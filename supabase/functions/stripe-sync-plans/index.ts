import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, rateLimit, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Sync Plans Edge Function
 * - Sincronização oficial de produtos e preços recorrentes BRL com a Stripe
 * - Operação idempotente com persistência direta no catálogo public.plans
 * - Proteção de contratos existentes: novas alterações geram novos preços sem afetar assinaturas ativas
 * - Autorização estrita no servidor (apenas administradores)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    
    // Apenas administradores master da plataforma podem publicar ou sincronizar planos
    if (!ctx.isAdminMaster) {
      throw new HttpError(403, { error: "forbidden", message: "Apenas administradores da plataforma podem sincronizar planos." });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";
    const supabase = ctx.admin;

    // Ação: Seed idempotente dos planos oficiais se não existirem
    if (action === "seed") {
      const defaultPlans = [
        {
          name: "Essencial",
          slug: "essencial",
          description: "Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.",
          price: 149,
          price_yearly: 1490,
          billing_cycle: "monthly",
          user_limit: 1,
          process_limit: 20,
          ocr_limit: 200,
          storage_limit_gb: 5,
          status: "draft",
          is_popular: false,
          is_active: true,
          features: ["1 usuário", "20 processos/mês", "200 páginas IA/mês", "5GB de armazenamento"]
        },
        {
          name: "Profissional",
          slug: "profissional",
          description: "Para escritórios em crescimento que exigem mais capacidade analítica com IA e múltiplos usuários.",
          price: 299,
          price_yearly: 2990,
          billing_cycle: "monthly",
          user_limit: 3,
          process_limit: 60,
          ocr_limit: 600,
          storage_limit_gb: 15,
          status: "draft",
          is_popular: true,
          highlight_badge: "Recomendado",
          is_active: true,
          features: ["3 usuários", "60 processos/mês", "600 páginas IA/mês", "15GB de armazenamento"]
        },
        {
          name: "Equipe",
          slug: "equipe",
          description: "Solução completa para grandes empresas marítimas, estaleiros e consultorias com alta demanda.",
          price: 599,
          price_yearly: 5990,
          billing_cycle: "monthly",
          user_limit: 10,
          process_limit: 150,
          ocr_limit: 1500,
          storage_limit_gb: 40,
          status: "draft",
          is_popular: false,
          is_active: true,
          features: ["10 usuários", "150 processos/mês", "1.500 páginas IA/mês", "40GB de armazenamento"]
        }
      ];

      for (const p of defaultPlans) {
        const { data: existing } = await supabase.from("plans").select("id, status").eq("slug", p.slug).maybeSingle();
        if (!existing) {
          await supabase.from("plans").insert(p);
        } else if (existing.status === "draft") {
          await supabase.from("plans").update({
            price: p.price,
            price_yearly: p.price_yearly,
            user_limit: p.user_limit,
            process_limit: p.process_limit,
            ocr_limit: p.ocr_limit,
            storage_limit_gb: p.storage_limit_gb,
            features: p.features,
            is_popular: p.is_popular,
            highlight_badge: p.highlight_badge || null
          }).eq("id", existing.id);
        }
      }

      const { data: allPlans } = await supabase.from("plans").select("*").order("price", { ascending: true });
      return new Response(JSON.stringify({ success: true, plans: allPlans }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ação: Sincronização oficial de plano com a Stripe
    const { planId, slug, name: rawName, description, priceMonthly, priceYearly } = body;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    // Validação e normalização de nome e slug para evitar qualquer "undefined"
    const defaultCatalogNames: Record<string, string> = {
      "essencial": "Essencial",
      "profissional": "Profissional",
      "equipe": "Equipe",
      "despachante": "Despachante Naval",
      "engenharia_pericia": "Engenharia & Perícia"
    };

    const targetSlug = (slug || "").trim().toLowerCase();
    const safeName = (rawName && rawName.trim() !== "undefined" && rawName.trim().length > 0)
      ? rawName.trim()
      : (defaultCatalogNames[targetSlug] || "Plano NavalDocs Pro");

    if (!targetSlug) {
      throw new HttpError(400, { error: "missing_slug", message: "Identificador (slug) do plano é obrigatório." });
    }

    if (!stripeSecretKey) {
      const errorMsg = "Configuração pendente: nenhuma credencial da Stripe (STRIPE_SECRET_KEY) configurada no ambiente seguro da hospedagem.";
      if (targetSlug || planId) {
        const query = supabase.from("plans").update({
          stripe_sync_status: "failed",
          sync_error: errorMsg,
          updated_at: new Date().toISOString()
        });
        if (targetSlug) query.eq("slug", targetSlug);
        else query.eq("id", planId);
        await query;
      }

      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: errorMsg
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consulta plano no banco para verificar se já possui stripe_product_id
    const { data: dbPlan } = await supabase
      .from("plans")
      .select("id, slug, name, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id")
      .or(`slug.eq.${targetSlug},id.eq.${planId || targetSlug}`)
      .maybeSingle();

    let productId = dbPlan?.stripe_product_id || body.stripeProductId || null;

    // 1. Criação ou atualização do produto na Stripe (evita duplicação)
    if (productId) {
      // Atualiza produto existente na Stripe
      const updateParams = new URLSearchParams();
      updateParams.append("name", `NavalDocs Pro - ${safeName}`);
      if (description) updateParams.append("description", description);
      updateParams.append("metadata[slug]", targetSlug);
      updateParams.append("metadata[plan_id]", planId || targetSlug);

      const updRes = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: updateParams.toString()
      });

      if (!updRes.ok) {
        // Se o produto foi excluído na Stripe, limpa o ID para recriar
        productId = null;
      }
    }

    if (!productId) {
      // Cria novo produto na Stripe
      const prodParams = new URLSearchParams();
      prodParams.append("name", `NavalDocs Pro - ${safeName}`);
      if (description) prodParams.append("description", description);
      prodParams.append("metadata[slug]", targetSlug);
      prodParams.append("metadata[plan_id]", planId || targetSlug);

      const prodRes = await fetch("https://api.stripe.com/v1/products", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: prodParams.toString()
      });

      const product = await prodRes.json();
      if (!prodRes.ok) {
        const errText = product.error?.message || "Erro ao criar produto na Stripe.";
        const q = supabase.from("plans").update({
          stripe_sync_status: "failed",
          sync_error: errText,
          updated_at: new Date().toISOString()
        });
        if (targetSlug) q.eq("slug", targetSlug);
        else q.eq("id", planId);
        await q;
        throw new Error(errText);
      }
      productId = product.id;
    }

    // 2. Preço Mensal BRL recorrente
    const monthlyUnitAmount = Math.round(Number(priceMonthly) * 100);
    const monthlyParams = new URLSearchParams();
    monthlyParams.append("product", productId);
    monthlyParams.append("currency", "brl");
    monthlyParams.append("unit_amount", monthlyUnitAmount.toString());
    monthlyParams.append("recurring[interval]", "month");
    monthlyParams.append("metadata[billing_cycle]", "monthly");
    monthlyParams.append("metadata[slug]", targetSlug);

    const priceMoRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: monthlyParams.toString()
    });
    const priceMonthlyObj = await priceMoRes.json();
    if (!priceMoRes.ok) throw new Error(priceMonthlyObj.error?.message || "Erro ao criar preço mensal na Stripe.");

    // 3. Preço Anual BRL recorrente
    const yearlyUnitAmount = Math.round(Number(priceYearly) * 100);
    const yearlyParams = new URLSearchParams();
    yearlyParams.append("product", productId);
    yearlyParams.append("currency", "brl");
    yearlyParams.append("unit_amount", yearlyUnitAmount.toString());
    yearlyParams.append("recurring[interval]", "year");
    yearlyParams.append("metadata[billing_cycle]", "annual");
    yearlyParams.append("metadata[slug]", targetSlug);

    const priceYrRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: yearlyParams.toString()
    });
    const priceYearlyObj = await priceYrRes.json();
    if (!priceYrRes.ok) throw new Error(priceYearlyObj.error?.message || "Erro ao criar preço anual na Stripe.");

    // 4. Persistência dos identificadores oficiais da Stripe no banco public.plans
    const now = new Date().toISOString();
    const updateData: any = {
      stripe_product_id: productId,
      stripe_price_monthly_id: priceMonthlyObj.id,
      stripe_price_yearly_id: priceYearlyObj.id,
      stripe_sync_status: "synced",
      sync_error: null,
      last_synced_at: now,
      price: Number(priceMonthly),
      price_yearly: Number(priceYearly),
      updated_at: now
    };

    const q = supabase.from("plans").update(updateData);
    if (targetSlug) q.eq("slug", targetSlug);
    else q.eq("id", planId);
    await q;

    return new Response(
      JSON.stringify({
        success: true,
        productId,
        priceMonthlyId: priceMonthlyObj.id,
        priceYearlyId: priceYearlyObj.id,
        message: `Plano "${safeName}" sincronizado com a Stripe com sucesso.`
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
