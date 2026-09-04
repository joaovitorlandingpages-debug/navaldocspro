import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError, makeAdmin } from "../_shared/auth.ts";

interface PreferencePayload {
  plan_id?: string;
  planId?: string;
  plan_slug?: string;
  planSlug?: string;
  billing_cycle?: "monthly" | "annual";
  billingCycle?: "monthly" | "annual";
  user_id?: string;
  userId?: string;
  company_id?: string;
  companyId?: string;
  customer_email?: string;
  customerEmail?: string;
  origin?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = makeAdmin();
    let authUser: { id: string; email?: string } | null = null;
    let boundCompanyId: string | null = null;

    // Tenta autenticação via header caso disponível
    try {
      const ctx = await authContext(req);
      authUser = { id: ctx.userId };
      boundCompanyId = ctx.companyId;
      await rateLimit(admin, `user:${ctx.userId}`, "create-preference", 15, 60);
    } catch {
      // Fallback para requisições com tokens repassados no payload
    }

    const body: PreferencePayload = await req.json().catch(() => ({}));
    const rawPlanId = body.plan_id || body.planId || body.plan_slug || body.planSlug || "plan-starter";
    const billingCycle = (body.billing_cycle || body.billingCycle || "monthly") === "annual" ? "annual" : "monthly";
    const origin = body.origin || req.headers.get("origin") || "https://navaldocs.com.br";
    const targetUserId = authUser?.id || body.user_id || body.userId;
    const companyId = boundCompanyId || body.company_id || body.companyId;

    if (!companyId) {
      throw new HttpError(400, {
        error: "company_id_required",
        message: "O identificador da organização/oficina (company_id) é obrigatório.",
      });
    }

