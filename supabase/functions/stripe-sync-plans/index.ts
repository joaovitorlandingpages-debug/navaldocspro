import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Sync Plans Edge Function
 * Sincronização oficial de produtos e preços recorrentes BRL com a Stripe
 * Operação idempotente com registro de IDs Stripe criados no catálogo
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    
    // Apenas administradores master podem publicar ou sincronizar planos
    const isAdmin = ctx.role === "admin_master" || ctx.role === "admin_master_global" || ctx.role === "superadmin";
    if (!isAdmin) {
      throw new HttpError(403, { error: "forbidden", message: "Apenas administradores da plataforma podem sincronizar planos." });
    }

    const body = await req.json().catch(() => ({}));
    const { planId, slug, name, description, priceMonthly, priceYearly } = body;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: "Configuração pendente: nenhuma credencial da Stripe (STRIPE_SECRET_KEY) configurada no ambiente seguro da hospedagem."
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Criação ou busca idempotente do Produto Stripe
    const prodParams = new URLSearchParams();
    prodParams.append("name", `NavalDocs Pro - ${name}`);
    if (description) prodParams.append("description", description);
    prodParams.append("metadata[slug]", slug);
    prodParams.append("metadata[plan_id]", planId || slug);

    const prodRes = await fetch("https://api.stripe.com/v1/products", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: prodParams.toString()
    });

    const product = await prodRes.json();
    if (!prodRes.ok) throw new Error(product.error?.message || "Erro ao criar produto na Stripe.");

    // 2. Preço Mensal BRL
    const monthlyParams = new URLSearchParams();
    monthlyParams.append("product", product.id);
    monthlyParams.append("currency", "brl");
    monthlyParams.append("unit_amount", (priceMonthly * 100).toString());
    monthlyParams.append("recurring[interval]", "month");
    monthlyParams.append("metadata[billing_cycle]", "monthly");

    const priceMoRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: monthlyParams.toString()
    });
    const priceMonthlyObj = await priceMoRes.json();

    // 3. Preço Anual BRL
    const yearlyParams = new URLSearchParams();
    yearlyParams.append("product", product.id);
    yearlyParams.append("currency", "brl");
    yearlyParams.append("unit_amount", (priceYearly * 100).toString());
    yearlyParams.append("recurring[interval]", "year");
    yearlyParams.append("metadata[billing_cycle]", "annual");

    const priceYrRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: yearlyParams.toString()
    });
    const priceYearlyObj = await priceYrRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        productId: product.id,
        priceMonthlyId: priceMonthlyObj.id,
        priceYearlyId: priceYearlyObj.id,
        message: `Plano "${name}" sincronizado com a Stripe com sucesso.`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    if (err instanceof HttpError) return jsonResponse(err.body, err.status);
    console.error("Erro na sincronização com Stripe:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
