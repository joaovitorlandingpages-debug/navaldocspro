import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    await rateLimit(ctx.admin, `user:${ctx.userId}`, "create-checkout", 10, 60);

    const body = await req.json().catch(() => ({}));
    const planId = body.planId || body.plan_id || body.planSlug || body.plan_slug;
    const origin = body.origin || req.headers.get("origin") || "https://navaldocs.com.br";
    const supabase = ctx.admin;

    // Resolução segura da empresa para evitar chave órfã
    const companyId = ctx.companyId || body.companyId || body.company_id;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhuma empresa vinculada ao usuário." });
    }

    // Validação de existência da empresa no banco
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new HttpError(404, { error: "company_not_found", message: `Empresa ${companyId} não encontrada.` });
    }

    // Busca detalhes do plano (por id ou slug)
    let { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!plan && body.planSlug) {
      const { data: planBySlug } = await supabase
        .from("plans")
        .select("*")
        .eq("slug", body.planSlug)
        .maybeSingle();
      if (planBySlug) plan = planBySlug;
    }

    // Fallback caso a tabela plans ainda não contenha o registro
    if (!plan) {
      const defaultPlans: Record<string, { id: string; name: string; price: number }> = {
        "plan-starter": { id: "plan-starter", name: "Starter / Despachante", price: 149 },
        "starter": { id: "plan-starter", name: "Starter / Despachante", price: 149 },
        "plan-professional": { id: "plan-professional", name: "Professional / Engenheiro Naval", price: 299 },
        "professional": { id: "plan-professional", name: "Professional / Engenheiro Naval", price: 299 },
        "plan-enterprise": { id: "plan-enterprise", name: "Enterprise / Estaleiro & Frota", price: 599 },
        "enterprise": { id: "plan-enterprise", name: "Enterprise / Estaleiro & Frota", price: 599 },
      };
      plan = defaultPlans[planId] || defaultPlans["plan-professional"];
    }

    const externalReference = `${companyId}:${plan.id}`;
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    
    // Registra tentativa de checkout no log de auditoria
    await supabase.from("payment_logs").insert({
      company_id: companyId,
      event_type: "checkout_initiated",
      status: "pending",
      payload: { 
        plan_id: plan.id, 
        plan_name: plan.name, 
        external_reference: externalReference 
      }
    });

    if (!accessToken) {
      console.log("MERCADO_PAGO_ACCESS_TOKEN not set, using sandbox mock mode.");
      
      const mockInitPoint = `${origin}/billing/success?collection_id=mock_123&collection_status=approved&payment_id=mock_123&status=approved&external_reference=${encodeURIComponent(externalReference)}&payment_type=pix&merchant_order_id=mock_order_123&preference_id=mock_pref_123&site_id=MLB&processing_mode=aggregator`;

      await supabase.from("payment_logs").insert({
        company_id: companyId,
        event_type: "checkout_created",
        status: "success",
        payload: { init_point: mockInitPoint, mode: "sandbox_mock", external_reference: externalReference }
      });

      return new Response(
        JSON.stringify({ 
          init_point: mockInitPoint,
          external_reference: externalReference,
          message: "Modo Sandbox: Redirecionando para sucesso simulado com external_reference correto." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chamada oficial à API do Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{
          id: plan.id,
          title: `NavalDocs Pro: ${plan.name}`,
          unit_price: Number(plan.price),
          quantity: 1,
          currency_id: "BRL"
        }],
        payment_methods: {
          installments: 12
        },
        back_urls: {
          success: `${origin}/billing/success`,
          failure: `${origin}/billing/failure`,
          pending: `${origin}/billing/success`
        },
        auto_return: "approved",
        external_reference: externalReference,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`
      })
    });

    const mpData = await response.json();

    if (!response.ok) {
      await supabase.from("payment_logs").insert({
        company_id: companyId,
        event_type: "checkout_failed",
        status: "error",
        payload: mpData,
        message: "Falha ao criar preferência no Mercado Pago"
      });
      throw new Error(mpData.message || "Erro ao conectar com Mercado Pago");
    }

    await supabase.from("payment_logs").insert({
      company_id: companyId,
      event_type: "checkout_created",
      status: "success",
      payload: { 
        preference_id: mpData.id, 
        init_point: mpData.init_point, 
        external_reference: externalReference 
      }
    });

    return new Response(
      JSON.stringify({ 
        init_point: mpData.init_point,
        preference_id: mpData.id,
        external_reference: externalReference
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status);
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
