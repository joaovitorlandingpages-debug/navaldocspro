/**
 * Ações em lote para itens do checklist do processo (Blueprint Workspace).
 * Reaproveita a edge function `generate-document` e o modelo de signature_requests
 * existentes — não altera esquema nem quebra fluxos individuais.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChecklistLite = {
  id: string;
  item_name: string;
  template_id: string | null;
  document_id: string | null;
  requires_signature?: boolean | null;
};

export interface BatchReport {
  ok: string[];
  failed: { name: string; reason: string }[];
  missingData: string[];
}

export async function batchGenerate(
  processId: string,
  items: ChecklistLite[],
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<BatchReport> {
  const report: BatchReport = { ok: [], failed: [], missingData: [] };
  const total = items.length;
  let done = 0;

  for (const it of items) {
    onProgress?.(done, total, it.item_name);
    if (!it.template_id) {
      report.missingData.push(it.item_name);
      done += 1;
      onProgress?.(done, total, it.item_name);
      continue;
    }
    try {
      const { error } = await supabase.functions.invoke("generate-document", {
        body: { templateId: it.template_id, processId, checklistId: it.id },
      });
      if (error) throw error;
      report.ok.push(it.item_name);
    } catch (e: any) {
      report.failed.push({ name: it.item_name, reason: e?.message || "erro desconhecido" });
    }
    done += 1;
    onProgress?.(done, total, it.item_name);
  }
  return report;
}

import type { ParticipantRole, SignatureParticipantInput } from "@/services/signatures";

export interface BatchSignerInput {
  name: string;
  email?: string;
  phone?: string;
  role: ParticipantRole;
  signing_order: "free" | "sequential";
  message?: string;
  customer_id?: string;
}

export interface BatchSignatureReport {
  created: string[];               // item_names com solicitação criada
  failed: { name: string; reason: string }[];
  missingPdf: string[];            // itens sem PDF gerado
  alreadySigned: string[];         // documentos já assinados
}

export async function batchRequestSignature(
  processId: string,
  items: ChecklistLite[],
  signer: BatchSignerInput,
  createdBy?: string,
): Promise<BatchSignatureReport> {
  const report: BatchSignatureReport = { created: [], failed: [], missingPdf: [], alreadySigned: [] };

  const eligible = items.filter((i) => i.requires_signature || i.document_id);
  if (eligible.length === 0) {
    toast.info("Nenhum item selecionado exige assinatura.");
    return report;
  }

  const { data: proc } = await supabase
    .from("processes").select("company_id, customer_id").eq("id", processId).maybeSingle();
  if (!proc?.company_id) {
    toast.error("Processo sem empresa vinculada.");
    return report;
  }

  // Pré-carrega status dos documentos vinculados
  const docIds = eligible.map((i) => i.document_id).filter(Boolean) as string[];
  const docStatus = new Map<string, { signed: boolean; hasPdf: boolean }>();
  if (docIds.length > 0) {
    const { data } = await supabase
      .from("generated_documents")
      .select("id,generated_file_url,signed_file_url,signature_status,status")
      .in("id", docIds);
    (data ?? []).forEach((d: any) => {
      docStatus.set(d.id, {
        signed: d.signature_status === "signed" || !!d.signed_file_url || d.status === "signed",
        hasPdf: !!d.generated_file_url || !!d.signed_file_url,
      });
    });
  }

  const { signaturesService } = await import("@/services/signatures");

  const participant: SignatureParticipantInput & { customer_id?: string } = {
    name: signer.name,
    email: signer.email,
    phone: signer.phone,
    role: signer.role,
    customer_id: signer.customer_id,
  };

  for (const it of eligible) {
    if (it.document_id) {
      const info = docStatus.get(it.document_id);
      if (info?.signed) { report.alreadySigned.push(it.item_name); continue; }
      if (info && !info.hasPdf) { report.missingPdf.push(it.item_name); continue; }
    } else if (it.requires_signature) {
      report.missingPdf.push(it.item_name);
      continue;
    }
    try {
      const { request } = await signaturesService.create({
        company_id: proc.company_id,
        customer_id: proc.customer_id ?? signer.customer_id,
        process_id: processId,
        document_id: it.document_id ?? undefined,
        title: it.item_name,
        signing_order: signer.signing_order,
        participants: [participant],
        created_by: createdBy,
      });
      if (signer.message) {
        await supabase.from("signature_events").insert({
          signature_request_id: request.id,
          company_id: proc.company_id,
          event_type: "message",
          event_message: signer.message,
        });
      }
      report.created.push(it.item_name);
    } catch (e: any) {
      report.failed.push({ name: it.item_name, reason: e?.message || "erro desconhecido" });
    }
  }
  return report;
}

export interface BatchDownloadReport {
  added: string[];
  failed: { name: string; reason: string }[];
  missing: string[];
}

function sanitizeFilename(name: string): string {
  return (name || "arquivo")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function fetchToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

function extForBlob(blob: Blob, fallbackName?: string): string {
  const mime = blob.type || "";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("zip")) return "zip";
  const m = fallbackName?.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "bin";
}

export async function batchDownload(
  processId: string,
  items: ChecklistLite[],
  processCode?: string | null,
): Promise<BatchDownloadReport> {
  const report: BatchDownloadReport = { added: [], failed: [], missing: [] };
  if (items.length === 0) {
    toast.info("Nenhum item selecionado.");
    return report;
  }

  const [{ default: JSZip }, storage] = await Promise.all([
    import("jszip"),
    import("@/lib/storage"),
  ]);
  const zip = new JSZip();
  const folders = {
    docs: zip.folder("Documentos")!,
    signed: zip.folder("Assinados")!,
    certs: zip.folder("Certificados")!,
    attach: zip.folder("Anexos")!,
  };

  // ---- 1. generated_documents (docs / assinados / certificados) ----
  const docIds = items.map((i) => i.document_id).filter(Boolean) as string[];
  const byDocId = new Map<string, ChecklistLite>();
  items.forEach((i) => { if (i.document_id) byDocId.set(i.document_id, i); });

  if (docIds.length > 0) {
    const { data, error } = await supabase
      .from("generated_documents")
      .select("id,name,generated_file_url,signed_file_url,evidence_certificate_url")
      .in("id", docIds);
    if (error) console.warn("[batchDownload] generated_documents:", error.message);

    for (const doc of (data ?? []) as any[]) {
      const item = byDocId.get(doc.id);
      const baseName = sanitizeFilename(item?.item_name || doc.name || doc.id);

      const parts: Array<{ folder: any; url: string | null; suffix: string }> = [
        { folder: folders.docs,   url: doc.generated_file_url,        suffix: "" },
        { folder: folders.signed, url: doc.signed_file_url,           suffix: "_assinado" },
        { folder: folders.certs,  url: doc.evidence_certificate_url,  suffix: "_certificado" },
      ];

      let anyPart = false;
      for (const p of parts) {
        if (!p.url) continue;
        anyPart = true;
        try {
          const bucket =
            p.folder === folders.docs   ? "generated-documents" :
            p.folder === folders.signed ? "signed-documents"    :
                                          "signed-documents";
          const signed = await storage.signedUrl(bucket as any, p.url, 120);
          const blob = await fetchToBlob(signed);
          const ext = extForBlob(blob, p.url);
          p.folder.file(`${baseName}${p.suffix}.${ext}`, blob);
          report.added.push(`${baseName}${p.suffix}`);
        } catch (e: any) {
          report.failed.push({ name: `${baseName}${p.suffix}`, reason: e?.message || "erro" });
        }
      }
      if (!anyPart) report.missing.push(baseName);
    }
  }

  // Itens selecionados sem document_id
  items.filter((i) => !i.document_id).forEach((i) =>
    report.missing.push(sanitizeFilename(i.item_name)),
  );

  // ---- 2. Anexos (process_document_uploads do processo) ----
  try {
    const { data: uploads } = await supabase
      .from("process_document_uploads")
      .select("id,file_url,file_name")
      .eq("process_id", processId);
    for (const up of (uploads ?? []) as any[]) {
      try {
        const signed = await storage.signedUrl("process-document-uploads" as any, up.file_url, 120);
        const blob = await fetchToBlob(signed);
        const ext = extForBlob(blob, up.file_name || up.file_url);
        const base = sanitizeFilename(up.file_name || up.id);
        const finalName = /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.${ext}`;
        folders.attach.file(finalName, blob);
        report.added.push(`anexo:${finalName}`);
      } catch (e: any) {
        report.failed.push({ name: up.file_name || up.id, reason: e?.message || "erro" });
      }
    }
  } catch (e: any) {
    console.warn("[batchDownload] anexos:", e?.message);
  }

  // ---- 3. Manifesto ----
  const manifest = [
    `Processo: ${processCode || processId}`,
    `Gerado em: ${new Date().toISOString()}`,
    `Adicionados: ${report.added.length}`,
    `Falharam: ${report.failed.length}`,
    `Sem arquivo: ${report.missing.length}`,
    "",
    "== Falhas ==",
    ...report.failed.map((f) => `- ${f.name}: ${f.reason}`),
    "",
    "== Sem arquivo ==",
    ...report.missing.map((m) => `- ${m}`),
  ].join("\n");
  zip.file("MANIFESTO.txt", manifest);

  // ---- 4. Geração e download único ----
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const safeCode = sanitizeFilename(processCode || processId.slice(0, 8));
  const filename = `Processo_${safeCode}_documentos.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast.success(
    `ZIP gerado: ${report.added.length} arquivo(s). ${report.failed.length} falha(s), ${report.missing.length} sem arquivo.`,
  );
  return report;
}

