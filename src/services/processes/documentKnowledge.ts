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
    dataUsed: [
      "Nome do proprietário",
      "CPF",
      "RG",
      "Endereço",
      "Cidade",
      "Estado",
      "Dados do engenheiro",
      "Data de emissão",
    ],
    preflightChecklist: [
      "Nome completo do outorgante",
      "CPF sem erros",
      "Endereço atualizado",
      "Poderes específicos listados",
      "Local e data",
    ],
    howItWorks:
      "Documento particular assinado pelo proprietário da embarcação outorgando poderes ao representante técnico para tramitar processos junto à Marinha.",
    whoSigns:
      "Proprietário (outorgante). Reconhecimento de firma pode ser exigido pela Capitania local.",
    whenMandatory:
      "Sempre que o processo é conduzido por terceiro (engenheiro, despachante, escritório).",
    commonErrors: [
      "CPF/RG divergentes do documento de identidade",
      "Falta de especificação dos poderes",
      "Endereço desatualizado",
    ],
    relatedDocs: ["Cópia do RG/CPF", "Comprovante de residência"],
    legalBase: {
      norm: "NORMAM-211/DPC (Esporte e Recreio) / NORMAM-201/DPC (Mar Aberto)",
      annex: "Procuração Administrativa Particular",
      template: "Procuração particular padrão para representação perante a Capitania dos Portos",
      version: "2024",
      updatedAt: "2024-01",
    },
    averageTime: "2-3 minutos",
  },
  requerimento: {
    purpose:
      "Solicita formalmente à autoridade marítima o serviço pretendido (inscrição, transferência, alteração, 2ª via).",
    dataUsed: [
      "Cliente",
      "Embarcação",
      "Tipo de serviço",
      "Capitania de destino",
      "Justificativa",
      "Data",
    ],
    preflightChecklist: [
      "Tipo de serviço correto",
      "Dados do requerente",
      "Dados da embarcação",
      "Capitania de destino",
    ],
    howItWorks:
      "Petição inicial do processo protocolada junto à Capitania dos Portos, Delegacia ou Agência (CP/DL/AG) acompanhada dos documentos pertinentes.",
    whoSigns: "Proprietário ou procurador legalmente constituído. Assinatura física ou eletrônica (gov.br / ICP-Brasil nos órgãos com atendimento eletrônico habilitado).",
    whenMandatory: "Em todo processo administrativo perante a autoridade marítima.",
    commonErrors: ["Serviço solicitado incorreto", "Capitania errada", "Falta de assinatura"],
    relatedDocs: ["Procuração", "BSADE", "Documentos da embarcação"],
    legalBase: {
      norm: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026)",
      annex: "Anexo 2-C",
      template: "Requerimento para Inscrição, Transferência ou Alteração de Embarcação",
      version: "2026",
    },
    averageTime: "3 minutos",
  },
  bsade: {
    purpose:
      "Boletim Simplificado de Atualização de Dados da Embarcação (BSADE) — consolida os dados técnicos e cadastrais oficiais da embarcação de esporte e recreio.",
    dataUsed: [
      "Nome da embarcação",
      "Tipo",
      "Categoria",
      "Comprimento",
      "Boca",
      "Pontal",
      "Material do casco",
      "Motor",
      "Potência",
      "Ano de construção",
      "Proprietário",
      "TIE",
    ],
    preflightChecklist: [
      "Nome e TIE conferidos",
      "Dimensões (m)",
      "Potência (HP/CV)",
      "Proprietário atual",
      "Categoria de navegação",
    ],
    howItWorks:
      "Formulário técnico preenchido em 2 vias exigido em processos de inscrição, alteração e transferência de embarcações de esporte e recreio.",
    whoSigns: "Proprietário / Requerente ou Engenheiro Naval responsável (quando houver alteração técnica estrutural/motor).",
    whenMandatory: "Inscrição inicial, transferência de propriedade e alteração de características.",
    commonErrors: [
      "Dimensões em unidade errada",
      "Categoria de navegação incorreta",
      "Potência divergente da plaqueta do motor",
    ],
    relatedDocs: ["TIE", "Nota fiscal do motor", "Requerimento"],
    legalBase: {
      norm: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026)",
      annex: "Anexo 2-B",
      template: "BSADE oficial DPC (Esporte e Recreio)",
      version: "2026",
    },
    averageTime: "5 minutos",
  },
  "declaracao de residencia": {
    purpose:
      "Declara, sob as penas da Lei nº 7.115/1983 e art. 299 do Código Penal, o domicílio e residência do requerente quando não há comprovante formal de consumo em seu próprio nome.",
    dataUsed: ["Nome", "CPF", "RG", "Endereço completo", "Cidade", "Estado", "CEP", "Data"],
    preflightChecklist: [
      "Nome e CPF conferidos",
      "Endereço completo com CEP",
      "Data de emissão",
    ],
    howItWorks:
      "Documento substitutivo do comprovante de residência formal, aceito pela Capitania conforme Anexo 2-G da NORMAM-211/DPC.",
    whoSigns: "Próprio declarante (adquirente ou proprietário). Assinatura presencial com firma reconhecida quando exigido pela Capitania regional ou digital ICP-Brasil/gov.br quando aceita pelo órgão.",
    whenMandatory:
      "Somente quando o requerente não possuir comprovante de residência tradicional em seu próprio nome expedido nos últimos 120 dias.",
    whenWaived: "Se o proprietário/adquirente já possuir conta de consumo recente (até 120 dias) em seu nome.",
    commonErrors: [
      "Endereço divergente do informado no requerimento",
      "Assinatura em desacordo com documento de identidade",
    ],
    relatedDocs: ["Cópia do RG/CPF"],
    legalBase: {
      norm: "NORMAM-211/DPC c/c Lei 7.115/1983",
      annex: "Anexo 2-I",
      template: "Declaração de Residência DPC",
      version: "2026",
    },
    averageTime: "2 minutos",
  },
  "comprovante de residencia": {
    purpose: "Comprovante formal de residência do interessado no endereço informado para o processo perante a Capitania.",
    dataUsed: ["Nome do interessado", "Endereço completo", "Data de vencimento ou emissão"],
    preflightChecklist: [
      "Documento em nome do adquirente/proprietário (ou cônjuge comprovado)",
      "Endereço com CEP legível",
      "Data de vencimento ocorrida há, no máximo, 120 dias (ou a vencer)",
    ],
    howItWorks:
      "Conta de água, luz, gás, telefone fixo/celular ou contrato de locação vigente em que figure como locatário (NORMAM-211/DPC item 0212).",
    whenMandatory: "Sempre que exigida qualificação e domicílio do proprietário perante a Capitania.",
    whenWaived: "Substituível pela Declaração de Residência (NORMAM-211 Anexo 2-I) quando não houver comprovante em nome próprio.",
    commonErrors: ["Documento em nome de terceiro sem comprovação de parentesco", "Comprovante vencido há mais de 120 dias"],
    relatedDocs: ["Declaração de residência"],
    legalBase: { norm: "NORMAM-211/DPC, Cap. 2" },
    averageTime: "Anexo — sem geração",
  },
  "copia do rg": {
    purpose:
      "Documento de identificação oficial do requerente com foto e CPF (RG, CNH, carteira profissional de conselho).",
    dataUsed: ["Nome completo", "RG", "Órgão emissor", "CPF", "Data de expedição"],
    preflightChecklist: ["Legibilidade da foto e número do documento", "Documento oficial válido"],
    howItWorks:
      "Anexo obrigatório para conferência de autenticidade dos dados e assinaturas em todos os processos administrativos navais.",
    whenMandatory: "Sempre.",
    commonErrors: ["Cópia ilegível", "Documento cortado ou sem verso"],
    relatedDocs: ["CPF", "Comprovante de residência"],
    legalBase: { norm: "NORMAM-211/DPC (Esporte e Recreio) / NORMAM-201/DPC" },
    averageTime: "Anexo — sem geração",
  },
  "copia do cpf": {
    purpose: "Comprovante de inscrição no CPF do interessado.",
    dataUsed: ["Nome", "CPF"],
    preflightChecklist: ["CPF ativo na Receita Federal"],
    howItWorks: "Dispensado quando a CNH, RG ou identidade funcional já contiver o número do CPF.",
    whenMandatory: "Apenas quando o documento de identidade apresentado não contiver o número do CPF.",
    commonErrors: ["CPF incorreto ou cancelado"],
    relatedDocs: ["Cópia do RG/CNH"],
    legalBase: { norm: "NORMAM-211/DPC" },
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

export function getDocumentKnowledge(
  itemName: string | null | undefined,
): DocumentKnowledge | null {
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
