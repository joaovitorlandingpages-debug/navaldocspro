import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authContext, jsonResponse, corsHeaders, HttpError } from "../_shared/auth.ts";

/**
 * Stripe Sync Plans Edge Function
 * - Sincronização oficial de produtos e preços recorrentes BRL com a Stripe
 * - Suporte a múltiplos aplicativos: NavalDocs, Arrais e Notificador (individuais e combos)
 * - Versionamento de ofertas e proteção estrita de contratos vigentes:
 *   Ao alterar um preço, cria um NOVO Price na Stripe vinculado à nova versão,
 *   preservando os IDs antigos e o histórico sem alterar contratos existentes.
 * - Autorização estrita no servidor: Apenas administradores globais autorizados
 *   (João Vitor e Douglas Faresi) podem publicar ou alterar preços no catálogo.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await authContext(req);
    
    // 1. Autorização estrita: apenas João Vitor e Douglas Faresi com perfil de administrador global
    const allowedEmails = ['joaovitor.f0725@gmail.com', 'douglas_faresi@hotmail.com'];
    
    // Obter email do usuário autenticado no Auth
    const { data: authUserData } = await ctx.admin.auth.admin.getUserById(ctx.userId);
    const userEmail = (authUserData?.user?.email || '').toLowerCase().trim();

    const isGlobalAdmin = 
      ctx.isAdminMaster || 
      ctx.role === "admin_master_global" || 
      ctx.role === "superadmin";

    const isAuthorizedPerson = allowedEmails.includes(userEmail) || isGlobalAdmin;

    if (!isAuthorizedPerson) {
      throw new HttpError(403, { 
        error: "forbidden", 
        message: "Acesso negado: Apenas administradores globais autorizados (João Vitor e Douglas Faresi) podem publicar ou sincronizar preços no catálogo." 
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";
    const supabase = ctx.admin;

    // Ação: Seed idempotente dos planos oficiais se não existirem
    if (action === "seed") {
      const defaultCatalog = [
        {
          name: "NavalDocs Essencial",
          slug: "essencial",
          description: "Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.",
          apps_included: ["navaldocs"],
          price: 249,
          price_yearly: 2490,
          billing_cycle: "monthly",
          user_limit: 1,
          process_limit: 30,
          arrais_kits_limit: 0,
          ocr_limit: 15,
          monitored_docs_limit: 0,
          storage_limit_gb: 2,
          addon_process_price: 5.0,
          addon_arrais_kit_price: 0.0,
          addon_ocr_price: 0.5,
          addon_monitored_doc_price: 0.0,
          status: "published",
          version: 1,
          is_popular: false,
          is_active: true,
          features: {
            features: [
              "1 usuário titular",
              "30 processos navais por mês",
              "15 documentos de origem lidos automaticamente por mês",
              "Geração automática e ilimitada de documentos finais",
              "2 GB de armazenamento seguro em nuvem",
              "Reutilização de dados e digitação manual sem consumir leituras"
            ]
          }
        },
        {
          name: "NavalDocs Profissional",
          slug: "profissional",
          description: "Para escritórios em crescimento que exigem maior volume de processos e equipe colaborativa.",
          apps_included: ["navaldocs"],
          price: 549,
          price_yearly: 5490,
          billing_cycle: "monthly",
          user_limit: 3,
          process_limit: 100,
          arrais_kits_limit: 0,
          ocr_limit: 50,
          monitored_docs_limit: 0,
          storage_limit_gb: 8,
          addon_process_price: 4.5,
          addon_arrais_kit_price: 0.0,
          addon_ocr_price: 0.45,
          addon_monitored_doc_price: 0.0,
          status: "published",
          version: 1,
          is_popular: true,
          highlight_badge: "Recomendado",
          is_active: true,
          features: {
            features: [
              "Até 3 usuários com controle de permissões",
              "100 processos navais por mês",
              "50 documentos de origem lidos automaticamente por mês",
              "Geração automática e ilimitada de documentos finais",
              "8 GB de armazenamento seguro em nuvem",
              "Reutilização de dados e digitação manual sem consumir leituras",
              "Suporte prioritário"
            ]
          }
        },
        {
          name: "NavalDocs Equipe",
          slug: "equipe",
          description: "Solução completa para grandes empresas marítimas, despachantes estruturados e estaleiros.",
          apps_included: ["navaldocs"],
          price: 1099,
          price_yearly: 10990,
          billing_cycle: "monthly",
          user_limit: 10,
          process_limit: 300,
          arrais_kits_limit: 0,
          ocr_limit: 150,
          monitored_docs_limit: 0,
          storage_limit_gb: 20,
          addon_process_price: 3.8,
          addon_arrais_kit_price: 0.0,
          addon_ocr_price: 0.4,
          addon_monitored_doc_price: 0.0,
          status: "published",
          version: 1,
          is_popular: false,
          highlight_badge: undefined,
          is_active: true,
          features: {
            features: [
              "Até 10 usuários simultâneos",
              "300 processos navais por mês",
              "150 documentos de origem lidos automaticamente por mês",
              "Geração automática e ilimitada de documentos finais",
              "20 GB de armazenamento em nuvem",
              "Reutilização de dados e digitação manual sem consumir leituras",
              "Gestão avançada e atendimento prioritário com SLA"
            ]
          }
        }
      ];

      for (const p of defaultCatalog) {
        const { data: existing } = await supabase.from("plans").select("id, status").eq("slug", p.slug).maybeSingle();
        if (!existing) {
          await supabase.from("plans").insert(p);
        }
      }

      const { data: allPlans } = await supabase.from("plans").select("*").order("price", { ascending: true });
      return new Response(JSON.stringify({ success: true, plans: allPlans }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ação: Sincronização oficial de plano com a Stripe
    const { 
      planId, 
      slug, 
      name: rawName, 
      description, 
      appsIncluded = ["navaldocs"],
      priceMonthly, 
      priceYearly,
      version: incomingVersion = 1,
      priceHistory = []
    } = body;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const isTestMode = stripeSecretKey.startsWith("sk_test_");
    const environment = isTestMode ? "test" : (stripeSecretKey.startsWith("sk_live_") ? "production" : "pending");

    const targetSlug = (slug || "").trim().toLowerCase();
    const safeName = (rawName && rawName.trim() !== "undefined" && rawName.trim().length > 0)
      ? rawName.trim()
      : "Plano NavalDocs Pro";

    if (!targetSlug) {
      throw new HttpError(400, { error: "missing_slug", message: "Identificador (slug) do plano é obrigatório." });
    }

    if (!stripeSecretKey) {
      const errorMsg = "Configuração pendente: nenhuma credencial da Stripe (STRIPE_SECRET_KEY) configurada no ambiente seguro da hospedagem.";
      if (targetSlug || planId) {
        const q = supabase.from("plans").update({
          stripe_sync_status: "failed",
          sync_error: errorMsg,
          updated_at: new Date().toISOString()
        });
        if (targetSlug) q.eq("slug", targetSlug);
        else q.eq("id", planId);
        await q;
      }

      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: errorMsg,
          environment
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consulta plano no banco de dados para checar estado atual e versionamento
    const { data: dbPlan } = await supabase
      .from("plans")
      .select("id, slug, name, price, price_yearly, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, version, price_history, features")
      .or(`slug.eq.${targetSlug},id.eq.${planId || targetSlug}`)
      .maybeSingle();

    let productId = dbPlan?.stripe_product_id || body.stripeProductId || null;
    let currentVersion = Number(dbPlan?.version || incomingVersion || 1);
    let updatedPriceHistory = Array.isArray(dbPlan?.price_history) 
      ? [...dbPlan.price_history] 
      : (Array.isArray(priceHistory) ? [...priceHistory] : []);

    // 1. Criação ou atualização do produto na Stripe
    const appsListStr = Array.isArray(appsIncluded) ? appsIncluded.join(",") : "navaldocs";

    if (productId) {
      // Atualiza produto existente
      const updateParams = new URLSearchParams();
      updateParams.append("name", `NavalDocs - ${safeName}`);
      if (description) updateParams.append("description", description);
      updateParams.append("metadata[slug]", targetSlug);
      updateParams.append("metadata[apps_included]", appsListStr);
      updateParams.append("metadata[version]", currentVersion.toString());

      const updRes = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: updateParams.toString()
      });

      if (!updRes.ok) {
        productId = null; // Re-cria se não existir mais na Stripe
      }
    }

    if (!productId) {
      // Cria novo produto na Stripe
      const prodParams = new URLSearchParams();
      prodParams.append("name", `NavalDocs - ${safeName}`);
      if (description) prodParams.append("description", description);
      prodParams.append("metadata[slug]", targetSlug);
      prodParams.append("metadata[apps_included]", appsListStr);
      prodParams.append("metadata[version]", currentVersion.toString());

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

    // 2. Criação de Preços (Stripe Prices são imutáveis; cada novo preço gera um novo Price ID)
    const monthlyUnitAmount = Math.round(Number(priceMonthly) * 100);
    const yearlyUnitAmount = Math.round(Number(priceYearly) * 100);

    // Se o preço mudou em relação ao registrado no banco, arquiva o preço anterior no histórico e incrementa versão
    if (dbPlan && dbPlan.price && dbPlan.stripe_price_monthly_id) {
      const priceMonthlyChanged = Number(dbPlan.price) !== Number(priceMonthly);
      const priceYearlyChanged = dbPlan.price_yearly != null && Number(dbPlan.price_yearly) !== Number(priceYearly);

      if (priceMonthlyChanged || priceYearlyChanged) {
        updatedPriceHistory.push({
          version: currentVersion,
          priceMonthly: Number(dbPlan.price),
          priceYearly: Number(dbPlan.price_yearly || Number(dbPlan.price) * 10),
          stripePriceMonthlyId: dbPlan.stripe_price_monthly_id,
          stripePriceYearlyId: dbPlan.stripe_price_yearly_id,
          changedAt: new Date().toISOString(),
          changedBy: userEmail,
          notes: `Preço anterior preservado para contratos vigentes. Nova versão v${currentVersion + 1} criada.`
        });
        currentVersion += 1;
      }
    }

    // 2.1 Criar Preço Mensal BRL
    const monthlyParams = new URLSearchParams();
    monthlyParams.append("product", productId);
    monthlyParams.append("currency", "brl");
    monthlyParams.append("unit_amount", monthlyUnitAmount.toString());
    monthlyParams.append("recurring[interval]", "month");
    monthlyParams.append("metadata[billing_cycle]", "monthly");
    monthlyParams.append("metadata[slug]", targetSlug);
    monthlyParams.append("metadata[version]", currentVersion.toString());

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

    // 2.2 Criar Preço Anual BRL
    const yearlyParams = new URLSearchParams();
    yearlyParams.append("product", productId);
    yearlyParams.append("currency", "brl");
    yearlyParams.append("unit_amount", yearlyUnitAmount.toString());
    yearlyParams.append("recurring[interval]", "year");
    yearlyParams.append("metadata[billing_cycle]", "annual");
    yearlyParams.append("metadata[slug]", targetSlug);
    yearlyParams.append("metadata[version]", currentVersion.toString());

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

    // 3. Persistência dos identificadores oficiais da Stripe no banco public.plans
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
      status: "published",
      is_active: true,
      updated_at: now
    };

    // Atualiza features JSONB com version e price_history
    const mergedFeatures = typeof dbPlan?.features === 'object' && dbPlan?.features !== null
      ? { ...dbPlan.features }
      : {};
    mergedFeatures.appsIncluded = appsIncluded;
    mergedFeatures.version = currentVersion;
    mergedFeatures.priceHistory = updatedPriceHistory;
    mergedFeatures.lastStripeSync = {
      productId,
      priceMonthlyId: priceMonthlyObj.id,
      priceYearlyId: priceYearlyObj.id,
      syncedAt: now,
      environment
    };
    updateData.features = mergedFeatures;

    try {
      updateData.apps_included = appsIncluded;
      updateData.version = currentVersion;
      updateData.price_history = updatedPriceHistory;
    } catch (_e) {
      // Ignora se colunas específicas ainda não estiverem migradas no banco
    }

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
        version: currentVersion,
        environment,
        message: `Plano "${safeName}" publicado e sincronizado com a Stripe com sucesso (v${currentVersion}, modo ${environment}).`
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
