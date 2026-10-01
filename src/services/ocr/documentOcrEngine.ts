import { 
  SupportedDocumentType, 
  ExtractedFieldDetail, 
  ExtractedDocumentReview, 
  DOCUMENT_TYPE_LABELS,
  DocumentDiscrepancy 
} from "./documentOcrTypes";
import { 
  isValidCPF, 
  isValidCNPJ, 
  maskCPF, 
  maskCNPJ, 
  maskCEP, 
  maskPhone, 
  maskDate,
  BR_UFS 
} from "@/lib/br-format";

// Lista de campos oficiais esperados para CLIENTES (PF e PJ)
export const CUSTOMER_EXPECTED_FIELDS = [
  { key: "name", label: "Nome / Razão Social", section: "identificacao" as const, required: true },
  { key: "cpf_cnpj", label: "CPF ou CNPJ", section: "identificacao" as const, required: true },
  { key: "rg", label: "RG / Documento de Identidade", section: "identificacao" as const, required: false },
  { key: "birth_date", label: "Data de Nascimento", section: "identificacao" as const, required: false },
  { key: "email", label: "E-mail de Contato", section: "contato_endereco" as const, required: false },
  { key: "phone", label: "Telefone / WhatsApp", section: "contato_endereco" as const, required: false },
  { key: "cep", label: "CEP", section: "contato_endereco" as const, required: false },
  { key: "logradouro", label: "Logradouro (Rua/Av/Rodovia)", section: "contato_endereco" as const, required: false },
  { key: "numero", label: "Número", section: "contato_endereco" as const, required: false },
  { key: "bairro", label: "Bairro", section: "contato_endereco" as const, required: false },
  { key: "cidade", label: "Cidade", section: "contato_endereco" as const, required: false },
  { key: "uf", label: "Estado (UF)", section: "contato_endereco" as const, required: false },
  { key: "complemento", label: "Complemento", section: "contato_endereco" as const, required: false },
];

// Lista de campos oficiais esperados para EMBARCAÇÕES
export const VESSEL_EXPECTED_FIELDS = [
  { key: "name", label: "Nome da Embarcação", section: "nautico" as const, required: true },
  { key: "registration_number", label: "Número de Inscrição na Capitania", section: "nautico" as const, required: true },
  { key: "vessel_type", label: "Tipo de Embarcação (Lancha, Veleiro, etc.)", section: "nautico" as const, required: true },
  { key: "hull_material", label: "Material do Casco", section: "nautico" as const, required: false },
  { key: "construction_year", label: "Ano de Construção", section: "nautico" as const, required: false },
  { key: "length", label: "Comprimento Total (m)", section: "nautico" as const, required: false },
  { key: "boca", label: "Boca (Largura em m)", section: "nautico" as const, required: false },
  { key: "pontal", label: "Pontal (m)", section: "nautico" as const, required: false },
  { key: "capacity", label: "Lotação / Capacidade de Pessoas", section: "nautico" as const, required: false },
  { key: "gross_tonnage", label: "Arqueação Bruta / AB", section: "nautico" as const, required: false },
  { key: "navigation_area", label: "Área de Navegação", section: "nautico" as const, required: false },
  { key: "engine_brand", label: "Marca do Motor", section: "propulsao" as const, required: false },
  { key: "engine_power", label: "Potência do Motor (HP/KW)", section: "propulsao" as const, required: false },
  { key: "engine_serial_number", label: "Nº de Série do Motor", section: "propulsao" as const, required: false },
  { key: "identified_owner_name", label: "Proprietário Indicado no Documento", section: "identificacao" as const, required: false },
  { key: "identified_owner_doc", label: "CPF/CNPJ do Proprietário Indicado", section: "identificacao" as const, required: false },
];

/**
 * Identifica o tipo de documento a partir do texto bruto e metadados da IA
 */
