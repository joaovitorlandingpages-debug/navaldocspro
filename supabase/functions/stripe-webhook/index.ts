import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/**
 * Validação criptográfica de assinatura Stripe usando corpo raw e HMAC-SHA256 (Web Crypto nativo).
 * Previne ataques de repetição com validação de timestamp (tolerância padrão de 300s).
 */
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<{ valid: boolean; reason?: string }> {
  if (!signatureHeader) return { valid: false, reason: "missing_header" };

  const items = signatureHeader.split(",").map(i => i.trim());
  let timestamp = "";
  const signatures: string[] = [];

  for (const item of items) {
    const [k, ...vParts] = item.split("=");
    const v = vParts.join("=");
    if (k === "t") timestamp = v;
    else if (k === "v1") signatures.push(v);
  }

  if (!timestamp || signatures.length === 0) {
    return { valid: false, reason: "invalid_header_format" };
  }

  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  // Proteção contra replay attacks
  if (toleranceSeconds > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tsNum) > toleranceSeconds) {
      return { valid: false, reason: "timestamp_out_of_tolerance" };
    }
  }

  try {
    const encoder = new TextEncoder();
    const payload = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const hashArray = Array.from(new Uint8Array(sigBuffer));
    const expectedHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Comparação em tempo constante para mitigar timing attacks
    const isValid = signatures.some(sig => {
      if (sig.length !== expectedHex.length) return false;
      let diff = 0;
      for (let i = 0; i < sig.length; i++) {
        diff |= sig.charCodeAt(i) ^ expectedHex.charCodeAt(i);
      }
      return diff === 0;
    });

    return isValid ? { valid: true } : { valid: false, reason: "signature_mismatch" };
  } catch (err: any) {
    return { valid: false, reason: err.message || "crypto_error" };
  }
}

/**
 * Extrai identificador (string ou id de objeto expandido)
 */
function extractId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "object" && val !== null && "id" in val && typeof (val as any).id === "string") {
    const trimmed = (val as any).id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/**
 * Extrai o ID da assinatura da Invoice de forma compatível com ambas as versões da API Stripe:
 * 1. Moderna (Stripe 2025+ e 2026-08-26.dahlia):
 *    - invoice.parent.type === "subscription_details" -> invoice.parent.subscription_details.subscription
 *    - invoice.parent.subscription_details.subscription (string ou objeto expandido)
 * 2. Legada (pré-2025):
 *    - invoice.subscription (string ou objeto expandido)
 * 
 * NOTA: Não usa a primeira linha da fatura sem confirmação de vínculo com a assinatura.
 */
function extractSubscriptionIdFromInvoice(invoice: any): string | null {
  if (!invoice || typeof invoice !== "object") return null;

  // 1. Formato Moderno Stripe (2025+ e 2026-08-26.dahlia)
  if (invoice.parent && typeof invoice.parent === "object") {
    const details = invoice.parent.subscription_details;
    if (details && typeof details === "object" && details.subscription) {
      const subId = extractId(details.subscription);
      if (subId) return subId;
    }
  }

  // 2. Formato Legado (campo subscription na raiz do invoice)
  if (invoice.subscription) {
    const subId = extractId(invoice.subscription);
    if (subId) return subId;
  }

  return null;
}

/**
 * Extrai o ID do cliente (string ou objeto expandido)
 */
function extractCustomerId(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.customer) return extractId(obj.customer);
  if (obj.customer_id) return extractId(obj.customer_id);
  return null;
}

/**
 * Consulta a assinatura na API da Stripe para obter o status real
 * (ex: 'trialing', 'active', 'past_due', 'canceled')
 */
async function fetchStripeSubscription(subscriptionId: string | null, secretKey?: string | null): Promise<any | null> {
  if (!subscriptionId || !secretKey) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: {
        "Authorization": `Bearer ${secretKey}`
      }
    });
    if (!res.ok) {
      console.warn(`Não foi possível consultar assinatura Stripe ${subscriptionId}: status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Erro ao consultar assinatura Stripe ${subscriptionId}:`, err);
    return null;
  }
}

