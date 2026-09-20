/**
 * Stripe Sync Service & Catálogo de Planos Administrativo
 * 
 * Gerencia o ciclo de vida comercial dos planos no NavalDocs Pro:
 * - Leitura e persistência no banco Supabase (tabela public.plans)
 * - Rascunhos locais e sincronização oficial com a Stripe
 * - Versionamento e preservação de contratos ativos
 * - Sincronização idempotente de produtos e preços recorrentes BRL com a Stripe
 * - Feedback real de erros e status sem simulações falsas
 */

import { supabase } from "@/integrations/supabase/client";

export type PlanPublicationStatus = 'draft' | 'published' | 'archived';
export type StripeSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'failed';

export interface AdminPlanData {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number; // em Reais (BRL)
  priceYearly: number; // em Reais (BRL) - cobrança única anual
  userLimit: number;
  processLimit: number;
  aiPagesLimit: number;
  storageGb: number;
  isPopular?: boolean;
  highlightBadge?: string;
  /** Status de publicação comercial / visibilidade aos clientes */
  status: PlanPublicationStatus;
  /** Status técnico de integração com o gateway Stripe */
  stripeSyncStatus: StripeSyncStatus;
  version: number;
  order: number;
  availableForSale: boolean;
  stripeProductId?: string | null;
  stripePriceMonthlyId?: string | null;
  stripePriceYearlyId?: string | null;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 3 Planos Oficiais Previstos pelo NavalDocs Pro
export const OFFICIAL_DEFAULT_PLANS: AdminPlanData[] = [
  {
    id: "plan-essencial",
    slug: "essencial",
    name: "Essencial",
    description: "Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.",
    priceMonthly: 149,
    priceYearly: 1490,
    userLimit: 1,
    processLimit: 20,
    aiPagesLimit: 200,
    storageGb: 5,
    isPopular: false,
    highlightBadge: undefined,
    status: "draft",
    stripeSyncStatus: "not_synced",
    version: 1,
    order: 1,
    availableForSale: true,
    stripeProductId: null,
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    lastSyncedAt: null,
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan-profissional",
    slug: "profissional",
    name: "Profissional",
    description: "Para escritórios em crescimento que exigem mais capacidade analítica com IA e múltiplos usuários.",
    priceMonthly: 299,
    priceYearly: 2990,
    userLimit: 3,
    processLimit: 60,
    aiPagesLimit: 600,
    storageGb: 15,
    isPopular: true,
    highlightBadge: "Recomendado",
    status: "draft",
    stripeSyncStatus: "not_synced",
    version: 1,
    order: 2,
    availableForSale: true,
    stripeProductId: null,
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    lastSyncedAt: null,
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan-equipe",
    slug: "equipe",
    name: "Equipe",
    description: "Solução completa para grandes empresas marítimas, estaleiros e consultorias com alta demanda.",
    priceMonthly: 599,
    priceYearly: 5990,
    userLimit: 10,
    processLimit: 150,
    aiPagesLimit: 1500,
    storageGb: 40,
    isPopular: false,
    highlightBadge: undefined,
    status: "draft",
    stripeSyncStatus: "not_synced",
    version: 1,
    order: 3,
    availableForSale: true,
    stripeProductId: null,
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    lastSyncedAt: null,
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const STORAGE_KEY = "navaldocs_admin_plans_catalog";

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export class StripeSyncService {
  /**
   * Converte linha do banco de dados na interface AdminPlanData
   */
  static mapDbToAdminPlan(row: any, order = 1): AdminPlanData {
    const feat = row.features || {};
    const priceMo = Number(row.price) || 0;
    const priceYr = row.price_yearly != null 
      ? Number(row.price_yearly) 
      : (feat.priceYearly != null ? Number(feat.priceYearly) : priceMo * 10);

    // Status de publicação comercial
    let statusVal: PlanPublicationStatus = 'draft';
    if (row.status === 'published' || row.status === 'archived' || row.status === 'draft') {
      statusVal = row.status;
    } else if (feat.status === 'published' || feat.status === 'archived' || feat.status === 'draft') {
      statusVal = feat.status;
    } else if (row.is_active === false) {
      statusVal = 'archived';
    } else {
      // Planos legados ativos por padrão são published
      statusVal = row.slug && ['essencial', 'profissional', 'equipe'].includes(row.slug.toLowerCase())
        ? 'draft'
        : 'published';
    }

    // Status de sincronização com Stripe
    let syncStatusVal: StripeSyncStatus = 'not_synced';
    if (row.stripe_sync_status === 'synced' || row.stripe_sync_status === 'failed' || row.stripe_sync_status === 'syncing' || row.stripe_sync_status === 'not_synced') {
      syncStatusVal = row.stripe_sync_status;
    } else if (row.stripe_product_id || feat.stripeProductId) {
      syncStatusVal = 'synced';
    } else if (row.sync_error || feat.syncError) {
      syncStatusVal = 'failed';
    }

    const isPop = Boolean(row.is_popular ?? feat.isPopular ?? (row.slug === 'profissional' || row.slug === 'pro'));
    const badge = row.highlight_badge || feat.highlightBadge || (isPop ? "Recomendado" : undefined);

    return {
      id: row.id,
      slug: row.slug || `plano-${row.id}`,
      name: row.name || "Plano sem nome",
      description: row.description || "",
      priceMonthly: priceMo,
      priceYearly: priceYr,
      userLimit: row.user_limit ?? 1,
      processLimit: row.process_limit ?? 20,
      aiPagesLimit: row.ocr_limit ?? 200,
      storageGb: row.storage_limit_gb ?? 5,
      isPopular: isPop,
      highlightBadge: badge,
      status: statusVal,
      stripeSyncStatus: syncStatusVal,
      version: row.version || 1,
      order,
      availableForSale: row.is_active !== false && statusVal === 'published',
      stripeProductId: row.stripe_product_id || feat.stripeProductId || null,
      stripePriceMonthlyId: row.stripe_price_monthly_id || feat.stripePriceMonthlyId || null,
      stripePriceYearlyId: row.stripe_price_yearly_id || feat.stripePriceYearlyId || null,
      lastSyncedAt: row.last_synced_at || feat.lastSyncedAt || null,
      syncError: row.sync_error || feat.syncError || null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Obtém a lista atual de planos em memória ou cache local
   */
  static getPlans(): AdminPlanData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Falha ao ler catálogo local de planos, usando iniciais:", e);
    }
    return OFFICIAL_DEFAULT_PLANS;
  }

  /**
   * Salva o catálogo no cache local
   */
  static savePlans(plans: AdminPlanData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.error("Erro ao salvar catálogo de planos localmente:", e);
    }
  }

  /**
   * Consulta os planos persistidos no Supabase e garante a presença dos planos previstos sem duplicação
   */
  static async fetchPlansFromDatabase(): Promise<AdminPlanData[]> {
    try {
      const { data: dbRows, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.warn("Erro ao buscar planos do banco, usando catálogo local:", error.message);
        return this.getPlans();
      }

      const existingSlugs = new Set((dbRows || []).map((r: any) => r.slug?.toLowerCase()));
      const result: AdminPlanData[] = [];

      // 1. Mapeia os planos existentes no banco
      (dbRows || []).forEach((row: any, idx: number) => {
        result.push(this.mapDbToAdminPlan(row, idx + 1));
      });

      // 2. Se os planos oficiais (Essencial, Profissional, Equipe) não existirem, cadastra como rascunhos sem duplicar
      const missingDefaults = OFFICIAL_DEFAULT_PLANS.filter(p => !existingSlugs.has(p.slug.toLowerCase()));

      if (missingDefaults.length > 0) {
        for (const p of missingDefaults) {
          // Tenta persistir no banco o rascunho
          try {
            const { data: inserted, error: insErr } = await supabase
              .from('plans')
              .insert({
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: p.priceMonthly,
                price_yearly: p.priceYearly,
                billing_cycle: 'monthly',
                user_limit: p.userLimit,
                process_limit: p.processLimit,
                ocr_limit: p.aiPagesLimit,
                storage_limit_gb: p.storageGb,
                status: 'draft',
                is_popular: p.isPopular || false,
                highlight_badge: p.highlightBadge || null,
                is_active: true,
                features: {
                  priceYearly: p.priceYearly,
                  status: 'draft',
                  isPopular: p.isPopular,
                  highlightBadge: p.highlightBadge,
                  highlightFeatures: [
                    `${p.userLimit} Usuário${p.userLimit > 1 ? 's' : ''}`,
                    `${p.processLimit} Processos/mês`,
                    `${p.aiPagesLimit} Páginas IA/mês`,
                    `${p.storageGb} GB Storage`
                  ]
                }
              })
              .select()
              .maybeSingle();

            if (inserted) {
              result.push(this.mapDbToAdminPlan(inserted, result.length + 1));
            } else {
              result.push(p);
            }
          } catch {
            result.push(p);
          }
        }
      }

      this.savePlans(result);
      return result;
    } catch (err) {
      console.error("Erro geral na busca de planos:", err);
      return this.getPlans();
    }
  }

  /**
   * Salva ou atualiza um plano no banco de dados e no catálogo local
   */
  static async savePlan(plan: Partial<AdminPlanData> & { id?: string }): Promise<AdminPlanData> {
    const plans = this.getPlans();
    const now = new Date().toISOString();
    const targetSlug = plan.slug || `plano-${Date.now().toString(36)}`;

    const planData: AdminPlanData = {
      id: plan.id || `plan-${Date.now()}`,
      slug: targetSlug,
      name: plan.name || "Novo Plano",
      description: plan.description || "",
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      userLimit: plan.userLimit || 1,
      processLimit: plan.processLimit || 20,
      aiPagesLimit: plan.aiPagesLimit || 200,
      storageGb: plan.storageGb || 5,
      isPopular: Boolean(plan.isPopular),
      highlightBadge: plan.highlightBadge || undefined,
      status: plan.status || 'draft',
      stripeSyncStatus: plan.stripeSyncStatus || 'not_synced',
      version: plan.version || 1,
      order: plan.order || (plans.length + 1),
      availableForSale: (plan.status ? plan.status === 'published' : (plan.availableForSale ?? false)),
      stripeProductId: plan.stripeProductId || null,
      stripePriceMonthlyId: plan.stripePriceMonthlyId || null,
      stripePriceYearlyId: plan.stripePriceYearlyId || null,
      lastSyncedAt: plan.lastSyncedAt || null,
      syncError: plan.syncError || null,
      createdAt: plan.createdAt || now,
      updatedAt: now
    };

    // 1. Tenta persistência completa no Supabase
    try {
      const payload: any = {
        name: planData.name,
        slug: planData.slug,
        description: planData.description,
        price: planData.priceMonthly,
        price_yearly: planData.priceYearly,
        billing_cycle: 'monthly',
        user_limit: planData.userLimit,
        process_limit: planData.processLimit,
        ocr_limit: planData.aiPagesLimit,
        storage_limit_gb: planData.storageGb,
        status: planData.status,
        stripe_sync_status: planData.stripeSyncStatus,
        is_popular: planData.isPopular,
        highlight_badge: planData.highlightBadge || null,
        is_active: planData.status !== 'archived',
        features: {
          priceYearly: planData.priceYearly,
          status: planData.status,
          stripeSyncStatus: planData.stripeSyncStatus,
          isPopular: planData.isPopular,
          highlightBadge: planData.highlightBadge,
          highlightFeatures: [
            `${planData.userLimit} Usuário${planData.userLimit > 1 ? 's' : ''}`,
            `${planData.processLimit} Processos/mês`,
            `${planData.aiPagesLimit} Páginas IA/mês`,
            `${planData.storageGb} GB Storage`
          ],
          stripeProductId: planData.stripeProductId,
          stripePriceMonthlyId: planData.stripePriceMonthlyId,
          stripePriceYearlyId: planData.stripePriceYearlyId,
          lastSyncedAt: planData.lastSyncedAt,
          syncError: planData.syncError
        },
        updated_at: now
      };

      if (plan.id && isUuid(plan.id)) {
        const { data: updated, error } = await supabase
          .from('plans')
          .update(payload)
          .eq('id', plan.id)
          .select()
          .maybeSingle();

        if (updated) {
          planData.id = updated.id;
        }
      } else {
        // Upsert por slug
        const { data: upserted, error } = await supabase
          .from('plans')
          .upsert(payload, { onConflict: 'slug' })
          .select()
          .maybeSingle();

        if (upserted) {
          planData.id = upserted.id;
        }
      }
    } catch (e) {
      console.warn("Aviso ao salvar no banco (usando persistência resiliente):", e);
    }

    // 2. Atualiza cache local
    const existingIndex = plans.findIndex(p => p.id === planData.id || p.slug === planData.slug);
    if (existingIndex >= 0) {
      plans[existingIndex] = planData;
    } else {
      plans.push(planData);
    }
    this.savePlans(plans);

    return planData;
  }

  /**
   * Salva como rascunho de forma síncrona/imediata
   */
  static saveDraft(plan: Partial<AdminPlanData> & { id?: string }): AdminPlanData {
    const plans = this.getPlans();
    const now = new Date().toISOString();
    const isEdit = Boolean(plan.id);

    let updated: AdminPlanData;
    if (isEdit) {
      const idx = plans.findIndex(p => p.id === plan.id || (plan.slug && p.slug === plan.slug));
      if (idx >= 0) {
        updated = {
          ...plans[idx],
          ...plan,
          status: 'draft',
          availableForSale: false,
          updatedAt: now
        };
        plans[idx] = updated;
      } else {
        updated = {
          id: plan.id!,
          slug: plan.slug || `plano-${Date.now().toString(36)}`,
          name: plan.name || "Novo Rascunho",
          description: plan.description || "",
          priceMonthly: plan.priceMonthly || 149,
          priceYearly: plan.priceYearly || 1490,
          userLimit: plan.userLimit || 1,
          processLimit: plan.processLimit || 20,
          aiPagesLimit: plan.aiPagesLimit || 200,
          storageGb: plan.storageGb || 5,
          isPopular: Boolean(plan.isPopular),
          highlightBadge: plan.highlightBadge,
          status: 'draft',
          stripeSyncStatus: plan.stripeSyncStatus || 'not_synced',
          version: 1,
          order: plans.length + 1,
          availableForSale: false,
          stripeProductId: null,
          stripePriceMonthlyId: null,
          stripePriceYearlyId: null,
          lastSyncedAt: null,
          syncError: null,
          createdAt: now,
          updatedAt: now
        };
        plans.push(updated);
      }
    } else {
      updated = {
        id: `plan-${Date.now()}`,
        slug: plan.slug || `plano-${Date.now().toString(36)}`,
        name: plan.name || "Novo Rascunho",
        description: plan.description || "",
        priceMonthly: plan.priceMonthly || 149,
        priceYearly: plan.priceYearly || 1490,
        userLimit: plan.userLimit || 1,
        processLimit: plan.processLimit || 20,
        aiPagesLimit: plan.aiPagesLimit || 200,
        storageGb: plan.storageGb || 5,
        isPopular: Boolean(plan.isPopular),
        highlightBadge: plan.highlightBadge,
        status: 'draft',
        stripeSyncStatus: 'not_synced',
        version: 1,
        order: plans.length + 1,
        availableForSale: false,
        stripeProductId: null,
        stripePriceMonthlyId: null,
        stripePriceYearlyId: null,
        lastSyncedAt: null,
        syncError: null,
        createdAt: now,
        updatedAt: now
      };
      plans.push(updated);
    }

    this.savePlans(plans);
    this.savePlan(updated).catch(e => console.warn("Sync async draft failed:", e));
    return updated;
  }

  /**
   * Publica comercialmente um plano (disponível para clientes)
   */
  static async publishPlan(planId: string): Promise<AdminPlanData | null> {
    const plans = this.getPlans();
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) return null;

    const plan = plans[idx];
    plan.status = 'published';
    plan.availableForSale = true;
    plan.updatedAt = new Date().toISOString();
    plans[idx] = plan;
    this.savePlans(plans);

    await this.savePlan(plan);
    return plan;
  }

  /**
   * Arquiva um plano (remove de circulação comercial sem afetar assinaturas ativas existentes)
   */
  static async archivePlan(planId: string): Promise<AdminPlanData | null> {
    const plans = this.getPlans();
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) return null;

    const plan = plans[idx];
    plan.status = 'archived';
    plan.availableForSale = false;
    plan.updatedAt = new Date().toISOString();
    plans[idx] = plan;
    this.savePlans(plans);

    await this.savePlan(plan);
    return plan;
  }

