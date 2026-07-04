import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CasEntity =
  | "processes"
  | "document_checklists"
  | "generated_documents"
  | "process_dossiers";

const RPC_BY_ENTITY: Record<CasEntity, string> = {
  processes: "cas_update_process",
  document_checklists: "cas_update_checklist_item",
  generated_documents: "cas_update_generated_document",
  process_dossiers: "cas_update_dossier",
};

export type CasResult =
  | { ok: true; version: number; updated_at: string }
  | { ok: false; conflict: true; currentVersion: number; expectedVersion: number; entity: CasEntity; id: string }
  | { ok: false; conflict: false; error: string };

/** Parse "optimistic_lock_conflict:<entity>:<id>:<expected>:<current>" */
function parseConflict(msg: string) {
  const m = msg.match(/optimistic_lock_conflict:([^:]+):([^:]+):(\d+):(\d+)/);
  if (!m) return null;
  return { entity: m[1] as CasEntity, id: m[2], expected: Number(m[3]), current: Number(m[4]) };
}

export async function casUpdate(
  entity: CasEntity,
  id: string,
  expectedVersion: number,
  patch: Record<string, unknown>,
): Promise<CasResult> {
  const fn = RPC_BY_ENTITY[entity];
  const { data, error } = await supabase.rpc(fn as any, {
    p_id: id,
    p_expected_version: expectedVersion,
    p_patch: patch as any,
  });
  if (error) {
    const parsed = parseConflict(error.message ?? "");
    if (parsed) {
      return { ok: false, conflict: true, currentVersion: parsed.current, expectedVersion: parsed.expected, entity, id };
    }
    return { ok: false, conflict: false, error: error.message ?? "update_failed" };
  }
  const row = data as { ok: boolean; version: number; updated_at: string };
  return { ok: true, version: row.version, updated_at: row.updated_at };
}

/** Show a conflict toast with a Reload action. */
export function notifyConflict(result: Extract<CasResult, { conflict: true }>, onReload: () => void) {
  toast.error("Alterado por outro usuário", {
    description: `Sua versão (${result.expectedVersion}) está desatualizada. Versão atual: ${result.currentVersion}. Recarregue para não perder dados.`,
    duration: 10000,
    action: { label: "Recarregar", onClick: onReload },
  });
}
