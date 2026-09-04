// Mercado Pago webhook — public endpoint. Validates x-signature HMAC, idempotent,
// rate-limited per IP. Never trusts payload fields beyond what MP signs.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";
import { rateLimit, clientIp, makeAdmin, corsHeaders, jsonResponse, HttpError } from "../_shared/auth.ts";

// MP signs: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" with HMAC-SHA256 (secret = webhook secret)
// Header `x-signature: ts=<ts>,v1=<hex>`
async function verifyMpSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("[MP_WEBHOOK] MERCADO_PAGO_WEBHOOK_SECRET not set — refusing webhook");
    return false;
  }
  const sigHeader = req.headers.get("x-signature") || "";
  const reqId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.trim().split("=").map((x) => x.trim()))
  ) as Record<string, string>;
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // timing-safe compare
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = makeAdmin();

  try {
    // Rate limit per IP (webhook abuse protection) — generous but bounded
    await rateLimit(admin, `ip:${clientIp(req)}`, "mercado-pago-webhook", 120, 60);

    const body = await req.json().catch(() => ({}));
    const resourceId = String(body?.data?.id ?? body?.id ?? "");
    const topic: string = body?.type || body?.topic || "";

    // ALWAYS log raw receipt (even before signature check) for audit
    await admin.from("payment_logs").insert({
      event_type: "webhook_received",
      status: "received",
      payload: body,
      message: `Webhook received for ${topic}: ${resourceId}`,
    });

    if (!resourceId) return jsonResponse({ received: true });

    // Verify signature BEFORE acting on the payload
    const ok = await verifyMpSignature(req, resourceId);
    if (!ok) {
      await admin.from("payment_logs").insert({
        event_type: "webhook_signature_invalid",
        status: "rejected",
        payload: body,
        message: `Signature invalid for ${topic}:${resourceId}`,
      });
      return jsonResponse({ error: "invalid_signature" }, 401);
    }

    if (topic !== "payment") return jsonResponse({ received: true });

    // Fetch the real payment from MP (never trust amount/status from payload)
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) return jsonResponse({ error: "mp_token_missing" }, 500);

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) {
      const txt = await r.text();
      await admin.from("payment_logs").insert({
        event_type: "mp_fetch_failed", status: "error",
        payload: { resourceId, status: r.status, body: txt },
      });
      return jsonResponse({ error: "mp_fetch_failed" }, 502);
    }
    const paymentData = await r.json();

    // Parsing do external_reference (suporta formato org:plan:cycle ou JSON)
    let companyId = "";
    let planId = "";
    let billingCycle = "monthly";

    const rawRef = String(paymentData.external_reference || "");
    if (rawRef.startsWith("{") && rawRef.endsWith("}")) {
      try {
        const parsed = JSON.parse(rawRef);
        companyId = parsed.organization_id || parsed.company_id || "";
        planId = parsed.plan_id || "";
        billingCycle = parsed.billing_cycle || "monthly";
      } catch {
        // Fallback
      }
    }

    if (!companyId) {
      const parts = rawRef.split(":");
      companyId = parts[0] || "";
      planId = parts[1] || "";
      if (parts[2]) {
        billingCycle = parts[2].toLowerCase() === "annual" ? "annual" : "monthly";
      }
    }

    if (!companyId || !planId) return jsonResponse({ received: true });

    // Prevenção de chave órfã: valida se a empresa realmente existe no Supabase
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (!company) {
      console.error("[MP_WEBHOOK] Chave órfã evitada! Empresa não encontrada no Supabase:", companyId);
      await admin.from("payment_logs").insert({
        company_id: companyId,
        event_type: "orphan_payment_prevented",
        status: "error",
        payload: { payment_id: paymentData.id, external_reference: paymentData.external_reference },
        message: `Pagamento ${paymentData.id} com company_id inexistente: ${companyId}`,
      });
      return jsonResponse({ received: true, warning: "orphan_company_prevented" });
    }

    // Idempotency — same payment id processed once
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("mercado_pago_payment_id", String(paymentData.id))
      .maybeSingle();
    if (existing) return jsonResponse({ received: true, deduplicated: true });

    if (paymentData.status === "approved") {
      let { data: plan } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
      if (!plan) {
        // Tenta buscar por slug caso planId seja o slug
        const { data: planBySlug } = await admin.from("plans").select("*").eq("slug", planId).maybeSingle();
        if (planBySlug) plan = planBySlug;
      }

      const effectivePlanId = plan?.id || planId;
      
      // Cálculo da vigência conforme o ciclo: Anual (+365 dias) ou Mensal (+30 dias)
      const periodEnd = new Date();
      if (billingCycle === "annual") {
        periodEnd.setDate(periodEnd.getDate() + 365);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }

      await admin.from("subscriptions").upsert({
        company_id: companyId, 
        plan_id: effectivePlanId, 
        status: "active",
        mercado_pago_subscription_id: String(paymentData.id),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" });

      // Atualiza status da empresa para ativo
      await admin.from("companies").update({
        billing_status: "active",
        plan: effectivePlanId,
        plan_id: effectivePlanId,
        updated_at: new Date().toISOString(),
      }).eq("id", companyId);

      await admin.from("payments").insert({
        company_id: companyId,
        mercado_pago_payment_id: String(paymentData.id),
        amount: paymentData.transaction_amount,
        status: "approved",
        payment_method: paymentData.payment_method_id,
        paid_at: new Date().toISOString(),
        metadata: paymentData,
      });

      await admin.from("payment_logs").insert({
        company_id: companyId, event_type: "payment_approved", status: "success",
        payload: { payment_id: paymentData.id, plan_id: planId },
        message: `Assinatura ativada para empresa ${companyId}`,
      });
    } else {
      await admin.from("payment_logs").insert({
        company_id: companyId,
        event_type: "payment_rejected", status: "rejected",
        payload: paymentData,
        message: `Pagamento ${resourceId} com status: ${paymentData.status}`,
      });
    }

    return jsonResponse({ received: true });
  } catch (error: any) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status);
    console.error("Webhook error:", error);
    return jsonResponse({ error: error?.message ?? String(error) }, 400);
  }
});
