export interface NavalPlan {
  id: string;
  slug: 'trial' | 'starter' | 'professional' | 'enterprise' | 'lifetime';
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billingCycle: 'monthly' | 'yearly';
  customerLimit: number | null;
  vesselLimit: number | null;
  processLimit: number | null;
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
      "Assinatura Digital ICP-Brasil & QR Code",
      "Carimbo CREA / ART Automático",
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

export const TRIAL_CONFIG = {
  days: 14,
  label: "14 Dias Grátis",
  description: "Acesso irrestrito a todas as ferramentas durante os primeiros 14 dias após o cadastro."
};

export const ADMIN_LIFETIME_CONFIG = {
  label: "Acesso Vitalício Admin",
  description: "Acesso total, permanente e ilimitado concedido aos Administradores da plataforma."
};
