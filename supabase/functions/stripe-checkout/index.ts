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

    const body = await req.json().catch(() => ({}));
    const { billingCycle = 'monthly', couponCode, successUrl, cancelUrl } = body;

    const safeSuccessBase = validateRedirectUrl(successUrl);
    const safeCancelBase = validateRedirectUrl(cancelUrl);

    // 1. Identificação do usuário, empresa e permissões financeiras
    const { data: profile, error: profileErr } = await ctx.admin
      .from('profiles')
      .select('company_id, name, email, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[stripe-checkout] Erro ao consultar perfil:", profileErr);
      return errorResponse("Erro ao carregar dados do usuário", 500);
    }

    if (!profile || !profile.company_id) {
      return errorResponse("Perfil ou empresa não encontrados", 400);
    }

    const companyId = profile.company_id;

    // Validação de autorização financeira no servidor
    // A RPC can_manage_company_billing é a autoridade primária.
    let canManage = false;
    const { data: canManageRpc, error: permErr } = await ctx.admin
      .rpc('can_manage_company_billing', {
        p_user_id: user.id,
        p_company_id: companyId
      });

    if (!permErr) {
      // Se a RPC respondeu (true ou false), seu resultado é soberano e NUNCA é substituído
      canManage = canManageRpc === true;
    } else {
      // O fallback SÓ é executado se a RPC estiver ausente/indisponível no PostgREST (PGRST202 ou 42883)
      const isRpcUnavailable = permErr.code === 'PGRST202' || permErr.code === '42883';
      if (isRpcUnavailable) {
        console.warn("[stripe-checkout] can_manage_company_billing indisponível no banco (código " + permErr.code + "), aplicando verificação direta temporária.");
        const isCompanyFinancialManager = profile.company_id === companyId && 
          ['company_admin', 'admin', 'owner', 'finance'].includes(profile.role);
        const isMasterAdmin = ['admin_master', 'admin_master_global', 'superadmin'].includes(profile.role);
        canManage = isCompanyFinancialManager || isMasterAdmin;
      } else {
        // Qualquer outro erro de execução no banco interrompe imediatamente a operação
        console.error("[stripe-checkout] Erro inesperado ao validar permissões financeiras:", permErr);
        return errorResponse("Erro ao validar permissões de faturamento", 500);
      }
    }

    if (!canManage) {
      return errorResponse("Você não tem permissão para gerenciar faturamento desta empresa", 403);
    }

    const { data: company, error: compErr } = await ctx.admin
      .from('companies')
      .select('id, name, cnpj, email')
      .eq('id', companyId)
      .single();

    if (compErr || !company) {
      return errorResponse("Dados da empresa não encontrados", 404);
    }

    // Busca customerId existente:
    // 1) Em companies (caso a coluna venha a existir)
    // 2) Em subscriptions (metadata->>'stripe_customer_id' ou coluna dedicada)
    let customerId: string | undefined = undefined;
    let existingSubRecord: { id: string; metadata: any; status: string } | null = null;

    try {
      const { data: compExtra } = await ctx.admin
        .from('companies')
        .select('stripe_customer_id')
        .eq('id', companyId)
        .maybeSingle();
      if (compExtra?.stripe_customer_id) {
        customerId = compExtra.stripe_customer_id;
      }
    } catch {
      // Coluna não existe no schema atual
    }

    if (!customerId) {
      try {
        const { data: sub } = await ctx.admin
          .from('subscriptions')
          .select('id, metadata, status')
          .eq('company_id', companyId)
          .maybeSingle();
        if (sub) {
          existingSubRecord = sub;
          if (sub.metadata?.stripe_customer_id) {
            customerId = sub.metadata.stripe_customer_id;
          }
        }
      } catch (errSubFetch) {
        console.error("[stripe-checkout] Erro ao consultar subscriptions:", errSubFetch);
        return errorResponse("Falha ao verificar registro de faturamento da empresa", 500);
      }
    }

    // Se ainda não temos customerId localmente, verifica no Stripe para prevenir duplicidade em concorrência
    if (!customerId) {
      try {
        // Busca idempotente na Stripe por metadata company_id
        const existingStripeCustomers = await ctx.stripe.customers.search({
          query: `metadata['company_id']:'${companyId}'`,
          limit: 1,
        });

        if (existingStripeCustomers.data && existingStripeCustomers.data.length > 0) {
          customerId = existingStripeCustomers.data[0].id;
        }
      } catch (searchErr) {
        console.warn("[stripe-checkout] Busca idempotente no Stripe falhou ou indisponível, usando fallback de criação:", searchErr);
      }

      // Se não encontrou no Stripe, cria com idempotency key baseada no companyId
      if (!customerId) {
        try {
          const customer = await ctx.stripe.customers.create(
            {
              email: user.email,
              name: company?.name || profile.name || undefined,
              metadata: {
                company_id: companyId,
                user_id: user.id,
                cnpj: company?.cnpj || '',
                app: 'navaldocspro',
              },
            },
            {
              idempotencyKey: `create_customer_${companyId}`,
            }
          );
          customerId = customer.id;
        } catch (stripeCustErr: any) {
          console.error("[stripe-checkout] Erro ao criar cliente na Stripe:", stripeCustErr);
          return errorResponse(`Falha ao registrar cliente no gateway de pagamento: ${stripeCustErr.message}`, 500);
        }
      }

      // VINCULAÇÃO DURÁVEL NO BANCO:
      // Tenta salvar em companies se a coluna existir
      let compSaved = false;
      try {
        const { error: updCompErr } = await ctx.admin
          .from('companies')
          .update({ stripe_customer_id: customerId })
          .eq('id', companyId);
        if (!updCompErr) compSaved = true;
      } catch {
        // Coluna não existe
      }

      // Se não foi salvo em companies, persiste em subscriptions.metadata sem liberar acesso (status='pending')
      if (!compSaved) {
        // Reconsulta imediatamente a assinatura para mesclar com quaisquer metadados gravados concorrentemente
        const { data: latestSub, error: fetchLatestErr } = await ctx.admin
          .from('subscriptions')
          .select('id, metadata, status')
          .eq('company_id', companyId)
          .maybeSingle();

        if (fetchLatestErr) {
          console.error("[stripe-checkout] Erro ao obter estado recente de subscriptions:", fetchLatestErr);
          return errorResponse("Falha ao sincronizar vínculo financeiro com a empresa", 500);
        }

        const currentMeta = latestSub?.metadata || existingSubRecord?.metadata || {};
        const mergedMeta = { ...currentMeta, stripe_customer_id: customerId };

        if (latestSub?.id) {
          const { error: updateSubErr } = await ctx.admin
            .from('subscriptions')
            .update({ metadata: mergedMeta, updated_at: new Date().toISOString() })
            .eq('id', latestSub.id);

          if (updateSubErr) {
            console.error("[stripe-checkout] Erro crítico ao salvar stripe_customer_id em subscriptions:", updateSubErr);
            return errorResponse("Não foi possível salvar o vínculo com o cliente no faturamento. Operação cancelada.", 500);
          }
        } else {
          // Inserção inicial: status estritamente 'pending' (NÃO trialing) para não liberar acesso prematuramente
          const { error: insertSubErr } = await ctx.admin
            .from('subscriptions')
            .insert({
              company_id: companyId,
              status: 'pending',
              metadata: mergedMeta,
            });

          if (insertSubErr) {
            // Em caso de concorrência onde outra requisição inseriu milissegundos antes (erro de unique em company_id):
            if (insertSubErr.code === '23505') {
              const { data: reSub, error: reFetchErr } = await ctx.admin
                .from('subscriptions')
                .select('id, metadata')
                .eq('company_id', companyId)
                .maybeSingle();

              if (!reFetchErr && reSub?.id) {
                const retryMerged = { ...(reSub.metadata || {}), stripe_customer_id: customerId };
                const { error: retryUpdErr } = await ctx.admin
                  .from('subscriptions')
                  .update({ metadata: retryMerged, updated_at: new Date().toISOString() })
                  .eq('id', reSub.id);

                if (retryUpdErr) {
                  console.error("[stripe-checkout] Falha no retry de atualização concorrente de subscriptions:", retryUpdErr);
                  return errorResponse("Falha ao registrar vínculo de faturamento concorrente", 500);
                }
              } else {
                console.error("[stripe-checkout] Falha ao recuperar assinatura concorrente:", reFetchErr);
                return errorResponse("Conflito concorrente ao vincular cliente de faturamento", 500);
              }
            } else {
              console.error("[stripe-checkout] Erro crítico ao criar registro de faturamento em subscriptions:", insertSubErr);
              return errorResponse("Não foi possível persistir o vínculo financeiro da empresa. Checkout cancelado.", 500);
            }
          }
        }
      }
    }

    // 2. SUPORTE A COMPRA DE CAPACIDADE ADICIONAL (ADDON / PAGAMENTO AVULSO)
    const isAddonPurchase = body.checkoutType === 'addon' || body.mode === 'payment' || Boolean(body.addonType);
    if (isAddonPurchase) {
      const addonType = body.addonType;
      const quantity = Math.max(1, parseInt(body.quantity || '1', 10));

      const validAddonTypes = ['processes', 'arrais_kits', 'ocr', 'monitored_docs'];
      if (!validAddonTypes.includes(addonType)) {
        return errorResponse(`Tipo de capacidade adicional inválido: ${addonType}. Use processes, arrais_kits, ocr ou monitored_docs.`, 400);
      }

      // Consulta preço unitário do catálogo ou do plano ativo da empresa
      const { data: currentSub } = await ctx.admin
        .from('subscriptions')
        .select('*, plan:plans(*)')
        .eq('company_id', companyId)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      const activePlan = currentSub?.plan;
      let unitPrice = 5.0;
      let addonLabel = "Processos Navais Adicionais";

      if (addonType === 'processes') {
        unitPrice = Number(activePlan?.addon_process_price) || 5.0;
        addonLabel = "Processos Navais Adicionais";
      } else if (addonType === 'arrais_kits') {
        unitPrice = Number(activePlan?.addon_arrais_kit_price) || 4.0;
        addonLabel = "Kits de Alunos Arrais Adicionais";
      } else if (addonType === 'ocr') {
        unitPrice = Number(activePlan?.addon_ocr_price) || 0.5;
        addonLabel = "Leituras de Anexos (OCR) Adicionais";
      } else if (addonType === 'monitored_docs') {
        unitPrice = Number(activePlan?.addon_monitored_doc_price) || 1.5;
        addonLabel = "Documentos Monitorados Adicionais";
      }

      const session = await ctx.stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(unitPrice * 100),
            product_data: {
              name: `${addonLabel} (${quantity} un)`,
              description: `Capacidade adicional de ${quantity}x ${addonLabel} para ${company.name}`
            }
          },
          quantity: quantity
        }],
        metadata: {
          company_id: companyId,
          user_id: user.id,
          checkout_type: 'addon',
          addon_type: addonType,
          addon_quantity: String(quantity),
          unit_price: String(unitPrice),
          app: 'navaldocspro'
        },
        success_url: successUrl || `${safeSuccessBase}/billing/subscription?addon_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${safeCancelBase}/billing/subscription?addon_canceled=true`,
      });

      return jsonResponse({
        sessionId: session.id,
        url: session.url,
        checkoutType: 'addon'
      });
    }

    // 3. FLUXO DE ASSINATURA DE PLANO
    const planId = body.planId || body.planSlug;
    if (!planId) {
      return errorResponse("planId é obrigatório para contratação de planos", 400);
    }

    // Valida o ciclo antes de resolver o plano
    if (billingCycle && billingCycle !== 'monthly' && billingCycle !== 'annual' && billingCycle !== 'yearly') {
      return errorResponse(`Ciclo de cobrança inválido: "${billingCycle}". Use monthly, annual ou yearly.`, 400);
    }

    const resolved = await resolvePlanFromDatabase(ctx.admin, planId, billingCycle);
    if (!resolved) {
      return errorResponse(`Plano não encontrado, inativo ou indisponível para contratação: ${planId} (${billingCycle})`, 404);
    }

    // Garante que o plano está sincronizado com a Stripe (price_id obrigatório)
    if (!resolved.priceId) {
      return errorResponse(
        `O plano "${resolved.name}" ainda não está sincronizado com a Stripe. Acesse o painel de administração e execute a sincronização antes de contratar.`,
        400
      );
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
    if ((company as any)?.trial_ends_at) {
      const dt = new Date((company as any).trial_ends_at).getTime();
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

    // Montagem dos line_items — usa EXCLUSIVAMENTE o price oficial da Stripe (pré-sincronizado)
    const lineItems = [{ price: resolved.priceId, quantity: 1 }];

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
          plan_version: String(resolved.version || 1),
          apps_included: (resolved.appsIncluded || []).join(','),
          pre_session_id: preSessionId,
        },
        ...(trialEndTimestamp ? { trial_end: trialEndTimestamp } : {}),
      },
      metadata: {
        company_id: companyId,
        user_id: user.id,
        plan_id: resolved.planId,
        plan_db_id: resolved.planDbId || '',
        plan_version: String(resolved.version || 1),
        apps_included: (resolved.appsIncluded || []).join(','),
        billing_cycle: resolved.billingCycle,
        coupon_id: reservedCouponId || '',
        pre_session_id: preSessionId,
      },
      success_url: successUrl || `${safeSuccessBase}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${safeCancelBase}/billing/failure`,
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
