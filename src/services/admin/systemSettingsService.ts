import { supabase } from "@/integrations/supabase/client";

// ==========================================
// TIPOS DE CONFIGURAÇÃO GLOBAL DO SISTEMA
// ==========================================

export interface PlatformBrandingSettings {
  systemName: string;
  systemSlogan: string;
  companyLegalName: string;
  companyCnpj: string;
  logoUrlLight: string;
  logoUrlDark: string;
  faviconUrl: string;
  primaryColor: string; // Ex: #075BFF
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportHours: string;
  termsUrl: string;
  privacyUrl: string;
}

export interface PlatformBroadcastSettings {
  isEnabled: boolean;
  type: "info" | "warning" | "destructive" | "success";
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface OfficialMarinhaFeesSettings {
  inscricaoEmbarcacaoLancha: number; // R$
  inscricaoMotoAquatica: number;
  transferenciaPropriedade: number;
  renovacaoTieTiem: number;
  segundaViaDocumento: number;
  vistoriaArqueacao: number;
  inscricaoExameCha: number;
  renovacaoCha: number;
  taxaDespachoPorto: number;
  linkEmissaoGru: string;
  orientacoesPagamento: string;
}

export interface PlatformOperationalRules {
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  processDraftExpirationDays: number;
  requireGovBrSignature: boolean;
  enableAiOcrVision: boolean;
  enableDocumentWatermark: boolean;
  autoArchiveCompletedProcessesDays: number;
  allowManualDocumentUpload: boolean;
}

export interface NotificationTemplatesSettings {
  whatsappProcessCreated: string;
  whatsappSignaturesReady: string;
  whatsappProcessCompleted: string;
  emailProcessSummary: string;
}

export interface IntegrationGatewaysSettings {
  stripeMode: "test" | "live";
  stripePublicKey: string;
  stripeSecretKeyMasked?: string;
  whatsappProvider: "evolution" | "zapi" | "twilio" | "none";
  whatsappApiUrl: string;
  whatsappTokenMasked?: string;
  signatureProvider: "govbr" | "docusign" | "clicksign" | "zapsign";
  aiVisionProvider: "gemini" | "openai" | "anthropic";
}

export interface SystemFullSettings {
  branding: PlatformBrandingSettings;
  broadcast: PlatformBroadcastSettings;
  marinhaFees: OfficialMarinhaFeesSettings;
  operationalRules: PlatformOperationalRules;
  notifications: NotificationTemplatesSettings;
  integrations: IntegrationGatewaysSettings;
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// SERVIÇOS NÁUTICOS DINÂMICOS
// ==========================================

export interface DynamicNavalService {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string; // "Ship" | "ArrowLeftRight" | "FileText" | "Wrench" | "Search" | "FileCheck" | "Award" | "FileSpreadsheet" | "UserCheck" | "Anchor"
  requiresVessel: boolean;
  category: "maritimo" | "pessoal" | "tecnico";
  isActive: boolean;
  suggestedFee: number; // Honorários sugeridos em R$
  estimatedDays: string; // Ex: "5 a 10 dias úteis"
  officialNormam: string; // Ex: "NORMAM-211/DPC Anexo 2-C"
  order: number;
  associatedDocIds: string[]; // Documentos vinculados
  isCustom?: boolean;
}

// ==========================================
// PADRÕES DE FÁBRICA (DEFAULTS)
// ==========================================

export const DEFAULT_PLATFORM_SETTINGS: SystemFullSettings = {
  branding: {
    systemName: "NavalDocs Pro",
    systemSlogan: "Plataforma Inteligente de Documentação Náutica e Despacho Marítimo",
    companyLegalName: "NavalDocs Tecnologia Náutica Ltda",
    companyCnpj: "48.291.849/0001-20",
    logoUrlLight: "/logo-navaldocs.svg",
    logoUrlDark: "/logo-navaldocs-dark.svg",
    faviconUrl: "/favicon.ico",
    primaryColor: "#075BFF",
    supportEmail: "suporte@navaldocs.com.br",
    supportPhone: "(13) 3289-4400",
    supportWhatsapp: "5513987654321",
    supportHours: "Segunda a Sexta, das 08h às 18h (Horário de Brasília)",
    termsUrl: "https://navaldocs.com.br/termos",
    privacyUrl: "https://navaldocs.com.br/privacidade",
  },
  broadcast: {
    isEnabled: false,
    type: "info",
    title: "Comunicado Oficial NavalDocs",
    message: "Atenção despachantes: expediente normal nas Capitanias dos Portos.",
    actionText: "Ver Detalhes",
    actionUrl: "",
    isMaintenanceMode: false,
    maintenanceMessage: "Sistema em manutenção programada para atualização das tabelas da NORMAM-211. Voltaremos em breve.",
  },
  marinhaFees: {
    inscricaoEmbarcacaoLancha: 85.0,
    inscricaoMotoAquatica: 65.0,
    transferenciaPropriedade: 75.0,
    renovacaoTieTiem: 45.0,
    segundaViaDocumento: 55.0,
    vistoriaArqueacao: 140.0,
    inscricaoExameCha: 95.0,
    renovacaoCha: 50.0,
    taxaDespachoPorto: 0.0, // Isento segundo diretrizes NAVSEG
    linkEmissaoGru: "https://www.marinha.mil.br/dpc/sisgru",
    orientacoesPagamento: "Emita a GRU no portal da DPC selecionando a Capitania, Delegacia ou Agência competente e pague via PIX ou código de barras.",
  },
  operationalRules: {
    maxUploadSizeMb: 25,
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"],
    processDraftExpirationDays: 60,
    requireGovBrSignature: true,
    enableAiOcrVision: true,
    enableDocumentWatermark: true,
    autoArchiveCompletedProcessesDays: 180,
    allowManualDocumentUpload: true,
  },
  notifications: {
    whatsappProcessCreated: "Olá {{cliente_nome}}, seu processo naval {{codigo_processo}} ({{servico_nome}}) para a embarcação {{embarcacao_nome}} foi aberto no NavalDocs Pro! Acompanhe o status com seu despachante.",
    whatsappSignaturesReady: "Atenção {{cliente_nome}}: os documentos oficiais do processo {{codigo_processo}} estão prontos para sua assinatura digital Gov.br. Clique no link para assinar com segurança: {{link_assinatura}}",
    whatsappProcessCompleted: "Boas notícias {{cliente_nome}}! O processo naval {{codigo_processo}} foi concluído perante a Autoridade Marítima. Os documentos oficiais emitidos já estão disponíveis para download.",
    emailProcessSummary: "Prezado(a) {{cliente_nome}}, segue o resumo oficial da solicitação náutica protocolada sob o código {{codigo_processo}}.",
  },
  integrations: {
    stripeMode: "test",
    stripePublicKey: "pk_test_sample_stripe_key",
    stripeSecretKeyMasked: "sk_test_••••••••••••••••••••",
    whatsappProvider: "evolution",
    whatsappApiUrl: "https://api.whatsapp-gateway.navaldocs.com",
    whatsappTokenMasked: "tok_••••••••••••••••",
    signatureProvider: "govbr",
    aiVisionProvider: "gemini",
  },
  updatedAt: "2026-11-04T12:00:00Z",
  updatedBy: "SuperAdmin Global",
};

export const DEFAULT_SERVICES_CATALOG: DynamicNavalService[] = [
  {
    id: "inscricao",
    name: "Inscrição de embarcação",
    shortName: "Inscrição",
    description: "Cadastrar uma embarcação nova ou sem registro anterior no SISGEMB da Capitania.",
    iconName: "Ship",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 650.0,
    estimatedDays: "8 a 15 dias úteis",
    officialNormam: "NORMAM-211/DPC, Capítulo 2 c/c Anexo 2-C e BSADE (Anexo 2-B)",
    order: 1,
    associatedDocIds: ["doc_req_inscricao", "doc_bsade", "doc_procuracao", "doc_bade", "doc_decl_construcao"],
  },
  {
    id: "transferencia",
    name: "Transferência de propriedade",
    shortName: "Transferência",
    description: "Registrar a mudança de titularidade e posse entre vendedor e comprador.",
    iconName: "ArrowLeftRight",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 550.0,
    estimatedDays: "5 a 10 dias úteis",
    officialNormam: "NORMAM-211/DPC, Anexos 2-C, 2-K (ATPE) e 2-I (Comunicação)",
    order: 2,
    associatedDocIds: ["doc_req_transf", "doc_decl_transf", "doc_comunicacao_transf"],
  },
  {
    id: "renovacao",
    name: "Renovação de documento (TIE/TIEM)",
    shortName: "Renovação",
    description: "Renovar o Título de Inscrição da Embarcação vencido ou a vencer.",
    iconName: "FileText",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 350.0,
    estimatedDays: "3 a 7 dias úteis",
    officialNormam: "NORMAM-211/DPC, Item 0212 c/c Anexo 2-C e Declaração de Manutenção",
    order: 3,
    associatedDocIds: ["doc_req_renov", "doc_decl_renov"],
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor propulsor",
    shortName: "Alteração de motor",
    description: "Substituição, troca ou acréscimo de motor propulsor marítimo.",
    iconName: "Wrench",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 450.0,
    estimatedDays: "5 a 10 dias úteis",
    officialNormam: "NORMAM-211/DPC, Item 0216 c/c Termo de Responsabilidade de Motor",
    order: 4,
    associatedDocIds: ["doc_termo_motor"],
  },
  {
    id: "vistoria",
    name: "Vistoria / Perícia naval",
    shortName: "Vistoria",
    description: "Organizar e solicitar inspeção naval e arqueação regulamentar.",
    iconName: "Search",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 750.0,
    estimatedDays: "10 a 20 dias úteis",
    officialNormam: "NORMAM-211/DPC, Capítulo 3 c/c Anexo 2-C e ART de Arqueação",
    order: 5,
    associatedDocIds: ["doc_req_vistoria"],
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento náutico",
    shortName: "Segunda via",
    description: "Emitir nova via de TIE/TIEM por motivo de perda, roubo, dano ou extravio.",
    iconName: "FileCheck",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 300.0,
    estimatedDays: "3 a 7 dias úteis",
    officialNormam: "NORMAM-211/DPC, Item 0214 c/c Declaração de Perda (Anexo 2-H)",
    order: 6,
    associatedDocIds: ["doc_req_segunda_via", "doc_decl_perda"],
  },
  {
    id: "habilitacao_cha",
    name: "Emissão / Renovação de CHA (Amador)",
    shortName: "Habilitação náutica",
    description: "Carteira de Habilitação de Amador (Motonauta, Arrais, Mestre ou Capitão).",
    iconName: "Award",
    requiresVessel: false,
    category: "pessoal",
    isActive: true,
    suggestedFee: 400.0,
    estimatedDays: "5 a 15 dias úteis",
    officialNormam: "NORMAM-211/DPC, Capítulo 5 c/c Anexos 5-H, 5-D e 5-E",
    order: 7,
    associatedDocIds: ["doc_req_cha", "doc_decl_perda_cha", "doc_atestado_ara"],
  },
  {
    id: "alteracao_cadastral",
    name: "Alteração cadastral do proprietário",
    shortName: "Alteração cadastral",
    description: "Atualização de endereço residencial, razão social ou dados de contato.",
    iconName: "UserCheck",
    requiresVessel: false,
    category: "pessoal",
    isActive: true,
    suggestedFee: 250.0,
    estimatedDays: "3 a 5 dias úteis",
    officialNormam: "NORMAM-211/DPC, Item 0213 c/c Anexo 2-C e Lei 7.115/1983",
    order: 8,
    associatedDocIds: ["doc_req_alteracao_cadastral"],
  },
  {
    id: "despacho_porto",
    name: "Aviso de saída / Despacho de porto",
    shortName: "Despacho",
    description: "Comunicação de tráfego, plano de viagem e salvatagem conforme NAVSEG.",
    iconName: "Anchor",
    requiresVessel: true,
    category: "maritimo",
    isActive: true,
    suggestedFee: 150.0,
    estimatedDays: "Imediato (mesmo dia)",
    officialNormam: "NORMAM-211/DPC, Anexo 4-A c/c Diretrizes Oficiais NAVSEG",
    order: 9,
    associatedDocIds: ["doc_comunicacao_despacho"],
  },
  {
    id: "laudo_engenharia",
    name: "Laudo técnico pericial de estabilidade",
    shortName: "Laudo técnico",
    description: "Memorial descritivo, prova de inclinação e ART de engenheiro naval.",
    iconName: "FileSpreadsheet",
    requiresVessel: true,
    category: "tecnico",
    isActive: true,
    suggestedFee: 1800.0,
    estimatedDays: "15 a 30 dias úteis",
    officialNormam: "NORMAM-201/211 c/c Diretrizes CREA/CONFEA",
    order: 10,
    associatedDocIds: ["doc_req_vistoria"],
  },
];

// Chaves de armazenamento LocalStorage
export const STORAGE_KEYS = {
  SYSTEM_SETTINGS: "navaldocs_master_system_settings_v1",
  SERVICES_CATALOG: "navaldocs_master_services_catalog_v1",
};

// ==========================================
// FUNÇÕES DE CONFIGURAÇÕES GLOBAIS
// ==========================================

export function getSystemSettings(): SystemFullSettings {
  if (typeof localStorage === "undefined") {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.branding) {
        return {
          ...DEFAULT_PLATFORM_SETTINGS,
          ...parsed,
          branding: { ...DEFAULT_PLATFORM_SETTINGS.branding, ...parsed.branding },
          broadcast: { ...DEFAULT_PLATFORM_SETTINGS.broadcast, ...parsed.broadcast },
          marinhaFees: { ...DEFAULT_PLATFORM_SETTINGS.marinhaFees, ...parsed.marinhaFees },
          operationalRules: { ...DEFAULT_PLATFORM_SETTINGS.operationalRules, ...parsed.operationalRules },
          notifications: { ...DEFAULT_PLATFORM_SETTINGS.notifications, ...parsed.notifications },
          integrations: { ...DEFAULT_PLATFORM_SETTINGS.integrations, ...parsed.integrations },
        };
      }
    }
  } catch (error) {
    console.warn("[systemSettingsService] Erro ao ler system settings do storage:", error);
  }

