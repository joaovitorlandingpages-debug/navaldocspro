import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Checkout Edge Function
 * Criação segura de sessão de checkout no servidor com:
 * - Validação de usuário e empresa autenticada
 * - Restrição estrita de URLs de retorno aos domínios autorizados deste projeto
 * - Preservação do término real do trial já concedido (1ª cobrança agendada na data exata)
 * - Integração e validação de cupons e campanhas (descontos e extensão de trial de 60 dias totais)
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
    const rawOrigin = body.origin || req.headers.get("origin") || "https://navaldocspro.com.br";
    const supabase = ctx.admin;

    // 1. Validação estrita de origens permitidas vinculadas exclusivamente a este projeto
    function sanitizeOrigin(orig: string): string {
      try {
        const parsed = new URL(orig);
        const host = parsed.hostname.toLowerCase();
        const isOfficialProd = host === "navaldocspro.com.br" || host === "www.navaldocspro.com.br";
        const isProjectPreview = host.includes("vqutxzdsajinhsvuddcp") && (host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app"));
        const isLocal = (host === "localhost" || host === "127.0.0.1") && (parsed.port === "5173" || parsed.port === "3000" || parsed.port === "8080");

        if (isOfficialProd || isProjectPreview || isLocal) {
          return `${parsed.protocol}//${parsed.host}`;
        }
      } catch {
        // Formato inválido
      }
      return "https://navaldocspro.com.br";
    }

    const origin = sanitizeOrigin(rawOrigin);

    const companyId = ctx.companyId || body.companyId;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhum escritório vinculado ao usuário autenticado." });
    }

    // 2. Verifica existência do escritório e permissão do usuário
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, email, created_at, metadata")
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
        message: "Este escritório já possui uma assinatura ativa. Acesse o portal de cobrança para alterar o plano."
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

    // 5. Preservação do Trial End já concedido
    const now = Date.now();
    let stripeTrialEndTimestamp: number | null = null;
    let trialEndIsoString: string | null = null;

    if (existingSub && (existingSub.status === "trialing" || existingSub.status === "pending")) {
      if (existingSub.current_period_end) {
        const currentEndMs = new Date(existingSub.current_period_end).getTime();
        // A Stripe exige que o trial_end seja no mínimo 48 horas no futuro para checkout de assinatura sem cobrança imediata
        if (currentEndMs > now + (48 * 60 * 60 * 1000)) {
          stripeTrialEndTimestamp = Math.floor(currentEndMs / 1000);
          trialEndIsoString = existingSub.current_period_end;
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
    let appliedCampaignInfo: any = null;

    if (couponCode) {
      const { data: dbCoupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .maybeSingle();

      if (dbCoupon) {
        // Valida limites de resgate e data de expiração
        const isExpired = dbCoupon.valid_until && new Date(dbCoupon.valid_until).getTime() < now;
        const limitReached = dbCoupon.max_redemptions && dbCoupon.redemption_count >= dbCoupon.max_redemptions;

        if (isExpired) {
          throw new HttpError(400, { error: "coupon_expired", message: `O cupom ${couponCode} está expirado.` });
        }
        if (limitReached) {
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

        if (dbCoupon.type === "trial_extension") {
          // Extensão de teste para 60 dias totais a partir da criação original da empresa
          const companyCreatedMs = company.created_at ? new Date(company.created_at).getTime() : now;
          const totalTrialMs = (dbCoupon.trial_days || 60) * 24 * 60 * 60 * 1000;
          const extendedEndMs = companyCreatedMs + totalTrialMs;

          if (extendedEndMs > now + (48 * 60 * 60 * 1000)) {
            stripeTrialEndTimestamp = Math.floor(extendedEndMs / 1000);
            trialEndIsoString = new Date(extendedEndMs).toISOString();

            // Atualiza o término do teste da empresa no banco
            await supabase.from("subscriptions").upsert({
              company_id: companyId,
              status: "trialing",
              current_period_end: trialEndIsoString,
              updated_at: new Date().toISOString()
            }, { onConflict: "company_id" });

            // Registra o resgate da campanha
            await supabase.from("coupon_redemptions").insert({
              coupon_id: dbCoupon.id,
              company_id: companyId,
              user_id: ctx.userId,
              metadata: { extended_to: trialEndIsoString, trial_days: dbCoupon.trial_days }
            });

            await supabase.from("coupons").update({
              redemption_count: (dbCoupon.redemption_count || 0) + 1,
              updated_at: new Date().toISOString()
            }).eq("id", dbCoupon.id);

            appliedCampaignInfo = { code: couponCode, type: "trial_extension", trialDays: dbCoupon.trial_days };
          }
        } else if (dbCoupon.type === "percent" || dbCoupon.type === "fixed") {
          // Cria ou reutiliza cupom na API da Stripe
          let stripeCoupId = dbCoupon.stripe_coupon_id;
          if (!stripeCoupId) {
            const coupParams = new URLSearchParams();
            coupParams.append("name", dbCoupon.name);
            coupParams.append("id", `COUP_${dbCoupon.code}_${Date.now().toString(36)}`);
            if (dbCoupon.type === "percent" && dbCoupon.discount_percent) {
              coupParams.append("percent_off", dbCoupon.discount_percent.toString());
            } else if (dbCoupon.type === "fixed" && dbCoupon.discount_fixed) {
              coupParams.append("amount_off", Math.round(Number(dbCoupon.discount_fixed) * 100).toString());
              coupParams.append("currency", "brl");
            }
            coupParams.append("duration", "once");

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
            appliedCampaignInfo = { code: couponCode, type: dbCoupon.type, discount: dbCoupon.discount_percent || dbCoupon.discount_fixed };
          }
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

