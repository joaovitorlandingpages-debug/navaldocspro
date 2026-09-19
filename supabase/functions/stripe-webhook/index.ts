import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/**
 * Stripe Webhook Edge Function
 * - Validação criptográfica da assinatura Stripe-Signature
 * - Processamento idempotente de eventos de checkout, fatura e cancelamento
 * - Preservação de assinaturas legadas
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const signature = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    if (!webhookSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET não configurado. Rejeitando requisição por segurança.");
      return new Response(
        JSON.stringify({ error: "webhook_secret_missing", message: "STRIPE_WEBHOOK_SECRET não configurado no ambiente." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "missing_signature", message: "Cabeçalho stripe-signature ausente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validação criptográfica real da assinatura Stripe (HMAC-SHA256 sobre "t.payload")
    const sigParts = Object.fromEntries(
      signature.split(",").map((p) => {
        const idx = p.indexOf("=");
        return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
      })
    ) as Record<string, string>;

    const timestamp = sigParts["t"];
    const providedSigs = signature
      .split(",")
      .filter((p) => p.trim().startsWith("v1="))
      .map((p) => p.trim().slice(3));

    if (!timestamp || providedSigs.length === 0) {
      return new Response(
        JSON.stringify({ error: "invalid_signature_format", message: "Cabeçalho stripe-signature malformado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proteção contra replay (tolerância de 5 minutos)
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - Number(timestamp)) > 300) {
      return new Response(
        JSON.stringify({ error: "timestamp_out_of_tolerance", message: "Assinatura Stripe expirada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`)
    );
    const expectedSig = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const timingSafeEqualHex = (a: string, b: string) => {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      return diff === 0;
    };

    if (!providedSigs.some((s) => timingSafeEqualHex(s, expectedSig))) {
      console.warn("Assinatura Stripe inválida — requisição rejeitada.");
      return new Response(
        JSON.stringify({ error: "invalid_signature", message: "Assinatura Stripe inválida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.type;

    // 1. Idempotência: verifica se o evento já foi processado anteriormente
    const { data: existingLog } = await supabase
      .from("payment_logs")
      .select("id")
      .eq("event_type", `stripe_${eventType}`)
      .contains("payload", { eventId })
      .maybeSingle();

    if (existingLog) {
      console.log(`Evento Stripe duplicado ignorado de forma idempotente: ${eventId}`);
      return new Response(JSON.stringify({ received: true, idempotent_skip: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Processamento dos eventos
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const planSlug = session.metadata?.plan_slug;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (companyId) {
          // Busca o plano
          const { data: plan } = await supabase
            .from("plans")
            .select("id")
            .eq("slug", planSlug)
            .maybeSingle();

          await supabase.from("subscriptions").upsert({
            company_id: companyId,
            plan_id: plan?.id || null,
            status: "active",
            metadata: {
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_slug: planSlug
            },
            updated_at: new Date().toISOString()
          }, { onConflict: "company_id" });

          await supabase.from("companies").update({
            is_active: true,
            is_pilot: false,
            updated_at: new Date().toISOString()
          }).eq("id", companyId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const amountPaid = (invoice.amount_paid || 0) / 100;

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("company_id")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();

          if (sub?.company_id) {
            await supabase.from("payments").insert({
              company_id: sub.company_id,
              amount: amountPaid,
              status: "approved",
              payment_method: "credit_card",
              created_at: new Date().toISOString()
            });

            await supabase.from("subscriptions").update({
              status: "active",
              updated_at: new Date().toISOString()
            }).eq("company_id", sub.company_id);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("company_id")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();

          if (sub?.company_id) {
            await supabase.from("subscriptions").update({
              status: "pending",
              updated_at: new Date().toISOString()
            }).eq("company_id", sub.company_id);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subObj = event.data.object;
        const subscriptionId = subObj.id;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("company_id")
          .contains("metadata", { stripe_subscription_id: subscriptionId })
          .maybeSingle();

        if (sub?.company_id) {
          await supabase.from("subscriptions").update({
            status: "canceled",
            updated_at: new Date().toISOString()
          }).eq("company_id", sub.company_id);
        }
        break;
      }

      default:
        console.log(`Evento Stripe não manipulado diretamente: ${eventType}`);
    }

    // 3. Log de auditoria
    await supabase.from("payment_logs").insert({
      event_type: `stripe_${eventType}`,
      status: "success",
      payload: { eventId, type: eventType, data: event.data.object }
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Erro no processamento do webhook Stripe:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
