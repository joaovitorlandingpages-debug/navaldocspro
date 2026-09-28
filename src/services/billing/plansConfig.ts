import { StripeSyncService, AdminPlanData } from "./stripeSyncService";

export type NavalPlanSlug =
  | 'essencial'
  | 'profissional'
  | 'equipe'
  | 'despachante'
  | 'engenharia_pericia'
  | 'marina_estaleiro'
  | 'starter'
  | 'professional'
  | 'enterprise'
  | 'trial'
  | 'lifetime';

export type BillingCycle = 'monthly' | 'annual' | 'yearly';

export interface NavalPlan {
  id: string;
  slug: NavalPlanSlug;
  name: string;
  badge?: string;
  categoryTag?: string;
  description: string;
  priceMonthly: number;
  priceYearly: number; // Plano anual em cobrança única
  billingCycle: BillingCycle;
  customerLimit: number | null;
  vesselLimit: number | null;
  processLimit: number | null; // Novos processos/mês
  documentLimit: number | null;
  ocrLimit: number | null; // Páginas analisadas por IA/mês
  userLimit: number | null;
  additionalUserPrice?: number;
  storageGb: number | null;
  isPopular?: boolean;
  features: string[];
  highlightFeatures: string[];
  availableForSale?: boolean;
}

// 1. PLANOS OFICIAIS DO CATÁLOGO NAVALDOCS PRO
export const OFFICIAL_NAVAL_PLANS: NavalPlan[] = [
  {
    id: "plan-essencial",
    slug: "essencial",
    name: "Essencial",
    description: "Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.",
    priceMonthly: 249,
    priceYearly: 2490,
    billingCycle: "monthly",
    customerLimit: null,
    vesselLimit: null,
    processLimit: 30,
    documentLimit: null,
    ocrLimit: 15,
    userLimit: 1,
    storageGb: 2,
    isPopular: false,
    availableForSale: true,
    features: [
      "1 usuário titular",
      "30 processos navais por mês",
      "15 documentos de origem lidos automaticamente por mês",
      "Geração automática e ilimitada de documentos finais",
      "2 GB de armazenamento seguro em nuvem",
      "Reutilização de dados e digitação manual sem consumir leituras",
      "Modelos oficiais DPC / NORMAM atualizados"
    ],
    highlightFeatures: [
      "1 Usuário",
      "30 Processos/mês",
      "15 Leituras OCR/mês",
      "2 GB Storage"
    ]
  },
  {
    id: "plan-profissional",
    slug: "profissional",
    name: "Profissional",
    badge: "Recomendado",
    categoryTag: "Mais Escolhido por Escritórios Náuticos",
    isPopular: true,
    description: "Para escritórios em crescimento que exigem maior volume de processos e equipe colaborativa.",
    priceMonthly: 549,
    priceYearly: 5490,
    billingCycle: "monthly",
    customerLimit: null,
    vesselLimit: null,
    processLimit: 100,
    documentLimit: null,
    ocrLimit: 50,
    userLimit: 3,
    storageGb: 8,
    availableForSale: true,
    features: [
      "Até 3 usuários com controle de permissões",
      "100 processos navais por mês",
      "50 documentos de origem lidos automaticamente por mês",
      "Geração automática e ilimitada de documentos finais",
      "8 GB de armazenamento seguro em nuvem",
      "Reutilização de dados e digitação manual sem consumir leituras",
      "Modelos oficiais DPC / NORMAM atualizados",
      "Suporte prioritário"
    ],
    highlightFeatures: [
      "3 Usuários",
      "100 Processos/mês",
      "50 Leituras OCR/mês",
      "8 GB Storage"
    ]
  },
  {
    id: "plan-equipe",
    slug: "equipe",
    name: "Equipe",
    description: "Solução completa para grandes empresas marítimas, despachantes estruturados e estaleiros.",
    priceMonthly: 1099,
    priceYearly: 10990,
    billingCycle: "monthly",
    customerLimit: null,
    vesselLimit: null,
    processLimit: 300,
    documentLimit: null,
    ocrLimit: 150,
    userLimit: 10,
    storageGb: 20,
    isPopular: false,
    availableForSale: true,
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
    highlightFeatures: [
      "10 Usuários",
      "300 Processos/mês",
      "150 Leituras OCR/mês",
      "20 GB Storage"
    ]
  }
];

