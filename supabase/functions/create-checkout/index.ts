import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, origin } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from auth header
    const authHeader = req.headers.get("Authorization");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));
    
    if (authError || !user) throw new Error("Não autorizado");

    const companyId = user.user_metadata?.company_id;
    if (!companyId) throw new Error("Empresa não vinculada ao usuário");

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
    
    if (!accessToken) {
      // For development, if token is not set, return a mock success
      return new Response(
        JSON.stringify({ 
            init_point: `${origin}/billing/success`,
            message: "MERCADO_PAGO_ACCESS_TOKEN não configurado. Redirecionando para sucesso (modo dev)." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mercado Pago API Call (Actual Implementation Example)
    /*
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{
          title: `Plano NavalDocs Pro: ${plan.name}`,
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
    return new Response(JSON.stringify({ init_point: mpData.init_point }), { status: 200, ... });
    */

    // Returning simulated checkout for now
    return new Response(
      JSON.stringify({ init_point: `${origin}/billing/success` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

