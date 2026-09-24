import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

export function sanitizeAllowedOrigin(rawOrigin: string | null | undefined): string {
  if (!rawOrigin) return "https://navaldocspro.lovable.app";
  try {
    const parsed = new URL(rawOrigin);
    const host = parsed.hostname.toLowerCase();
    
    const isLovableApp = host === "navaldocspro.lovable.app" || host === "preview--navaldocspro.lovable.app";
    const isCustomProd = host === "navaldocspro.com.br" || host === "www.navaldocspro.com.br";
    const isLocal = (host === "localhost" || host === "127.0.0.1") && ["5173", "3000", "8080", "5174"].includes(parsed.port);

    if (isLovableApp || isCustomProd || isLocal) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // URL inválida
  }
  return "https://navaldocspro.lovable.app";
}

/**
 * Stripe Customer Portal Edge Function
 * - Exige autenticação e permissão de faturamento no servidor (can_manage_company_billing)
 * - Usuários comuns (ex: viewer, operacional) são estritamente bloqueados
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    const body = await req.json().catch(() => ({}));
    const rawOrigin = body.origin || req.headers.get("origin");
    const supabase = ctx.admin;

    const origin = sanitizeAllowedOrigin(rawOrigin);
    const returnUrl = `${origin}/configuracoes?tab=billing`;

    const companyId = ctx.companyId || body.companyId;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhum escritório vinculado ao usuário autenticado." });
    }

    // Validação estrita de permissão financeira no servidor
    const { data: canManage, error: permErr } = await supabase.rpc("can_manage_company_billing", {
      p_user_id: ctx.userId,
      p_company_id: companyId,
    });

    if (permErr || !canManage) {
      throw new HttpError(403, {
        error: "forbidden_billing_permission",
        message: "Você não possui permissão para acessar o painel financeiro e portal de clientes deste escritório."
      });
    }

    // Busca stripe_customer_id na empresa ou na assinatura
    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", companyId)
      .maybeSingle();

    let customerId = company?.stripe_customer_id;

    if (!customerId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id, metadata")
        .eq("company_id", companyId)
        .maybeSingle();

      customerId = sub?.stripe_customer_id || sub?.metadata?.stripe_customer_id;
    }

    if (!customerId) {
      throw new HttpError(404, {
        error: "customer_not_found",
        message: "Nenhum cliente Stripe associado a este escritório. Se sua assinatura for via outro método ou ainda em teste, contrate um plano para habilitar o portal."
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new HttpError(503, {
        error: "stripe_not_configured",
        message: "Configuração pendente: STRIPE_SECRET_KEY não configurada no servidor."
      });
    }

    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", returnUrl);

    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const portalData = await portalRes.json();

    if (!portalRes.ok) {
      throw new Error(portalData.error?.message || "Erro ao gerar sessão do Portal de Clientes da Stripe.");
    }

    return new Response(
      JSON.stringify({
        url: portalData.url
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    if (err instanceof HttpError) return jsonResponse(err.body, err.status);
    console.error("Erro ao gerar sessão do portal Stripe:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
