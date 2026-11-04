import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";

export interface DocumentManualOverride {
  documentId: string;
  documentName: string;
  customerName: string;
  customerDoc: string;
  vesselName: string;
  vesselInscricao: string;
  vesselLength: string;
  vesselBeam: string;
  vesselDepth: string;
  engineDetails: string;
  customBodyText: string;
  engineerName: string;
  engineerCrea: string;
  rectificationReason: string;
  modifiedAt: string;
  modifiedBy: string;
}

const OVERRIDES_STORAGE_KEY = "navaldocs_admin_doc_overrides_v1";

export function getDocumentOverrides(): Record<string, DocumentManualOverride> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler overrides de documentos:", e);
  }
  return {};
}

export function getDocumentOverrideById(docId: string): DocumentManualOverride | null {
  const all = getDocumentOverrides();
  return all[docId] || null;
}

export function saveDocumentOverride(override: DocumentManualOverride): void {
  if (typeof localStorage !== "undefined") {
    const all = getDocumentOverrides();
    all[override.documentId] = {
      ...override,
      modifiedAt: new Date().toISOString(),
    };
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent("navaldocs_doc_overrides_updated", { detail: override })
    );
  }
}

/**
 * Regenera e compila um PDF oficial corrigido manualmente pelo engenheiro
 */
export async function regenerateOverriddenPdf(override: DocumentManualOverride): Promise<{
  bytes: Uint8Array;
  fileName: string;
}> {
  const contentLines = [
    `RETIFICAÇÃO TÉCNICA OFICIAL - NAVALDOCS PRO`,
    `RESPONSÁVEL TÉCNICO: Eng. Naval ${override.engineerName || "João Silva"} (CREA: ${override.engineerCrea || "48291/RJ"})`,
    `MOTIVO DA RETIFICAÇÃO: ${override.rectificationReason || "Correção de dados cadastrais para cumprimento de exigência da Capitania"}`,
    `DATA DA CORREÇÃO: ${new Date().toLocaleDateString("pt-BR")}`,
    `---------------------------------------------------------------------------`,
    ``,
    override.customBodyText || `Documento oficial retificado perante a Autoridade Marítima para a embarcação ${override.vesselName}.`,
    ``,
    `---------------------------------------------------------------------------`,
    `TITULAR: ${override.customerName} (CPF/CNPJ: ${override.customerDoc})`,
    `EMBARCAÇÃO: ${override.vesselName} (Inscrição: ${override.vesselInscricao || "A designar"})`,
    `CARACTERÍSTICAS: Comprimento: ${override.vesselLength || "-"} | Boca: ${override.vesselBeam || "-"} | Pontal: ${override.vesselDepth || "-"}`,
    `PROPULSÃO: ${override.engineDetails || "Conforme nota fiscal de aquisição"}`,
    ``,
    `___________________________________________________________________________`,
    `Assinatura do Requerente / Titular Cadastral (${override.customerName})`,
    ``,
    `___________________________________________________________________________`,
    `Visto do Engenheiro Naval Responsável (${override.engineerName || "Engenheiro Sócio"} - CREA: ${override.engineerCrea || "CREA/SP"})`,
  ];

  const pdfResult = await buildBrandedDocumentPdf({
    docName: override.documentName || "Documento Náutico Retificado",
    content: contentLines.join("\n"),
    branding: null,
    isOfficialForm: true,
    hideSignatureBlock: false,
  });

  const sanitizedDocName = (override.documentName || "documento")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  return {
    bytes: pdfResult.bytes,
    fileName: `${sanitizedDocName}_retificado_${Date.now()}.pdf`,
  };
}

/**
 * Dispara o download direto do PDF retificado no navegador do cliente
 */
export function triggerPdfDownload(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