export function identifyDocumentType(rawText: string, aiDocType?: string): SupportedDocumentType {
  const upper = (rawText || "").toUpperCase();

  if (/CARTEIRA\s+NACIONAL\s+DE\s+HABILITA[ÇC][ÃA]O|HABILITA[ÇC][ÃA]O|CNH/i.test(upper)) {
    return "CNH";
  }
  if (/REGISTRO\s+GERAL|CARTEIRA\s+DE\s+IDENTIDADE|SECRETARIA\s+DE\s+SEGURAN[ÇC]A/i.test(upper) && !/EMBARCA/i.test(upper)) {
    return "RG";
  }
  if (/CADASTRO\s+DE\s+PESSOAS?\s+F[ÍI]SICAS?|RECEITA\s+FEDERAL/i.test(upper) && !/CNPJ/i.test(upper) && !/EMBARCA/i.test(upper)) {
    return "CPF";
  }
  if (/CADASTRO\s+NACIONAL\s+DA\s+PESSOA\s+JUR[ÍI]DICA|COMPROVANTE\s+DE\s+INSCRI[ÇC][ÃA]O\s+E\s+DE\s+SITUA[ÇC][ÃA]O\s+CADASTRAL/i.test(upper)) {
    return "CARTAO_CNPJ";
  }
  if (/CONTA\s+DE\s+ENERGIA|FATURA|ENERGIA\s+EL[ÉE]TRICA|COMPANHIA\s+DE\s+[ÁA]GUA|SANEAMENTO|TELEFONIA|INTERNET|COMPROVANTE\s+DE\s+RESID[ÊE]NCIA/i.test(upper)) {
    return "COMPROVANTE_RESIDENCIA";
  }
  if (/T[ÍI]TULO\s+DE\s+INSCRI[ÇC][ÃA]O\s+DE\s+EMBARCA[ÇC][ÃA]O\s+MI[ÚU]DA|TIEM/i.test(upper)) {
    return "VESSEL_TIEM";
  }
  if (/T[ÍI]TULO\s+DE\s+INSCRI[ÇC][ÃA]O\s+DE\s+EMBARCA[ÇC][ÃA]O|MARINHA\s+DO\s+BRASIL|CAPITANIA\s+DOS\s+PORTOS|TIE\b/i.test(upper)) {
    return "VESSEL_TIE";
  }
  if (/BOLETIM\s+DE\s+SIMPLIFICADA|BSADE|PROTOCOLO\s+PROVIS[ÓO]RIO/i.test(upper)) {
    return "VESSEL_PROVISORIO";
  }
  if (/TERMO\s+DE\s+ENTREGA|DECLARA[ÇC][ÃA]O\s+DE\s+VENDA|RECIBO\s+DE\s+COMPRA\s+E\s+VENDA|COMPRA\s+E\s+VENDA\s+DE\s+EMBARCA[ÇC][ÃA]O/i.test(upper)) {
    return "VESSEL_SALE_DECLARATION";
  }
  if (/NOTA\s+FISCAL|DANFE|CHAVE\s+DE\s+ACESSO/i.test(upper)) {
    return "VESSEL_INVOICE";
  }

  // Fallback baseado no aiDocType retornado
  if (aiDocType) {
    const norm = aiDocType.toUpperCase();
    if (norm.includes("CNH")) return "CNH";
    if (norm.includes("RG")) return "RG";
    if (norm.includes("TIEM")) return "VESSEL_TIEM";
    if (norm.includes("TIE")) return "VESSEL_TIE";
    if (norm.includes("RESIDENCIA") || norm.includes("ENDERECO")) return "COMPROVANTE_RESIDENCIA";
  }

  return "GENERIC";
}

/**
 * Normaliza e valida campos de cliente a partir do resultado do OCR
 */