    // 1. Valida se a empresa existe no Supabase
    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, name, email")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new HttpError(404, {
        error: "company_not_found",
        message: `Oficina ${companyId} não encontrada.`,
      });
    }

    // 2. Tabela de Preços Oficial para Planos Mensais e Anuais (com 2 meses grátis)
    const officialPlans: Record<
      string,
      { id: string; name: string; monthlyPrice: number; annualPrice: number }
    > = {
      "plan-starter": { id: "plan-starter", name: "Starter / Despachante", monthlyPrice: 89, annualPrice: 890 },
      "starter": { id: "plan-starter", name: "Starter / Despachante", monthlyPrice: 89, annualPrice: 890 },
      "naval-starter-monthly": { id: "plan-starter", name: "Starter / Despachante", monthlyPrice: 89, annualPrice: 890 },
      "naval-starter-annual": { id: "plan-starter", name: "Starter / Despachante", monthlyPrice: 89, annualPrice: 890 },

      "plan-professional": { id: "plan-professional", name: "Professional / Engenheiro Naval", monthlyPrice: 179, annualPrice: 1790 },
      "professional": { id: "plan-professional", name: "Professional / Engenheiro Naval", monthlyPrice: 179, annualPrice: 1790 },
      "naval-pro-monthly": { id: "plan-professional", name: "Professional / Engenheiro Naval", monthlyPrice: 179, annualPrice: 1790 },
      "naval-pro-annual": { id: "plan-professional", name: "Professional / Engenheiro Naval", monthlyPrice: 179, annualPrice: 1790 },

      "plan-enterprise": { id: "plan-enterprise", name: "Enterprise / Estaleiro & Frota", monthlyPrice: 499, annualPrice: 4990 },
      "enterprise": { id: "plan-enterprise", name: "Enterprise / Estaleiro & Frota", monthlyPrice: 499, annualPrice: 4990 },
    };

    const selectedPlan = officialPlans[rawPlanId] || officialPlans["plan-starter"];
    const amount = billingCycle === "annual" ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
    const cycleLabel = billingCycle === "annual" ? "Anual (2 Meses Grátis)" : "Mensal";

    // 3. Montagem do external_reference estruturado: { organization_id, plan_id, billing_cycle }
    // Armazena no formato padronizado org:plan:cycle e também JSON serializável
    const externalReference = `${companyId}:${selectedPlan.id}:${billingCycle}`;

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    // Registra tentativa no payment_logs
    await admin.from("payment_logs").insert({
      company_id: companyId,
      event_type: "preference_initiated",
      status: "pending",
      payload: {
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        amount,
        user_id: targetUserId,
        external_reference: externalReference,
      },
    });

    // 4. Modo Mock / Sandbox caso o token do Mercado Pago não esteja configurado
    if (!accessToken) {
      console.warn("[MP] MERCADO_PAGO_ACCESS_TOKEN ausente. Retornando modo simulado.");

      const mockInitPoint = `${origin}/billing/success?collection_id=mock_sub_${Date.now()}&collection_status=approved&payment_id=mock_pay_${Date.now()}&status=approved&external_reference=${encodeURIComponent(
        externalReference
      )}&payment_type=pix&preference_id=pref_mock_123`;

      await admin.from("payment_logs").insert({
        company_id: companyId,
        event_type: "preference_created",
        status: "success",
        payload: { init_point: mockInitPoint, mode: "mock", external_reference: externalReference },
      });

      return jsonResponse({
        success: true,
        init_point: mockInitPoint,
        sandbox_init_point: mockInitPoint,
        preference_id: "pref_mock_123",
        external_reference: externalReference,
        amount,
        billing_cycle: billingCycle,
        pix: {
          qr_code: "00020126580014br.gov.bcb.pix0136mock-naval-pix-key5204000053039865802BR5913NavalDocsPro6009SaoPaulo62070503***6304ABCD",
          qr_code_base64: null,
          copy_paste: "00020126580014br.gov.bcb.pix0136mock-naval-pix-key5204000053039865802BR5913NavalDocsPro6009SaoPaulo62070503***6304ABCD",
        },
        message: "Ambiente de Testes: Preferência criada com sucesso.",
      });
    }

    // 5. Chamada Oficial para API do Mercado Pago
    const preferencePayload = {
      items: [
        {
          id: `${selectedPlan.id}-${billingCycle}`,
          title: `NavalDocs Pro · ${selectedPlan.name} (${cycleLabel})`,
          description: `Assinatura ${cycleLabel} do sistema NavalDocs Pro para a oficina ${company.name}.`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      payer: {
        email: body.customer_email || body.customerEmail || company.email || "contato@navaldocs.com.br",
        name: company.name,
      },
      external_reference: externalReference,
      statement_descriptor: "NAVALDOCSPRO",
      back_urls: {
        success: `${origin}/billing/success`,
        failure: `${origin}/billing/failure`,
        pending: `${origin}/billing/pending`,
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [],
        installments: billingCycle === "annual" ? 12 : 1,
      },
      metadata: {
        organization_id: companyId,
        company_id: companyId,
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        user_id: targetUserId,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[MP] Erro ao criar preferência:", errorText);

      await admin.from("payment_logs").insert({
        company_id: companyId,
        event_type: "preference_error",
        status: "error",
        payload: { error: errorText, status: mpResponse.status },
      });

      throw new HttpError(502, {
        error: "mp_preference_failed",
        message: "Falha ao comunicar com o gateway do Mercado Pago.",
        details: errorText,
      });
    }

    const prefData = await mpResponse.json();

    await admin.from("payment_logs").insert({
      company_id: companyId,
      event_type: "preference_created",
      status: "success",
      payload: {
        preference_id: prefData.id,
        init_point: prefData.init_point,
        external_reference: externalReference,
      },
    });

    return jsonResponse({
      success: true,
      init_point: prefData.init_point,
      sandbox_init_point: prefData.sandbox_init_point,
      preference_id: prefData.id,
      external_reference: externalReference,
      amount,
      billing_cycle: billingCycle,
      message: "Preferência criada com sucesso.",
    });
  } catch (error: any) {
    console.error("[create-preference] Exception:", error);
    const status = error.status || 500;
    return jsonResponse(
      {
        success: false,
        error: error.message || "Erro inesperado ao gerar preferência de pagamento.",
        details: error.body || null,
      },
      status
    );
  }
});
