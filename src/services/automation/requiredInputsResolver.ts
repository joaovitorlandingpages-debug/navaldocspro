/**
 * Dado um conjunto de templates selecionados, calcula quais documentos-fonte
 * o usuário precisa enviar (CNH, comprovante, TIE...) para preencher
 * automaticamente todos os campos exigidos.
 */

export type SourceCategory =
  | "PERSONAL_IDENTITY"
  | "PROOF_OF_ADDRESS"
  | "VESSEL_TIE"
  | "COMPANY_REGISTRATION"
  | "ENGINEER_CREDENTIALS";

export interface RequiredInput {
  category: SourceCategory;
  label: string;
  description: string;
  ocrType: string;
  providesFields: string[];
  optional?: boolean;
}

const PLACEHOLDER_REGEX = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function scanPlaceholders(content: string | null | undefined): string[] {
  if (!content) return [];
  const matches = content.matchAll(PLACEHOLDER_REGEX);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1].toLowerCase());
  return Array.from(set);
}

const FIELD_TO_CATEGORY: Record<string, SourceCategory> = {
  customer_name: "PERSONAL_IDENTITY",
  customer_cpf: "PERSONAL_IDENTITY",
  customer_rg: "PERSONAL_IDENTITY",
  customer_address: "PROOF_OF_ADDRESS",
  customer_phone: "PERSONAL_IDENTITY",
  customer_email: "PERSONAL_IDENTITY",
  vessel_name: "VESSEL_TIE",
  vessel_id: "VESSEL_TIE",
  vessel_type: "VESSEL_TIE",
  vessel_activity: "VESSEL_TIE",
  vessel_length: "VESSEL_TIE",
  vessel_engine: "VESSEL_TIE",
  company_name: "COMPANY_REGISTRATION",
  company_cnpj: "COMPANY_REGISTRATION",
  company_responsible: "COMPANY_REGISTRATION",
  engineer_name: "ENGINEER_CREDENTIALS",
  engineer_crea: "ENGINEER_CREDENTIALS",
};

const CATEGORY_META: Record<SourceCategory, Omit<RequiredInput, "providesFields">> = {
  PERSONAL_IDENTITY: {
    category: "PERSONAL_IDENTITY",
    label: "CNH ou RG do Cliente",
    description: "Documento de identidade — extrai nome, CPF, RG, contato",
    ocrType: "PERSONAL_IDENTITY",
  },
  PROOF_OF_ADDRESS: {
    category: "PROOF_OF_ADDRESS",
    label: "Comprovante de Residência",
    description: "Conta de luz/água/telefone — extrai endereço completo",
    ocrType: "PROOF_OF_ADDRESS",
  },
  VESSEL_TIE: {
    category: "VESSEL_TIE",
    label: "TIE / TIEM da Embarcação",
    description: "Título de Inscrição — extrai dados técnicos do barco",
    ocrType: "VESSEL_TIE",
  },
  COMPANY_REGISTRATION: {
    category: "COMPANY_REGISTRATION",
    label: "Cartão CNPJ / Contrato Social",
    description: "Dados da empresa cliente (quando aplicável)",
    ocrType: "COMPANY_REGISTRATION",
    optional: true,
  },
  ENGINEER_CREDENTIALS: {
    category: "ENGINEER_CREDENTIALS",
    label: "Credenciais do Engenheiro",
    description: "ART/CREA — preenchido pelo perfil ou upload",
    ocrType: "ENGINEER_CREDENTIALS",
    optional: true,
  },
};

export function resolveRequiredInputs(templates: Array<{ base_content?: string | null }>): RequiredInput[] {
  const fieldsByCategory = new Map<SourceCategory, Set<string>>();

  for (const tpl of templates) {
    const placeholders = scanPlaceholders(tpl.base_content);
    for (const field of placeholders) {
      const category = FIELD_TO_CATEGORY[field];
      if (!category) continue;
      if (!fieldsByCategory.has(category)) fieldsByCategory.set(category, new Set());
      fieldsByCategory.get(category)!.add(field);
    }
  }

  return Array.from(fieldsByCategory.entries()).map(([category, fields]) => ({
    ...CATEGORY_META[category],
    providesFields: Array.from(fields),
  }));
}

/**
 * Mescla dados extraídos de múltiplos OCRs em um payload único para o autofiller.
 */
export function mergeExtractedData(
  extractions: Array<{ category: SourceCategory; data: any }>
): {
  customer?: any;
  vessel?: any;
  company?: any;
  engineer?: any;
} {
  const result: any = { customer: {}, vessel: {}, company: {}, engineer: {} };

  for (const { category, data } of extractions) {
    if (!data) continue;
    switch (category) {
      case "PERSONAL_IDENTITY":
        result.customer.name = data.name || data.full_name || result.customer.name;
        result.customer.cpf_cnpj = data.cpf || data.document_number || result.customer.cpf_cnpj;
        result.customer.rg = data.rg || result.customer.rg;
        result.customer.phone = data.phone || result.customer.phone;
        result.customer.email = data.email || result.customer.email;
        break;
      case "PROOF_OF_ADDRESS":
        result.customer.address = data.address || data.full_address || result.customer.address;
        break;
      case "VESSEL_TIE":
        result.vessel.name = data.vessel_name || result.vessel.name;
        result.vessel.tie = data.registration_number || result.vessel.tie;
        result.vessel.vessel_type = data.vessel_type || result.vessel.vessel_type;
        result.vessel.activity = data.navigation_category || data.activity || result.vessel.activity;
        result.vessel.length = data.length || result.vessel.length;
        result.vessel.engine_model = data.engine_model || result.vessel.engine_model;
        // also bring owner into customer when present
        if (data.owner_name && !result.customer.name) result.customer.name = data.owner_name;
        if (data.owner_doc && !result.customer.cpf_cnpj) result.customer.cpf_cnpj = data.owner_doc;
        break;
      case "COMPANY_REGISTRATION":
        result.company.name = data.company_name || result.company.name;
        result.company.cnpj = data.cnpj || result.company.cnpj;
        result.company.responsible_name = data.responsible || result.company.responsible_name;
        break;
      case "ENGINEER_CREDENTIALS":
        result.engineer.name = data.name || result.engineer.name;
        result.engineer.crea = data.crea || data.registration || result.engineer.crea;
        break;
    }
  }

  return result;
}
