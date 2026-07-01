/**
 * Ações em lote para itens do checklist do processo (Blueprint Workspace).
 * Não substitui a geração individual — invoca a mesma edge function em paralelo
 * com progresso e relatório final.
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
  ok: string[];        // item_name
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
      continue;
    }
    try {
      const { error } = await supabase.functions.invoke("generate-document", {
        body: {
          templateId: it.template_id,
          processId,
          checklistId: it.id,
        },
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
  let created = 0;
  for (const it of eligible) {
    try {
      const { error } = await supabase.from("signature_requests").insert({
        process_id: processId,
        title: it.item_name,
        status: "pending",
        document_checklist_id: it.id,
      } as any);
      if (!error) created += 1;
    } catch {}
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
    .select("id,file_url,file_name")
    .in("id", withDocs.map((i) => i.document_id!));
  if (error || !data) {
    toast.error("Falha ao localizar arquivos.");
    return;
  }
  for (const doc of data) {
    if ((doc as any).file_url) {
      window.open((doc as any).file_url, "_blank");
    }
  }
}