  /**
   * Sincroniza um plano com a API da Stripe pelo backend seguro
   * Mantém o status de publicação comercial independente do status de sincronização
   */
  static async syncWithStripe(planId: string): Promise<{ success: boolean; message: string; plan?: AdminPlanData }> {
    const plans = this.getPlans();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) {
      return { success: false, message: "Plano não encontrado no catálogo." };
    }

    const plan = plans[planIndex];
    plan.stripeSyncStatus = "syncing";
    this.savePlans(plans);

    try {
      const { data, error } = await supabase.functions.invoke("stripe-sync-plans", {
        body: {
          planId: plan.id,
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly
        }
      });

      if (error || data?.error) {
        const errorMsg = data?.message || error?.message || "Falha na comunicação com a API da Stripe.";
        plan.stripeSyncStatus = "failed";
        plan.syncError = errorMsg;
        plan.updatedAt = new Date().toISOString();
        plans[planIndex] = plan;
        this.savePlans(plans);
        await this.savePlan(plan);

        return {
          success: false,
          message: errorMsg,
          plan
        };
      }

      // Sincronização confirmada pela Stripe
      plan.stripeSyncStatus = "synced";
      plan.stripeProductId = data.productId;
      plan.stripePriceMonthlyId = data.priceMonthlyId;
      plan.stripePriceYearlyId = data.pricePriceYearlyId || data.priceYearlyId;
      plan.lastSyncedAt = new Date().toISOString();
      plan.syncError = null;
      plan.updatedAt = new Date().toISOString();

      plans[planIndex] = plan;
      this.savePlans(plans);
      await this.savePlan(plan);

      return {
        success: true,
        message: `Plano "${plan.name}" sincronizado com sucesso na Stripe!`,
        plan
      };
    } catch (err: any) {
      const errorMsg = err?.message || "Erro de rede ou falha ao acionar a função de sincronização.";
      plan.stripeSyncStatus = "failed";
      plan.syncError = errorMsg;
      plan.updatedAt = new Date().toISOString();
      plans[planIndex] = plan;
      this.savePlans(plans);
      await this.savePlan(plan);

      return {
        success: false,
        message: `Falha na sincronização: ${errorMsg}`,
        plan
      };
    }
  }

  /**
   * Sincroniza todos os planos elegíveis com a Stripe
   */
  static async syncAllPlans(): Promise<{ total: number; successCount: number; errors: string[] }> {
    const plans = await this.fetchPlansFromDatabase();
    let successCount = 0;
    const errors: string[] = [];

    for (const plan of plans) {
      if (plan.status !== 'archived') {
        const res = await this.syncWithStripe(plan.id);
        if (res.success) {
          successCount++;
        } else {
          errors.push(`${plan.name}: ${res.message}`);
        }
      }
    }

    return { total: plans.length, successCount, errors };
  }

  /**
   * Verifica se o ambiente possui publishable key ou indicador de configuração
   */
  static isStripeConfigured(): boolean {
    const envKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY;
    const manualConfig = typeof window !== 'undefined' ? localStorage.getItem("navaldocs_stripe_configured") : null;
    return Boolean(envKey || manualConfig === "true");
  }
}
