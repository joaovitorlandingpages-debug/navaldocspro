import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * stripe-sync-coupons
 * Cria ou atualiza um cupom e um promotion code na Stripe e grava os IDs retornados
 * na tabela public.coupons. Apenas administradores da plataforma podem executar.
 *
 * Body JSON:
 *  - couponId: string (UUID do cupom em public.coupons)
 *  - action: "sync" | "deactivate"  (default: "sync")
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);

    if (!ctx.isAdminMaster) {
      throw new HttpError(403, {
        error: "forbidden",
        message: "Apenas administradores da plataforma podem sincronizar cupons com a Stripe.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const { couponId, action = "sync" } = body;

    if (!couponId) {
      throw new HttpError(400, { error: "missing_coupon_id", message: "couponId é obrigatório." });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new HttpError(503, {
        error: "stripe_not_configured",
        message: "Credencial da Stripe (STRIPE_SECRET_KEY) não configurada.",
      });
    }

    const supabase = ctx.admin;

    // Busca o cupom no banco
    const { data: coupon, error: fetchErr } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", couponId)
      .single();

    if (fetchErr || !coupon) {
      throw new HttpError(404, { error: "coupon_not_found", message: "Cupom não encontrado." });
    }

    if (coupon.type === "trial_extension" || coupon.discount_type === "trial_extension") {
      throw new HttpError(400, {
        error: "unsupported_type",
        message: "Cupons do tipo trial_extension não são sincronizados com a Stripe (não geram cobranças).",
      });
    }

    // ação: desativar cupom na Stripe
    if (action === "deactivate") {
      if (!coupon.stripe_coupon_id) {
        return jsonResponse({ success: true, message: "Cupom não possui stripe_coupon_id, nada a desativar." });
      }

      const deactivateRes = await fetch(`https://api.stripe.com/v1/coupons/${coupon.stripe_coupon_id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${stripeSecretKey}` },
      });

      // 200 ou 404 (já deletado) são aceitáveis
      if (!deactivateRes.ok && deactivateRes.status !== 404) {
        const errBody = await deactivateRes.json().catch(() => ({}));
        throw new HttpError(502, {
          error: "stripe_delete_failed",
          message: errBody?.error?.message || "Falha ao desativar cupom na Stripe.",
        });
      }

      await supabase
        .from("coupons")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", couponId);

      return jsonResponse({ success: true, message: "Cupom desativado na Stripe e no banco." });
    }

    // ação: sync (create or update)

    let stripeCouponId = coupon.stripe_coupon_id || null;
    let stripePromoId = coupon.stripe_promotion_code_id || null;

    // Monta parâmetros do cupom Stripe
    const couponParams = new URLSearchParams();

    if (coupon.type === "percent" || coupon.discount_type === "percentage") {
      const pct = Number(coupon.discount_percent || coupon.discount_value || 0);
      if (pct <= 0 || pct > 100) {
        throw new HttpError(400, { error: "invalid_percent", message: "Percentual de desconto inválido (deve ser 1–100)." });
      }
      couponParams.append("percent_off", pct.toString());
    } else if (coupon.type === "fixed" || coupon.discount_type === "fixed_amount") {
      const fixed = Math.round(Number(coupon.discount_fixed || coupon.discount_value || 0) * 100);
      if (fixed <= 0) {
        throw new HttpError(400, { error: "invalid_fixed", message: "Valor de desconto fixo inválido." });
      }
      couponParams.append("amount_off", fixed.toString());
      couponParams.append("currency", "brl");
    } else {
      throw new HttpError(400, { error: "unsupported_type", message: `Tipo de cupom não suportado: ${coupon.type}` });
    }

    const duration = coupon.discount_duration || "once";
    couponParams.append("duration", duration);
    if (duration === "repeating" && coupon.duration_in_months) {
      couponParams.append("duration_in_months", String(coupon.duration_in_months));
    }

    if (coupon.max_redemptions) {
      couponParams.append("max_redemptions", String(coupon.max_redemptions));
    }

    if (coupon.valid_until) {
      const redeemBy = Math.floor(new Date(coupon.valid_until).getTime() / 1000);
      if (!isNaN(redeemBy)) {
        couponParams.append("redeem_by", redeemBy.toString());
      }
    }

    couponParams.append("name", coupon.name || coupon.code);
    couponParams.append("metadata[app]", "navaldocspro");
    couponParams.append("metadata[navaldocs_coupon_id]", couponId);
    couponParams.append("metadata[code]", coupon.code);

    // Calcula hash/timestamp de idempotência para o cupom
    const syncTimestamp = coupon.updated_at ? new Date(coupon.updated_at).getTime() : Date.now();
    const couponIdempotencyKey = `navaldocs-coupon-${couponId}-${syncTimestamp}`;

    // 1. Cria ou verifica o cupom existente na Stripe com diferenciação de 404 vs erro temporário
    if (stripeCouponId) {
      const checkRes = await fetch(`https://api.stripe.com/v1/coupons/${stripeCouponId}`, {
        headers: { "Authorization": `Bearer ${stripeSecretKey}` },
      });

      if (checkRes.status === 404) {
        // Cupom foi excluído na Stripe — necessita recriação
        console.warn(`Stripe coupon ${stripeCouponId} não encontrado (404), preparando recriação...`);
        stripeCouponId = null;
        stripePromoId = null;
      } else if (!checkRes.ok) {
        // 5xx, 429 ou erro de conexão: falha temporária! Não recria nem assume inexistência
        const errBody = await checkRes.json().catch(() => ({}));
        throw new HttpError(503, {
          error: "stripe_temporary_failure",
          message: `Falha temporária ao consultar cupom na Stripe (HTTP ${checkRes.status}): ${errBody?.error?.message || "Serviço indisponível"}. Tente novamente.`,
        });
      } else {
        // Cupom existe na Stripe: verifica se o desconto local mudou (versionamento necessário)
        const stripeCouponObj = await checkRes.json();
        const localPct = (coupon.type === "percent" || coupon.discount_type === "percentage")
          ? Number(coupon.discount_percent || coupon.discount_value || 0)
          : null;
        const localFixedCents = (coupon.type === "fixed" || coupon.discount_type === "fixed_amount")
          ? Math.round(Number(coupon.discount_fixed || coupon.discount_value || 0) * 100)
          : null;
        const localDuration = coupon.discount_duration || "once";

        const percentMatch = localPct !== null ? stripeCouponObj.percent_off === localPct : stripeCouponObj.percent_off === null;
        const amountMatch = localFixedCents !== null ? stripeCouponObj.amount_off === localFixedCents : stripeCouponObj.amount_off === null;
        const durationMatch = stripeCouponObj.duration === localDuration;

        const discountChanged = !percentMatch || !amountMatch || !durationMatch;

        if (discountChanged) {
          // Desconto local foi modificado! Como cupons Stripe são imutáveis e podem estar
          // em uso por assinaturas existentes (preservando descontos já contratados),
          // versionamos criando uma nova versão sem deletar o cupom anterior da Stripe.
          console.log(`Desconto do cupom ${coupon.code} mudou localmente. Versionando cupom na Stripe para preservar assinaturas existentes...`);
          stripeCouponId = null;
          stripePromoId = null;
        } else {
          // Parâmetros de desconto permanecem iguais. Atualiza apenas nome / metadados se necessário
          await fetch(`https://api.stripe.com/v1/coupons/${stripeCouponId}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              name: coupon.name || coupon.code,
              "metadata[app]": "navaldocspro",
              "metadata[navaldocs_coupon_id]": couponId,
              "metadata[code]": coupon.code,
            }).toString(),
          });
        }
      }
    }

    if (!stripeCouponId) {
      // Cria nova versão do cupom na Stripe com Idempotency-Key
      const createRes = await fetch("https://api.stripe.com/v1/coupons", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": couponIdempotencyKey,
        },
        body: couponParams.toString(),
      });

      const createBody = await createRes.json();
      if (!createRes.ok) {
        throw new HttpError(502, {
          error: "stripe_coupon_create_failed",
          message: createBody?.error?.message || "Falha ao criar cupom na Stripe.",
        });
      }

      stripeCouponId = createBody.id;
    }

    // 2. Cria ou verifica promotion code
    if (stripePromoId) {
      const checkPromoRes = await fetch(`https://api.stripe.com/v1/promotion_codes/${stripePromoId}`, {
        headers: { "Authorization": `Bearer ${stripeSecretKey}` },
      });

      if (checkPromoRes.status === 404) {
        console.warn(`Stripe promotion_code ${stripePromoId} não encontrado (404), recriando...`);
        stripePromoId = null;
      } else if (!checkPromoRes.ok) {
        const errBody = await checkPromoRes.json().catch(() => ({}));
        throw new HttpError(503, {
          error: "stripe_temporary_failure",
          message: `Falha temporária ao consultar promotion code na Stripe (HTTP ${checkPromoRes.status}): ${errBody?.error?.message || "Serviço indisponível"}. Tente novamente.`,
        });
      } else {
        const existingPromoObj = await checkPromoRes.json();
        const promoCouponId = typeof existingPromoObj.coupon === "object" ? existingPromoObj.coupon?.id : existingPromoObj.coupon;
        if (promoCouponId !== stripeCouponId || !existingPromoObj.active) {
          // Promo code aponta para versão antiga do cupom ou está inativo — precisa de novo promo code
          stripePromoId = null;
        }
      }
    }

    if (!stripePromoId) {
      const promoIdempotencyKey = `navaldocs-promo-${couponId}-${syncTimestamp}-${stripeCouponId}`;
      const promoParams = new URLSearchParams();
      promoParams.append("coupon", stripeCouponId!);
      promoParams.append("code", coupon.code.trim().toUpperCase());
      if (coupon.max_redemptions) {
        promoParams.append("max_redemptions", String(coupon.max_redemptions));
      }
      if (coupon.valid_until) {
        const expiresAt = Math.floor(new Date(coupon.valid_until).getTime() / 1000);
        if (!isNaN(expiresAt)) {
          promoParams.append("expires_at", expiresAt.toString());
        }
      }
      promoParams.append("metadata[app]", "navaldocspro");
      promoParams.append("metadata[navaldocs_coupon_id]", couponId);

      const promoRes = await fetch("https://api.stripe.com/v1/promotion_codes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": promoIdempotencyKey,
        },
        body: promoParams.toString(),
      });

      const promoBody = await promoRes.json();
      if (!promoRes.ok) {
        // Se o código já existe na Stripe, confere o vínculo estrito antes de associar
        if (promoBody?.error?.code === "resource_already_exists") {
          const listRes = await fetch(
            `https://api.stripe.com/v1/promotion_codes?code=${encodeURIComponent(coupon.code.trim().toUpperCase())}&limit=5`,
            { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
          );
          const listBody = await listRes.json();
          if (listRes.ok && listBody?.data?.length > 0) {
            // Busca promoção vinculada EXATAMENTE ao cupom atual e a este aplicativo
            const matchingPromo = listBody.data.find((p: any) => {
              const promoCouponId = typeof p.coupon === "object" ? p.coupon?.id : p.coupon;
              const promoApp = p.metadata?.app || p.metadata?.system;
              const promoCouponRef = p.metadata?.navaldocs_coupon_id;
              const isSameCoupon = promoCouponId === stripeCouponId;
              const isSameApp = promoApp === "navaldocspro" || promoCouponRef === couponId || !promoApp;
              return isSameCoupon && isSameApp && p.active !== false;
            });

            if (matchingPromo) {
              stripePromoId = matchingPromo.id;
            } else {
              throw new HttpError(409, {
                error: "promo_code_conflict",
                message: `O código promocional '${coupon.code}' já existe na Stripe associado a outro cupom ou aplicação. Altere o código do cupom antes de sincronizar.`,
              });
            }
          } else {
            throw new HttpError(502, {
              error: "stripe_promo_create_failed",
              message: promoBody?.error?.message || "Falha ao criar código promocional na Stripe.",
            });
          }
        } else {
          throw new HttpError(502, {
            error: "stripe_promo_create_failed",
            message: promoBody?.error?.message || "Falha ao criar código promocional na Stripe.",
          });
        }
      } else {
        stripePromoId = promoBody.id;
      }
    }

    // Persiste os IDs retornados no banco
    const { error: updateErr } = await supabase
      .from("coupons")
      .update({
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: stripePromoId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", couponId);

    if (updateErr) {
      // IDs criados na Stripe mas falha ao salvar no banco — log para análise manual
      console.error(
        `CRÍTICO: cupom sincronizado na Stripe (${stripeCouponId}, promo: ${stripePromoId}) mas falha ao atualizar banco para coupon ${couponId}:`,
        updateErr
      );
      throw new HttpError(500, {
        error: "db_update_failed",
        message: `Cupom criado na Stripe (${stripeCouponId}) mas falha ao salvar no banco: ${updateErr.message}. stripe_coupon_id=${stripeCouponId}, stripe_promotion_code_id=${stripePromoId}`,
      });
    }

    return jsonResponse({
      success: true,
      stripe_coupon_id: stripeCouponId,
      stripe_promotion_code_id: stripePromoId,
      message: `Cupom "${coupon.name}" sincronizado com a Stripe com sucesso.`,
    });

  } catch (err: any) {
    if (err instanceof HttpError) return jsonResponse(err.body, err.status);
    console.error("Erro na sincronização de cupom com Stripe:", err);
    return jsonResponse({ error: err.message || "Erro interno" }, 500);
  }
});
