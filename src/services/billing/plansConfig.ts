export type NavalPlanSlug =
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
  categoryTag?: string; // Tag visual de categoria (ex.: "Para Engenheiros e Vistoriadores")
  description: string;
  priceMonthly: number;
  priceYearly: number; // Plano anual com 2 meses grátis (10x o valor mensal)
  billingCycle: BillingCycle;
  customerLimit: number | null;
  vesselLimit: number | null;
  processLimit: number | null; // Limite de OS / Laudos simultâneos ativos por mês (null = Ilimitado)
  documentLimit: number | null;
  ocrLimit: number | null;
  userLimit: number | null; // Usuários inclusos (null = Ilimitado)
  additionalUserPrice?: number; // Preço por usuário adicional/mês
  storageGb: number | null; // Capacidade de armazenamento de fotos e PDFs
  isPopular?: boolean;
  features: string[];
  highlightFeatures: string[];
}

export const NAVAL_PLANS: NavalPlan[] = [
  // 1. PLANO DESPACHANTE NAVAL
  {
    id: "plan-despachante",
    slug: "despachante",
    name: "Despachante Naval",
    description: "Ideal para despachantes marítimos e oficinas focadas na gestão de processos e documentação de rotina.",
    priceMonthly: 129,
    priceYearly: 1290, // 2 meses grátis (R$ 129 x 10)
    billingCycle: "monthly",
    customerLimit: 100,
    vesselLimit: 80,
    processLimit: 50, // Até 50 OS/processos simultâneos por mês
    documentLimit: 200,
    ocrLimit: 75,
    userLimit: 2, // 2 usuários inclusos
    additionalUserPrice: 29, // R$ 29/usuário adicional
    storageGb: 10, // 10GB para fotos e PDFs
    features: [
      "Gestão de processos e documentação de rotina náutica",
      "Modelos oficiais da Capitania dos Portos (DPC)",
      "Checklists normativos NORMAM-01, 02 e 03",
      "Geração automatizada de requerimentos e procurações",
      "Assinatura digital integrada com QR Code",
      "Até 50 Ordens de Serviço simultâneas/mês",
      "2 usuários inclusos na equipe (+R$ 29/usuário extra)",
      "10GB para fotos de vistorias e anexos em PDF",
      "Suporte via e-mail e chamado técnico"
    ],
    highlightFeatures: [
      "50 OS / Processos Mês",
      "2 Usuários Inclusos",
      "10GB Fotos e PDFs",
      "Modelos Oficiais DPC"
    ]
  },

  // 2. PLANO ENGENHARIA & PERÍCIA
  {
    id: "plan-engenharia-pericia",
    slug: "engenharia_pericia",
    name: "Engenharia & Perícia",
    badge: "MAIS ESCOLHIDO",
    categoryTag: "Para Engenheiros e Vistoriadores",
    isPopular: true,
    description: "Solução completa e avançada para engenheiros navais, peritos marítimos e vistoriadores técnicos credenciados.",
    priceMonthly: 179,
    priceYearly: 1790, // 2 meses grátis (R$ 179 x 10)
    billingCycle: "monthly",
    customerLimit: 250,
    vesselLimit: 200,
    processLimit: 100, // Limite de 100 OS / Laudos Técnicos por mês
    documentLimit: 500,
    ocrLimit: 200,
    userLimit: 3, // 3 usuários inclusos
    additionalUserPrice: 25, // R$ 25/usuário adicional
    storageGb: 30, // 30GB para fotos em alta resolução e PDFs
    features: [
      "Módulo de Laudos Técnicos e Vistorias Navais",
      "Checklists de Segurança da Marinha do Brasil",
      "Anexo de Anotações de Responsabilidade Técnica (ART)",
      "Galeria de Fotos de Vistoria em Alta Resolução",
      "PDFs Formatados para Capitania dos Portos",
      "Até 100 OS / Laudos Técnicos simultâneos por mês",
      "3 usuários inclusos na equipe (+R$ 25/usuário extra)",
      "Carimbo Digital do Engenheiro Naval (CREA/ART)",
      "Assinaturas Digitais com Hash SHA-256 e QR Code",
      "Dossiê Naval completo em PDF unificado e ZIP",
      "Portal do Cliente com link de acompanhamento seguro",
      "Suporte prioritário via WhatsApp e Telefone"
    ],
    highlightFeatures: [
      "100 OS / Laudos Mês",
      "3 Usuários Inclusos",
      "Módulo Laudos & ART",
      "Fotos em Alta Resolução",
      "Carimbo CREA / ART"
    ]
  },

  // 3. PLANO MARINA & ESTALEIRO
  {
    id: "plan-marina-estaleiro",
    slug: "marina_estaleiro",
    name: "Marina & Estaleiro",
    badge: "TUDO ILIMITADO",
    description: "Gestão operacional total e irrestrita para estaleiros, marinas, oficinas e frotas náuticas de grande porte.",
    priceMonthly: 249,
    priceYearly: 2490, // 2 meses grátis (R$ 249 x 10)
    billingCycle: "monthly",
    customerLimit: null, // Ilimitado
    vesselLimit: null, // Ilimitado
    processLimit: null, // Tudo Ilimitado (OS, Laudos e Processos)
    documentLimit: null, // Ilimitado
    ocrLimit: null, // Ilimitado
    userLimit: null, // Usuários Ilimitados
    additionalUserPrice: 0,
    storageGb: 150, // 150GB dedicado para fotos e arquivos
    features: [
      "Ordens de Serviço (OS) e Laudos ILIMITADOS",
      "Embarcações e Clientes ILIMITADOS",
      "Usuários e Acessos ILIMITADOS",
      "Módulo de Controle de Estoque Náutico Avançado",
      "Módulo Completo de Vistorias Técnicas e ART",
      "Geração de Documentos e PDFs ILIMITADA",
      "Leituras inteligentes de OCR ILIMITADAS",
      "150GB de armazenamento dedicado para fotos e PDFs",
      "White-label com logotipo e cabeçalho customizado",
      "Motor de Automações & Alertas de Vencimento NORMAM",
      "Acesso completo à API e Webhooks",
      "Backup automático diário e trilha de auditoria",
      "Gerente de conta dedicado e suporte VIP 24/7"
    ],
    highlightFeatures: [
      "OS & Laudos Ilimitados",
      "Usuários Ilimitados",
      "Estoque Náutico Ilimitado",
      "150GB Fotos e PDFs",
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
 * Helper para compatibilidade de busca de plano por slug com suporte aos legados.
 */
export function findPlanBySlug(slug: string | null | undefined): NavalPlan {
  if (!slug) return NAVAL_PLANS[1]; // Engenharia & Perícia como padrão
  const clean = slug.toLowerCase().trim();

  const direct = NAVAL_PLANS.find((p) => p.slug === clean || p.id === clean);
  if (direct) return direct;

  // Aliases legados
  if (clean === "starter" || clean === "despachante") return NAVAL_PLANS[0];
  if (clean === "professional" || clean === "engenharia_pericia") return NAVAL_PLANS[1];
  if (clean === "enterprise" || clean === "marina_estaleiro") return NAVAL_PLANS[2];

  return NAVAL_PLANS[1];
}

/**
 * Regras do Período de Teste Grátis (Trial)
 */
export const TRIAL_CONFIG = {
  days: 14,
  label: "14 Dias Grátis",
  description: "Acesso irrestrito a todas as ferramentas durante os primeiros 14 dias após o cadastro.",
  limits: {
    customerLimit: 100,
    vesselLimit: 50,
    processLimit: 50,
    documentLimit: 150,
    ocrLimit: 50,
    userLimit: 3,
    storageGb: 10
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
