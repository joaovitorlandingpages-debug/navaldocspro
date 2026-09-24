import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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

function extractSubscriptionIdFromInvoice(invoice: any): string | null {
  if (!invoice || typeof invoice !== "object") return null;

  if (invoice.parent && typeof invoice.parent === "object") {
    const details = invoice.parent.subscription_details;
    if (details && typeof details === "object" && details.subscription) {
      const subId = extractId(details.subscription);
      if (subId) return subId;
    }
  }

  if (invoice.subscription) {
    const subId = extractId(invoice.subscription);
    if (subId) return subId;
  }

  return null;
}

function extractCustomerId(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.customer) return extractId(obj.customer);
  if (obj.customer_id) return extractId(obj.customer_id);
  return null;
}

async function fetchStripeSubscription(subscriptionId: string | null, secretKey?: string | null): Promise<any | null> {
  if (!subscriptionId || !secretKey) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
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
      console.error("STRIPE_WEBHOOK_SECRET não configurado.");
      return new Response(
        JSON.stringify({ error: "webhook_secret_missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "missing_signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sigCheck = await verifyStripeSignature(rawBody, signature, webhookSecret, 300);
    if (!sigCheck.valid) {
      console.error(`Assinatura Stripe inválida: ${sigCheck.reason}`);
      return new Response(
        JSON.stringify({ error: "invalid_signature", reason: sigCheck.reason }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(rawBody);
    eventId = event.id;
    eventType = event.type;

    // 1. Idempotência por evento
    const { data: existingLog, error: logCheckErr } = await supabase
      .from("payment_logs")
      .select("id")
      .eq("event_type", `stripe_${eventType}`)
      .eq("status", "success")
      .contains("payload", { eventId })
      .maybeSingle();

    if (logCheckErr) {
      throw new Error(`Falha no banco ao verificar idempotência: ${logCheckErr.message}`);
    }

    if (existingLog) {
      console.log(`Evento Stripe duplicado ignorado de forma idempotente: ${eventId}`);
      return new Response(JSON.stringify({ received: true, idempotent_skip: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Processamento dos eventos
    switch (eventType) {
      // -------------------------------------------------------------
      // EVENTO 1: checkout.session.completed
      // -------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id || (session.client_reference_id ? session.client_reference_id.split(":")[0] : null);
        const planSlug = session.metadata?.plan_id || session.metadata?.plan_slug || (session.client_reference_id ? session.client_reference_id.split(":")[1] : null);
        const billingCycle = session.metadata?.billing_cycle || "monthly";
        const customerId = extractCustomerId(session);
        const subscriptionId = extractId(session.subscription);
        const couponId = session.metadata?.coupon_id || null;
        const preSessionId = session.metadata?.pre_session_id || null;

        if (companyId) {
          const { data: plan } = await supabase
            .from("plans")
            .select("id, name")
            .or(`slug.eq.${planSlug},id.eq.${planSlug}`)
            .maybeSingle();

          let subStatus = "pending";
          let activateCompany = false;
          let stripeTrialEndIso: string | null = null;

          // Se houver assinatura vinculada, obtém detalhes completos da Stripe
          let stripeSubObj: any = null;
          if (typeof session.subscription === "object" && session.subscription !== null) {
            stripeSubObj = session.subscription;
          } else if (subscriptionId && stripeSecretKey) {
            stripeSubObj = await fetchStripeSubscription(subscriptionId, stripeSecretKey);
          }

          if (stripeSubObj?.trial_end) {
            stripeTrialEndIso = new Date(stripeSubObj.trial_end * 1000).toISOString();
          }

          if (session.payment_status === "paid") {
            subStatus = "active";
            activateCompany = true;
          } else if (session.payment_status === "no_payment_required") {
            if (stripeSubObj?.status === "trialing") {
              subStatus = "trialing";
            } else if (stripeSubObj?.status === "active") {
              subStatus = "active";
            } else {
              subStatus = stripeTrialEndIso ? "trialing" : "active";
            }
            activateCompany = true;
          }

          const { data: existingSub, error: findSubErr } = await supabase
            .from("subscriptions")
            .select("id, metadata")
            .eq("company_id", companyId)
            .maybeSingle();

          if (findSubErr) {
            throw new Error(`Falha ao consultar assinatura existente: ${findSubErr.message}`);
          }

          const mergedMetadata = {
            ...(existingSub?.metadata || {}),
            stripe_customer_id: customerId || existingSub?.metadata?.stripe_customer_id,
            stripe_subscription_id: subscriptionId || existingSub?.metadata?.stripe_subscription_id,
            plan_slug: planSlug || existingSub?.metadata?.plan_slug,
            billing_cycle: billingCycle,
            payment_status: session.payment_status,
            checkout_mode: session.mode,
            stripe_trial_end: stripeTrialEndIso || undefined
          };

          const subUpsertData: any = {
            company_id: companyId,
            plan_id: plan?.id || null,
            status: subStatus,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            billing_cycle: billingCycle,
            metadata: mergedMetadata,
            updated_at: new Date().toISOString()
          };

          if (stripeTrialEndIso) {
            subUpsertData.trial_ends_at = stripeTrialEndIso;
          }

          const { error: upsertErr } = await supabase
            .from("subscriptions")
            .upsert(subUpsertData, { onConflict: "company_id" });

          if (upsertErr) {
            throw new Error(`Falha ao persistir assinatura no banco: ${upsertErr.message}`);
          }

          if (activateCompany) {
            const companyUpdateData: any = {
              is_active: true,
              is_pilot: false,
              stripe_customer_id: customerId || undefined,
              updated_at: new Date().toISOString()
            };

            if (stripeTrialEndIso) {
              companyUpdateData.trial_ends_at = stripeTrialEndIso;
            }

            const { error: compErr } = await supabase
              .from("companies")
              .update(companyUpdateData)
              .eq("id", companyId);

            if (compErr) {
              throw new Error(`Falha ao ativar empresa: ${compErr.message}`);
            }
          }

          // Confirmação atômica de resgate de cupom
          // Verifica cupom em metadata ou inserido via checkout da Stripe
          let effectiveCouponId = couponId;
          if (!effectiveCouponId) {
            const rawDiscount = session.total_details?.breakdown?.discounts?.[0]?.discount || session.discount;
            const stripePromoId = rawDiscount?.promotion_code;
            const stripeCoupId = rawDiscount?.coupon?.id || rawDiscount?.coupon;

            if (stripePromoId || stripeCoupId) {
              const { data: dbCoup } = await supabase
                .from("coupons")
                .select("id")
                .or(`stripe_promotion_code_id.eq.${stripePromoId || 'none'},stripe_coupon_id.eq.${stripeCoupId || 'none'}`)
                .maybeSingle();

              if (dbCoup?.id) {
                effectiveCouponId = dbCoup.id;
              }
            }
          }

          if (effectiveCouponId || preSessionId || session.id) {
            const { data: confirmRes, error: rpcErr } = await supabase.rpc("confirm_discount_coupon_redemption", {
              p_session_id: session.id,
              p_company_id: companyId,
              p_coupon_id: effectiveCouponId ? effectiveCouponId : null,
              p_metadata: {
                pre_session_id: preSessionId,
                stripe_session_id: session.id,
                payment_status: session.payment_status,
                applied_at: new Date().toISOString()
              }
            });

            if (rpcErr) {
              throw new Error(`Erro na RPC confirm_discount_coupon_redemption: ${rpcErr.message}`);
            }

            if (confirmRes && !confirmRes.success && confirmRes.error !== "reservation_not_found") {
              throw new Error(`Falha na validação do cupom no webhook: ${confirmRes.error}`);
            }
          }
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 2: invoice.payment_succeeded
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

        let sub: any = null;
        if (subscriptionId) {
          const { data, error } = await supabase
            .from("subscriptions")
            .select("id, company_id, status, metadata")
            .or(`stripe_subscription_id.eq.${subscriptionId},metadata->>stripe_subscription_id.eq.${subscriptionId}`)
            .maybeSingle();

          if (error) console.warn("Erro ao buscar sub por subscriptionId:", error);
          sub = data;
        }

        if (!sub && invoice.metadata?.company_id) {
          const { data, error } = await supabase
            .from("subscriptions")
            .select("id, company_id, status, metadata")
            .eq("company_id", invoice.metadata.company_id)
            .maybeSingle();

          if (error) console.warn("Erro ao buscar sub por company_id:", error);
          sub = data;
        }

        // Se a assinatura não foi encontrada (evento chegou antes do checkout.session.completed),
        // retorna HTTP 500 para o Stripe reenviar o evento em seguida sem perder o processamento.
        if (!sub?.company_id) {
          throw new Error(`Assinatura não localizada para o invoice ${invoiceId} (subscriptionId: ${subscriptionId}). Reenviando.`);
        }

        let targetStatus = "active";
        let stripeTrialEndIso: string | null = null;

        if (amountPaid === 0) {
          let realSubStatus: string | null = null;
          if (subscriptionId && stripeSecretKey) {
            const stripeSub = await fetchStripeSubscription(subscriptionId, stripeSecretKey);
            if (stripeSub?.status) {
              realSubStatus = stripeSub.status;
            }
            if (stripeSub?.trial_end) {
              stripeTrialEndIso = new Date(stripeSub.trial_end * 1000).toISOString();
            }
          }

          if (realSubStatus === "trialing") {
            targetStatus = "trialing";
          } else if (realSubStatus === "active") {
            targetStatus = "active";
          } else {
            targetStatus = sub.status === "trialing" ? "trialing" : "active";
          }
        } else {
          targetStatus = "active";
        }

        // Transição correta: se já houver registro com status 'rejected', atualiza para 'approved'
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id, status")
          .contains("metadata", { stripe_invoice_id: invoiceId })
          .maybeSingle();

        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString();

        if (existingPayment) {
          if (existingPayment.status === "rejected" && amountPaid > 0) {
            const { error: payUpErr } = await supabase
              .from("payments")
              .update({
                status: "approved",
                paid_at: paidAt,
                amount: amountPaid,
                metadata: {
                  stripe_invoice_id: invoiceId,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                  currency: currency,
                  status_transition: "rejected_to_approved",
                  billing_reason: invoice.billing_reason
                }
              })
              .eq("id", existingPayment.id);

            if (payUpErr) {
              throw new Error(`Falha ao atualizar pagamento de rejected para approved: ${payUpErr.message}`);
            }
          }
        } else if (amountPaid > 0) {
          const { error: payErr } = await supabase.from("payments").insert({
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

          if (payErr) {
            throw new Error(`Falha ao registrar pagamento no banco: ${payErr.message}`);
          }
        }

        const subUpdate: any = {
          status: targetStatus,
          stripe_subscription_id: subscriptionId || undefined,
          stripe_customer_id: customerId || undefined,
          updated_at: new Date().toISOString()
        };
        if (currentPeriodStart) subUpdate.current_period_start = currentPeriodStart;
        if (currentPeriodEnd) subUpdate.current_period_end = currentPeriodEnd;
        if (stripeTrialEndIso) subUpdate.trial_ends_at = stripeTrialEndIso;

        subUpdate.metadata = {
          ...(sub.metadata || {}),
          stripe_subscription_id: subscriptionId || sub.metadata?.stripe_subscription_id,
          stripe_customer_id: customerId || sub.metadata?.stripe_customer_id
        };

        const { error: subUpErr } = await supabase
          .from("subscriptions")
          .update(subUpdate)
          .eq("company_id", sub.company_id);

        if (subUpErr) {
          throw new Error(`Falha ao atualizar vigência da assinatura: ${subUpErr.message}`);
        }

        const companyUpdateData: any = {
          is_active: true,
          is_pilot: false,
          updated_at: new Date().toISOString()
        };
        if (stripeTrialEndIso) {
          companyUpdateData.trial_ends_at = stripeTrialEndIso;
        }

        const { error: compUpErr } = await supabase
          .from("companies")
          .update(companyUpdateData)
          .eq("id", sub.company_id);

        if (compUpErr) {
          throw new Error(`Falha ao ativar empresa após pagamento: ${compUpErr.message}`);
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 3: invoice.payment_failed
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
            .or(`stripe_subscription_id.eq.${subscriptionId},metadata->>stripe_subscription_id.eq.${subscriptionId}`)
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
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .contains("metadata", { stripe_invoice_id: invoiceId })
            .maybeSingle();

          if (!existingPayment && amountDue > 0) {
            const { error: payErr } = await supabase.from("payments").insert({
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

            if (payErr) {
              console.error("Erro ao registrar recusa de pagamento:", payErr);
            }
          }

          const { error: subUpErr } = await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString()
            })
            .eq("company_id", sub.company_id);

          if (subUpErr) {
            throw new Error(`Falha ao atualizar status para past_due: ${subUpErr.message}`);
          }
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 4: customer.subscription.updated
      // -------------------------------------------------------------
      case "customer.subscription.updated": {
        const subObj = event.data.object;
        const subscriptionId = extractId(subObj.id);
        const customerId = extractCustomerId(subObj);
        const stripeStatus = subObj.status;
        const cancelAtPeriodEnd = Boolean(subObj.cancel_at_period_end);

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
        const trialEndsAtIso = subObj.trial_end
          ? new Date(subObj.trial_end * 1000).toISOString()
          : null;

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .or(`stripe_subscription_id.eq.${subscriptionId},metadata->>stripe_subscription_id.eq.${subscriptionId}`)
            .maybeSingle();

          if (sub?.company_id) {
            const updateData: any = {
              status: mappedStatus,
              cancel_at_period_end: cancelAtPeriodEnd,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId || undefined,
              updated_at: new Date().toISOString()
            };
            if (currentPeriodStart) updateData.current_period_start = currentPeriodStart;
            if (currentPeriodEnd) updateData.current_period_end = currentPeriodEnd;
            if (trialEndsAtIso) updateData.trial_ends_at = trialEndsAtIso;

            updateData.metadata = {
              ...(sub.metadata || {}),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId || sub.metadata?.stripe_customer_id,
              stripe_status: stripeStatus,
              cancel_at_period_end: cancelAtPeriodEnd
            };

            const { error: subUpErr } = await supabase
              .from("subscriptions")
              .update(updateData)
              .eq("company_id", sub.company_id);

            if (subUpErr) {
              throw new Error(`Falha ao atualizar assinatura no evento subscription.updated: ${subUpErr.message}`);
            }

            const companyUpdate: any = {
              updated_at: new Date().toISOString()
            };
            if (mappedStatus === "active" || mappedStatus === "trialing") {
              companyUpdate.is_active = true;
            } else if (mappedStatus === "canceled") {
              companyUpdate.is_active = false;
            }
            if (trialEndsAtIso) companyUpdate.trial_ends_at = trialEndsAtIso;

            await supabase.from("companies").update(companyUpdate).eq("id", sub.company_id);
          }
        }
        break;
      }

      // -------------------------------------------------------------
      // EVENTO 5: customer.subscription.deleted
      // -------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subObj = event.data.object;
        const subscriptionId = extractId(subObj.id);

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, company_id, metadata")
            .or(`stripe_subscription_id.eq.${subscriptionId},metadata->>stripe_subscription_id.eq.${subscriptionId}`)
            .maybeSingle();

          if (sub?.company_id) {
            const { error: subUpErr } = await supabase.from("subscriptions").update({
              status: "canceled",
              cancel_at_period_end: false,
              metadata: {
                ...(sub.metadata || {}),
                canceled_at: new Date().toISOString(),
                stripe_status: "canceled"
              },
              updated_at: new Date().toISOString()
            }).eq("company_id", sub.company_id);

            if (subUpErr) {
              throw new Error(`Falha ao cancelar assinatura: ${subUpErr.message}`);
            }

            const { error: compUpErr } = await supabase.from("companies").update({
              is_active: false,
              updated_at: new Date().toISOString()
            }).eq("id", sub.company_id);

            if (compUpErr) {
              throw new Error(`Falha ao inativar empresa: ${compUpErr.message}`);
            }
          }
        }
        break;
      }

      default:
        console.log(`Evento Stripe não manipulado diretamente: ${eventType}`);
    }

    // 3. Log de auditoria persistido com status success
    const { error: logErr } = await supabase.from("payment_logs").insert({
      event_type: `stripe_${eventType}`,
      status: "success",
      payload: { eventId, type: eventType, data: event.data?.object }
    });

    if (logErr) {
      console.warn("Aviso: falha ao salvar log de pagamento com sucesso:", logErr);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Erro no processamento do webhook Stripe:", err);

    try {
      await supabase.from("payment_logs").insert({
        event_type: `stripe_${eventType || "unknown"}`,
        status: "error",
        error_message: err.message || "Erro desconhecido",
        payload: { eventId, type: eventType, error: err.stack || err.message }
      });
    } catch (_logErr) {
      // Ignora erro secundário
    }

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