export function buildCustomerReview(
  file: File | null,
  fileUrl: string,
  rawText: string,
  rawFields: Record<string, any> = {},
  existingCustomer?: Record<string, any> | null
): ExtractedDocumentReview {
  const safeFields = rawFields || {};
  const docType = identifyDocumentType(rawText, safeFields.document_type);
  const typeMeta = DOCUMENT_TYPE_LABELS[docType];
  const fields: Record<string, ExtractedFieldDetail> = {};
  const discrepancies: DocumentDiscrepancy[] = [];

  // Helper para buscar trecho de origem no rawText
  const findExcerpt = (val: string): string | undefined => {
    if (!val || val.length < 3) return undefined;
    const clean = val.replace(/[^\w]/g, "");
    const lines = rawText.split("\n");
    for (const line of lines) {
      if (line.toLowerCase().includes(val.toLowerCase()) || line.replace(/[^\w]/g, "").includes(clean)) {
        return line.trim();
      }
    }
    return undefined;
  };

  CUSTOMER_EXPECTED_FIELDS.forEach((cfg) => {
    let rawVal: any = safeFields[cfg.key];
    
    // Mapeamentos alternativos comuns de IA
    if (!rawVal) {
      if (cfg.key === "name") rawVal = safeFields.nome || safeFields.razao_social || safeFields.full_name;
      if (cfg.key === "cpf_cnpj") rawVal = safeFields.cpf || safeFields.cnpj || safeFields.doc_number;
      if (cfg.key === "birth_date") rawVal = safeFields.data_nascimento || safeFields.nascimento;
      if (cfg.key === "logradouro") rawVal = safeFields.endereco || safeFields.address || safeFields.rua;
      if (cfg.key === "cidade") rawVal = safeFields.municipio || safeFields.city;
      if (cfg.key === "uf") rawVal = safeFields.estado || safeFields.state;
      if (cfg.key === "cep") rawVal = safeFields.zip_code;
      if (cfg.key === "phone") rawVal = safeFields.telefone;
      if (cfg.key === "rg") rawVal = safeFields.identidade;
    }

    let valStr = (rawVal !== null && rawVal !== undefined) ? String(rawVal).trim() : "";
    let confidence = valStr ? 0.92 : 0;
    let status: ExtractedFieldDetail["status"] = valStr ? "high_confidence" : "not_found";
    let doubtReason: string | undefined = undefined;

    // Regras estritas de validação anti-alucinação por campo
    if (cfg.key === "cpf_cnpj" && valStr) {
      const cleanDigits = valStr.replace(/\D/g, "");
      if (cleanDigits.length === 11) {
        valStr = maskCPF(cleanDigits);
        if (!isValidCPF(valStr)) {
          status = "doubt";
          confidence = 0.5;
          doubtReason = "Dígito verificador do CPF não confere com o cálculo oficial.";
        }
      } else if (cleanDigits.length === 14) {
        valStr = maskCNPJ(cleanDigits);
        if (!isValidCNPJ(valStr)) {
          status = "doubt";
          confidence = 0.5;
          doubtReason = "Dígito verificador do CNPJ não confere com o cálculo oficial.";
        }
      } else {
        status = "doubt";
        confidence = 0.3;
        doubtReason = `Documento incompleto (${cleanDigits.length} dígitos encontrados).`;
      }
    }

    if (cfg.key === "birth_date" && valStr) {
      valStr = maskDate(valStr);
      // Validar data plausível
      const parts = valStr.split("/");
      if (parts.length === 3) {
        const year = parseInt(parts[2], 10);
        const currentYear = new Date().getFullYear();
        if (year < 1910 || year > currentYear) {
          status = "doubt";
          confidence = 0.4;
          doubtReason = `Ano de nascimento improvável: ${year}.`;
        }
      }
    }

    if (cfg.key === "cep" && valStr) {
      valStr = maskCEP(valStr);
      if (valStr.replace(/\D/g, "").length !== 8) {
        status = "doubt";
        confidence = 0.4;
        doubtReason = "CEP com formato inconsistente.";
      }
    }

    if (cfg.key === "uf" && valStr) {
      valStr = valStr.toUpperCase().slice(0, 2);
      if (!BR_UFS.includes(valStr)) {
        status = "doubt";
        confidence = 0.3;
        doubtReason = `Sigla de estado "${valStr}" não é um estado brasileiro válido.`;
      }
    }

    // Detecção de divergências com cliente existente
    if (existingCustomer && valStr) {
      const existingVal = String(existingCustomer[cfg.key] || existingCustomer.cpf_cnpj || "").trim();
      if (existingVal && existingVal.toLowerCase() !== valStr.toLowerCase()) {
        const cleanExisting = existingVal.replace(/\D/g, "");
        const cleanVal = valStr.replace(/\D/g, "");
        // Se for campo numérico/documento e diferir, ou se for nome substancialmente diferente
        if (cleanExisting !== cleanVal && (cleanExisting.length > 0 || valStr.length > 3)) {
          status = "divergent";
          discrepancies.push({
            fieldKey: cfg.key,
            label: cfg.label,
            existingValue: existingVal,
            extractedValue: valStr,
            severity: cfg.required ? "conflict" : "warning",
            message: `O documento lido apresenta "${valStr}", divergindo do cadastro atual ("${existingVal}").`
          });
        }
      }
    }

    const excerpt = findExcerpt(valStr);

    fields[cfg.key] = {
      key: cfg.key,
      label: cfg.label,
      value: valStr,
      originalValue: valStr,
      confidence,
      status,
      doubtReason,
      sourceExcerpt: excerpt,
      isRequired: cfg.required,
      section: cfg.section
    };
  });

  const filledCount = Object.values(fields).filter(f => f.value.length > 0).length;
  const overallConfidence = filledCount > 0 ? 0.9 : 0;

  return {
    file,
    fileUrl,
    fileName: file?.name || "documento.pdf",
    fileSize: file?.size || 0,
    fileType: file?.type || "application/pdf",
    pageCount: (file?.type || "").includes("pdf") ? 1 : 1,
    documentType: docType,
    documentTypeLabel: typeMeta.label,
    category: typeMeta.category,
    rawText,
    fields,
    overallConfidence,
    discrepancies,
    audit: {
      acceptedCount: filledCount,
      editedCount: 0,
      manualCount: 0
    },
    targetEntity: "customer"
  };
}