  return DEFAULT_PLATFORM_SETTINGS;
}

export async function saveSystemSettings(settings: SystemFullSettings): Promise<void> {
  const payload = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. Salvar no localStorage para resposta instantânea
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(payload));
    } catch (e) {
      console.error("[systemSettingsService] Erro ao gravar localstorage:", e);
    }
  }

  // 2. Disparar evento global para reatividade imediata no DOM/componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("navaldocs_system_settings_updated", { detail: payload })
    );
  }

  // 3. Persistir de forma permanente no Supabase (system_settings)
  try {
    const { error } = await supabase.from("system_settings").upsert(
      {
        key: "platform_full_settings",
        value: payload as any,
        description: "Configurações mestras da plataforma NavalDocs Pro gerenciadas pelo SuperAdmin",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) {
      console.warn("[systemSettingsService] Aviso ao persistir no Supabase (usando local):", error.message);
    }
  } catch (err) {
    console.warn("[systemSettingsService] Falha de rede ao persistir no Supabase:", err);
  }
}

export function resetSystemSettingsToDefaults(): SystemFullSettings {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_SETTINGS);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("navaldocs_system_settings_updated", { detail: DEFAULT_PLATFORM_SETTINGS })
    );
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

// ==========================================
// FUNÇÕES DO CATÁLOGO DE SERVIÇOS NÁUTICOS
// ==========================================

