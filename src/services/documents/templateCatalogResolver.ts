/**
 * Serviço de Resolução e Validação de Modelos do Catálogo NavalDocs Pro.
 *
 * Garante a separação estrita entre:
 * 1. Código/slug de catálogo (ex: "proc-representacao-naval")
 * 2. Código oficial (ex: "PROC-NAV")
 * 3. UUID real do registro no banco de dados (document_templates.id)
 * 4. ID do processo e ID da empresa
 *
 * NUNCA envia slug em colunas UUID.
 * NUNCA inventa UUID aleatório para contornar integridade referencial.
 * Respeita escopo multi-empresa (prioridade empresa > global).
 */
import { supabase } from "@/integrations/supabase/client";

export interface CatalogTemplateItem {
  id: string; // Slug único de catálogo (mantido como id para compatibilidade de rotas e seleções)
  slug: string;
  code: string;
  name: string;
  description: string;
  category: "esporte_recreio" | "moto_aquatica" | "profissional" | "geral";
  categoryLabel: string;
  updatedAt: string;
  status: "aprovado" | "em_revisao";
  reviewReason?: string;
  requiredFields: string[];
  isMandatory: boolean;
  isConditional?: boolean;
  conditionText?: string;
  nature: "official_form" | "platform_generated"; // Distingue modelo oficial da Marinha de documento elaborado pela plataforma
  officialSource: string;
  validationDate: string;
  aliases: {
    codes: string[];
    names: string[];
  };
}

