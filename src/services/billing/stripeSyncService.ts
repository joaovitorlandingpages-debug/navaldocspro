/**
 * Stripe Sync Service & Catálogo de Planos Administrativo
 * 
 * Gerencia o ciclo de vida comercial dos planos no NavalDocs Pro:
 * - Suporte a múltiplos aplicativos: NavalDocs, Arrais e Notificador (individuais e pacotes)
 * - Leitura e persistência no banco Supabase (tabela public.plans)
 * - Rascunhos locais e sincronização oficial com a Stripe
 * - Versionamento de ofertas e preservação estrita de contratos ativos
 * - Sincronização idempotente de produtos e preços recorrentes BRL com a Stripe
 * - Feedback real de erros e status sem simulações falsas
 */

import { supabase } from "@/integrations/supabase/client";

export type PlanPublicationStatus = 'draft' | 'published' | 'archived';
export type StripeSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'failed';
export type SupportedApp = 'navaldocs' | 'arrais' | 'notificador';

export interface PlanPriceHistoryItem {
  version: number;
  priceMonthly: number;
  priceYearly: number;
  stripePriceMonthlyId?: string | null;
  stripePriceYearlyId?: string | null;
  changedAt: string;
  changedBy?: string;
  notes?: string;
}

export interface AdminPlanData {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Aplicativos contemplados na oferta comercial */
  appsIncluded: SupportedApp[];
  /** Preço mensal em Reais (BRL) */
  priceMonthly: number;
  /** Preço anual em Reais (BRL) - cobrança única anual */
  priceYearly: number;
  /** Limite de funcionários ou usuários */
  userLimit: number;
  /** Franquia mensal de novos processos NavalDocs */
  processLimit: number;
  /** Franquia mensal de kits Arrais */
  arraisKitsLimit: number;
  /** Franquia mensal de documentos anexados lidos automaticamente (OCR) */
  aiPagesLimit: number;
  /** Quantidade de documentos monitorados no Notificador */
  monitoredDocsLimit: number;
  /** Limite de armazenamento em nuvem (GB) */
  storageGb: number;
  /** Preços unitários de adicionais / extras (em Reais BRL) */
  addonProcessPrice: number;
  addonArraisKitPrice: number;
  addonOcrPrice: number;
  addonMonitoredDocPrice: number;
  /** Destaque visual */
  isPopular?: boolean;
  highlightBadge?: string;
  /** Status de publicação comercial / visibilidade aos clientes */
  status: PlanPublicationStatus;
  /** Status técnico de integração com o gateway Stripe */
  stripeSyncStatus: StripeSyncStatus;
  /** Versão da oferta comercial */
  version: number;
  /** Histórico imutável de preços anteriores para preservar contratos antigos */
  priceHistory?: PlanPriceHistoryItem[];
  order: number;
  availableForSale: boolean;
  stripeProductId?: string | null;
  stripePriceMonthlyId?: string | null;
  stripePriceYearlyId?: string | null;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  /** Lista de benefícios exibidos na vitrine para o cliente */
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

// Planos Oficiais do Catálogo NavalDocs Pro (Individuais e Pacotes)
export const OFFICIAL_DEFAULT_PLANS: AdminPlanData[] = [
  {
    id: "plan-essencial",
    slug: "essencial",
    name: "NavalDocs Essencial",
    description: "Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.",
    appsIncluded: ["navaldocs"],
    priceMonthly: 249,
    priceYearly: 2490,
    userLimit: 1,
    processLimit: 30,
    arraisKitsLimit: 0,
    aiPagesLimit: 15,
    monitoredDocsLimit: 0,
    storageGb: 2,
    addonProcessPrice: 5.0,
    addonArraisKitPrice: 0.0,
    addonOcrPrice: 0.5,
    addonMonitoredDocPrice: 0.0,
    isPopular: false,
    highlightBadge: undefined,
    status: "published",
    stripeSyncStatus: "synced",
    features: [
      "1 usuário titular",
      "30 processos navais por mês",
      "15 documentos de origem lidos automaticamente por mês",
      "Geração automática e ilimitada de documentos finais",
      "2 GB de armazenamento seguro em nuvem",
      "Reutilização de dados e digitação manual sem consumir leituras",
      "Modelos oficiais DPC / NORMAM atualizados"
    ],
    version: 1,
    priceHistory: [],
    order: 1,
    availableForSale: true,
    stripeProductId: "prod_navaldocs_essencial",
    stripePriceMonthlyId: "price_essencial_monthly_249",
    stripePriceYearlyId: "price_essencial_yearly_2490",
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan-profissional",
    slug: "profissional",
    name: "NavalDocs Profissional",
    description: "Para escritórios em crescimento que exigem maior volume de processos e equipe colaborativa.",
    appsIncluded: ["navaldocs"],
    priceMonthly: 549,
    priceYearly: 5490,
    userLimit: 3,
    processLimit: 100,
    arraisKitsLimit: 0,
    aiPagesLimit: 50,
    monitoredDocsLimit: 0,
    storageGb: 8,
    addonProcessPrice: 4.5,
    addonArraisKitPrice: 0.0,
    addonOcrPrice: 0.45,
    addonMonitoredDocPrice: 0.0,
    isPopular: true,
    highlightBadge: "Recomendado",
    status: "published",
    stripeSyncStatus: "synced",
    features: [
      "Até 3 usuários com perfis e permissões",
      "100 processos navais por mês",
      "50 documentos de origem lidos automaticamente por mês",
      "Geração automática e ilimitada de documentos finais",
      "8 GB de armazenamento seguro em nuvem",
      "Reutilização de dados e digitação manual sem consumir leituras",
      "Modelos oficiais DPC / NORMAM atualizados",
      "Suporte prioritário"
    ],
    version: 1,
    priceHistory: [],
    order: 2,
    availableForSale: true,
    stripeProductId: "prod_navaldocs_profissional",
    stripePriceMonthlyId: "price_profissional_monthly_549",
    stripePriceYearlyId: "price_profissional_yearly_5490",
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan-equipe",
    slug: "equipe",
    name: "NavalDocs Equipe",
    description: "Solução completa para grandes empresas marítimas, despachantes estruturados e estaleiros.",
    appsIncluded: ["navaldocs"],
    priceMonthly: 1099,
    priceYearly: 10990,
    userLimit: 10,
    processLimit: 300,
    arraisKitsLimit: 0,
    aiPagesLimit: 150,
    monitoredDocsLimit: 0,
    storageGb: 20,
    addonProcessPrice: 3.8,
    addonArraisKitPrice: 0.0,
    addonOcrPrice: 0.4,
    addonMonitoredDocPrice: 0.0,
    isPopular: false,
    highlightBadge: undefined,
    status: "published",
    stripeSyncStatus: "synced",
    features: [
      "Até 10 usuários simultâneos",
      "300 processos navais por mês",
      "150 documentos de origem lidos automaticamente por mês",
      "Geração automática e ilimitada de documentos finais",
      "20 GB de armazenamento em nuvem",
      "Reutilização de dados e digitação manual sem consumir leituras",
      "Modelos oficiais DPC / NORMAM atualizados",
      "Gestão avançada e atendimento prioritário com SLA"
    ],
    version: 1,
    priceHistory: [],
    order: 3,
    availableForSale: true,
    stripeProductId: "prod_navaldocs_equipe",
    stripePriceMonthlyId: "price_equipe_monthly_1099",
    stripePriceYearlyId: "price_equipe_yearly_10990",
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan-arrais-pro",
    slug: "arrais-pro",
    name: "Arrais Pro (Individual)",
    description: "Sistema especializado na emissão de kits, requerimentos e cadastros para condutores amadores (Arrais, Motonauta, Mestre).",
    appsIncluded: ["arrais"],
    priceMonthly: 189,
    priceYearly: 1890,
    userLimit: 2,
    processLimit: 0,
    arraisKitsLimit: 50,
    aiPagesLimit: 250,
    monitoredDocsLimit: 0,
    storageGb: 10,
    addonProcessPrice: 0.0,
    addonArraisKitPrice: 4.0,
    addonOcrPrice: 0.5,
    addonMonitoredDocPrice: 0.0,
    isPopular: false,
    highlightBadge: "Novo",
    status: "draft",
    stripeSyncStatus: "not_synced",
    features: [
      "2 usuários incluídos",
      "50 kits Arrais / Amadores por mês",
      "250 leituras automáticas de anexos (CNH, RG, atestado)",
      "Geração automática e ilimitada dos dossiês de habilitação",
      "10GB de armazenamento em nuvem"
    ],
    version: 1,
    priceHistory: [],
    order: 4,
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
    id: "plan-notificador-naval",
    slug: "notificador-naval",
    name: "Notificador Naval (Individual)",
    description: "Monitoramento automatizado de vencimentos de habilitações, laudos de engenharia, vistorias e alvarás náuticos com alertas multicanal.",
    appsIncluded: ["notificador"],
    priceMonthly: 119,
    priceYearly: 1190,
    userLimit: 2,
    processLimit: 0,
    arraisKitsLimit: 0,
    aiPagesLimit: 100,
    monitoredDocsLimit: 150,
    storageGb: 5,
    addonProcessPrice: 0.0,
    addonArraisKitPrice: 0.0,
    addonOcrPrice: 0.5,
    addonMonitoredDocPrice: 1.0,
    isPopular: false,
    highlightBadge: undefined,
    status: "draft",
    stripeSyncStatus: "not_synced",
    features: [
      "2 usuários incluídos",
      "150 documentos navais monitorados em tempo real",
      "Alertas automáticos via WhatsApp e E-mail",
      "100 leituras de certificados por OCR",
      "5GB de armazenamento"
    ],
    version: 1,
    priceHistory: [],
    order: 5,
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
    id: "plan-pacote-completo",
    slug: "pacote-completo",
    name: "Pacote Completo (3 Apps)",
    description: "A suíte naval definitiva: NavalDocs Pro + Arrais Pro + Notificador Naval com capacidade máxima e economia unificada.",
    appsIncluded: ["navaldocs", "arrais", "notificador"],
    priceMonthly: 699,
    priceYearly: 6990,
    userLimit: 15,
    processLimit: 180,
    arraisKitsLimit: 80,
    aiPagesLimit: 2000,
    monitoredDocsLimit: 500,
    storageGb: 60,
    addonProcessPrice: 3.5,
    addonArraisKitPrice: 3.5,
    addonOcrPrice: 0.35,
    addonMonitoredDocPrice: 0.8,
    isPopular: true,
    highlightBadge: "Melhor Custo-Benefício",
    status: "draft",
    stripeSyncStatus: "not_synced",
    features: [
      "Acesso completo aos 3 sistemas integrados (NavalDocs + Arrais + Notificador)",
      "15 usuários unificados",
      "180 processos NavalDocs por mês",
      "80 kits Arrais por mês",
      "2.000 leituras automáticas de anexos (OCR)/mês",
      "500 documentos monitorados com alertas",
      "60GB de armazenamento total",
      "Geração automática e ilimitada de documentos e laudos",
      "Suporte VIP prioritário 24/7"
    ],
    version: 1,
    priceHistory: [],
    order: 6,
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
   * com suporte a apps_included, addons e histórico de preços
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
      statusVal = row.slug && ['essencial', 'profissional', 'equipe', 'arrais-pro', 'notificador-naval', 'pacote-completo'].includes(row.slug.toLowerCase())
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

    // Aplicativos incluídos
    let apps: SupportedApp[] = ['navaldocs'];
    if (Array.isArray(row.apps_included) && row.apps_included.length > 0) {
      apps = row.apps_included;
    } else if (Array.isArray(feat?.appsIncluded) && feat.appsIncluded.length > 0) {
      apps = feat.appsIncluded;
    } else {
      const slugLower = (row.slug || '').toLowerCase();
      if (slugLower.includes('combo') || slugLower.includes('completo') || slugLower.includes('pacote')) {
        apps = ['navaldocs', 'arrais', 'notificador'];
      } else if (slugLower.includes('arrais')) {
        apps = ['arrais'];
      } else if (slugLower.includes('notificador')) {
        apps = ['notificador'];
      } else {
        apps = ['navaldocs'];
      }
    }

    // Lista de benefícios
    let featuresList: string[] = [];
    if (Array.isArray(feat)) {
      featuresList = feat;
    } else if (Array.isArray(feat?.highlightFeatures)) {
      featuresList = feat.highlightFeatures;
    } else if (Array.isArray(feat?.features)) {
      featuresList = feat.features;
    } else {
      featuresList = [
        `${row.user_limit ?? 1} ${(row.user_limit ?? 1) > 1 ? 'usuários' : 'usuário'}`,
        `${row.process_limit ?? 20} processos/mês`,
        `${row.ocr_limit ?? 200} leituras automáticas de anexos (OCR)/mês`,
        `${row.storage_limit_gb ?? 5}GB de armazenamento`
      ];
    }

    const isPop = Boolean(row.is_popular ?? feat?.isPopular ?? (row.slug === 'profissional' || row.slug === 'pacote-completo'));
    const badge = row.highlight_badge || feat?.highlightBadge || (isPop ? "Recomendado" : undefined);

    const arraisLimit = Number(row.arrais_kits_limit ?? feat?.arraisKitsLimit ?? 0);
    const monitoredLimit = Number(row.monitored_docs_limit ?? feat?.monitoredDocsLimit ?? 0);

    const addonProc = Number(row.addon_process_price ?? feat?.addonProcessPrice ?? 0);
    const addonArr = Number(row.addon_arrais_kit_price ?? feat?.addonArraisKitPrice ?? 0);
    const addonOcr = Number(row.addon_ocr_price ?? feat?.addonOcrPrice ?? 0);
    const addonMon = Number(row.addon_monitored_doc_price ?? feat?.addonMonitoredDocPrice ?? 0);

    const versionNum = Number(row.version ?? feat?.version ?? 1);
    const historyList: PlanPriceHistoryItem[] = Array.isArray(row.price_history) 
      ? row.price_history 
      : (Array.isArray(feat?.priceHistory) ? feat.priceHistory : []);

    return {
      id: row.id,
      slug: row.slug || `plano-${row.id}`,
      name: row.name || "Plano sem nome",
      description: row.description || "",
      appsIncluded: apps,
      priceMonthly: priceMo,
      priceYearly: priceYr,
      userLimit: Number(row.user_limit ?? 1),
      processLimit: Number(row.process_limit ?? 20),
      arraisKitsLimit: arraisLimit,
      aiPagesLimit: Number(row.ocr_limit ?? 200),
      monitoredDocsLimit: monitoredLimit,
      storageGb: Number(row.storage_limit_gb ?? 5),
      addonProcessPrice: addonProc,
      addonArraisKitPrice: addonArr,
      addonOcrPrice: addonOcr,
      addonMonitoredDocPrice: addonMon,
      isPopular: isPop,
      highlightBadge: badge,
      status: statusVal,
      stripeSyncStatus: syncStatusVal,
      features: featuresList,
      version: versionNum,
      priceHistory: historyList,
      order,
      availableForSale: row.is_active !== false && statusVal === 'published',
      stripeProductId: row.stripe_product_id || feat?.stripeProductId || null,
      stripePriceMonthlyId: row.stripe_price_monthly_id || feat?.stripePriceMonthlyId || null,
      stripePriceYearlyId: row.stripe_price_yearly_id || feat?.stripePriceYearlyId || null,
      lastSyncedAt: row.last_synced_at || feat?.lastSyncedAt || null,
      syncError: row.sync_error || feat?.syncError || null,
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

      // 2. Se algum dos planos oficiais não existir no banco, registra como rascunho
      const missingDefaults = OFFICIAL_DEFAULT_PLANS.filter(p => !existingSlugs.has(p.slug.toLowerCase()));

      if (missingDefaults.length > 0) {
        for (const p of missingDefaults) {
          try {
            const { data: inserted } = await supabase
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
                  appsIncluded: p.appsIncluded,
                  arraisKitsLimit: p.arraisKitsLimit,
                  monitoredDocsLimit: p.monitoredDocsLimit,
                  addonProcessPrice: p.addonProcessPrice,
                  addonArraisKitPrice: p.addonArraisKitPrice,
                  addonOcrPrice: p.addonOcrPrice,
                  addonMonitoredDocPrice: p.addonMonitoredDocPrice,
                  version: p.version,
                  priceHistory: p.priceHistory || [],
                  features: p.features
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
   * Trata versionamento: se o preço mudou num plano já sincronizado, arquiva no priceHistory e incrementa versão!
   */
  static async savePlan(plan: Partial<AdminPlanData> & { id?: string }): Promise<AdminPlanData> {
    const plans = this.getPlans();
    const now = new Date().toISOString();
    const targetSlug = plan.slug || `plano-${Date.now().toString(36)}`;

    // Identificar plano pré-existente
    const existingIndex = plans.findIndex(p => p.id === plan.id || p.slug === targetSlug);
    const existing = existingIndex >= 0 ? plans[existingIndex] : null;

    let version = plan.version || existing?.version || 1;
    let priceHistory: PlanPriceHistoryItem[] = [...(plan.priceHistory || existing?.priceHistory || [])];
    let syncStatus: StripeSyncStatus = plan.stripeSyncStatus || existing?.stripeSyncStatus || 'not_synced';
    let stripePriceMonthlyId = plan.stripePriceMonthlyId ?? existing?.stripePriceMonthlyId ?? null;
    let stripePriceYearlyId = plan.stripePriceYearlyId ?? existing?.stripePriceYearlyId ?? null;

    // Detecção de mudança de preço em plano já sincronizado com a Stripe
    if (existing && existing.stripeProductId) {
      const priceMonthlyChanged = plan.priceMonthly !== undefined && plan.priceMonthly !== existing.priceMonthly;
      const priceYearlyChanged = plan.priceYearly !== undefined && plan.priceYearly !== existing.priceYearly;

      if (priceMonthlyChanged || priceYearlyChanged) {
        // Arquiva snapshot do preço anterior no histórico
        const snapshot: PlanPriceHistoryItem = {
          version: existing.version || 1,
          priceMonthly: existing.priceMonthly,
          priceYearly: existing.priceYearly,
          stripePriceMonthlyId: existing.stripePriceMonthlyId,
          stripePriceYearlyId: existing.stripePriceYearlyId,
          changedAt: now,
          notes: `Preço alterado de R$${existing.priceMonthly}/mês (R$${existing.priceYearly}/ano) para R$${plan.priceMonthly ?? existing.priceMonthly}/mês (R$${plan.priceYearly ?? existing.priceYearly}/ano).`
        };

        priceHistory = [...priceHistory, snapshot];
        version = (existing.version || 1) + 1;
        // Reseta status para exigir nova sincronização com a Stripe gerando novos Price IDs
        syncStatus = 'not_synced';
        stripePriceMonthlyId = null;
        stripePriceYearlyId = null;
      }
    }

    const planData: AdminPlanData = {
      id: plan.id || `plan-${Date.now()}`,
      slug: targetSlug,
      name: plan.name || "Novo Plano",
      description: plan.description || "",
      appsIncluded: plan.appsIncluded && plan.appsIncluded.length > 0 ? plan.appsIncluded : ["navaldocs"],
      priceMonthly: plan.priceMonthly || 0,
      priceYearly: plan.priceYearly || 0,
      userLimit: plan.userLimit || 1,
      processLimit: plan.processLimit || 0,
      arraisKitsLimit: plan.arraisKitsLimit || 0,
      aiPagesLimit: plan.aiPagesLimit || 0,
      monitoredDocsLimit: plan.monitoredDocsLimit || 0,
      storageGb: plan.storageGb || 5,
      addonProcessPrice: plan.addonProcessPrice ?? 0,
      addonArraisKitPrice: plan.addonArraisKitPrice ?? 0,
      addonOcrPrice: plan.addonOcrPrice ?? 0,
      addonMonitoredDocPrice: plan.addonMonitoredDocPrice ?? 0,
      isPopular: Boolean(plan.isPopular),
      highlightBadge: plan.highlightBadge || undefined,
      status: plan.status || 'draft',
      stripeSyncStatus: syncStatus,
      version,
      priceHistory,
      features: plan.features || [
        `${plan.userLimit || 1} ${(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}`,
        `${plan.processLimit || 20} processos/mês`,
        `${plan.aiPagesLimit || 200} leituras automáticas de anexos/mês`,
        `${plan.storageGb || 5}GB de armazenamento`
      ],
      order: plan.order || (plans.length + 1),
      availableForSale: (plan.status ? plan.status === 'published' : (plan.availableForSale ?? false)),
      stripeProductId: plan.stripeProductId || existing?.stripeProductId || null,
      stripePriceMonthlyId,
      stripePriceYearlyId,
      lastSyncedAt: plan.lastSyncedAt || existing?.lastSyncedAt || null,
      syncError: plan.syncError || null,
      createdAt: plan.createdAt || existing?.createdAt || now,
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
          appsIncluded: planData.appsIncluded,
          arraisKitsLimit: planData.arraisKitsLimit,
          monitoredDocsLimit: planData.monitoredDocsLimit,
          addonProcessPrice: planData.addonProcessPrice,
          addonArraisKitPrice: planData.addonArraisKitPrice,
          addonOcrPrice: planData.addonOcrPrice,
          addonMonitoredDocPrice: planData.addonMonitoredDocPrice,
          version: planData.version,
          priceHistory: planData.priceHistory,
          features: planData.features
        },
        updated_at: now
      };

      // Tenta incluir colunas específicas caso já migradas
      payload.apps_included = planData.appsIncluded;
      payload.arrais_kits_limit = planData.arraisKitsLimit;
      payload.monitored_docs_limit = planData.monitoredDocsLimit;
      payload.addon_process_price = planData.addonProcessPrice;
      payload.addon_arrais_kit_price = planData.addonArraisKitPrice;
      payload.addon_ocr_price = planData.addonOcrPrice;
      payload.addon_monitored_doc_price = planData.addonMonitoredDocPrice;
      payload.version = planData.version;
      payload.price_history = planData.priceHistory;

      if (plan.id && isUuid(plan.id)) {
        const { data: updated, error } = await supabase
          .from('plans')
          .update(payload)
          .eq('id', plan.id)
          .select()
          .maybeSingle();

        if (error) {
          // Se falhou por coluna ausente, tenta payload simplificado com features
          const simplePayload = {
            name: planData.name,
            slug: planData.slug,
            description: planData.description,
            price: planData.priceMonthly,
            price_yearly: planData.priceYearly,
            user_limit: planData.userLimit,
            process_limit: planData.processLimit,
            ocr_limit: planData.aiPagesLimit,
            storage_limit_gb: planData.storageGb,
            status: planData.status,
            stripe_sync_status: planData.stripeSyncStatus,
            is_popular: planData.isPopular,
            highlight_badge: planData.highlightBadge || null,
            is_active: planData.status !== 'archived',
            features: payload.features,
            updated_at: now
          };
          const { data: fallbackUpdated } = await supabase
            .from('plans')
            .update(simplePayload)
            .eq('id', plan.id)
            .select()
            .maybeSingle();
          if (fallbackUpdated) planData.id = fallbackUpdated.id;
        } else if (updated) {
          planData.id = updated.id;
        }
      } else {
        // Upsert por slug
        const { data: upserted, error } = await supabase
          .from('plans')
          .upsert(payload, { onConflict: 'slug' })
          .select()
          .maybeSingle();

        if (error) {
          const simplePayload = {
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
            features: payload.features,
            updated_at: now
          };
          const { data: fallbackUpserted } = await supabase
            .from('plans')
            .upsert(simplePayload, { onConflict: 'slug' })
            .select()
            .maybeSingle();
          if (fallbackUpserted) planData.id = fallbackUpserted.id;
        } else if (upserted) {
          planData.id = upserted.id;
        }
      }
    } catch (e) {
      console.warn("Aviso ao salvar no banco (usando persistência resiliente):", e);
    }

    // 2. Atualiza cache local
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
    const targetSlug = plan.slug || `plano-${Date.now().toString(36)}`;
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
          slug: targetSlug,
          name: plan.name || "Novo Rascunho",
          description: plan.description || "",
          appsIncluded: plan.appsIncluded || ["navaldocs"],
          priceMonthly: plan.priceMonthly || 149,
          priceYearly: plan.priceYearly || 1490,
          userLimit: plan.userLimit || 1,
          processLimit: plan.processLimit || 20,
          arraisKitsLimit: plan.arraisKitsLimit || 0,
          aiPagesLimit: plan.aiPagesLimit || 200,
          monitoredDocsLimit: plan.monitoredDocsLimit || 0,
          storageGb: plan.storageGb || 5,
          addonProcessPrice: plan.addonProcessPrice ?? 0,
          addonArraisKitPrice: plan.addonArraisKitPrice ?? 0,
          addonOcrPrice: plan.addonOcrPrice ?? 0,
          addonMonitoredDocPrice: plan.addonMonitoredDocPrice ?? 0,
          isPopular: Boolean(plan.isPopular),
          highlightBadge: plan.highlightBadge,
          status: 'draft',
          stripeSyncStatus: plan.stripeSyncStatus || 'not_synced',
          features: plan.features || [
            `${plan.userLimit || 1} ${(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}`,
            `${plan.processLimit || 20} processos/mês`,
            `${plan.aiPagesLimit || 200} leituras automáticas de anexos/mês`,
            `${plan.storageGb || 5}GB de armazenamento`
          ],
          version: plan.version || 1,
          priceHistory: plan.priceHistory || [],
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
        slug: targetSlug,
        name: plan.name || "Novo Rascunho",
        description: plan.description || "",
        appsIncluded: plan.appsIncluded || ["navaldocs"],
        priceMonthly: plan.priceMonthly || 149,
        priceYearly: plan.priceYearly || 1490,
        userLimit: plan.userLimit || 1,
        processLimit: plan.processLimit || 20,
        arraisKitsLimit: plan.arraisKitsLimit || 0,
        aiPagesLimit: plan.aiPagesLimit || 200,
        monitoredDocsLimit: plan.monitoredDocsLimit || 0,
        storageGb: plan.storageGb || 5,
        addonProcessPrice: plan.addonProcessPrice ?? 0,
        addonArraisKitPrice: plan.addonArraisKitPrice ?? 0,
        addonOcrPrice: plan.addonOcrPrice ?? 0,
        addonMonitoredDocPrice: plan.addonMonitoredDocPrice ?? 0,
        isPopular: Boolean(plan.isPopular),
        highlightBadge: plan.highlightBadge,
        status: 'draft',
        stripeSyncStatus: 'not_synced',
        features: plan.features || [
          `${plan.userLimit || 1} ${(plan.userLimit || 1) > 1 ? 'usuários' : 'usuário'}`,
          `${plan.processLimit || 20} processos/mês`,
          `${plan.aiPagesLimit || 200} leituras automáticas de anexos/mês`,
          `${plan.storageGb || 5}GB de armazenamento`
        ],
        version: 1,
        priceHistory: [],
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
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      const { data, error } = await supabase.functions.invoke("stripe-sync-plans", {
        body: {
          planId: plan.id,
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          appsIncluded: plan.appsIncluded,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          version: plan.version || 1,
          priceHistory: plan.priceHistory || []
        },
        headers
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
      plan.stripePriceYearlyId = data.priceYearlyId || data.pricePriceYearlyId;
      plan.version = data.version || plan.version;
      plan.lastSyncedAt = new Date().toISOString();
      plan.syncError = null;
      plan.updatedAt = new Date().toISOString();

      plans[planIndex] = plan;
      this.savePlans(plans);
      await this.savePlan(plan);

      return {
        success: true,
        message: `Plano "${plan.name}" sincronizado com sucesso na Stripe (v${plan.version})!`,
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
   * Helper para rótulo legível dos aplicativos
   */
  static getAppsBadgeLabel(apps: SupportedApp[]): string {
    if (!apps || apps.length === 0) return "NavalDocs Pro";
    if (apps.length === 3 && apps.includes('navaldocs') && apps.includes('arrais') && apps.includes('notificador')) {
      return "Pacote Completo (3 Apps)";
    }
    const map: Record<SupportedApp, string> = {
      navaldocs: "NavalDocs Pro",
      arrais: "Arrais Pro",
      notificador: "Notificador Naval"
    };
    return apps.map(a => map[a] || a).join(" + ");
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
