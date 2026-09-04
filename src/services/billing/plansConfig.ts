export type NavalPlanSlug = 'trial' | 'starter' | 'professional' | 'enterprise' | 'lifetime';

export interface NavalPlan {
  id: string;
  slug: NavalPlanSlug;
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billingCycle: 'monthly' | 'yearly';
  customerLimit: number | null;
  vesselLimit: number | null;
  processLimit: number | null; // OS / Processos ativos por mês
  documentLimit: number | null;
  ocrLimit: number | null;
  userLimit: number | null;
  storageGb: number | null;
  isPopular?: boolean;
  features: string[];
  highlightFeatures: string[];
}

export const NAVAL_PLANS: NavalPlan[] = [
  {
    id: "plan-starter",
    slug: "starter",
    name: "Starter / Despachante",
    description: "Ideal para despachantes náuticos e profissionais autônomos iniciando a digitalização.",
    priceMonthly: 149,
    priceYearly: 1490, // 2 meses grátis
    billingCycle: "monthly",
    customerLimit: 50,
    vesselLimit: 25,
    processLimit: 50,
    documentLimit: 150,
    ocrLimit: 50,
    userLimit: 2,
    storageGb: 5,
    features: [
      "Até 25 embarcações cadastradas",
      "Até 50 processos navais ativos/mês",
      "150 gerações de documentos PDF",
      "50 leituras inteligentes via OCR",
      "2 usuários com acesso ao sistema",
      "Modelos oficiais da Capitania (DPC)",
      "Checklists básicos NORMAM-01/02/03",
      "Suporte via e-mail e ticket"
    ],
    highlightFeatures: [
      "25 Embarcações",
      "50 Processos / mês",
      "Assinatura Digital Básica"
    ]
  },
  {
    id: "plan-professional",
    slug: "professional",
    name: "Professional / Engenheiro Naval",
    badge: "MAIS ESCOLHIDO",
    isPopular: true,
    description: "Para engenheiros navais, consultorias e escritórios náuticos em crescimento.",
    priceMonthly: 299,
    priceYearly: 2990, // 2 meses grátis
    billingCycle: "monthly",
    customerLimit: 200,
    vesselLimit: 100,
    processLimit: 250,
    documentLimit: 500,
    ocrLimit: 200,
    userLimit: 5,
    storageGb: 20,
    features: [
      "Até 100 embarcações cadastradas",
      "Até 250 processos navais ativos/mês",
      "500 documentos PDF com papel timbrado",
      "200 leituras inteligentes OCR (TIE, CSN, BIE)",
      "5 usuários com permissões de equipe",
      "Assinaturas Digitais com Hash SHA-256 e QR Code",
      "Carimbo Digital do Engenheiro (CREA/ART)",
      "Portal do Cliente com link seguro de acompanhamento",
      "Dossiê Naval completo em PDF unificado e ZIP",
      "Suporte prioritário via WhatsApp"
    ],
    highlightFeatures: [
      "100 Embarcações",
      "250 Processos / mês",
      "Assinatura Digital ICP-Brasil & QR Code",
      "Portal do Cliente Incluso"
    ]
  },
  {
    id: "plan-enterprise",
    slug: "enterprise",
    name: "Enterprise / Estaleiro & Frota",
    badge: "ALTA PERFORMANCE",
    description: "Para estaleiros, marinas, operadores de frotas e grandes escritórios de engenharia naval.",
    priceMonthly: 599,
    priceYearly: 5990, // 2 meses grátis
    billingCycle: "monthly",
    customerLimit: null, // Ilimitado
    vesselLimit: null,
    processLimit: null,
    documentLimit: null,
    ocrLimit: null,
    userLimit: null,
    storageGb: 100,
    features: [
      "Embarcações ILIMITADAS",
      "Processos navais ILIMITADOS",
      "Geração de documentos e PDFs ILIMITADA",
      "Leituras de OCR ILIMITADAS",
      "Usuários e colaboradores ILIMITADOS",
      "White-label total (seu domínio e identidade visual)",
      "Motor de Automações & Alertas de Vencimento NORMAM",
      "Acesso completo à API e Webhooks",
      "Backup automático e auditoria enterprise",
      "Gerente de conta dedicado e onboarding VIP"
    ],
    highlightFeatures: [
      "Tudo ILIMITADO",
      "White-label Completo",
      "API & Integrações",
      "Suporte VIP 24/7"
    ]
  }
];

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
 * Dias de tolerância após o vencimento sem bloqueio de visualização,
 * alertando o usuário antes do bloqueio estrito de novas emissões.
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
 * Garante que a oficina/tenant principal de teste nunca sofra bloqueio de cotas durante a validação.
 */
export const HOMOLOGATION_CONFIG = {
  // Tenants conhecidos de homologação e validação contínua
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
 * Utiliza variáveis de ambiente e checagem de dados reais do banco, sem tocar em localStorage.
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