export const CATALOG_TEMPLATES: CatalogTemplateItem[] = [
  {
    id: "req-padrao-cpes",
    slug: "req-padrao-cpes",
    name: "Requerimento Padrão do Interessado",
    code: "REQ-001",
    description:
      "Requerimento oficial padronizado elaborado com base na NORMAM-211/DPC, Anexo 2-C para solicitação de serviços de registro, transferência, 2ª via e emissão de TIE/TIEM perante a Capitania dos Portos / Del / Agência.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026), Anexo 2-C • DPC / CPES",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-padrao-cpes", "REQ-001", "REQ_INSCR", "REQ_PADRAO"],
      names: [
        "Requerimento Padrão do Interessado",
        "Requerimento de Inscrição",
        "Requerimento de Registro Inicial de Embarcação",
      ],
    },
  },
  {
    id: "proc-representacao-naval",
    slug: "proc-representacao-naval",
    name: "Procuração Específica para Capitania dos Portos",
    code: "PROC-NAV",
    description:
      "Instrumento particular de mandato outorgando poderes de representação ao despachante náutico para protocolo e acompanhamento administrativo perante a Marinha do Brasil.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Responsável", "Outorgado"],
    isMandatory: true,
    isConditional: false,
    officialSource: "Código Civil Brasileiro (Lei 10.406/02, art. 653) c/c NORMAM-211/DPC e NORMAM-201/DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: [
        "proc-representacao-naval",
        "PROC-NAV",
        "PROC_PART_NAVAL",
        "PROC_SIMPLES_NAVAL",
      ],
      names: [
        "Procuração para Representação em Processo Naval",
        "Procuração Específica para Capitania dos Portos",
        "Procuração",
        "Procuração Simples Naval",
      ],
    },
  },
  {
    id: "decl-residencia-naval",
    slug: "decl-residencia-naval",
    name: "Declaração de Residência do Proprietário",
    code: "DEC-RES",
    description:
      "Declaração formal de domicílio sob as penas da Lei Federal nº 7.115/1983 e art. 299 do Código Penal para instrução de processos marítimos (NORMAM-211/DPC, Anexo 2-I).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Endereço Completo"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Dispensável caso o interessado apresente comprovante de residência próprio em seu nome emitido há menos de 120 dias.",
    officialSource: "NORMAM-211/DPC, Anexo 2-I c/c Lei Federal nº 7.115/1983",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["decl-residencia-naval", "DEC-RES", "DECL_RES_NAVAL"],
      names: [
        "Declaração de Residência do Proprietário",
        "Declaração de Residência",
      ],
    },
  },
  {
    id: "req-moto-aquatica",
    slug: "req-moto-aquatica",
    name: "Requerimento Específico para Moto Aquática (Jet Ski)",
    code: "REQ-JET",
    description:
      "Formulário oficial para inscrição, transferência ou renovação de moto aquática com parâmetros técnicos dedicados a motonáutica (NORMAM-212/DPC, Anexo 2-A).",
    category: "moto_aquatica",
    categoryLabel: "Moto aquática",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
      "Proprietário da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-212/DPC, Anexo 2-A • Diretoria de Portos e Costas",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-moto-aquatica", "REQ-JET", "REQ_MOTO_AQUATICA"],
      names: [
        "Requerimento Específico para Moto Aquática (Jet Ski)",
        "Requerimento para Moto Aquática",
        "Requerimento Jet Ski",
      ],
    },
  },
  {
    id: "bsade-simplificado",
    slug: "bsade-simplificado",
    name: "Boletim de Simplificação e Atualização de Dados (BSADE)",
    code: "BSADE-001",
    description:
      "Boletim oficial padronizado (NORMAM-211/DPC, Anexo 2-B) para inscrição inicial e registro das características técnicas, dimensões, propulsão e lotação em 2 vias.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
      "Comprimento Total",
      "Boca",
      "Pontal",
      "Calado",
      "Potência do Motor",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026), Anexo 2-B",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["bsade-simplificado", "BSADE-001", "BSADE", "BADE_BSADE"],
      names: [
        "Boletim de Simplificação e Atualização de Dados (BSADE)",
        "BSADE",
        "Boletim Simplificado",
        "BADE/BSADE",
      ],
    },
  },
  {
    id: "req-transferencia",
    slug: "req-transferencia",
    name: "Requerimento de Transferência de Propriedade",
    code: "REQ-TRANSF",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, item 0208 / Anexo 2-C) para emissão de novo TIE decorrente da transferência de propriedade.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Nº de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0208 e Anexo 2-C • DPC / Marinha do Brasil",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-transferencia", "REQ-TRANSF", "REQ_TRANSFERENCIA"],
      names: [
        "Requerimento de Transferência de Propriedade",
        "Requerimento de Transferência",
        "Transferência de Propriedade",
      ],
    },
  },
  {
    id: "termo-entrega-transf",
    slug: "termo-entrega-transf",
    name: "Termo de Entrega e Responsabilidade (Transferência)",
    code: "TER-ENTR",
    description:
      "Termo oficial de entrega da embarcação e assunção de responsabilidade civil e marítima pelo adquirente (NORMAM-211/DPC, Anexo 2-M).",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Anexo 2-M • Marinha do Brasil",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["termo-entrega-transf", "TER-ENTR", "DECL_TRANSF"],
      names: [
        "Termo de Entrega e Declaração de Responsabilidade",
        "Declaração de Transferência",
        "Termo de Entrega da Embarcação",
      ],
    },
  },
  {
    id: "req-renovacao-tie",
    slug: "req-renovacao-tie",
    name: "Requerimento de Renovação de TIE/TIEM",
    code: "REQ-RENOV",
    description:
      "Requerimento padronizado (NORMAM-211/DPC, item 0212 / Anexo 2-C) para prorrogação da validade do documento de inscrição náutica.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Nº de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0212 e Anexo 2-C • DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-renovacao-tie", "REQ-RENOV", "REQ_RENOVACAO"],
      names: [
        "Requerimento de Renovação de TIE/TIEM",
        "Requerimento de Renovação",
        "Renovação de Documento",
      ],
    },
  },
  {
    id: "decl-manutencao-renov",
    slug: "decl-manutencao-renov",
    name: "Declaração de Manutenção e Condições Operacionais",
    code: "DEC-OPER",
    description:
      "Declaração formal sob as penas da Lei Federal nº 7.115/1983 de manutenção das condições de salvatagem e integridade do casco.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: false,
    isConditional: true,
    conditionText: "Exigida para renovação de TIE quando dispensada a vistoria técnica presencial.",
    officialSource: "NORMAM-211/DPC item 0212 c/c Lei Federal nº 7.115/1983",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["decl-manutencao-renov", "DEC-OPER", "DECL_RENOV"],
      names: [
        "Declaração de Manutenção e Condições Operacionais",
        "Declaração do Interessado para Renovação",
      ],
    },
  },
  {
    id: "req-alteracao-motor",
    slug: "req-alteracao-motor",
    name: "Requerimento de Alteração de Motor e Termo de Responsabilidade",
    code: "REQ-MOT",
    description:
      "Requerimento oficial e termo técnico (NORMAM-211/DPC, item 0210 e Anexo 2-C) para averbação de nova propulsão no TIE.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Potência do Motor"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0210 e Anexo 2-C • DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-alteracao-motor", "REQ-MOT", "TERMO_MOTOR", "ALT_MOTOR"],
      names: [
        "Requerimento de Alteração de Motor",
        "Termo de Responsabilidade Técnica (Motor)",
        "Autorização para Substituição de Motor",
      ],
    },
  },
  {
    id: "req-segunda-via-tie",
    slug: "req-segunda-via-tie",
    name: "Requerimento de Segunda Via de Documento Náutico",
    code: "REQ-2VIA",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, item 0214 / Anexo 2-C) para solicitação de 2ª via de TIE/TIEM por perda, extravio ou dano.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Nº de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0214 e Anexo 2-C • DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-segunda-via-tie", "REQ-2VIA", "REQ_2VIA"],
      names: [
        "Requerimento de Segunda Via de Documento Náutico",
        "Requerimento de 2ª Via de TIE/TIEM",
        "Segunda Via TIE",
      ],
    },
  },
  {
    id: "decl-perda-extravio",
    slug: "decl-perda-extravio",
    name: "Declaração de Perda / Extravio de Documento Náutico",
    code: "DEC-PERD",
    description:
      "Declaração formal sob as penas da lei (NORMAM-211/DPC, Anexo 2-H) para perda acidental, extravio, furto ou roubo de TIE/TIEM físico antigo.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Exigido exclusivamente em casos de perda, extravio, furto ou roubo do TIE físico verde antigo. Se for TIE Digital com QR Code, a reimpressão no sistema gov.br/Marinha é autônoma e gratuita.",
    officialSource: "NORMAM-211/DPC, Anexo 2-H • Capitania dos Portos",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["decl-perda-extravio", "DEC-PERD", "DECL_PERDA"],
      names: [
        "Declaração de Perda / Extravio de TIE",
        "Declaração de Extravio ou Perda de Documento",
        "Declaração de Perda",
      ],
    },
  },
  {
    id: "req-vistoria-naval",
    slug: "req-vistoria-naval",
    name: "Requerimento de Vistoria / Perícia Naval",
    code: "REQ-VIST",
    description:
      "Requerimento formal (NORMAM-211/DPC, Capítulo 3 / NORMAM-201/DPC item 0302) para solicitação de vistoria inicial, periódica ou especial pela Capitania.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Cap. 3 / NORMAM-201/DPC item 0302",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-vistoria-naval", "REQ-VIST", "REQ_VISTORIA"],
      names: [
        "Requerimento de Vistoria / Perícia Naval",
        "Requerimento de Vistoria Técnica",
        "Vistoria Naval",
      ],
    },
  },
  {
    id: "req-comercial-prof",
    slug: "req-comercial-prof",
    name: "Requerimento de Embarcação Profissional / Comercial",
    code: "REQ-PROF",
    description:
      "Requerimento oficial padronizado com base na NORMAM-201/DPC, Anexo 2-E para inscrição, regularização ou transferência de embarcações comerciais e profissionais não sujeitas a registro no Tribunal Marítimo.",
    category: "profissional",
    categoryLabel: "Embarcações profissionais",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
      "Proprietário da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-201/DPC, Anexo 2-E • Diretoria de Portos e Costas",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-comercial-prof", "REQ-PROF", "REQ_INSCR"],
      names: [
        "Requerimento de Embarcação Profissional / Comercial",
        "Requerimento de Inscrição Comercial",
      ],
    },
  },
  {
    id: "req-habilitacao-cha",
    slug: "req-habilitacao-cha",
    name: "Requerimento para Habilitação Náutica de Amador (CHA)",
    code: "REQ-CHA",
    description:
      "Requerimento oficial de inscrição em exame ou renovação da Carteira de Habilitação de Amador (NORMAM-211/DPC, Capítulo 5).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 5 (Amadores) • DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-habilitacao-cha", "REQ-CHA", "REQ_CHA"],
      names: [
        "Requerimento para Habilitação Náutica de Amador (CHA)",
        "Requerimento de CHA",
        "Habilitação Náutica Amador",
      ],
    },
  },
  {
    id: "req-alteracao-cadastral",
    slug: "req-alteracao-cadastral",
    name: "Requerimento de Alteração Cadastral do Proprietário",
    code: "REQ-CAD",
    description:
      "Requerimento padronizado (NORMAM-211/DPC, item 0213 / Anexo 2-C) para atualização de domicílio ou dados civis do titular.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Endereço Completo"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0213 e Anexo 2-C",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-alteracao-cadastral", "REQ-CAD", "ALT_CADASTRO"],
      names: [
        "Requerimento de Alteração Cadastral do Proprietário",
        "Alteração Cadastral",
      ],
    },
  },
  {
    id: "comunicacao-despacho",
    slug: "comunicacao-despacho",
    name: "Comunicação de Saída / Despacho na Capitania",
    code: "COM-DESP",
    description:
      "Comunicação oficial prévia de tráfego, trajeto e rol de pessoas a bordo (NORMAM-211/DPC, Capítulo 4 / NORMAM-201/DPC).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Cap. 4 / NORMAM-201/DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["comunicacao-despacho", "COM-DESP", "DESPACHO_SAIDA"],
      names: [
        "Comunicação de Saída / Despacho na Capitania",
        "Comunicação de Despacho",
        "Despacho de Saída",
      ],
    },
  },
];

