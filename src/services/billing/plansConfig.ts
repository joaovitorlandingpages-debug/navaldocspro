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
    priceMonthly: 149,
    priceYearly: 1490,
    billingCycle: "monthly",
    customerLimit: 50,
    vesselLimit: 40,
    processLimit: 20,
    documentLimit: 100,
    ocrLimit: 200,
    userLimit: 1,
    storageGb: 5,
    isPopular: false,
    availableForSale: true,
    features: [
      "1 usuário incluindo o titular",
      "20 novos processos por mês",
      "200 páginas analisadas por IA por mês",
      "5 GB de armazenamento total",
      "Modelos oficiais da Capitania dos Portos (DPC)",
      "Reaproveitamento inteligente de documentos",
      "Geração automatizada de requerimentos e procurações",
      "Assinatura eletrônica com QR Code de verificação",
      "Suporte prioritário por e-mail"
    ],
    highlightFeatures: [
      "1 Usuário",
      "20 Processos/mês",
      "200 Páginas IA/mês",
      "5 GB Storage"
    ]
  },
  {
    id: "plan-profissional",
    slug: "profissional",
    name: "Profissional",
    badge: "Recomendado",
    categoryTag: "Mais Escolhido por Engenheiros e Vistoriadores",
    isPopular: true,
    description: "Para escritórios em crescimento que exigem mais capacidade analítica com IA e múltiplos usuários.",
    priceMonthly: 299,
    priceYearly: 2990,
    billingCycle: "monthly",
    customerLimit: 200,
    vesselLimit: 150,
    processLimit: 60,
    documentLimit: 300,
    ocrLimit: 600,
    userLimit: 3,
    storageGb: 15,
    availableForSale: true,
    features: [
      "3 usuários incluindo o titular",
      "60 novos processos por mês",
      "600 páginas analisadas por IA por mês",
      "15 GB de armazenamento total",
      "Destaque 'Recomendado' para escritórios estruturados",
      "Módulo de Laudos Técnicos e Vistorias Navais",
      "Checklists normativos NORMAM-01, 02 e 03",
      "Personalização com marca-d'água oficial da empresa",
      "Geração de pacotes ZIP com arquivos prontos",
      "Suporte via e-mail e WhatsApp em horário comercial"
    ],
    highlightFeatures: [
      "3 Usuários",
      "60 Processos/mês",
      "600 Páginas IA/mês",
      "15 GB Storage"
    ]
  },
  {
    id: "plan-equipe",
    slug: "equipe",
    name: "Equipe",
    description: "Solução completa para grandes empresas marítimas, estaleiros e consultorias com alta demanda.",
    priceMonthly: 599,
    priceYearly: 5990,
    billingCycle: "monthly",
    customerLimit: 500,
    vesselLimit: 400,
    processLimit: 150,
    documentLimit: 800,
    ocrLimit: 1500,
    userLimit: 10,
    storageGb: 40,
    isPopular: false,
    availableForSale: true,
    features: [
      "10 usuários incluindo o titular",
      "150 novos processos por mês",
      "1.500 páginas analisadas por IA por mês",
      "40 GB de armazenamento total",
      "Gestão avançada de múltiplos escritórios e filiais",
      "Auditoria de ações da IA e relatórios de conformidade",
      "Exportação em lote e integrações avançadas",
      "Gestor de conta dedicado e onboarding técnico"
    ],
    highlightFeatures: [
      "10 Usuários",
      "150 Processos/mês",
      "1.500 Páginas IA/mês",
      "40 GB Storage"
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
        .filter(p => p.availableForSale)
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
