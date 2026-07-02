import { supabase } from "@/integrations/supabase/client";

export type VisibleProcessRow = Record<string, any> & { id: string; company_id: string };

const visibleProcessSelect = "*, customers:customers!processes_customer_id_fkey(name), vessels:vessels!processes_vessel_id_fkey(name)";

export async function fetchVisibleProcessById(processId: string, companyId: string): Promise<VisibleProcessRow | null> {
  const { data, error } = await supabase
    .from("processes")
    .select(visibleProcessSelect)
    .eq("id", processId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .is("trashed_at", null)
    .or("is_draft.is.null,is_draft.eq.false")
    .maybeSingle();

  if (error) throw error;
  return (data as VisibleProcessRow | null) ?? null;
}

export async function confirmProcessVisible(processId: string, companyId: string): Promise<VisibleProcessRow> {
  const process = await fetchVisibleProcessById(processId, companyId);
  if (!process) {
    throw new Error(
      "O processo foi gravado, mas não ficou visível na lista da empresa. Nenhum sucesso foi confirmado; tente novamente ou revise os filtros.",
    );
  }
  return process;
}

export function notifyProcessesChanged(process: VisibleProcessRow) {
  window.dispatchEvent(new CustomEvent("processes:changed", { detail: { id: process.id, process } }));
}