export function getDynamicServicesCatalog(): DynamicNavalService[] {
  if (typeof localStorage === "undefined") {
    return DEFAULT_SERVICES_CATALOG;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES_CATALOG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("[systemSettingsService] Erro ao ler catálogo de serviços do storage:", error);
  }

  return DEFAULT_SERVICES_CATALOG;
}

/**
 * Retorna exclusivamente os serviços ativos para exibição em Novo Pedido
 */
export function getActiveServicesCatalog(): DynamicNavalService[] {
  const all = getDynamicServicesCatalog();
  return all.filter((s) => s.isActive);
}

export async function saveDynamicServicesCatalog(services: DynamicNavalService[]): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVICES_CATALOG, JSON.stringify(services));
    } catch (e) {
      console.error("[systemSettingsService] Erro ao salvar serviços no localStorage:", e);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("navaldocs_services_catalog_updated", { detail: { count: services.length } })
    );
  }

  try {
    await supabase.from("system_settings").upsert(
      {
        key: "naval_services_catalog",
        value: services as any,
        description: "Catálogo dinâmico de serviços náuticos e honorários do NavalDocs Pro",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } catch (err) {
    console.warn("[systemSettingsService] Aviso ao persistir catálogo de serviços no Supabase:", err);
  }
}

export async function addDynamicService(
  newService: Omit<DynamicNavalService, "id">
): Promise<DynamicNavalService> {
  const current = getDynamicServicesCatalog();
  const id = `serv_custom_${Date.now()}`;
  const created: DynamicNavalService = {
    ...newService,
    id,
    isCustom: true,
  };
  const updated = [...current, created];
  await saveDynamicServicesCatalog(updated);
  return created;
}

export async function updateDynamicService(
  id: string,
  updates: Partial<DynamicNavalService>
): Promise<void> {
  const current = getDynamicServicesCatalog();
  const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
  await saveDynamicServicesCatalog(updated);
}

export async function toggleDynamicServiceActive(id: string): Promise<boolean> {
  const current = getDynamicServicesCatalog();
  let newState = false;
  const updated = current.map((s) => {
    if (s.id === id) {
      newState = !s.isActive;
      return { ...s, isActive: newState };
    }
    return s;
  });
  await saveDynamicServicesCatalog(updated);
  return newState;
}

export async function deleteDynamicService(id: string): Promise<void> {
  const current = getDynamicServicesCatalog();
  const updated = current.filter((s) => s.id !== id);
  await saveDynamicServicesCatalog(updated);
}

export function resetDynamicServicesToDefaults(): DynamicNavalService[] {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.SERVICES_CATALOG);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("navaldocs_services_catalog_updated", { detail: { count: DEFAULT_SERVICES_CATALOG.length } })
    );
  }
  return DEFAULT_SERVICES_CATALOG;
}

