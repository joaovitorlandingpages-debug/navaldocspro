import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initContext, handleCors, jsonResponse, errorResponse } from "../_shared/stripe-client.ts";
import { resolvePlanFromDatabase } from "../_shared/stripe-plans.ts";

const ALLOWED_REDIRECT_ORIGINS = [
  'https://navaldocspro.lovable.app',
  'https://preview--navaldocspro.lovable.app',
  'https://navaldocspro.com.br',
  'https://www.navaldocspro.com.br',
];

const DEFAULT_REDIRECT_BASE = 'https://navaldocspro.lovable.app';

function validateRedirectUrl(urlStr?: string): string {
  if (!urlStr) return DEFAULT_REDIRECT_BASE;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return parsed.origin;
    }
    const match = ALLOWED_REDIRECT_ORIGINS.some(allowed => {
      return parsed.origin.toLowerCase() === allowed.toLowerCase();
    });
    if (match) return parsed.origin;
  } catch (_e) {
    // Fallback to strict default
  }
  return DEFAULT_REDIRECT_BASE;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let ctx;
  try {
    ctx = initContext(req);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }

  try {
    const user = await ctx.getUser();
    if (!user) {
      return errorResponse("Não autenticado", 401);
    }

    const { planId, billingCycle = 'monthly', couponCode, successUrl, cancelUrl } = await req.json();

    if (!planId) {
      return errorResponse("planId é obrigatório", 400);
    }

    // 1. Consulta dinâmica do catálogo no banco public.plans
    const resolved = await resolvePlanFromDatabase(ctx.admin, planId, billingCycle);
    if (!resolved) {
      return errorResponse(`Plano não encontrado no catálogo: ${planId} (${billingCycle})`, 404);
    }

    const { data: profile, error: profileErr } = await ctx.admin
      .from('profiles')
      .select('company_id, full_name, email, role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile?.company_id) {
      return errorResponse("Perfil ou empresa não encontrados", 400);
    }

    const companyId = profile.company_id;

    // 2. Validação de autorização financeira no servidor
    const { data: canManage, error: permErr } = await ctx.admin
      .rpc('can_manage_company_billing', {
        p_user_id: user.id,
        p_company_id: companyId
      });

    if (permErr || !canManage) {
      return errorResponse("Você não tem permissão para gerenciar faturamento desta empresa", 403);
    }

    const { data: company, error: compErr } = await ctx.admin
      .from('companies')
      .select('id, name, cnpj, email, stripe_customer_id, trial_ends_at')
      .eq('id', companyId)
      .single();

    if (compErr || !company) {
      return errorResponse("Dados da empresa não encontrados", 404);
    }

    let customerId = company?.stripe_customer_id;

    if (!customerId) {
      const customer = await ctx.stripe.customers.create({
        email: user.email,
        name: company?.name || profile.full_name || undefined,
        metadata: {
          company_id: companyId,
          user_id: user.id,
          cnpj: company?.cnpj || '',
        },
      });
      customerId = customer.id;

      await ctx.admin
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId);
    }

    // 3. Verificação de assinaturas existentes: impede criação duplicada quando já existe assinatura ativa/trialing na Stripe
    const { data: existingSub } = await ctx.admin
      .from('subscriptions')
      .select('id, status, current_period_end, trial_ends_at, stripe_subscription_id, metadata')
      .eq('company_id', companyId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasStripeContract = Boolean(existingSub?.stripe_subscription_id || existingSub?.metadata?.stripe_subscription_id);

    if (existingSub && hasStripeContract) {
      if (existingSub.status === 'active') {
        return errorResponse("Empresa já possui uma assinatura ativa na Stripe. Acesse o portal para gerenciar ou alterar seu plano.", 400);
      }
      if (existingSub.status === 'trialing') {
        return errorResponse("Empresa já possui assinatura contratada em período de teste na Stripe. Acesse o portal para gerenciar.", 400);
      }
      if (existingSub.status === 'past_due') {
        return errorResponse("Existe uma assinatura com cobrança pendente. Regularize o pagamento pelo portal antes de contratar um novo plano.", 400);
      }
    }

    // 4. Cálculo de Trial restante
    let trialEndTimestamp: number | undefined = undefined;
    let trialExtendedTechnically = false;

    const trialDates: number[] = [];
    if (company?.trial_ends_at) {
      const dt = new Date(company.trial_ends_at).getTime();
      if (!isNaN(dt)) trialDates.push(dt);
    }
    if (existingSub?.trial_ends_at) {
      const dt = new Date(existingSub.trial_ends_at).getTime();
      if (!isNaN(dt)) trialDates.push(dt);
    }
    if (existingSub?.status === 'trialing' && existingSub?.current_period_end) {
      const dt = new Date(existingSub.current_period_end).getTime();
      if (!isNaN(dt)) trialDates.push(dt);
    }

    if (trialDates.length > 0) {
      const maxTrialMs = Math.max(...trialDates);
      const remainingSeconds = Math.floor((maxTrialMs - Date.now()) / 1000);

      if (remainingSeconds > 0) {
        if (remainingSeconds >= 48 * 3600) {
          trialEndTimestamp = Math.floor(maxTrialMs / 1000);
        } else {
          // Stripe exige no mínimo 48h para trial_end.
          // Alinhamos o timestamp para a margem mínima de 48h + 60s para impedir cobrança imediata do cartão.
          trialEndTimestamp = Math.floor(Date.now() / 1000) + 48 * 3600 + 60;
          trialExtendedTechnically = true;
        }
      }
    }

    // 5. Reserva atômica de cupom de desconto
    let stripeDiscounts: any[] | undefined = undefined;
    let reservedCouponId: string | null = null;
    const sessionExpiresAt = Math.floor(Date.now() / 1000) + 1800; // 30 minutos exatos
    const preSessionId = `res_${companyId.slice(0, 8)}_${Date.now()}`;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
      const { data: reservation, error: resErr } = await ctx.admin
        .rpc('reserve_discount_coupon', {
          p_code: couponCode.trim(),
          p_company_id: companyId,
          p_session_id: preSessionId,
          p_plan_id: resolved.planId,
          p_billing_cycle: resolved.billingCycle,
          p_expires_at: new Date(sessionExpiresAt * 1000).toISOString(),
        });

      if (resErr || !reservation?.success) {
        return errorResponse(reservation?.error || 'Cupom inválido ou indisponível para esta contratação', 400);
      }

      reservedCouponId = reservation.coupon_id;

      if (reservation.stripe_promotion_code_id) {
        stripeDiscounts = [{ promotion_code: reservation.stripe_promotion_code_id }];
      } else if (reservation.stripe_coupon_id) {
        stripeDiscounts = [{ coupon: reservation.stripe_coupon_id }];
      } else {
        await ctx.admin.rpc('release_discount_coupon_reservation', { p_session_id: preSessionId });
        return errorResponse("O cupom promocional informado não possui identificador correspondente configurado na Stripe.", 400);
      }
    }

    const safeSuccessBase = validateRedirectUrl(successUrl);
    const safeCancelBase = validateRedirectUrl(cancelUrl);

    // Montagem dos line_items (usa price oficial da Stripe ou price_data se o plano não estiver pré-sincronizado)
    const lineItems = resolved.priceId
      ? [{ price: resolved.priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: `NavalDocs Pro - Plano ${resolved.name}`,
            },
            unit_amount: resolved.unitAmount,
            recurring: {
              interval: resolved.billingCycle === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        }];

    const checkoutSessionParams: any = {
      customer: customerId,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      subscription_data: {
        metadata: {
          company_id: companyId,
          user_id: user.id,
          plan_id: resolved.planId,
          plan_db_id: resolved.planDbId || '',
          billing_cycle: resolved.billingCycle,
          coupon_id: reservedCouponId || '',
          pre_session_id: preSessionId,
        },
        ...(trialEndTimestamp ? { trial_end: trialEndTimestamp } : {}),
      },
      metadata: {
        company_id: companyId,
        user_id: user.id,
        plan_id: resolved.planId,
        plan_db_id: resolved.planDbId || '',
        billing_cycle: resolved.billingCycle,
        coupon_id: reservedCouponId || '',
        pre_session_id: preSessionId,
      },
      success_url: `${safeSuccessBase}/configuracoes?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeCancelBase}/configuracoes?tab=billing&checkout=cancelled`,
      expires_at: sessionExpiresAt,
    };

    if (stripeDiscounts && stripeDiscounts.length > 0) {
      checkoutSessionParams.discounts = stripeDiscounts;
    } else {
      checkoutSessionParams.allow_promotion_codes = true;
    }

    let session;
    try {
      session = await ctx.stripe.checkout.sessions.create(checkoutSessionParams);
    } catch (stripeErr: any) {
      if (reservedCouponId) {
        await ctx.admin.rpc('release_discount_coupon_reservation', { p_session_id: preSessionId });
      }
      return errorResponse(`Erro ao criar checkout no Stripe: ${stripeErr.message}`, 400);
    }

    // 6. Vinculação da reserva e tratamento de falhas
    if (reservedCouponId) {
      const { data: updatedRows, error: updateErr } = await ctx.admin
        .from('coupon_redemptions')
        .update({
          stripe_session_id: session.id,
          expires_at: new Date(session.expires_at * 1000).toISOString(),
          metadata: {
            plan_id: resolved.planId,
            billing_cycle: resolved.billingCycle,
            pre_session_id: preSessionId,
          }
        })
        .eq('stripe_session_id', preSessionId)
        .select();

      if (updateErr || !updatedRows || updatedRows.length === 0) {
        console.error("Falha ao atualizar reserva com session_id Stripe:", updateErr);
        // Tenta expirar a sessão na Stripe primeiro para garantir que o cliente não pague com vaga liberada
        let expiredSuccessfully = false;
        try {
          const expRes = await ctx.stripe.checkout.sessions.expire(session.id);
          if (expRes.status === 'expired') {
            expiredSuccessfully = true;
          }
        } catch (expireErr: any) {
          console.error("Não foi possível expirar a sessão Stripe:", expireErr);
        }

        // Se e somente se a sessão foi expirada na Stripe, libera a reserva local
        if (expiredSuccessfully) {
          await ctx.admin.rpc('release_discount_coupon_reservation', { p_session_id: preSessionId });
        }
        return errorResponse("Falha ao vincular reserva promocional à sessão de pagamento.", 500);
      }
    }

    const effectiveTrialIso = trialEndTimestamp ? new Date(trialEndTimestamp * 1000).toISOString() : null;

    return jsonResponse({
      sessionId: session.id,
      url: session.url,
      trialEnd: effectiveTrialIso,
      trialExtendedTechnically: trialExtendedTechnically,
    });
  } catch (err: any) {
    return errorResponse(err.message || "Erro interno no checkout", 500);
  }
});