// PLANOS LEGADOS (PRESERVADOS PARA NÃO QUEBRAR ASSINATURAS ATIVAS)
export const LEGACY_NAVAL_PLANS: NavalPlan[] = [
  {
    id: "plan-despachante",
    slug: "despachante",
    name: "Despachante Naval (Legado)",
    description: "Plano contratado em condições anteriores.",
    priceMonthly: 129,
    priceYearly: 1290,
    billingCycle: "monthly",
    customerLimit: 100,
    vesselLimit: 80,
    processLimit: 50,
    documentLimit: 200,
    ocrLimit: 75,
    userLimit: 2,
    storageGb: 10,
    availableForSale: false,
    features: ["Contrato legado preservado"],
    highlightFeatures: ["Plano Legado"]
  },
  {
    id: "plan-engenharia-pericia",
    slug: "engenharia_pericia",
    name: "Engenharia & Perícia (Legado)",
    description: "Plano contratado em condições anteriores.",
    priceMonthly: 179,
    priceYearly: 1790,
    billingCycle: "monthly",
    customerLimit: 250,
    vesselLimit: 200,
    processLimit: 100,
    documentLimit: 500,
    ocrLimit: 200,
    userLimit: 3,
    storageGb: 30,
    availableForSale: false,
    features: ["Contrato legado preservado"],
    highlightFeatures: ["Plano Legado"]
  }
];

// Planos ativos expostos por padrão
export const NAVAL_PLANS: NavalPlan[] = OFFICIAL_NAVAL_PLANS;

/**
 * Retorna o catálogo comercial ativo publicado pelo Admin.
 * Se o administrador atualizou os planos no painel, reflete as alterações sem necessidade de deploy.
 */
export function getPublishedCatalogPlans(): NavalPlan[] {
  try {
    const adminCatalog = StripeSyncService.getPlans();
    if (adminCatalog && adminCatalog.length > 0) {
      return adminCatalog
        .filter(p => p.status === 'published' && p.availableForSale !== false)
        .map(p => {
          const defaultRef = OFFICIAL_NAVAL_PLANS.find(o => o.slug === p.slug);
          return {
            id: p.id,
            slug: p.slug as NavalPlanSlug,
            name: p.name,
            badge: p.highlightBadge || (p.isPopular ? "Recomendado" : undefined),
            description: p.description,
            priceMonthly: p.priceMonthly,
            priceYearly: p.priceYearly,
            billingCycle: "monthly" as BillingCycle,
            customerLimit: defaultRef?.customerLimit || 100,
            vesselLimit: defaultRef?.vesselLimit || 80,
            processLimit: p.processLimit,
            documentLimit: defaultRef?.documentLimit || 200,
            ocrLimit: p.aiPagesLimit,
            userLimit: p.userLimit,
            storageGb: p.storageGb,
            isPopular: p.isPopular,
            features: defaultRef?.features || [
              `${p.userLimit} usuário${p.userLimit > 1 ? 's' : ''}`,
              `${p.processLimit} processos/mês`,
              `${p.aiPagesLimit} páginas de IA/mês`,
              `${p.storageGb} GB de armazenamento total`,
              "Modelos oficiais DPC / NORMAM",
              "Assinatura eletrônica com verificação"
            ],
            highlightFeatures: [
              `${p.userLimit} Usuário${p.userLimit > 1 ? 's' : ''}`,
              `${p.processLimit} Processos/mês`,
              `${p.aiPagesLimit} Páginas IA`,
              `${p.storageGb} GB`
            ]
          };
        });
    }
  } catch (e) {
    console.warn("Falha ao ler catálogo dinâmico de planos, usando planos padrão:", e);
  }
  return OFFICIAL_NAVAL_PLANS;
}

export const TRIAL_CONFIG = {
  days: 30,
  durationDays: 30,
  campaignDurationDays: 60,
  userLimit: 1,
  processLimit: 10,
  ocrLimit: 100,
  storageGb: 1,
  retentionDaysAfterEnd: 30,
  limits: {
    customerLimit: 50,
    vesselLimit: 40,
    processLimit: 10,
    documentLimit: 100,
    userLimit: 1,
    ocrLimit: 100,
    storageGb: 1
  }
};

export const GRACE_PERIOD_CONFIG = {
  days: 5,
  description: "Período de tolerância de 5 dias corridos após o vencimento"
};

/**
 * Função de verificação para ambiente de testes de homologação/validação interna
 */
export function isHomologationBypass(
  companyId?: string | null,
  companyName?: string | null,
  isPilotOrDemo?: boolean
): boolean {
  if (!companyId) return false;
  if (isPilotOrDemo) return true;
  if (companyId === "admin-homologation" || companyId === "sub-homologation-bypass") return true;
  const name = (companyName || "").toLowerCase();
  return name.includes("homologação") || name.includes("homologacao") || name.includes("teste naval");
}


// Helpers de precificação usados pelo checkout e pela vitrine de planos
export function getPlanPrice(plan: NavalPlan, cycle: BillingCycle): number {
  return cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
}

export function calculateAnnualSavings(plan: NavalPlan): number {
  return plan.priceMonthly * 12 - plan.priceYearly;
}

export function getAnnualDiscountPercentage(plan: NavalPlan): number {
  const full = plan.priceMonthly * 12;
  if (!full) return 0;
  return Math.round((calculateAnnualSavings(plan) / full) * 100);
}
