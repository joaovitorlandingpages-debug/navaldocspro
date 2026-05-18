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
    const { plan_id, company_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      throw new Error("Plano não encontrado");
    }

    // Mercado Pago integration would happen here
    // For now, we simulate the checkout URL creation
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate calling Mercado Pago API
    // const response = await fetch("https://api.mercadopago.com/checkout/preferences", { ... })
    
    // Returning a mock URL for now as per instructions to prepare structure
    const checkoutUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock_pref_${Date.now()}`;

    return new Response(
      JSON.stringify({ checkoutUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
