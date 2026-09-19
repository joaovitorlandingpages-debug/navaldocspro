import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Checkout Edge Function
 * Criação segura de sessão de checkout no servidor com:
 * - Validação de usuário e empresa autenticada
 * - Prevenção contra cobranças duplicadas para a mesma empresa
 * - Resolução do plano e preço BRL recorrente
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
    const origin = body.origin || req.headers.get("origin") || "https://navaldocspro.com.br";
    const supabase = ctx.admin;

    const companyId = ctx.companyId || body.companyId;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhum escritório vinculado ao usuário autenticado." });
    }

    // 1. Verifica existência do escritório
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, email")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new HttpError(404, { error: "company_not_found", message: `Escritório ${companyId} não encontrado.` });
    }

    // 2. Prevenção contra assinatura duplicada ativa
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status, plan_id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      throw new HttpError(400, {
        error: "active_subscription_exists",
        message: "Este escritório já possui uma assinatura ativa. Acesse o portal de cobrança para alterar o plano."
      });
    }

    // 3. Mapeamento dos planos oficiais
    const planCatalog: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number }> = {
      "essencial": { name: "Essencial", monthlyPrice: 149, yearlyPrice: 1490 },
      "profissional": { name: "Profissional", monthlyPrice: 299, yearlyPrice: 2990 },
      "equipe": { name: "Equipe", monthlyPrice: 599, yearlyPrice: 5990 },
      // Legados
      "despachante": { name: "Despachante Naval", monthlyPrice: 129, yearlyPrice: 1290 },
      "engenharia_pericia": { name: "Engenharia & Perícia", monthlyPrice: 179, yearlyPrice: 1790 }
    };

    const targetPlan = planCatalog[planSlug] || planCatalog["profissional"];
    const amountInCents = billingCycle === "annual" ? targetPlan.yearlyPrice * 100 : targetPlan.monthlyPrice * 100;
    const interval = billingCycle === "annual" ? "year" : "month";

    // 4. Verificação da chave secreta da Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      // Registra pendência de credenciais no log
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

    // 5. Chamada oficial à API Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/billing/plans`);
    params.append("client_reference_id", `${companyId}:${planSlug}`);
    if (company.email) params.append("customer_email", company.email);

    // Linha do item
    params.append("line_items[0][price_data][currency]", "brl");
    params.append("line_items[0][price_data][product_data][name]", `NavalDocs Pro - Plano ${targetPlan.name}`);
    params.append("line_items[0][price_data][unit_amount]", amountInCents.toString());
    params.append("line_items[0][price_data][recurring][interval]", interval);
    params.append("line_items[0][quantity]", "1");

    // Metadados
    params.append("metadata[company_id]", companyId);
    params.append("metadata[plan_slug]", planSlug);
    params.append("metadata[billing_cycle]", billingCycle);

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
      payload: { sessionId: sessionData.id, url: sessionData.url }
    });

    return new Response(
      JSON.stringify({
        sessionId: sessionData.id,
        url: sessionData.url
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
