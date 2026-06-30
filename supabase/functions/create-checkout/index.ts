import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    await rateLimit(ctx.admin, `user:${ctx.userId}`, "create-checkout", 10, 60);

    const { planId, origin } = await req.json();
    const supabase = ctx.admin;

    const companyId = ctx.companyId;
    if (!companyId) throw new HttpError(403, { error: "no_company_bound" });


    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      throw new Error("Plano não encontrado");
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    
    // Log checkout attempt
    await supabase.from("payment_logs").insert({
        company_id: companyId,
        event_type: "checkout_initiated",
        status: "pending",
        payload: { plan_id: planId, plan_name: plan.name }
    });

    if (!accessToken) {
      console.log("MERCADO_PAGO_ACCESS_TOKEN not set, using sandbox mock mode.");
      
      const mockInitPoint = `${origin}/billing/success?collection_id=mock_123&collection_status=approved&payment_id=mock_123&status=approved&external_reference=${companyId}:${planId}&payment_type=credit_card&merchant_order_id=mock_order_123&preference_id=mock_pref_123&site_id=MLB&processing_mode=aggregator&merchant_account_id=null`;

      await supabase.from("payment_logs").insert({
          company_id: companyId,
          event_type: "checkout_created",
          status: "success",
          payload: { init_point: mockInitPoint, mode: "sandbox_mock" }
      });

      return new Response(
        JSON.stringify({ 
            init_point: mockInitPoint,
            message: "Modo Sandbox: Redirecionando para sucesso simulado." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actual Mercado Pago API Call
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
        back_urls: {
          success: `${origin}/billing/success`,
          failure: `${origin}/billing/failure`,
          pending: `${origin}/billing/success`
        },
        auto_return: "approved",
        external_reference: `${companyId}:${plan.id}`,
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
        payload: { preference_id: mpData.id, init_point: mpData.init_point }
    });

    return new Response(
      JSON.stringify({ init_point: mpData.init_point }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
