import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { casUpdate, notifyConflict, type CasEntity } from "@/lib/optimisticLock";

type Args = {
  entity: CasEntity;
  /** Query keys to invalidate on success or on conflict reload */
  invalidateKeys?: readonly unknown[][];
  /** Optional success toast */
  successMessage?: string;
};

/**
 * Optimistic-lock aware mutation. The caller passes { id, version, patch }.
 * On version conflict the user sees a "Alterado por outro usuário" toast
 * with a Reload action that invalidates the provided query keys.
 */
export function useOptimisticUpdate({ entity, invalidateKeys = [], successMessage }: Args) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { id: string; version: number; patch: Record<string, unknown> }) => {
      const res = await casUpdate(entity, vars.id, vars.version, vars.patch);
      if (!res.ok) {
        if (res.conflict) {
          notifyConflict(res, () => {
            invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k as any }));
          });
          throw new Error("optimistic_lock_conflict");
        }
        toast.error("Falha ao salvar: " + res.error);
        throw new Error(res.error);
      }
      return res;
    },
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k as any }));
    },
  });
}
