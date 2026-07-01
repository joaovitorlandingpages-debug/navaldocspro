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

export async function batchDownload(items: ChecklistLite[]) {
  const withDocs = items.filter((i) => i.document_id);
  if (withDocs.length === 0) {
    toast.info("Nenhum item selecionado tem documento gerado para baixar.");
    return;
  }
  const { data, error } = await supabase
    .from("generated_documents")
    .select("id,generated_file_url,signed_file_url,name")
    .in("id", withDocs.map((i) => i.document_id!));
  if (error || !data) { toast.error("Falha ao localizar arquivos."); return; }
  for (const doc of data) {
    const url = (doc as any).signed_file_url || (doc as any).generated_file_url;
    if (url) window.open(url, "_blank");
  }
}
