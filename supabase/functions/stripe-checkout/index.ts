import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Validação e sanitização rigorosa de origens permitidas vinculadas aos domínios oficiais.
 * Domínios autorizados:
 * - https://navaldocspro.lovable.app
 * - https://preview--navaldocspro.lovable.app
 * - https://navaldocspro.com.br
 * - https://www.navaldocspro.com.br
 * - http://localhost:* / http://127.0.0.1:*
 */
export function sanitizeAllowedOrigin(rawOrigin: string | null | undefined): string {
  if (!rawOrigin) return "https://navaldocspro.lovable.app";
  try {
    const parsed = new URL(rawOrigin);
    const host = parsed.hostname.toLowerCase();
    
    // Domínios Lovable autorizados expressamente para este projeto
    const isLovableApp = host === "navaldocspro.lovable.app" || host === "preview--navaldocspro.lovable.app";
    // Domínios personalizados de produção (confirmados na infraestrutura)
    const isCustomProd = host === "navaldocspro.com.br" || host === "www.navaldocspro.com.br";
    // Desenvolvimento local
    const isLocal = (host === "localhost" || host === "127.0.0.1") && ["5173", "3000", "8080", "5174"].includes(parsed.port);

    if (isLovableApp || isCustomProd || isLocal) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Formato de URL inválido
  }
  return "https://navaldocspro.lovable.app";
}

