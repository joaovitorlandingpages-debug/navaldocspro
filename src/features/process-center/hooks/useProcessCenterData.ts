import { supabase } from "@/integrations/supabase/client";
import { getProcessDocumentStats, calculateTimeInProgress } from "../utils/processMetrics";
import { ProcessHealthEngine } from "../engines/ProcessHealthEngine";
import { OperationalSuggestionEngine } from "../engines/OperationalSuggestionEngine";

export const processCenterKeys = {
  all: ['process-center'] as const,
  detail: (id: string) => [...processCenterKeys.all, 'detail', id] as const,
  metrics: (id: string) => [...processCenterKeys.all, 'metrics', id] as const,
};

/**
 * Unified hook for Process Center data
 */
export function useProcessCenterData(processId: string) {
  return {
    queryKey: processCenterKeys.metrics(processId),
    queryFn: async () => {
      const { data: process, error: pError } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, vessel_type, current_owner_name, current_owner_cpf_cnpj)
        `)
        .eq('id', processId)
        .maybeSingle();

      if (pError) throw pError;
      if (!process) throw new Error("Process not found");

      const docStats = await getProcessDocumentStats(processId);
      const healthReport = await ProcessHealthEngine.calculate(processId, docStats);
      const suggestions = OperationalSuggestionEngine.generate(processId, docStats);
      const timeInProgress = calculateTimeInProgress(process.created_at, process.finalized_at);

      return {
        process,
        docStats,
        healthReport,
        suggestions,
        timeInProgress
      };
    }
  };
}
