export type NavalPlanSlug = 'trial' | 'starter' | 'professional' | 'enterprise' | 'lifetime';
export type BillingCycle = 'monthly' | 'annual' | 'yearly';

export interface NavalPlan {
  id: string;
  slug: NavalPlanSlug;
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceYearly: number; // Plano anual com 2 meses grátis / ~17-20% off
  billingCycle: BillingCycle;
  customerLimit: number | null;
  vesselLimit: number | null;
  processLimit: number | null; // Quantidade de OS simultâneas ativas por mês
  documentLimit: number | null;
  ocrLimit: number | null;
  userLimit: number | null; // Usuários inclusos
  additionalUserPrice?: number; // Preço por usuário adicional/mês
  storageGb: number | null; // Capacidade de armazenamento de fotos e PDFs
  isPopular?: boolean;
  features: string[];
  highlightFeatures: string[];
}

export const NAVAL_PLANS: NavalPlan[] = [
  {
    id: "plan-starter",
    slug: "starter",
    name: "Starter / Despachante & Oficina",
    description: "Ideal para despachantes náuticos, mecânicos autônomos e oficinas iniciando a gestão digital.",
    priceMonthly: 89,
    priceYearly: 890, // 2 meses grátis (R$ 89 x 10)
    billingCycle: "monthly",
    customerLimit: 50,
    vesselLimit: 30,
    processLimit: 50, // Até 50 OS simultâneas/mês
    documentLimit: 150,
    ocrLimit: 50,
    userLimit: 2, // 2 usuários inclusos
    additionalUserPrice: 29, // R$ 29/usuário adicional
    storageGb: 5, // 5GB para fotos de vistorias e PDFs
    features: [
      "Até 50 Ordens de Serviço simultâneas/mês",
      "Até 30 embarcações cadastradas",
      "2 usuários inclusos (R$ 29/usuário adicional)",
      "5GB para armazenamento de fotos e PDFs",
      "150 gerações de documentos PDF",
      "50 leituras inteligentes via OCR",
      "Modelos oficiais da Capitania (DPC)",
      "Checklists básicos NORMAM",
      "Suporte via e-mail e chamado"
    ],
    highlightFeatures: [
      "50 OS Simultâneas",
      "2 Usuários Inclusos",
      "5GB Fotos e PDFs",
      "Assinatura Digital Básica"
    ]
  },
  {
    id: "plan-professional",
    slug: "professional",
    name: "Professional / Engenheiro Naval & Estaleiro",
    badge: "MAIS ESCOLHIDO",
    isPopular: true,
    description: "Para oficinas consolidadas, consultorias e engenheiros navais que demandam alto volume.",
    priceMonthly: 179,
    priceYearly: 1790, // 2 meses grátis (R$ 179 x 10)
    billingCycle: "monthly",
    customerLimit: 250,
    vesselLimit: 150,
    processLimit: 250, // Até 250 OS simultâneas/mês
    documentLimit: 500,
    ocrLimit: 200,
    userLimit: 5, // 5 usuários inclusos
    additionalUserPrice: 25, // R$ 25/usuário adicional
    storageGb: 20, // 20GB para fotos e PDFs
    features: [
      "Até 250 Ordens de Serviço simultâneas/mês",
      "Até 150 embarcações cadastradas",
      "5 usuários inclusos na equipe",
      "20GB para fotos em alta resolução e PDFs",
      "500 documentos PDF com papel timbrado",
      "200 leituras inteligentes OCR (TIE, CSN, BIE)",
      "Assinaturas Digitais com Hash SHA-256 e QR Code",
      "Carimbo Digital do Engenheiro (CREA/ART)",
      "Portal do Cliente com link seguro de acompanhamento",
      "Dossiê Naval completo em PDF unificado e ZIP",
      "Suporte prioritário via WhatsApp"
    ],
    highlightFeatures: [
      "250 OS Simultâneas",
      "5 Usuários Inclusos",
      "20GB Fotos e PDFs",
      "Assinatura Digital ICP-Brasil & QR Code",
      "Portal do Cliente Incluso"
    ]
  },
  {
    id: "plan-enterprise",
    slug: "enterprise",
    name: "Enterprise / Grande Estaleiro & Frota",
    badge: "ALTA PERFORMANCE",
    description: "Para estaleiros de grande porte, marinas, frotas náuticas e oficinas de grande escala.",
    priceMonthly: 499,
    priceYearly: 4990, // 2 meses grátis (R$ 499 x 10)
    billingCycle: "monthly",
    customerLimit: null, // Ilimitado
    vesselLimit: null,
    processLimit: null, // OS ilimitadas
    documentLimit: null,
    ocrLimit: null,
    userLimit: 15, // 15 usuários inclusos
    additionalUserPrice: 19,
    storageGb: 100, // 100GB para fotos e arquivos
    features: [
      "Ordens de Serviço (OS) ILIMITADAS",
      "Embarcações ILIMITADAS",
      "15 usuários inclusos (expansível)",
      "100GB de armazenamento dedicado para fotos e PDFs",
      "Geração de documentos e PDFs ILIMITADA",
      "Leituras de OCR ILIMITADAS",
      "White-label total (seu domínio e logotipo)",
      "Motor de Automações & Alertas de Vencimento NORMAM",
      "Acesso completo à API e Webhooks",
      "Backup automático diário e trilha de auditoria",
      "Gerente de conta dedicado e onboarding VIP"
    ],
    highlightFeatures: [
      "OS Ilimitadas",
      "15 Usuários Inclusos",
      "100GB Fotos e PDFs",
      "White-label Completo",
      "Suporte VIP 24/7"
    ]
  }
];

