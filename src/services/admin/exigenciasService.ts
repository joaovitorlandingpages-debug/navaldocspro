export type StatusExigencia = "pendente" | "em_cumprimento" | "protocolado" | "deferido";

export interface ExigenciaMarinha {
  id: string;
  codigoProcesso: string; // Ex: "NAV-2026-09380"
  nomeCliente: string;
  telefoneCliente: string;
  nomeEmbarcacao: string;
  omCapitania: string; // Ex: "CPSP - Santos"
  dataNotificacao: string; // "YYYY-MM-DD"
  prazoDias: number; // Geralmente 30 ou 60 dias
  dataLimite: string; // "YYYY-MM-DD"
  vistoriadorResponsavel?: string; // Ex: "Suboficial Marins"
  motivoExigencia: string; // Ex: "Falta apresentação de ART do engenheiro ou nova foto da popa"
  documentosSolicitados: string[];
  status: StatusExigencia;
  dataCumprimento?: string;
  notasInternas?: string;
}

export const DEFAULT_EXIGENCIAS: ExigenciaMarinha[] = [
  {
    id: "exig_01",
    codigoProcesso: "NAV-2026-08124",
    nomeCliente: "Carlos Eduardo Ramos",
    telefoneCliente: "5513987654321",
    nomeEmbarcacao: "MAR AZUL IV",
    omCapitania: "CPSP - Santos",
    dataNotificacao: "2026-10-25",
    prazoDias: 30,
    dataLimite: "2026-11-24",
    vistoriadorResponsavel: "SO-MR Fontes",
    motivoExigencia: "Apresentar fotografia nítida da popa com a grafia legível do porto de inscrição e nome da embarcação conforme item 0205 da NORMAM-211.",
    documentosSolicitados: ["Fotografia da Popa em Alta Resolução"],
    status: "em_cumprimento",
    notasInternas: "Cliente já avisado via WhatsApp. Prometeu enviar fotos tiradas na marina até sexta-feira.",
  },
  {
    id: "exig_02",
    codigoProcesso: "NAV-2026-07910",
    nomeCliente: "Roberto Alencar",
    telefoneCliente: "5511976548899",
    nomeEmbarcacao: "SEA HUNTER III",
    omCapitania: "DelSãoSebastião",
    dataNotificacao: "2026-10-18",
    prazoDias: 30,
    dataLimite: "2026-11-17",
    vistoriadorResponsavel: "Cap. Ten. Gouveia",
    motivoExigencia: "Anexar laudo de arqueação e estabilidade com ART assinada pelo engenheiro naval responsável.",
    documentosSolicitados: ["ART CREA Engenheiro Naval", "Memorial de Arqueação"],
    status: "pendente",
    notasInternas: "Engenheiro responsável já está revisando o memorial descritivo.",
  },
];

const EXIGENCIAS_STORAGE_KEY = "navaldocs_admin_exigencias_v1";

export function getExigencias(): ExigenciaMarinha[] {
  if (typeof localStorage === "undefined") {
    return DEFAULT_EXIGENCIAS;
  }
  try {
    const raw = localStorage.getItem(EXIGENCIAS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao ler exigências do storage:", e);
  }
  return DEFAULT_EXIGENCIAS;
}

export function saveExigencias(list: ExigenciaMarinha[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(EXIGENCIAS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("navaldocs_exigencias_updated", { detail: { count: list.length } }));
  }
}

export function addExigencia(nova: Omit<ExigenciaMarinha, "id">): ExigenciaMarinha {
  const list = getExigencias();
  const created: ExigenciaMarinha = {
    ...nova,
    id: `exig_${Date.now()}`,
  };
  const updated = [created, ...list];
  saveExigencias(updated);
  return created;
}

export function updateExigencia(id: string, updates: Partial<ExigenciaMarinha>): void {
  const list = getExigencias();
  const updated = list.map((e) => (e.id === id ? { ...e, ...updates } : e));
  saveExigencias(updated);
}

export function deleteExigencia(id: string): void {
  const list = getExigencias();
  const updated = list.filter((e) => e.id !== id);
  saveExigencias(updated);
}

/**
 * Calcula dias restantes para o prazo fatal da Capitania
 */
export function getDiasRestantes(dataLimiteStr: string): number {
  try {
    const limite = new Date(dataLimiteStr + "T23:59:59").getTime();
    const hoje = new Date().getTime();
    const diffMs = limite - hoje;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}