export interface ResolvedTemplateResult {
  catalogItem: CatalogTemplateItem;
  dbTemplateId: string | null;
  dbTemplateRecord: any | null;
  resolutionSource: "company_code" | "company_alias" | "company_name" | "global_code" | "global_alias" | "global_name" | "not_found";
}

/**
 * Carrega todos os templates disponíveis para a empresa atual e globais
 */
export async function loadDatabaseTemplates(companyId?: string): Promise<any[]> {
  try {
    let query = supabase
      .from("document_templates")
      .select("id, code, name, category, is_global, company_id, lifecycle_status, is_active");

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null,is_global.eq.true`);
    } else {
      query = query.or("company_id.is.null,is_global.eq.true");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[templateCatalogResolver] Erro ao carregar templates do banco:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[templateCatalogResolver] Falha inesperada ao consultar templates:", err);
    return [];
  }
}

/**
 * Resolve um item do catálogo para um registro real no banco de dados.
 * Prioridade:
 * 1. Template da empresa por código exato (slug ou code)
 * 2. Template da empresa por códigos alternativos
 * 3. Template da empresa por nome
 * 4. Template global por código exato (slug ou code)
 * 5. Template global por códigos alternativos
 * 6. Template global por nome
 */
export function resolveCatalogTemplate(
  catalogItem: CatalogTemplateItem,
  dbTemplates: any[],
  companyId?: string,
): ResolvedTemplateResult {
  const norm = (s?: string | null) => (s || "").trim().toLowerCase();

  // 1. Empresa: código exato
  let match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      (norm(t.code) === norm(catalogItem.slug) || norm(t.code) === norm(catalogItem.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_code",
    };
  }

  // 2. Empresa: alias de código
  match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      catalogItem.aliases.codes.some((c) => norm(c) === norm(t.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_alias",
    };
  }

  // 3. Empresa: alias de nome
  match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      catalogItem.aliases.names.some((n) => norm(n) === norm(t.name)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_name",
    };
  }

  // 4. Global: código exato
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      (norm(t.code) === norm(catalogItem.slug) || norm(t.code) === norm(catalogItem.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_code",
    };
  }

  // 5. Global: alias de código
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      catalogItem.aliases.codes.some((c) => norm(c) === norm(t.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_alias",
    };
  }

  // 6. Global: alias de nome
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      catalogItem.aliases.names.some((n) => norm(n) === norm(t.name)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_name",
    };
  }

  return {
    catalogItem,
    dbTemplateId: null,
    dbTemplateRecord: null,
    resolutionSource: "not_found",
  };
}

/**
 * Validação granular de campos obrigatórios por modelo.
 * Bloqueia APENAS os documentos que realmente exigem campos ausentes.
 * Por exemplo: Declaração de Residência NUNCA exige dados de embarcação.
 */
export function checkTemplateMissingRequirements(
  tpl: CatalogTemplateItem,
  customer: any,
  vessel: any,
  staff: any,
  company?: any,
  outorgadoTypeOverride?: "pf" | "pj",
): { isBlocked: boolean; missingFields: string[] } {
  const missing: string[] = [];

  const hasCustomerName = !!(customer?.name || customer?.fantasy_name);
  const hasCustomerDoc = !!(customer?.cpf_cnpj || customer?.document);
  const hasCustomerAddress = !!(customer?.address && customer?.city);
  const hasStaff = !!(staff?.name && staff?.name !== "Não informado");
  const hasVesselName = !!vessel?.name;
  const hasVesselRegistration = !!(vessel?.registration_number && vessel.registration_number.trim() !== "");
  const hasVesselOwner = !!(vessel?.current_owner_name && vessel.current_owner_name.trim() !== "");

  // Outorgado da Procuração: identificação explícita de PF vs PJ
  // Se explicitado pelo usuário/processo, usa a preferência.
  // Caso contrário, se a empresa tiver outorgado_tipo configurado, usa ele.
  // Se não houver preferência e a empresa NÃO tiver CNPJ de PJ (ou se tiver procurador_nome/cpf), considera PF.
  const explicitType = outorgadoTypeOverride || company?.outorgado_tipo || (company?.cnpj ? "pj" : "pf");
  const isOutorgadoPF = explicitType === "pf" || (!company?.cnpj && !outorgadoTypeOverride);

  const hasProcuradorPFName = !!(company?.procurador_nome || staff?.name);
  const hasProcuradorPFCpf = !!company?.procurador_cpf;
  const hasCompanyPJDoc = !!(company?.cnpj && (company?.contact_address || company?.address));
  const hasCompanyPJName = !!(company?.name || company?.razao_social);

  for (const field of tpl.requiredFields) {
    if (field === "Nome do Cliente" && !hasCustomerName) {
      missing.push("Nome do Cliente");
    }
    if (field === "CPF/CNPJ do Cliente" && !hasCustomerDoc) {
      missing.push("CPF ou CNPJ do Cliente");
    }
    if (field === "Endereço Completo" && !hasCustomerAddress) {
      missing.push("Endereço Completo");
    }
    if (field === "Responsável" && !hasStaff) {
      missing.push("Funcionário / Operador Responsável");
    }
    if (field === "Nome da Embarcação" && !hasVesselName) {
      missing.push("Nome da Embarcação");
    }
    if (field === "Proprietário da Embarcação" && !hasVesselOwner) {
      missing.push("Proprietário da Embarcação");
    }
    if (field === "Número de Inscrição" && !hasVesselRegistration) {
      missing.push("Número de Inscrição da Embarcação");
    }
    if (field === "Outorgado") {
      if (isOutorgadoPF) {
        if (!hasProcuradorPFName) {
          missing.push("Nome Completo do Outorgado (Pessoa Física)");
        }
        if (!hasProcuradorPFCpf) {
          missing.push("CPF do Outorgado (Pessoa Física)");
        }
      } else {
        if (!hasCompanyPJName) {
          missing.push("Razão Social da Outorgada (Pessoa Jurídica)");
        }
        if (!hasCompanyPJDoc) {
          missing.push("CNPJ e Endereço da Sede (Outorgada Pessoa Jurídica)");
        }
      }
    }
  }

  return {
    isBlocked: missing.length > 0,
    missingFields: missing,
  };
}

/**
 * Busca item do catálogo por slug ou ID
 */
export function getCatalogTemplateBySlug(slug: string): CatalogTemplateItem | undefined {
  return CATALOG_TEMPLATES.find((t) => t.slug === slug || t.id === slug);
}