/**
 * Retorna o valor de cobrança de acordo com o ciclo (mensal ou anual).
 */
export function getPlanPrice(plan: NavalPlan, cycle: BillingCycle = 'monthly'): number {
  if (cycle === 'annual' || cycle === 'yearly') {
    return plan.priceYearly;
  }
  return plan.priceMonthly;
}

/**
 * Calcula a economia em Reais do plano anual (equivalente a 2 meses grátis).
 */
export function calculateAnnualSavings(plan: NavalPlan): number {
  return (plan.priceMonthly * 12) - plan.priceYearly;
}

/**
 * Retorna a porcentagem de desconto do plano anual (ex.: ~17%).
 */
export function getAnnualDiscountPercentage(plan: NavalPlan): number {
  const fullYearPrice = plan.priceMonthly * 12;
  if (fullYearPrice <= 0) return 0;
  const discount = ((fullYearPrice - plan.priceYearly) / fullYearPrice) * 100;
  return Math.round(discount);
}

/**
 * Regras do Período de Teste Grátis (Trial)
 */
export const TRIAL_CONFIG = {
  days: 14,
  label: "14 Dias Grátis",
  description: "Acesso irrestrito a todas as ferramentas durante os primeiros 14 dias após o cadastro.",
  limits: {
    customerLimit: 50,
    vesselLimit: 25,
    processLimit: 50,
    documentLimit: 100,
    ocrLimit: 50,
    userLimit: 3,
    storageGb: 5
  }
};

/**
 * Regras do Período de Carência (Grace Period)
 */
export const GRACE_PERIOD_CONFIG = {
  days: 5,
  label: "Período de Carência",
  description: "Tolerância de 5 dias após a data de renovação para regularização de pagamento sem perda imediata das operações."
};

/**
 * Acesso Vitalício Admin
 */
export const ADMIN_LIFETIME_CONFIG = {
  label: "Acesso Vitalício Admin",
  description: "Acesso total, permanente e ilimitado concedido aos Administradores da plataforma."
};

/**
 * Configuração e Bypass Seguro para Homologação
 */
export const HOMOLOGATION_CONFIG = {
  knownBypassTenants: [
    "homologacao",
    "demo-company",
    "naval-homologacao",
    "oficina-homologacao",
    "master-homologacao",
    "oficina-teste",
    "admin-company"
  ] as string[],

  label: "Modo Homologação",
  badge: "Bypass Validação",
  description: "Tenant de homologação com cotas ilimitadas para testes e validação contínua."
};

/**
 * Helper seguro para identificar se o tenant está em modo de homologação/validação.
 */
export function isHomologationBypass(
  companyId?: string | null,
  companyName?: string | null,
  isDemoOrPilot?: boolean | null
): boolean {
  if (!companyId && !companyName) return false;

  // 1. Checa se o companyId corresponde à variável de ambiente configurada
  const envHomologationId = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_HOMOLOGATION_COMPANY_ID as string | undefined)
    : undefined;

  if (envHomologationId && companyId === envHomologationId) {
    return true;
  }

  // 2. Checa IDs fixos de homologação
  if (companyId && HOMOLOGATION_CONFIG.knownBypassTenants.includes(companyId.toLowerCase().trim())) {
    return true;
  }

  // 3. Checa o nome corporativo por tags seguras de homologação
  if (companyName) {
    const normalized = companyName.toLowerCase();
    if (
      normalized.includes("[homologação]") ||
      normalized.includes("[homologacao]") ||
      normalized.includes("oficina homologação") ||
      normalized.includes("oficina homologacao") ||
      normalized.includes("tenant homologação") ||
      normalized.includes("ambiente de homologacao") ||
      normalized.includes("teste naval oficial")
    ) {
      return true;
    }
  }

  // 4. Se a empresa tem flag is_pilot ou is_demo no Supabase e bypass global ativo
  const pilotBypassEnabled = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_PILOT_BYPASS_ENABLED === 'true')
    : false;

  if (pilotBypassEnabled && isDemoOrPilot === true) {
    return true;
  }

  return false;
}
