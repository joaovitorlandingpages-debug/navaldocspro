import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Verify Connection Edge Function
 * - Executada no backend e restrita a administradores da plataforma
 * - Verifica o status real das credenciais de ambiente sem expor segredos
 * - Testa a comunicação real com a API Stripe (GET /v1/balance)
 * - Retorna URL oficial do webhook e lista de eventos exigidos
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    
    // 1. Verificação de permissões do administrador da plataforma
    const isAdmin = 
      ctx.role === "admin_master" || 
      ctx.role === "admin_master_global" || 
      ctx.role === "superadmin" ||
      ctx.role === "admin";

    if (!isAdmin) {
      throw new HttpError(403, { 
        error: "forbidden", 
        message: "Acesso restrito ao administrador da plataforma NavalDocs Pro." 
      });
    }

    // 2. Leitura segura das variáveis de ambiente no servidor
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    const hasSecretKey = !!stripeSecretKey.trim();
    const hasWebhookSecret = !!webhookSecret.trim();

    // Determina o ambiente baseado no prefixo da chave (sk_test ou sk_live)
    let environment: "test" | "production" | "pending" = "pending";
    if (stripeSecretKey.startsWith("sk_test_")) {
      environment = "test";
    } else if (stripeSecretKey.startsWith("sk_live_")) {
      environment = "production";
    }

    // URL oficial do webhook gerada dinamicamente a partir do Supabase URL real do projeto
    const webhookUrl = supabaseUrl 
      ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stripe-webhook`
      : "";

    // Eventos oficiais exigidos pelo handler implementado em stripe-webhook
    const requiredEvents = [
      "checkout.session.completed",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
      "customer.subscription.deleted",
      "customer.subscription.updated"
    ];

    // 3. Se a chave não estiver configurada no backend
    if (!hasSecretKey) {
      return new Response(
        JSON.stringify({
          status: "pending_configuration",
          environment,
          connected: false,
          hasSecretKey: false,
          hasWebhookSecret,
          webhookUrl,
          requiredEvents,
          message: "Configuração pendente: nenhuma credencial da Stripe configurada no servidor seguro da hospedagem.",
          checkedAt: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Teste real com a API Stripe (somente quando chave presente)
    const stripeRes = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`
      }
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({
          status: "error",
          environment,
          connected: false,
          hasSecretKey: true,
          hasWebhookSecret,
          webhookUrl,
          requiredEvents,
          message: stripeData.error?.message || "Chave da Stripe inválida ou sem permissão para consultar o saldo.",
          checkedAt: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "connected",
        environment,
        connected: true,
        hasSecretKey: true,
        hasWebhookSecret,
        webhookUrl,
        requiredEvents,
        message: `Conexão validada com sucesso com a Stripe em modo ${environment === "production" ? "Produção" : "Teste (Sandbox)"}.`,
        livemode: stripeData.livemode ?? (environment === "production"),
        checkedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    if (err instanceof HttpError) return jsonResponse(err.body, err.status);
    console.error("Erro na verificação de conexão Stripe:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Falha interna ao verificar conexão Stripe." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