/**
 * Stripe Webhook Edge Function
 * - Suporte oficial à versão moderna 2026-08-26.dahlia e retrocompatibilidade com versões legadas
 * - Validação criptográfica da assinatura Stripe-Signature com proteção de replay
 * - Processamento idempotente de checkout, fatura, atualização e cancelamento
 * - Diferenciação precisa de status: pago, trial real e cupom de 100% / fatura zerada
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

  let eventId = "unknown";
  let eventType = "unknown";

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

    // Validação criptográfica da assinatura Stripe
    const sigCheck = await verifyStripeSignature(rawBody, signature, webhookSecret, 300);
    if (!sigCheck.valid) {
      console.error(`Assinatura Stripe inválida: ${sigCheck.reason}`);
      return new Response(
        JSON.stringify({ error: "invalid_signature", message: `Validação criptográfica falhou: ${sigCheck.reason}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Leitura segura do JSON do evento
    const event = JSON.parse(rawBody);
    eventId = event.id;
    eventType = event.type;

    // 1. Idempotência: verifica se o evento já foi processado com sucesso anteriormente
    const { data: existingLog } = await supabase
      .from("payment_logs")
      .select("id")
      .eq("event_type", `stripe_${eventType}`)
      .eq("status", "success")
      .contains("payload", { eventId })
      .maybeSingle();

    if (existingLog) {
      console.log(`Evento Stripe duplicado ignorado de forma idempotente: ${eventId}`);
      return new Response(JSON.stringify({ received: true, idempotent_skip: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Processamento dos eventos configurados
    switch (eventType) {
      // -------------------------------------------------------------
      // EVENTO 1: checkout.session.completed
      // -------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id || (session.client_reference_id ? session.client_reference_id.split(":")[0] : null);
        const planSlug = session.metadata?.plan_slug || (session.client_reference_id ? session.client_reference_id.split(":")[1] : null);
        const billingCycle = session.metadata?.billing_cycle || "monthly";
        const customerId = extractCustomerId(session);
        const subscriptionId = extractId(session.subscription);

        if (companyId) {
          // Busca o plano no catálogo pelo slug
          const { data: plan } = await supabase
            .from("plans")
            .select("id, name")
            .eq("slug", planSlug)
            .maybeSingle();

          // Diferenciação de status:
          // - "paid": pagamento confirmado de imediato -> status 'active'
          // - "no_payment_required": pode ser teste gratuito (trial) OU cupom de 100% / fatura zerada.
          //   Consulta o status real da assinatura na Stripe para definir com precisão entre 'trialing' ou 'active'.
          // - outros ("unpaid", aguardando confirmação assíncrona): status 'pending' (não ativa empresa ainda)
          let subStatus = "pending";
          let activateCompany = false;

          if (session.payment_status === "paid") {
            subStatus = "active";
            activateCompany = true;
          } else if (session.payment_status === "no_payment_required") {
            // Verifica se a assinatura veio expandida no payload
            let resolvedStatus: string | null = null;
            if (typeof session.subscription === "object" && session.subscription?.status) {
              resolvedStatus = session.subscription.status;
            }

            // Se não veio expandida, consulta a assinatura diretamente na API da Stripe
            if (!resolvedStatus && subscriptionId && stripeSecretKey) {
              const stripeSub = await fetchStripeSubscription(subscriptionId, stripeSecretKey);
              if (stripeSub?.status) {
                resolvedStatus = stripeSub.status;
              }
            }

            if (resolvedStatus === "trialing") {
              subStatus = "trialing";
            } else if (resolvedStatus === "active") {
              // Cupom de 100% ou fatura zerada em plano ativo
              subStatus = "active";
            } else {
              // Fallback se a consulta remota não estiver disponível
              const hasTrial = Boolean(
                session.subscription_data?.trial_period_days ||
                (typeof session.subscription === "object" && session.subscription?.trial_end)
              );
              subStatus = hasTrial ? "trialing" : "active";
            }
            activateCompany = true;
          } else {
            subStatus = "pending";
            activateCompany = false;
          }

          // Preserva metadados anteriores da assinatura
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("metadata")
            .eq("company_id", companyId)
            .maybeSingle();

          const mergedMetadata = {
            ...(existingSub?.metadata || {}),
            stripe_customer_id: customerId || existingSub?.metadata?.stripe_customer_id,
            stripe_subscription_id: subscriptionId || existingSub?.metadata?.stripe_subscription_id,
            plan_slug: planSlug || existingSub?.metadata?.plan_slug,
            billing_cycle: billingCycle,
            payment_status: session.payment_status,
            checkout_mode: session.mode
          };

          await supabase.from("subscriptions").upsert({
            company_id: companyId,
            plan_id: plan?.id || null,
            status: subStatus,
            metadata: mergedMetadata,
            updated_at: new Date().toISOString()
          }, { onConflict: "company_id" });

          if (activateCompany) {
            await supabase.from("companies").update({
              is_active: true,
              is_pilot: false,
              updated_at: new Date().toISOString()
            }).eq("id", companyId);
          }

          // Se um cupom de desconto foi aplicado no checkout, registra o resgate definitivamente no banco
          const appliedCouponId = session.metadata?.applied_coupon_id;
          if (appliedCouponId && (subStatus === "active" || subStatus === "trialing")) {
            const { data: existingRedemption } = await supabase
              .from("coupon_redemptions")
              .select("id")
              .eq("coupon_id", appliedCouponId)
              .eq("company_id", companyId)
              .maybeSingle();

            if (!existingRedemption) {
              await supabase.from("coupon_redemptions").insert({
                coupon_id: appliedCouponId,
                company_id: companyId,
                metadata: {
                  session_id: session.id,
                  applied_at: new Date().toISOString(),
                  source: "stripe_checkout_completed"
                }
              });

              const { data: coup } = await supabase
                .from("coupons")
                .select("redemption_count")
                .eq("id", appliedCouponId)
                .maybeSingle();

              if (coup) {
                await supabase.from("coupons").update({
                  redemption_count: (coup.redemption_count || 0) + 1,
                  updated_at: new Date().toISOString()
                }).eq("id", appliedCouponId);
              }
            }
          }
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 2: invoice.payment_succeeded (Renovação / Pagamento Aprovado)
      // -------------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
        const customerId = extractCustomerId(invoice);
        const invoiceId = invoice.id;
        const rawAmount = invoice.amount_paid != null ? invoice.amount_paid : (invoice.total || 0);
        const amountPaid = rawAmount / 100;
        const currency = (invoice.currency || "brl").toLowerCase();

        const currentPeriodStart = invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null;
        const currentPeriodEnd = invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null;

        // Localiza a assinatura por metadata.stripe_subscription_id ou company_id em fallback
        let sub: any = null;
        if (subscriptionId) {
          const { data } = await supabase
            .from("subscriptions")
            .select("id, company_id, status, metadata")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();
          sub = data;
        }

        if (!sub && invoice.metadata?.company_id) {
          const { data } = await supabase
            .from("subscriptions")
            .select("id, company_id, status, metadata")
            .eq("company_id", invoice.metadata.company_id)
            .maybeSingle();
          sub = data;
        }

        if (sub?.company_id) {
          // Determina o status da assinatura:
          // Se a fatura é zerada (amountPaid === 0), pode ser:
          // 1. Fatura inicial de período gratuito (trial): a assinatura NÃO deve ser transformada em 'active'! Permanece 'trialing'.
          // 2. Fatura zerada por cupom de 100% ou abatimento integral: assinatura 'active'.
          let targetStatus = "active";

          if (amountPaid === 0) {
            let realSubStatus: string | null = null;
            if (subscriptionId && stripeSecretKey) {
              const stripeSub = await fetchStripeSubscription(subscriptionId, stripeSecretKey);
              if (stripeSub?.status) {
                realSubStatus = stripeSub.status;
              }
            }

            if (realSubStatus === "trialing") {
              // Confirmação oficial da Stripe de que é período gratuito
              targetStatus = "trialing";
            } else if (realSubStatus === "active") {
              // Cupom de 100% ou desconto integral
              targetStatus = "active";
            } else {
              // Fallback: se o banco já registrou como trialing, preserva trialing para não ativar precocemente
              targetStatus = sub.status === "trialing" ? "trialing" : "active";
            }
          } else {
            // Pagamento com valor monetário real recebido (> 0)
            targetStatus = "active";
          }

          // Idempotência na tabela de pagamentos: registra apenas se for valor real e ainda não registrado
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .contains("metadata", { stripe_invoice_id: invoiceId })
            .maybeSingle();

          if (!existingPayment && amountPaid > 0) {
            const paidAt = invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
              : new Date().toISOString();

            await supabase.from("payments").insert({
              company_id: sub.company_id,
              subscription_id: sub.id,
              amount: amountPaid,
              status: "approved",
              payment_method: "credit_card",
              paid_at: paidAt,
              metadata: {
                stripe_invoice_id: invoiceId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                currency: currency,
                billing_reason: invoice.billing_reason
              },
              created_at: new Date().toISOString()
            });
          }

          // Atualiza vigência e status da assinatura preservando trialing se aplicável
          const subUpdate: any = {
            status: targetStatus,
            updated_at: new Date().toISOString()
          };
          if (currentPeriodStart) subUpdate.current_period_start = currentPeriodStart;
          if (currentPeriodEnd) subUpdate.current_period_end = currentPeriodEnd;

          if (subscriptionId && (!sub.metadata?.stripe_subscription_id || !sub.metadata?.stripe_customer_id)) {
            subUpdate.metadata = {
              ...(sub.metadata || {}),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId || sub.metadata?.stripe_customer_id
            };
          }

          await supabase.from("subscriptions").update(subUpdate).eq("company_id", sub.company_id);

          // Garante que o escritório esteja ativo
          await supabase.from("companies").update({
            is_active: true,
            is_pilot: false,
            updated_at: new Date().toISOString()
          }).eq("id", sub.company_id);
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 3: invoice.payment_failed (Falha de Cobrança)
      // -------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
        const customerId = extractCustomerId(invoice);
        const invoiceId = invoice.id;
        const rawDue = invoice.amount_due != null ? invoice.amount_due : (invoice.total || 0);
        const amountDue = rawDue / 100;
        const currency = (invoice.currency || "brl").toLowerCase();

        let sub: any = null;
        if (subscriptionId) {
          const { data } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();
          sub = data;
        }

        if (!sub && invoice.metadata?.company_id) {
          const { data } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .eq("company_id", invoice.metadata.company_id)
            .maybeSingle();
          sub = data;
        }

        if (sub?.company_id) {
          // Registra a recusa na tabela de pagamentos para auditoria
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .contains("metadata", { stripe_invoice_id: invoiceId, failure_recorded: true })
            .maybeSingle();

          if (!existingPayment && amountDue > 0) {
            await supabase.from("payments").insert({
              company_id: sub.company_id,
              subscription_id: sub.id,
              amount: amountDue,
              status: "rejected",
              payment_method: "credit_card",
              metadata: {
                stripe_invoice_id: invoiceId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                currency: currency,
                failure_recorded: true,
                attempt_count: invoice.attempt_count,
                next_payment_attempt: invoice.next_payment_attempt,
                failure_message: invoice.last_finalization_error?.message || "Pagamento recusado"
              },
              created_at: new Date().toISOString()
            });
          }

          // Atualiza status da assinatura para past_due
          await supabase.from("subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString()
          }).eq("company_id", sub.company_id);
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 4: customer.subscription.updated (Alteração de Status / Vigência)
      // -------------------------------------------------------------
      case "customer.subscription.updated": {
        const subObj = event.data.object;
        const subscriptionId = extractId(subObj.id);
        const customerId = extractCustomerId(subObj);
        const stripeStatus = subObj.status;
        const cancelAtPeriodEnd = Boolean(subObj.cancel_at_period_end);

        // Mapeamento seguro de status conforme enum do banco (active, trialing, past_due, canceled, pending)
        let mappedStatus = "pending";
        switch (stripeStatus) {
          case "active":
            mappedStatus = "active";
            break;
          case "trialing":
            mappedStatus = "trialing";
            break;
          case "past_due":
          case "unpaid":
            mappedStatus = "past_due";
            break;
          case "canceled":
          case "incomplete_expired":
            mappedStatus = "canceled";
            break;
          case "incomplete":
          case "paused":
          default:
            mappedStatus = "pending";
            break;
        }

        const currentPeriodStart = subObj.current_period_start
          ? new Date(subObj.current_period_start * 1000).toISOString()
          : null;
        const currentPeriodEnd = subObj.current_period_end
          ? new Date(subObj.current_period_end * 1000).toISOString()
          : null;

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();

          if (sub?.company_id) {
            const updateData: any = {
              status: mappedStatus,
              cancel_at_period_end: cancelAtPeriodEnd,
              updated_at: new Date().toISOString()
            };
            if (currentPeriodStart) updateData.current_period_start = currentPeriodStart;
            if (currentPeriodEnd) updateData.current_period_end = currentPeriodEnd;

            updateData.metadata = {
              ...(sub.metadata || {}),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId || sub.metadata?.stripe_customer_id,
              stripe_status: stripeStatus,
              cancel_at_period_end: cancelAtPeriodEnd
            };

            await supabase.from("subscriptions").update(updateData).eq("company_id", sub.company_id);

            if (mappedStatus === "active" || mappedStatus === "trialing") {
              await supabase.from("companies").update({
                is_active: true,
                updated_at: new Date().toISOString()
              }).eq("id", sub.company_id);
            } else if (mappedStatus === "canceled") {
              await supabase.from("companies").update({
                is_active: false,
                updated_at: new Date().toISOString()
              }).eq("id", sub.company_id);
            }
          }
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 5: customer.subscription.deleted (Cancelamento Efetivado)
      // -------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subObj = event.data.object;
        const subscriptionId = extractId(subObj.id);

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .contains("metadata", { stripe_subscription_id: subscriptionId })
            .maybeSingle();

          if (sub?.company_id) {
            await supabase.from("subscriptions").update({
              status: "canceled",
              cancel_at_period_end: false,
              metadata: {
                ...(sub.metadata || {}),
                canceled_at: new Date().toISOString(),
                stripe_status: "canceled"
              },
              updated_at: new Date().toISOString()
            }).eq("company_id", sub.company_id);

            await supabase.from("companies").update({
              is_active: false,
              updated_at: new Date().toISOString()
            }).eq("id", sub.company_id);
          }
        }
        break;
      }

      default:
        console.log(`Evento Stripe não manipulado diretamente: ${eventType}`);
    }

    // 3. Log de auditoria persistido com status "success"
    await supabase.from("payment_logs").insert({
      event_type: `stripe_${eventType}`,
      status: "success",
      payload: { eventId, type: eventType, data: event.data?.object }
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Erro no processamento do webhook Stripe:", err);

    // Registra falha na tabela de auditoria se possível, para rastreabilidade
    try {
      await supabase.from("payment_logs").insert({
        event_type: `stripe_${eventType || "unknown"}`,
        status: "error",
        error_message: err.message || "Erro desconhecido",
        payload: { eventId, type: eventType, error: err.stack || err.message }
      });
    } catch (_logErr) {
      // Ignora erro de inserção de log secundário
    }

    // Retorna HTTP 500 para o Stripe efetuar retentativas automáticas
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