/**
 * Stripe Checkout Edge Function
 * Criação segura de sessão de checkout no servidor com:
 * - Validação de usuário e empresa autenticada
 * - Restrição estrita de URLs de retorno aos domínios autorizados deste projeto
 * - Preservação do término real do trial já concedido (1ª cobrança agendada na data exata)
 * - Tratamento explícito de trials com menos de 48 horas restantes (sem cobrança antecipada indevida)
 * - Validação server-side de cupons e campanhas com preservação de estoque até conclusão do pagamento
 * - Registro em log de auditoria
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    await rateLimit(ctx.admin, `user:${ctx.userId}`, "stripe-checkout", 10, 60);

    const body = await req.json().catch(() => ({}));
    const planSlug = body.planSlug || body.plan_slug;
    const billingCycle = body.billingCycle || "monthly"; // 'monthly' | 'annual'
    const couponCode = (body.couponCode || body.coupon_code || "").toString().trim().toUpperCase();
    const rawOrigin = body.origin || req.headers.get("origin");
    const supabase = ctx.admin;

    // 1. Sanitização estrita de URL de retorno
    const origin = sanitizeAllowedOrigin(rawOrigin);

    const companyId = ctx.companyId || body.companyId;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhum escritório vinculado ao usuário autenticado." });
    }

    // 2. Verifica existência do escritório e permissão do usuário
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, email, created_at, trial_ends_at, metadata")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new HttpError(404, { error: "company_not_found", message: `Escritório ${companyId} não encontrado.` });
    }

    if (ctx.companyId !== companyId && !ctx.isAdminMaster) {
      throw new HttpError(403, { error: "forbidden", message: "Sem permissão para contratar planos por este escritório." });
    }

    // 3. Prevenção contra assinatura ativa duplicada
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status, plan_id, current_period_end, metadata")
      .eq("company_id", companyId)
      .maybeSingle();

    if (existingSub && existingSub.status === "active") {
      throw new HttpError(400, {
        error: "active_subscription_exists",
        message: "Este escritório já possui uma assinatura ativa. Acesse o portal de cobrança para alterar o plano ou cartão."
      });
    }

    // 4. Validação do plano no catálogo do banco (bloqueia rascunhos e arquivados)
    const { data: dbPlan } = await supabase
      .from("plans")
      .select("id, name, slug, price, price_yearly, status, is_active, stripe_price_monthly_id, stripe_price_yearly_id")
      .or(`slug.eq.${planSlug},id.eq.${planSlug}`)
      .maybeSingle();

    if (dbPlan) {
      if (dbPlan.status !== "published" || dbPlan.is_active !== true) {
        throw new HttpError(400, {
          error: "plan_not_purchasable",
          message: `O plano "${dbPlan.name}" não está disponível para novas contratações.`
        });
      }
    }

    const planCatalog: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number }> = {
      "essencial": { name: "Essencial", monthlyPrice: 149, yearlyPrice: 1490 },
      "profissional": { name: "Profissional", monthlyPrice: 299, yearlyPrice: 2990 },
      "equipe": { name: "Equipe", monthlyPrice: 599, yearlyPrice: 5990 },
      "despachante": { name: "Despachante Naval", monthlyPrice: 129, yearlyPrice: 1290 },
      "engenharia_pericia": { name: "Engenharia & Perícia", monthlyPrice: 179, yearlyPrice: 1790 }
    };

    const targetPlan = dbPlan 
      ? { name: dbPlan.name, monthlyPrice: Number(dbPlan.price), yearlyPrice: Number(dbPlan.price_yearly || dbPlan.price * 10) }
      : (planCatalog[planSlug] || planCatalog["profissional"]);

    const amountInCents = billingCycle === "annual" ? targetPlan.yearlyPrice * 100 : targetPlan.monthlyPrice * 100;
    const interval = billingCycle === "annual" ? "year" : "month";

    // 5. Preservação do Trial End Real e Tratamento de Trials < 48h
    const now = Date.now();
    let stripeTrialEndTimestamp: number | null = null;
    let trialEndIsoString: string | null = null;

    // A data real do teste pode vir de subscriptions.current_period_end ou companies.trial_ends_at
    const candidateTrialEnd = existingSub?.current_period_end || company.trial_ends_at;
    const isCandidateTrial = existingSub ? (existingSub.status === "trialing" || existingSub.status === "pending") : true;

    if (candidateTrialEnd && isCandidateTrial) {
      const currentEndMs = new Date(candidateTrialEnd).getTime();
      const remainingMs = currentEndMs - now;

      if (remainingMs > 0) {
        if (remainingMs < 48 * 60 * 60 * 1000) {
          // CASO CRÍTICO: Menos de 48 horas restantes no trial.
          // A API do Stripe Checkout não aceita trial_end inferior a 48h (exige timestamp >= 48h à frente).
          // NÃO ignoramos o prazo concedido nem cobramos antes dele!
          const hoursLeft = Math.max(1, Math.ceil(remainingMs / (3600 * 1000)));
          const dateFormatted = new Date(currentEndMs).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          
          throw new HttpError(400, {
            error: "trial_active_under_48h",
            hours_remaining: hoursLeft,
            trial_ends_at: new Date(currentEndMs).toISOString(),
            message: `Seu período de teste gratuito ainda está ativo (restam aproximadamente ${hoursLeft}h até ${dateFormatted}). Para garantir que você aproveite 100% do seu teste sem nenhuma cobrança antecipada, a contratação poderá ser concluída ao término desse prazo, mantendo seu acesso 100% liberado até lá.`
          });
        } else {
          // Prazo de teste preservado com primeira cobrança agendada na data exata
          stripeTrialEndTimestamp = Math.floor(currentEndMs / 1000);
          trialEndIsoString = new Date(currentEndMs).toISOString();
        }
      }
    }

    // 6. Verificação de Chave Secreta da Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      await supabase.from("payment_logs").insert({
        company_id: companyId,
        event_type: "checkout_blocked_missing_credentials",
        status: "pending",
        payload: {
          planSlug,
          billingCycle,
          message: "Configuração pendente: STRIPE_SECRET_KEY não encontrada nas variáveis de ambiente seguras da hospedagem."
        }
      });

      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: "A integração com o Stripe está em status 'Configuração pendente'. Configure a variável STRIPE_SECRET_KEY no ambiente seguro para ativar checkouts reais."
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Validação de Cupons e Campanhas do Admin no Servidor
    let appliedStripeCouponId: string | null = null;
    let appliedCouponDbId: string | null = null;
    let appliedCampaignInfo: any = null;

    if (couponCode) {
      const { data: dbCoupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!dbCoupon) {
        throw new HttpError(400, { error: "coupon_not_found", message: `Cupom "${couponCode}" inválido ou inexistente.` });
      }

      // Validação de datas
      if (dbCoupon.valid_from && new Date(dbCoupon.valid_from).getTime() > now) {
        throw new HttpError(400, { error: "coupon_not_started", message: `A campanha ${couponCode} ainda não foi iniciada.` });
      }
      if (dbCoupon.valid_until && new Date(dbCoupon.valid_until).getTime() < now) {
        throw new HttpError(400, { error: "coupon_expired", message: `O cupom ${couponCode} está expirado.` });
      }
      if (dbCoupon.max_redemptions && dbCoupon.redemption_count >= dbCoupon.max_redemptions) {
        throw new HttpError(400, { error: "coupon_limit_reached", message: `O cupom ${couponCode} atingiu o limite máximo de resgates.` });
      }

      // Verifica se a empresa já resgatou este cupom anteriormente
      const { data: previousRedemption } = await supabase
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", dbCoupon.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (previousRedemption) {
        throw new HttpError(400, { error: "coupon_already_used", message: `Este escritório já utilizou o cupom ${couponCode}.` });
      }

      // Validação de elegibilidade por plano
      if (Array.isArray(dbCoupon.applicable_plans) && dbCoupon.applicable_plans.length > 0) {
        if (!dbCoupon.applicable_plans.includes(planSlug)) {
          throw new HttpError(400, { error: "coupon_not_applicable_plan", message: `O cupom ${couponCode} não é aplicável ao plano selecionado.` });
        }
      }

      // Validação de elegibilidade por ciclo
      if (Array.isArray(dbCoupon.applicable_billing_cycles) && dbCoupon.applicable_billing_cycles.length > 0) {
        if (!dbCoupon.applicable_billing_cycles.includes(billingCycle)) {
          throw new HttpError(400, { error: "coupon_not_applicable_cycle", message: `O cupom ${couponCode} não é aplicável ao ciclo de faturamento selecionado.` });
        }
      }

      if (dbCoupon.type === "trial_extension") {
        throw new HttpError(400, {
          error: "coupon_is_trial_extension",
          message: `O código "${couponCode}" é uma extensão de teste gratuito de ${dbCoupon.trial_days || 60} dias e não requer cartão de crédito. Resgate-o diretamente no painel de sua conta.`
        });
      } else if (dbCoupon.type === "percent" || dbCoupon.type === "fixed") {
        appliedCouponDbId = dbCoupon.id;
        let stripeCoupId = dbCoupon.stripe_coupon_id;

        // Se o cupom ainda não foi criado na Stripe, cria agora
        if (!stripeCoupId) {
          const coupParams = new URLSearchParams();
          coupParams.append("name", dbCoupon.name);
          coupParams.append("id", `COUP_${dbCoupon.code}_${Date.now().toString(36)}`);
          if (dbCoupon.type === "percent" && dbCoupon.discount_percent) {
            coupParams.append("percent_off", Number(dbCoupon.discount_percent).toString());
          } else if (dbCoupon.type === "fixed" && dbCoupon.discount_fixed) {
            coupParams.append("amount_off", Math.round(Number(dbCoupon.discount_fixed) * 100).toString());
            coupParams.append("currency", "brl");
          }
          
          const duration = dbCoupon.discount_duration || "once";
          coupParams.append("duration", duration);
          if (duration === "repeating" && dbCoupon.duration_in_months) {
            coupParams.append("duration_in_months", dbCoupon.duration_in_months.toString());
          }

          const stripeCoupRes = await fetch("https://api.stripe.com/v1/coupons", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: coupParams.toString()
          });

          const coupData = await stripeCoupRes.json();
          if (stripeCoupRes.ok && coupData.id) {
            stripeCoupId = coupData.id;
            await supabase.from("coupons").update({
              stripe_coupon_id: stripeCoupId,
              updated_at: new Date().toISOString()
            }).eq("id", dbCoupon.id);
          }
        }

        if (stripeCoupId) {
          appliedStripeCouponId = stripeCoupId;
          appliedCampaignInfo = { 
            coupon_id: dbCoupon.id,
            code: couponCode, 
            type: dbCoupon.type, 
            discount: dbCoupon.discount_percent || dbCoupon.discount_fixed,
            duration: dbCoupon.discount_duration || "once"
          };
        }
      }
    }

    // 8. Chamada oficial à API Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/plans`);
    params.append("client_reference_id", `${companyId}:${planSlug}`);
    params.append("allow_promotion_codes", "true");
    if (company.email) params.append("customer_email", company.email);

    // Se houver término de trial preservado
    if (stripeTrialEndTimestamp) {
      params.append("subscription_data[trial_end]", stripeTrialEndTimestamp.toString());
    }

    // Se houver cupom validado no servidor
    if (appliedStripeCouponId) {
      params.append("discounts[0][coupon]", appliedStripeCouponId);
    }

    // Preço oficial ou dinâmico
    const stripePriceId = billingCycle === "annual" ? dbPlan?.stripe_price_yearly_id : dbPlan?.stripe_price_monthly_id;
    if (stripePriceId && stripePriceId.startsWith("price_")) {
      params.append("line_items[0][price]", stripePriceId);
      params.append("line_items[0][quantity]", "1");
    } else {
      params.append("line_items[0][price_data][currency]", "brl");
      params.append("line_items[0][price_data][product_data][name]", `NavalDocs Pro - Plano ${targetPlan.name}`);
      params.append("line_items[0][price_data][unit_amount]", amountInCents.toString());
      params.append("line_items[0][price_data][recurring][interval]", interval);
      params.append("line_items[0][quantity]", "1");
    }

    // Metadados seguros da sessão
    params.append("metadata[company_id]", companyId);
    params.append("metadata[plan_slug]", planSlug);
    params.append("metadata[billing_cycle]", billingCycle);
    if (appliedCouponDbId) params.append("metadata[applied_coupon_id]", appliedCouponDbId);
    if (trialEndIsoString) params.append("metadata[preserved_trial_end]", trialEndIsoString);
    if (appliedCampaignInfo) params.append("metadata[applied_campaign]", JSON.stringify(appliedCampaignInfo));

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const sessionData = await stripeRes.json();

    if (!stripeRes.ok) {
      await supabase.from("payment_logs").insert({
        company_id: companyId,
        event_type: "stripe_checkout_error",
        status: "error",
        payload: sessionData
      });
      throw new Error(sessionData.error?.message || "Erro ao gerar sessão de checkout na Stripe.");
    }

    await supabase.from("payment_logs").insert({
      company_id: companyId,
      event_type: "stripe_checkout_created",
      status: "success",
      payload: { 
        sessionId: sessionData.id, 
        url: sessionData.url, 
        trialEnd: trialEndIsoString, 
        campaign: appliedCampaignInfo 
      }
    });

    return new Response(
      JSON.stringify({
        sessionId: sessionData.id,
        url: sessionData.url,
        trialEnd: trialEndIsoString,
        appliedCampaign: appliedCampaignInfo
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status);
    console.error("Erro no checkout Stripe:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
