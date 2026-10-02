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
 * Identifica o tipo de documento a partir do texto bruto, metadados da IA e entidade alvo
 */
export function identifyDocumentType(
  rawText: any, 
  aiDocType?: string,
  targetEntity?: "customer" | "vessel"
): SupportedDocumentType {
  const upper = (typeof rawText === "string" ? rawText : String(rawText || "")).toUpperCase();

  // 1. Verificação explícita do aiDocType se retornado e válido
  if (aiDocType) {
    const norm = aiDocType.toUpperCase().trim();
    if (norm === "FICHA_CADASTRAL" || norm.includes("FICHA_CADASTRO") || norm.includes("CADASTRO_CLIENTE")) return "FICHA_CADASTRAL";
    if (norm === "FICHA_EMBARCACAO" || norm.includes("FICHA_EMBARCAÇÃO") || norm.includes("DADOS_EMBARCACAO")) return "FICHA_EMBARCACAO";
    if (norm.includes("CNH")) return "CNH";
    if (norm.includes("RG") && !norm.includes("CARGA")) return "RG";
    if (norm.includes("CPF")) return "CPF";
    if (norm.includes("CNPJ") || norm.includes("CARTAO_CNPJ")) return "CARTAO_CNPJ";
    if (norm.includes("TIEM")) return "VESSEL_TIEM";
    if (norm.includes("TIE")) return "VESSEL_TIE";
    if (norm.includes("PROVISORIO") || norm.includes("BSADE")) return "VESSEL_PROVISORIO";
    if (norm.includes("RESIDENCIA") || norm.includes("ENDERECO") || norm.includes("ENDEREÇO")) return "COMPROVANTE_RESIDENCIA";
    if (norm.includes("INVOICE") || norm.includes("NOTA")) return "VESSEL_INVOICE";
    if (norm.includes("DECLARATION") || norm.includes("COMPRA_E_VENDA")) return "VESSEL_SALE_DECLARATION";
  }

  // 2. Reconhecimento por conteúdo textual do documento
  if (/CARTEIRA\s+NACIONAL\s+DE\s+HABILITA[ÇC][ÃA]O|HABILITA[ÇC][ÃA]O|CNH/i.test(upper)) {
    return "CNH";
  }
  if (/FICHA\s+CADASTRAL|CADASTRO\s+DE\s+CLIENTE|DADOS\s+DE\s+IDENTIFICA[ÇC][ÃA]O|DADOS\s+DO\s+CLIENTE/i.test(upper) && !/EMBARCA[ÇC][ÃA]O|CASCO|MOTOR|CAPITANIA/i.test(upper)) {
    return "FICHA_CADASTRAL";
  }
  if (/T[ÍI]TULO\s+DE\s+INSCRI[ÇC][ÃA]O\s+DE\s+EMBARCA[ÇC][ÃA]O\s+MI[ÚU]DA|TIEM/i.test(upper)) {
    return "VESSEL_TIEM";
  }
  if (/T[ÍI]TULO\s+DE\s+INSCRI[ÇC][ÃA]O\s+DE\s+EMBARCA[ÇC][ÃA]O|MARINHA\s+DO\s+BRASIL|CAPITANIA\s+DOS\s+PORTOS|TIE\b/i.test(upper)) {
    return "VESSEL_TIE";
  }
  if (/FICHA\s+T[ÉE]CNICA|DADOS\s+DA\s+EMBARCA[ÇC][ÃA]O|NOME\s+DA\s+EMBARCA[ÇC][ÃA]O|INSCRI[ÇC][ÃA]O\s+N[ÁA]UTICA/i.test(upper)) {
    return "FICHA_EMBARCACAO";
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
  if (/BOLETIM\s+DE\s+SIMPLIFICADA|BSADE|PROTOCOLO\s+PROVIS[ÓO]RIO/i.test(upper)) {
    return "VESSEL_PROVISORIO";
  }
  if (/TERMO\s+DE\s+ENTREGA|DECLARA[ÇC][ÃA]O\s+DE\s+VENDA|RECIBO\s+DE\s+COMPRA\s+E\s+VENDA|COMPRA\s+E\s+VENDA\s+DE\s+EMBARCA[ÇC][ÃA]O/i.test(upper)) {
    return "VESSEL_SALE_DECLARATION";
  }
  if (/NOTA\s+FISCAL|DANFE|CHAVE\s+DE\s+ACESSO/i.test(upper)) {
    return "VESSEL_INVOICE";
  }

  // 3. Fallback inteligente baseado no contexto do fluxo (evita exibir genericamente "Documento Geral")
  if (targetEntity === "customer") return "FICHA_CADASTRAL";
  if (targetEntity === "vessel") return "FICHA_EMBARCACAO";

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
  const docType = identifyDocumentType(
    rawText, 
    safeFields._document_type || safeFields.document_type,
    "customer"
  );
  const typeMeta = DOCUMENT_TYPE_LABELS[docType] || DOCUMENT_TYPE_LABELS.FICHA_CADASTRAL;
  const fields: Record<string, ExtractedFieldDetail> = {};
  const discrepancies: DocumentDiscrepancy[] = [];

  // Parse inteligente de endereço caso venha composto em address ou endereco
  let streetParsed = safeFields.logradouro || safeFields.endereco || safeFields.address || safeFields.rua || safeFields.street;
  let numberParsed = safeFields.numero || safeFields.number || safeFields.num;
  let complementParsed = safeFields.complemento || safeFields.complement || safeFields.comp;
  let neighborhoodParsed = safeFields.bairro || safeFields.neighborhood || safeFields.distrito;

  if (streetParsed && (!numberParsed || !neighborhoodParsed)) {
    const rawAddrStr = String(streetParsed);
    const parts = rawAddrStr.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      streetParsed = parts[0];
      if (!numberParsed && parts[1]) {
        const numMatch = parts[1].match(/^(\d+[A-Za-z]?)(?:\s+(.*))?$/);
        if (numMatch) {
          numberParsed = numMatch[1];
          if (numMatch[2] && !complementParsed) complementParsed = numMatch[2];
        } else {
          numberParsed = parts[1];
        }
      }
      if (parts.length >= 3) {
        if (!complementParsed && parts[2].toLowerCase().includes("apto") || parts[2].toLowerCase().includes("bloco") || parts[2].toLowerCase().includes("sala")) {
          complementParsed = parts[2];
          if (parts[3] && !neighborhoodParsed) neighborhoodParsed = parts[3];
        } else if (!neighborhoodParsed) {
          neighborhoodParsed = parts[2];
        }
      }
    }
  }

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
      if (cfg.key === "name") rawVal = safeFields.nome || safeFields.razao_social || safeFields.full_name || safeFields.cliente || safeFields.titular;
      if (cfg.key === "cpf_cnpj") rawVal = safeFields.cpf || safeFields.cnpj || safeFields.doc_number || safeFields.documento;
      if (cfg.key === "birth_date") rawVal = safeFields.data_nascimento || safeFields.nascimento || safeFields.data_nasc;
      if (cfg.key === "logradouro") rawVal = streetParsed;
      if (cfg.key === "numero") rawVal = numberParsed;
      if (cfg.key === "complemento") rawVal = complementParsed;
      if (cfg.key === "bairro") rawVal = neighborhoodParsed;
      if (cfg.key === "cidade") rawVal = safeFields.municipio || safeFields.city;
      if (cfg.key === "uf") rawVal = safeFields.estado || safeFields.state;
      if (cfg.key === "cep") rawVal = safeFields.zip_code || safeFields.cep;
      if (cfg.key === "phone") rawVal = safeFields.telefone || safeFields.celular || safeFields.whatsapp || safeFields.tel;
      if (cfg.key === "email") rawVal = safeFields.email || safeFields.e_mail;
      if (cfg.key === "rg") rawVal = safeFields.identidade || safeFields.doc_identidade || safeFields.rg_rne;
    }

    // Fallback de extração direta do rawText se o campo continuar vazio
    if (!rawVal && rawText) {
      if (cfg.key === "bairro") {
        const m = rawText.match(/(?:BAIRRO|DISTRO|NEIGHBORHOOD)[:\s\n]+([A-ZÁ-Úa-zá-ú0-9\s\-]+?)(?:\n|CIDADE|MUNIC[ÍI]PIO|CEP|ESTADO|$)/i);
        if (m) rawVal = m[1].trim();
      } else if (cfg.key === "numero") {
        const m = rawText.match(/(?:N[ÚU]MERO|N[ºO\.]?)[:\s\n]+(\d+[A-Za-z]?)/i);
        if (m) rawVal = m[1].trim();
      } else if (cfg.key === "logradouro") {
        const m = rawText.match(/(?:LOGRADOURO|RUA|AVENIDA|AV\.)[:\s\n]+([^\n]+)/i);
        if (m) rawVal = m[1].trim();
      } else if (cfg.key === "complemento") {
        const m = rawText.match(/(?:COMPLEMENTO)[:\s\n]+([^\n]+)/i);
        if (m) rawVal = m[1].trim();
      }
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
  const docType = identifyDocumentType(
    rawText, 
    safeFields._document_type || safeFields.document_type,
    "vessel"
  );
  const typeMeta = DOCUMENT_TYPE_LABELS[docType] || DOCUMENT_TYPE_LABELS.FICHA_EMBARCACAO;
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
      if (cfg.key === "name") rawVal = safeFields.vessel_name || safeFields.nome_embarcacao || safeFields.embarcacao || safeFields.nome;
      if (cfg.key === "registration_number") rawVal = safeFields.inscricao || safeFields.numero_inscricao || safeFields.tie_number || safeFields.registro || safeFields.num_inscricao;
      if (cfg.key === "vessel_type") rawVal = safeFields.tipo || safeFields.tipo_embarcacao || safeFields.categoria || safeFields.type;
      if (cfg.key === "hull_material") rawVal = safeFields.material || safeFields.material_casco || safeFields.casco;
      if (cfg.key === "construction_year") rawVal = safeFields.ano_construcao || safeFields.ano || safeFields.ano_fabricacao;
      if (cfg.key === "length") rawVal = safeFields.comprimento || safeFields.comprimento_total;
      if (cfg.key === "boca") rawVal = safeFields.boca || safeFields.beam || safeFields.largura;
      if (cfg.key === "pontal") rawVal = safeFields.pontal || safeFields.depth || safeFields.altura;
      if (cfg.key === "capacity") rawVal = safeFields.lotacao || safeFields.capacidade || safeFields.passageiros;
      if (cfg.key === "gross_tonnage") rawVal = safeFields.gross_tonnage || safeFields.arqueacao_bruta || safeFields.ab;
      if (cfg.key === "navigation_area") rawVal = safeFields.navigation_area || safeFields.area_navegacao || safeFields.navegacao;
      if (cfg.key === "engine_brand") rawVal = safeFields.engine_brand || safeFields.motor || safeFields.marca_motor || safeFields.marca;
      if (cfg.key === "engine_power") rawVal = safeFields.engine_power || safeFields.potencia || safeFields.potencia_motor;
      if (cfg.key === "engine_serial_number") rawVal = safeFields.engine_serial || safeFields.numero_motor || safeFields.serie_motor || safeFields.numero_serie || safeFields.num_serie;
      if (cfg.key === "identified_owner_name") rawVal = safeFields.owner_name || safeFields.proprietario || safeFields.proprietaria || safeFields.nome_proprietario;
      if (cfg.key === "identified_owner_doc") rawVal = safeFields.owner_document || safeFields.cpf_proprietario || safeFields.cnpj_proprietario || safeFields.doc_proprietario;
    }

    let valStr = (rawVal !== null && rawVal !== undefined) ? String(rawVal).trim() : "";
    let confidence = valStr ? 0.92 : 0;
    let status: ExtractedFieldDetail["status"] = valStr ? "high_confidence" : "not_found";
    let doubtReason: string | undefined = undefined;

    // Normalizações de medidas
    if ((cfg.key === "boca" || cfg.key === "pontal" || cfg.key === "length") && valStr) {
      const matchNum = valStr.replace(",", ".").match(/[\d.]+/);
      if (matchNum) {
        valStr = matchNum[0];
      }
    }

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
