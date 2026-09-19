/**
 * Stripe Sync Service & Catálogo de Planos Administrativo
 * 
 * Gerencia o ciclo de vida comercial dos planos no NavalDocs Pro:
 * - Rascunho local (Draft)
 * - Versionamento estável (sem quebrar contratos ativos)
 * - Sincronização idempotente com produtos e preços recorrentes Stripe (BRL)
 * - Suporte a ambiente de teste e produção
 * - Tratamento gracioso quando chaves não estiverem configuradas
 */

export type PlanSyncStatus = 'draft' | 'syncing' | 'synced' | 'failed' | 'archived';

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
  status: PlanSyncStatus;
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

// Planos iniciais solicitados pelo usuário - criados inicialmente como rascunho local
export const INITIAL_ADMIN_PLANS: AdminPlanData[] = [
  {
    id: "plan-essencial-v1",
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
    id: "plan-profissional-v1",
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
    id: "plan-equipe-v1",
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

export class StripeSyncService {
  /**
   * Obtém a lista atual de planos administrativos do catálogo
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
    // Salva e retorna os planos iniciais padrão
    this.savePlans(INITIAL_ADMIN_PLANS);
    return INITIAL_ADMIN_PLANS;
  }

  /**
   * Salva o catálogo de planos
   */
  static savePlans(plans: AdminPlanData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.error("Erro ao salvar catálogo de planos:", e);
    }
  }

  /**
   * Salva ou atualiza um plano como rascunho
   */
  static saveDraft(plan: Partial<AdminPlanData> & { id?: string }): AdminPlanData {
    const plans = this.getPlans();
    const now = new Date().toISOString();

    if (plan.id) {
      const index = plans.findIndex(p => p.id === plan.id);
      if (index >= 0) {
        const existing = plans[index];
        const updated: AdminPlanData = {
          ...existing,
          ...plan,
          // Se alterar preço ou limites, mantemos como rascunho até que seja publicado novamente
          status: existing.status === 'synced' ? 'draft' : (plan.status || existing.status),
          updatedAt: now
        };
        plans[index] = updated;
        this.savePlans(plans);
        return updated;
      }
    }

    // Novo plano
    const newPlan: AdminPlanData = {
      id: plan.id || `plan-${Date.now()}`,
      slug: plan.slug || `plano-${Date.now()}`,
      name: plan.name || "Novo Plano",
      description: plan.description || "",
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      userLimit: plan.userLimit || 1,
      processLimit: plan.processLimit || 10,
      aiPagesLimit: plan.aiPagesLimit || 100,
      storageGb: plan.storageGb || 5,
      isPopular: plan.isPopular || false,
      highlightBadge: plan.highlightBadge,
      status: "draft",
      version: 1,
      order: plans.length + 1,
      availableForSale: plan.availableForSale ?? true,
      stripeProductId: null,
      stripePriceMonthlyId: null,
      stripePriceYearlyId: null,
      lastSyncedAt: null,
      syncError: null,
      createdAt: now,
      updatedAt: now
    };

    plans.push(newPlan);
    this.savePlans(plans);
    return newPlan;
  }

  /**
   * Verifica se a integração com o Stripe possui credenciais ativas
   */
  static isStripeConfigured(): boolean {
    const envKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY;
    const manualConfig = localStorage.getItem("navaldocs_stripe_configured");
    return Boolean(envKey || manualConfig === "true");
  }

  /**
   * Sincroniza um plano com a API da Stripe
   * Se não houver credenciais, marca erro e avisa a pendência sem simular falsamente
   */
  static async syncWithStripe(planId: string): Promise<{ success: boolean; message: string; plan?: AdminPlanData }> {
    const plans = this.getPlans();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) {
      return { success: false, message: "Plano não encontrado no catálogo." };
    }

    const plan = plans[planIndex];

    // Verifica credenciais
    if (!this.isStripeConfigured()) {
      plan.status = "failed";
      plan.syncError = "Configuração pendente: nenhuma credencial da Stripe configurada no ambiente.";
      plan.updatedAt = new Date().toISOString();
      plans[planIndex] = plan;
      this.savePlans(plans);
      return {
        success: false,
        message: "Stripe não configurado. Conecte sua conta do Stripe antes de publicar.",
        plan
      };
    }

    // Sincronização oficial via Edge Function backend
    plan.status = "syncing";
    this.savePlans(plans);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
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
        const errorMsg = data?.message || error?.message || "Falha ao sincronizar com a Stripe.";
        plan.status = "failed";
        plan.syncError = errorMsg;
        plan.updatedAt = new Date().toISOString();
        plans[planIndex] = plan;
        this.savePlans(plans);

        return {
          success: false,
          message: errorMsg,
          plan
        };
      }

      // Sincronização confirmada pela API oficial da Stripe
      plan.status = "synced";
      plan.stripeProductId = data.productId;
      plan.stripePriceMonthlyId = data.priceMonthlyId;
      plan.stripePriceYearlyId = data.priceYearlyId;
      plan.lastSyncedAt = new Date().toISOString();
      plan.syncError = null;
      plan.updatedAt = new Date().toISOString();

      plans[planIndex] = plan;
      this.savePlans(plans);

      return {
        success: true,
        message: `Plano "${plan.name}" publicado e sincronizado com a Stripe com sucesso!`,
        plan
      };
    } catch (err: any) {
      plan.status = "failed";
      plan.syncError = err?.message || "Falha de rede ou timeout ao contatar o backend da Stripe.";
      plan.updatedAt = new Date().toISOString();
      plans[planIndex] = plan;
      this.savePlans(plans);
      return {
        success: false,
        message: `Falha na sincronização: ${plan.syncError}`,
        plan
      };
    }
  }
}