/**
 * Normaliza e valida campos de embarcação a partir do resultado do OCR
 */
export function buildVesselReview(
  file: File | null,
  fileUrl: string,
  rawText: string,
  rawFields: Record<string, any> = {},
  existingVessel?: Record<string, any> | null
): ExtractedDocumentReview {
  const safeFields = rawFields || {};
  const docType = identifyDocumentType(rawText, safeFields.document_type);
  const typeMeta = DOCUMENT_TYPE_LABELS[docType];
  const fields: Record<string, ExtractedFieldDetail> = {};
  const discrepancies: DocumentDiscrepancy[] = [];

  const findExcerpt = (val: string): string | undefined => {
    if (!val || val.length < 3) return undefined;
    const clean = val.replace(/[^\w]/g, "");
    const lines = rawText.split("\n");
    for (const line of lines) {
      if (line.toLowerCase().includes(val.toLowerCase()) || line.replace(/[^\w]/g, "").includes(clean)) {
        return line.trim();
      }
    }
    return undefined;
  };

  VESSEL_EXPECTED_FIELDS.forEach((cfg) => {
    let rawVal: any = safeFields[cfg.key];

    if (!rawVal) {
      if (cfg.key === "name") rawVal = safeFields.vessel_name || safeFields.nome_embarcacao;
      if (cfg.key === "registration_number") rawVal = safeFields.inscricao || safeFields.numero_inscricao || safeFields.tie_number;
      if (cfg.key === "vessel_type") rawVal = safeFields.tipo || safeFields.tipo_embarcacao;
      if (cfg.key === "hull_material") rawVal = safeFields.material || safeFields.material_casco;
      if (cfg.key === "construction_year") rawVal = safeFields.ano_construcao || safeFields.ano;
      if (cfg.key === "length") rawVal = safeFields.comprimento || safeFields.comprimento_total;
      if (cfg.key === "engine_brand") rawVal = safeFields.motor || safeFields.marca_motor;
      if (cfg.key === "engine_power") rawVal = safeFields.potencia || safeFields.potencia_motor;
      if (cfg.key === "engine_serial_number") rawVal = safeFields.engine_serial || safeFields.numero_motor;
      if (cfg.key === "identified_owner_name") rawVal = safeFields.owner_name || safeFields.proprietario;
      if (cfg.key === "identified_owner_doc") rawVal = safeFields.owner_document || safeFields.cpf_proprietario;
    }

    let valStr = (rawVal !== null && rawVal !== undefined) ? String(rawVal).trim() : "";
    let confidence = valStr ? 0.92 : 0;
    let status: ExtractedFieldDetail["status"] = valStr ? "high_confidence" : "not_found";
    let doubtReason: string | undefined = undefined;

    // Validações náuticas específicas
    if (cfg.key === "construction_year" && valStr) {
      const year = parseInt(valStr.replace(/\D/g, ""), 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1920 || year > currentYear + 1) {
        status = "doubt";
        confidence = 0.4;
        doubtReason = `Ano de construção náutica incomum ou fora de faixa: ${valStr}.`;
      } else {
        valStr = String(year);
      }
    }

    if (cfg.key === "registration_number" && valStr) {
      // Normaliza espaços e pontuações
      valStr = valStr.toUpperCase().replace(/\s+/g, "");
      if (valStr.length < 5) {
        status = "doubt";
        confidence = 0.5;
        doubtReason = "Número de inscrição aparentemente incompleto.";
      }
    }

    if (cfg.key === "length" && valStr) {
      valStr = valStr.replace(",", ".").replace(/[^\d.]/g, "");
      const num = parseFloat(valStr);
      if (isNaN(num) || num <= 0 || num > 300) {
        status = "doubt";
        confidence = 0.4;
        doubtReason = "Comprimento fora da faixa náutica padrão.";
      }
    }

    if (cfg.key === "identified_owner_doc" && valStr) {
      const cleanDigits = valStr.replace(/\D/g, "");
      if (cleanDigits.length === 11) {
        valStr = maskCPF(cleanDigits);
        if (!isValidCPF(valStr)) {
          status = "doubt";
          confidence = 0.5;
          doubtReason = "CPF do proprietário lido com dígito verificador inválido.";
        }
      } else if (cleanDigits.length === 14) {
        valStr = maskCNPJ(cleanDigits);
        if (!isValidCNPJ(valStr)) {
          status = "doubt";
          confidence = 0.5;
          doubtReason = "CNPJ do proprietário lido com dígito verificador inválido.";
        }
      }
    }

    // Detecção de divergências com embarcação já salva
    if (existingVessel && valStr) {
      const existingVal = String(existingVessel[cfg.key] || "").trim();
      if (existingVal && existingVal.toLowerCase() !== valStr.toLowerCase()) {
        status = "divergent";
        discrepancies.push({
          fieldKey: cfg.key,
          label: cfg.label,
          existingValue: existingVal,
          extractedValue: valStr,
          severity: cfg.required ? "conflict" : "warning",
          message: `O documento da embarcação informa "${valStr}", divergindo do valor cadastrado ("${existingVal}").`
        });
      }
    }

    const excerpt = findExcerpt(valStr);

    fields[cfg.key] = {
      key: cfg.key,
      label: cfg.label,
      value: valStr,
      originalValue: valStr,
      confidence,
      status,
      doubtReason,
      sourceExcerpt: excerpt,
      isRequired: cfg.required,
      section: cfg.section
    };
  });

  const filledCount = Object.values(fields).filter(f => f.value.length > 0).length;
  const overallConfidence = filledCount > 0 ? 0.9 : 0;

  return {
    file,
    fileUrl,
    fileName: file?.name || "documento_embarcacao.pdf",
    fileSize: file?.size || 0,
    fileType: file?.type || "application/pdf",
    pageCount: (file?.type || "").includes("pdf") ? 1 : 1,
    documentType: docType,
    documentTypeLabel: typeMeta.label,
    category: typeMeta.category,
    rawText,
    fields,
    overallConfidence,
    discrepancies,
    audit: {
      acceptedCount: filledCount,
      editedCount: 0,
      manualCount: 0
    },
    targetEntity: "vessel"
  };
}
