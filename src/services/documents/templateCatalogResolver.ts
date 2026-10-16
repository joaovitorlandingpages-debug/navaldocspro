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
      "Requerimento oficial padronizado pela Autoridade Marítima para solicitação de serviços de registro e emissão de TIE/TIEM perante a Capitania dos Portos / Del / Agência.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "16/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
      "Número de Inscrição",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Anexo 2-A • Capitania dos Portos (CPES/DPC)",
    validationDate: "16/10/2026",
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
      "Instrumento particular de mandato elaborado pela plataforma outorgando poderes de representação ao despachante náutico para protocolo e acompanhamento administrativo perante a Marinha do Brasil.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "16/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Responsável"],
    isMandatory: true,
    isConditional: false,
    officialSource: "Código Civil Brasileiro (Lei 10.406/02, art. 653) c/c NORMAM-211/DPC",
    validationDate: "16/10/2026",
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
      "Declaração formal de domicílio elaborada sob as penas da Lei Federal nº 7.115/1983 para instrução de processos marítimos.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "16/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Endereço Completo"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Dispensável caso o interessado apresente comprovante de residência próprio em seu nome emitido há menos de 90/120 dias.",
    officialSource: "Lei Federal nº 7.115/1983 c/c NORMAM-211/DPC",
    validationDate: "16/10/2026",
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
      "Formulário oficial para inscrição, transferência ou renovação de motoaquática com parâmetros técnicos dedicados a motonáutica.",
    category: "moto_aquatica",
    categoryLabel: "Moto aquática",
    updatedAt: "16/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-212/DPC, Anexo 3-B • Capitania dos Portos (CPES node/384)",
    validationDate: "16/10/2026",
    aliases: {
      codes: ["req-moto-aquatica", "REQ-JET", "REQ_INSCR"],
      names: [
        "Requerimento Específico para Moto Aquática (Jet Ski)",
        "Requerimento de Inscrição",
      ],
    },
  },
  {
    id: "decl-perda-extravio",
    slug: "decl-perda-extravio",
    name: "Declaração de Perda / Extravio de Documento Náutico",
    code: "DEC-PERD",
    description:
      "Declaração formal sob as penas da lei exclusivamente para casos de extravio, perda, furto ou roubo do TIE/TIEM original ou ATP.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "16/10/2026",
    status: "em_revisao",
    nature: "platform_generated",
    reviewReason:
      "Modelo em conferência pela equipe NavalDocs. Validação dos campos de número de Boletim de Ocorrência policial e declaração expressa de responsabilidade civil.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Exigido exclusivamente em casos de perda, extravio, furto ou roubo do TIE/TIEM original ou da Autorização de Transferência (ATP), devendo ser acompanhado de Boletim de Ocorrência policial.",
    officialSource: "NORMAM-211/DPC, Anexo 2-E • Capitania dos Portos",
    validationDate: "16/10/2026",
    aliases: {
      codes: ["decl-perda-extravio", "DEC-PERD"],
      names: [
        "Declaração de Perda / Extravio de TIE",
        "Declaração de Extravio ou Perda de Documento",
      ],
    },
  },
  {
    id: "req-comercial-prof",
    slug: "req-comercial-prof",
    name: "Requerimento de Embarcação Profissional / Comercial",
    code: "REQ-PROF",
    description:
      "Requerimento oficial de inscrição ou regularização para embarcações de pesca, passageiros ou transporte comercial de carga perante a Capitania dos Portos.",
    category: "profissional",
    categoryLabel: "Embarcações profissionais",
    updatedAt: "16/10/2026",
    status: "aprovado",
    nature: "official_form",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-201/DPC, Anexo 2-A • Capitania dos Portos (CPES node/388)",
    validationDate: "16/10/2026",
    aliases: {
      codes: ["req-comercial-prof", "REQ-PROF", "REQ_INSCR"],
      names: [
        "Requerimento de Embarcação Profissional / Comercial",
        "Requerimento de Inscrição",
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
): { isBlocked: boolean; missingFields: string[] } {
  const missing: string[] = [];

  const hasCustomerName = !!(customer?.name || customer?.fantasy_name);
  const hasCustomerDoc = !!(customer?.cpf_cnpj || customer?.document);
  const hasCustomerAddress = !!(customer?.address && customer?.city);
  const hasStaff = !!(staff?.name && staff?.name !== "Não informado");
  const hasVesselName = !!vessel?.name;
  const hasVesselRegistration = !!(vessel?.registration_number && vessel.registration_number.trim() !== "");

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
      missing.push("Funcionário / Despachante Responsável");
    }
    if (field === "Nome da Embarcação" && !hasVesselName) {
      missing.push("Nome da Embarcação");
    }
    if (field === "Número de Inscrição" && !hasVesselRegistration) {
      missing.push("Número de Inscrição da Embarcação");
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
