/**
 * Catálogo estático de conhecimento por documento naval.
 * Alimenta o SmartDocumentCard com finalidade, dados usados,
 * checklist pré-geração, base legal e erros comuns.
 * Consulta case-insensitive por `item_name`.
 */

export type DocumentKnowledge = {
  purpose: string;
  dataUsed: string[];
  preflightChecklist: string[];
  howItWorks: string;
  whoSigns?: string;
  whenMandatory?: string;
  whenWaived?: string;
  commonErrors: string[];
  relatedDocs: string[];
  legalBase: {
    norm: string;
    annex?: string;
    template?: string;
    version?: string;
    updatedAt?: string;
  };
  averageTime?: string;
};

const CATALOG: Record<string, DocumentKnowledge> = {
  procuracao: {
    purpose:
      "Concede poderes ao engenheiro/despachante para representar o proprietário perante a Marinha do Brasil, Capitania dos Portos e órgãos correlatos.",
    dataUsed: ["Nome do proprietário", "CPF", "RG", "Endereço", "Cidade", "Estado", "Dados do engenheiro", "Data de emissão"],
    preflightChecklist: ["Nome completo do outorgante", "CPF sem erros", "Endereço atualizado", "Poderes específicos listados", "Local e data"],
    howItWorks:
      "Documento particular assinado pelo proprietário da embarcação outorgando poderes ao representante técnico para tramitar processos junto à Marinha.",
    whoSigns: "Proprietário (outorgante). Reconhecimento de firma pode ser exigido pela Capitania local.",
    whenMandatory: "Sempre que o processo é conduzido por terceiro (engenheiro, despachante, escritório).",
    commonErrors: ["CPF/RG divergentes do documento de identidade", "Falta de especificação dos poderes", "Endereço desatualizado"],
    relatedDocs: ["Cópia do RG/CPF", "Comprovante de residência"],
    legalBase: { norm: "NORMAM-01/DPC", annex: "Anexo 3-B", template: "Procuração particular padrão", version: "2024", updatedAt: "2024-01" },
    averageTime: "2-3 minutos",
  },
  requerimento: {
    purpose: "Solicita formalmente à autoridade marítima o serviço pretendido (inscrição, transferência, alteração, cancelamento).",
    dataUsed: ["Cliente", "Embarcação", "Tipo de serviço", "Capitania de destino", "Justificativa", "Data"],
    preflightChecklist: ["Tipo de serviço correto", "Dados do requerente", "Dados da embarcação", "Capitania de destino"],
    howItWorks: "Petição inicial do processo. É protocolada junto à Capitania dos Portos ou Delegacia com a documentação de suporte.",
    whoSigns: "Proprietário ou procurador legalmente constituído.",
    whenMandatory: "Em todo processo administrativo perante a autoridade marítima.",
    commonErrors: ["Serviço solicitado incorreto", "Capitania errada", "Falta de assinatura"],
    relatedDocs: ["Procuração", "BSADE", "Documentos da embarcação"],
    legalBase: { norm: "NORMAM-01/DPC", annex: "Anexo 3-A", template: "Requerimento padrão", version: "2024" },
    averageTime: "3 minutos",
  },
  bsade: {
    purpose: "Boletim Simplificado de Atualização de Dados da Embarcação — consolida os dados técnicos oficiais da embarcação.",
    dataUsed: [
      "Nome da embarcação", "Tipo", "Categoria", "Comprimento", "Boca", "Pontal",
      "Material do casco", "Motor", "Potência", "Ano de construção", "Proprietário", "TIE",
    ],
    preflightChecklist: ["Nome e TIE conferidos", "Dimensões (m)", "Potência (HP/CV)", "Proprietário atual", "Categoria de navegação"],
    howItWorks: "Formulário técnico exigido em processos de inscrição, alteração e transferência. Os dados devem bater exatamente com a arqueação/TIE.",
    whoSigns: "Engenheiro naval responsável e proprietário.",
    whenMandatory: "Inscrição, transferência de propriedade, alteração de características.",
    commonErrors: ["Dimensões em unidade errada", "Categoria de navegação incorreta", "Potência divergente do motor real"],
    relatedDocs: ["TIE", "Nota fiscal do motor", "Requerimento"],
    legalBase: { norm: "NORMAM-01/DPC", annex: "Anexo 2-A", template: "BSADE oficial DPC", version: "2024" },
    averageTime: "5 minutos",
  },
  "declaracao de residencia": {
    purpose: "Declara, sob responsabilidade civil e criminal, o endereço de residência do proprietário quando não há comprovante formal.",
    dataUsed: ["Nome", "CPF", "RG", "Endereço completo", "Cidade", "Estado", "CEP", "Data"],
    preflightChecklist: ["Nome e CPF conferidos", "Endereço completo", "CEP correto", "Data de emissão"],
    howItWorks: "Documento substitutivo do comprovante de residência. Aceito quando o proprietário não possui contas em seu nome no endereço declarado.",
    whoSigns: "Próprio declarante, com reconhecimento de firma quando exigido.",
    whenMandatory: "Somente quando não houver comprovante de residência formal (conta de água, luz, telefone, contrato de aluguel).",
    whenWaived: "Se o proprietário já tiver anexado comprovante de residência oficial em seu nome.",
    commonErrors: ["Endereço divergente do informado em outros documentos", "Falta de reconhecimento de firma"],
    relatedDocs: ["Cópia do RG/CPF"],
    legalBase: { norm: "Lei 7.115/1983", template: "Declaração de residência padrão", version: "2024" },
    averageTime: "2 minutos",
  },
  "comprovante de residencia": {
    purpose: "Comprovante formal de residência do proprietário no endereço declarado.",
    dataUsed: ["Nome do proprietário", "Endereço", "Data recente (últimos 90 dias)"],
    preflightChecklist: ["Documento em nome do proprietário", "Endereço legível", "Emitido nos últimos 90 dias"],
    howItWorks: "Conta de consumo (água, luz, telefone, gás) ou contrato de aluguel/escritura em nome do proprietário.",
    whenMandatory: "Sempre que o processo exigir comprovação formal de residência.",
    whenWaived: "Substituível por Declaração de Residência quando não disponível.",
    commonErrors: ["Documento em nome de terceiro", "Comprovante vencido (>90 dias)"],
    relatedDocs: ["Declaração de residência"],
    legalBase: { norm: "NORMAM-01/DPC" },
    averageTime: "Anexo — sem geração",
  },
  "copia do rg": {
    purpose: "Documento de identidade oficial do proprietário para verificação de identidade e assinaturas.",
    dataUsed: ["Nome completo", "RG", "Órgão emissor", "Data de expedição"],
    preflightChecklist: ["Legibilidade da foto e dados", "Documento válido"],
    howItWorks: "Anexo obrigatório para conferência dos dados de identificação em todos os processos.",
    whenMandatory: "Sempre.",
    commonErrors: ["Cópia ilegível", "RG vencido em alguns estados"],
    relatedDocs: ["CPF", "Comprovante de residência"],
    legalBase: { norm: "NORMAM-01/DPC" },
    averageTime: "Anexo — sem geração",
  },
  "copia do cpf": {
    purpose: "Comprovante de inscrição no CPF do proprietário.",
    dataUsed: ["Nome", "CPF"],
    preflightChecklist: ["CPF ativo na Receita Federal"],
    howItWorks: "Pode ser substituído pelo RG quando este já contiver o CPF.",
    whenMandatory: "Quando o RG não contiver o número do CPF.",
    commonErrors: ["CPF cancelado ou suspenso"],
    relatedDocs: ["Cópia do RG"],
    legalBase: { norm: "NORMAM-01/DPC" },
    averageTime: "Anexo — sem geração",
  },
};

function normalize(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDocumentKnowledge(itemName: string | null | undefined): DocumentKnowledge | null {
  if (!itemName) return null;
  const key = normalize(itemName);
  if (CATALOG[key]) return CATALOG[key];
  // fuzzy: check if key contains any catalog key
  for (const catKey of Object.keys(CATALOG)) {
    if (key.includes(catKey) || catKey.includes(key)) return CATALOG[catKey];
  }
  return null;
}

export function isVesselSummaryDoc(itemName: string): boolean {
  const k = normalize(itemName);
  return k.includes("bsade") || k.includes("boletim") || k.includes("dados da embarcacao");
}

export function isResidenceDeclaration(itemName: string): boolean {
  const k = normalize(itemName);
  return k.includes("declaracao de residencia");
}
