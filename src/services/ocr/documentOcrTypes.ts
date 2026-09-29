/**
 * Tipos e Definições Oficiais de OCR e Leitura de Documentos — NavalDocs Pro
 */

export type SupportedDocumentCategory = 
  | "customer_id"         // Documento de identificação do cliente (CNH, RG, CPF, Passaporte)
  | "proof_of_address"    // Comprovante de residência / domicílio
  | "corporate_doc"       // Contrato social, Cartão CNPJ, Procuração
  | "vessel_doc"          // Documentos de embarcação (TIE, TIEM, Provisório/BSADE, Termo de Entrega/Venda)
  | "engine_invoice"      // Nota fiscal de embarcação ou motor
  | "generic";            // Outros documentos

export type SupportedDocumentType = 
  | "CNH"                       // Carteira Nacional de Habilitação
  | "RG"                        // Registro Geral / Carteira de Identidade
  | "CPF"                       // Cadastro de Pessoas Físicas
  | "CARTAO_CNPJ"               // Comprovante de Inscrição e Situação Cadastral
  | "COMPROVANTE_RESIDENCIA"    // Conta de consumo (luz, água, gás, telefone, internet)
  | "VESSEL_TIE"                // Título de Inscrição de Embarcação
  | "VESSEL_TIEM"               // Título de Inscrição de Embarcação Miúda
  | "VESSEL_PROVISORIO"         // Protocolo / Registro Provisório da Capitania / BSADE
  | "VESSEL_SALE_DECLARATION"   // Termo de Entrega / Declaração / Recibo de Compra e Venda
  | "VESSEL_INVOICE"            // Nota Fiscal de Embarcação ou Motor
  | "GENERIC";

export type FieldConfidenceStatus = 
  | "high_confidence"     // 🟢 Alta confiança (> 85% e formato validado)
  | "doubt"               // 🟡 Dúvida / Atenção necessária (caracteres dúbios ou alerta de formato)
  | "divergent"           // ⚠️ Divergência com dados previamente salvos
  | "not_found"           // ⚪ Não localizado no documento (mantido em branco)
  | "manual";             // ✏️ Preenchido / Editado manualmente pelo operador

export interface ExtractedFieldDetail {
  key: string;
  label: string;
  value: string;
  originalValue: string;
  confidence: number; // 0.0 a 1.0
  status: FieldConfidenceStatus;
  doubtReason?: string;
  sourceExcerpt?: string;
  page?: number;
  isRequired?: boolean;
  section: "identificacao" | "contato_endereco" | "nautico" | "propulsao" | "outros";
}

export interface DocumentDiscrepancy {
  fieldKey: string;
  label: string;
  existingValue: string;
  extractedValue: string;
  severity: "warning" | "conflict";
  message: string;
}

export interface ExtractedDocumentReview {
  jobId?: string;
  fileId?: string;
  file: File;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  documentType: SupportedDocumentType;
  documentTypeLabel: string;
  category: SupportedDocumentCategory;
  rawText: string;
  fields: Record<string, ExtractedFieldDetail>;
  overallConfidence: number;
  discrepancies: DocumentDiscrepancy[];
  audit: {
    acceptedCount: number;
    editedCount: number;
    manualCount: number;
    reviewedAt?: string;
    reviewedBy?: string;
  };
  targetEntity: "customer" | "vessel";
}

export const DOCUMENT_TYPE_LABELS: Record<SupportedDocumentType, { label: string; category: SupportedDocumentCategory; badgeColor: string }> = {
  CNH: {
    label: "CNH — Carteira Nacional de Habilitação",
    category: "customer_id",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  RG: {
    label: "RG — Carteira de Identidade",
    category: "customer_id",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
  },
  CPF: {
    label: "CPF — Cadastro de Pessoa Física",
    category: "customer_id",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  CARTAO_CNPJ: {
    label: "Cartão CNPJ / Comprovante Cadastral",
    category: "corporate_doc",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  COMPROVANTE_RESIDENCIA: {
    label: "Comprovante de Endereço / Residência",
    category: "proof_of_address",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
  },
  VESSEL_TIE: {
    label: "TIE — Título de Inscrição de Embarcação",
    category: "vessel_doc",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200"
  },
  VESSEL_TIEM: {
    label: "TIEM — Embarcação Miúda",
    category: "vessel_doc",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200"
  },
  VESSEL_PROVISORIO: {
    label: "Protocolo Provisório / BSADE da Marinha",
    category: "vessel_doc",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200"
  },
  VESSEL_SALE_DECLARATION: {
    label: "Termo de Entrega / Recibo de Compra e Venda",
    category: "vessel_doc",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200"
  },
  VESSEL_INVOICE: {
    label: "Nota Fiscal de Embarcação ou Motor",
    category: "engine_invoice",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200"
  },
  GENERIC: {
    label: "Documento Geral",
    category: "generic",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200"
  },
};
