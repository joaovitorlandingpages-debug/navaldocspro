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
    console.log("MP_WEBHOOK_OK");
    const body = await req.json();

    console.log("Webhook received:", body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get event details
    // Mercado Pago sends different structures based on the notification type
    const resourceId = body.data?.id || body.id;
    const topic = body.type || body.topic;

    // Log the webhook reception
    await supabase.from("payment_logs").insert({
        event_type: "webhook_received",
        status: "received",
        payload: body,
        message: `Webhook received for ${topic}: ${resourceId}`
    });

    if (topic === "payment" && resourceId) {
        const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
        
        let paymentData;
        
        if (!accessToken) {
            console.log("MERCADO_PAGO_ACCESS_TOKEN not set, simulating payment verification.");
            // In sandbox/dev without token, we might get a simulated payment ID
            paymentData = {
                id: resourceId,
                status: "approved",
                external_reference: body.external_reference || "mock_company_id:mock_plan_id",
                transaction_amount: 100,
                payment_method_id: "credit_card"
            };
        } else {
            // Fetch real payment details from Mercado Pago
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });
            paymentData = await response.json();
        }

        if (paymentData.status === "approved") {
            const [companyId, planId] = (paymentData.external_reference || "").split(":");
            
            if (companyId && planId) {
                // 1. Update/Create Subscription
                const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
                
                if (plan) {
                    const currentPeriodEnd = new Date();
                    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

                    const { error: subError } = await supabase.from("subscriptions").upsert({
                        company_id: companyId,
                        plan_id: planId,
                        status: "active",
                        mercado_pago_subscription_id: paymentData.id.toString(),
                        current_period_start: new Date().toISOString(),
                        current_period_end: currentPeriodEnd.toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'company_id' });

                    if (subError) console.error("Error updating subscription:", subError);

                    // 2. Log Payment
                    await supabase.from("payments").insert({
                        company_id: companyId,
                        subscription_id: null, // Link if needed
                        mercado_pago_payment_id: paymentData.id.toString(),
                        amount: paymentData.transaction_amount,
                        status: "approved",
                        payment_method: paymentData.payment_method_id,
                        paid_at: new Date().toISOString(),
                        metadata: paymentData
                    });

                    // 3. Log Success
                    await supabase.from("payment_logs").insert({
                        company_id: companyId,
                        event_type: "payment_approved",
                        status: "success",
                        payload: { payment_id: paymentData.id, plan_id: planId },
                        message: `Assinatura ativada para empresa ${companyId}`
                    });
                }
            }
        } else {
             await supabase.from("payment_logs").insert({
                event_type: "payment_rejected",
                status: "rejected",
                payload: paymentData,
                message: `Pagamento ${resourceId} com status: ${paymentData.status}`
            });
        }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
