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

export async function batchRequestSignature(processId: string, items: ChecklistLite[]) {
  const eligible = items.filter((i) => i.requires_signature || i.document_id);
  if (eligible.length === 0) {
    toast.info("Nenhum item selecionado exige assinatura.");
    return { created: 0 };
  }
  const { data: proc } = await supabase
    .from("processes").select("company_id, customer_id").eq("id", processId).maybeSingle();
  if (!proc?.company_id) {
    toast.error("Processo sem empresa vinculada.");
    return { created: 0 };
  }
  let created = 0;
  for (const it of eligible) {
    const { error } = await supabase.from("signature_requests").insert({
      company_id: proc.company_id,
      customer_id: proc.customer_id ?? null,
      process_id: processId,
      title: it.item_name,
      status: "pending",
      document_id: it.document_id ?? null,
      metadata: { document_checklist_id: it.id } as any,
    });
    if (!error) created += 1;
  }
  return { created };
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
