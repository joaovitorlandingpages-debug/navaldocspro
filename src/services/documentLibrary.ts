import { supabase } from "@/integrations/supabase/client";

export type LibraryTemplate = {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  process_type: string | null;
  description: string | null;
  base_content: string | null;
  is_global: boolean;
  is_active: boolean;
  version_number: number | null;
  metadata: any;
  company_id: string | null;
};

export type DocStatus =
  | "pending"
  | "filling"
  | "awaiting_review"
  | "awaiting_approval"
  | "approved"
  | "pdf_generated"
  | "rejected";

export const STATUS_LABELS: Record<DocStatus, string> = {
  pending: "Pendente",
  filling: "Em preenchimento",
  awaiting_review: "Aguardando revisão",
  awaiting_approval: "Aguardando aprovação",
  approved: "Aprovado",
  pdf_generated: "PDF final gerado",
  rejected: "Rejeitado",
};

export const STATUS_COLOR: Record<DocStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  filling: "bg-amber-100 text-amber-700",
  awaiting_review: "bg-blue-100 text-blue-700",
  awaiting_approval: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  pdf_generated: "bg-green-200 text-green-900",
  rejected: "bg-red-100 text-red-700",
};

// ---- Bloco 5: Process document statuses (storage layer) ----
export type ProcessDocStatus =
  | "pendente"
  | "em_preenchimento"
  | "aguardando_revisao"
  | "aguardando_aprovacao"
  | "aprovado"
  | "pdf_gerado"
  | "rejeitado"
  | "ignorado";

export const PROCESS_DOC_STATUS_LABELS: Record<ProcessDocStatus, string> = {
  pendente: "Pendente",
  em_preenchimento: "Em preenchimento",
  aguardando_revisao: "Aguardando revisão",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  pdf_gerado: "PDF gerado",
  rejeitado: "Rejeitado",
  ignorado: "Ignorado",
};

export type SuggestedTemplate = LibraryTemplate & {
  is_required: boolean;
  reason: string;
};

export function suggestTemplatesForWizard(
  all: LibraryTemplate[],
  processType: string | null | undefined,
  companyId: string | null,
): SuggestedTemplate[] {
  if (!processType) return [];
  const norm = processType.toLowerCase();
  const visible = all.filter(
    (t) => t.is_global || (companyId && t.company_id === companyId),
  );
  return visible
    .filter((t) => {
      const pt = (t.process_type || "").toLowerCase();
      return pt === "geral" || norm.includes(pt) || pt.includes(norm);
    })
    .map((t) => {
      const mandatory = !!t.metadata?.mandatory_in_process;
      const pt = (t.process_type || "").toLowerCase();
      const reason = mandatory
        ? `Obrigatório para ${t.process_type || "este processo"}`
        : pt === "geral"
          ? "Sugerido (modelo geral)"
          : `Sugerido para ${t.process_type}`;
      return { ...t, is_required: mandatory, reason };
    });
}

export async function fetchLibrary(): Promise<LibraryTemplate[]> {
  const { data, error } = await supabase
    .from("document_templates")
    .select(
      "id, code, name, category, process_type, description, base_content, is_global, is_active, version_number, metadata, company_id",
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as any) || [];
}

export function suggestTemplatesForProcessType(
  all: LibraryTemplate[],
  processType: string | null | undefined,
): LibraryTemplate[] {
  if (!processType) return [];
  const norm = processType.toLowerCase();
  return all.filter((t) => {
    if (!t.metadata?.mandatory_in_process) return false;
    const pt = (t.process_type || "").toLowerCase();
    return pt === "geral" || norm.includes(pt) || pt.includes(norm);
  });
}

export function detectMissingFields(
  tpl: LibraryTemplate,
  context: Record<string, any>,
): string[] {
  const required: string[] = tpl.metadata?.mandatory_fields || [];
  return required.filter((path) => {
    const val = path
      .split(".")
      .reduce((acc: any, k) => (acc ? acc[k] : undefined), context);
    return !val || String(val).trim() === "";
  });
}

export async function logLibraryEvent(
  eventType:
    | "library_document_selected"
    | "library_document_removed"
    | "process_documents_auto_suggested"
    | "process_required_document_missing"
    | "process_document_status_changed"
    | "process_library_validation_passed"
    | "process_library_validation_failed"
    | "process_templates_suggested"
    | "process_document_created"
    | "process_document_optional_selected"
    | "process_document_optional_ignored"
    | "process_document_duplicate_skipped"
    | "process_document_approval_required"
    | "process_final_pdf_blocked"
    | "process_final_pdf_unlocked",
  metadata: Record<string, any> = {},
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", auth.user?.id || "")
      .maybeSingle();
    await supabase.from("document_generation_logs").insert({
      event_type: eventType,
      severity:
        eventType.includes("missing") ||
        eventType.includes("failed") ||
        eventType.includes("blocked")
          ? "warning"
          : "info",
      message: `[library] ${eventType}`,
      metadata,
      user_id: auth.user?.id,
      company_id: profile?.company_id,
      process_id: metadata.process_id || null,
      document_template_id: metadata.template_id || null,
    } as any);
  } catch (e) {
    console.warn("[library log failed]", e);
  }
}

// ---- Bloco 5: persist suggested/selected docs into process_documents ----
export async function persistProcessDocuments(args: {
  processId: string;
  companyId: string;
  userId: string | null;
  templates: SuggestedTemplate[];
  selectedOptionalIds: Set<string>;
  ignoredOptionalIds: Set<string>;
}) {
  const { processId, companyId, userId, templates, selectedOptionalIds, ignoredOptionalIds } = args;
  // Skip duplicates
  const { data: existing } = await (supabase as any)
    .from("process_documents")
    .select("template_id")
    .eq("process_id", processId);
  const existingIds = new Set<string>((existing || []).map((r: any) => r.template_id));
  const rows: any[] = [];
  for (const tpl of templates) {
    if (existingIds.has(tpl.id)) {
      await logLibraryEvent("process_document_duplicate_skipped", {
        process_id: processId, template_id: tpl.id, template_name: tpl.name,
      });
      continue;
    }
    const isIgnored = !tpl.is_required && ignoredOptionalIds.has(tpl.id);
    const isIncluded = tpl.is_required || selectedOptionalIds.has(tpl.id);
    if (!isIncluded && !isIgnored) continue;
    rows.push({
      process_id: processId,
      template_id: tpl.id,
      company_id: companyId,
      status: isIgnored ? "ignorado" : "pendente",
      is_required: tpl.is_required,
      source: tpl.is_required ? "required_auto" : "optional_selected",
      selected_by: userId,
      metadata: { reason: tpl.reason, template_name: tpl.name, template_code: tpl.code } as any,
    });
  }
  if (rows.length === 0) return { inserted: 0 };
  const { error } = await (supabase as any).from("process_documents").insert(rows);
  if (error) {
    console.error("[process_documents insert]", error);
    throw error;
  }
  for (const r of rows) {
    await logLibraryEvent("process_document_created", {
      process_id: processId, template_id: r.template_id,
      status: r.status, is_required: r.is_required,
    });
  }
  return { inserted: rows.length };
}

