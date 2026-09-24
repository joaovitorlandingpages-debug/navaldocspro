import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Validação e sanitização rigorosa de origens permitidas vinculadas aos domínios oficiais.
 * Domínios autorizados:
 * - https://navaldocspro.lovable.app
 * - https://preview--navaldocspro.lovable.app
 * - https://navaldocspro.com.br
 * - https://www.navaldocspro.com.br
 * - http://localhost:* / http://127.0.0.1:*
 */
export function sanitizeAllowedOrigin(rawOrigin: string | null | undefined): string {
  if (!rawOrigin) return "https://navaldocspro.lovable.app";
  try {
    const parsed = new URL(rawOrigin);
    const host = parsed.hostname.toLowerCase();
    
    // Domínios Lovable autorizados expressamente para este projeto
    const isLovableApp = host === "navaldocspro.lovable.app" || host === "preview--navaldocspro.lovable.app";
    // Domínios personalizados de produção (confirmados na infraestrutura)
    const isCustomProd = host === "navaldocspro.com.br" || host === "www.navaldocspro.com.br";
    // Desenvolvimento local
    const isLocal = (host === "localhost" || host === "127.0.0.1") && ["5173", "3000", "8080", "5174"].includes(parsed.port);

    if (isLovableApp || isCustomProd || isLocal) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Formato de URL inválido
  }
  return "https://navaldocspro.lovable.app";
}

/**
 * Stripe Customer Portal Edge Function
 * - Gera uma sessão segura do Stripe Billing Customer Portal
 * - Permite aos clientes atualizar cartão, consultar faturas, renovar ou cancelar assinaturas
 * - Protegido por autenticação: somente usuários do próprio escritório
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

    // Validação estrita de origens permitidas vinculadas aos domínios autorizados
    const origin = sanitizeAllowedOrigin(rawOrigin);
    const returnUrl = `${origin}/billing/subscription`;

    const companyId = ctx.companyId || body.companyId;
    if (!companyId) {
      throw new HttpError(403, { error: "no_company_bound", message: "Nenhum escritório vinculado ao usuário autenticado." });
    }

    if (ctx.companyId !== companyId && !ctx.isAdminMaster) {
      throw new HttpError(403, { error: "forbidden", message: "Sem permissão para acessar faturamento deste escritório." });
    }

    // Busca a assinatura do escritório para obter o stripe_customer_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, status, metadata")
      .eq("company_id", companyId)
      .maybeSingle();

    const customerId = sub?.metadata?.stripe_customer_id;

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

    // Criação da sessão do Billing Portal na API da Stripe
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
