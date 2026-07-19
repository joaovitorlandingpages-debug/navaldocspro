import { supabase } from "@/integrations/supabase/client";
import { getProcessDocumentStats, calculateTimeInProgress } from "../utils/processMetrics";
import { ProcessHealthEngine } from "../engines/ProcessHealthEngine";
import { OperationalSuggestionEngine } from "../engines/OperationalSuggestionEngine";
import { ProcessRiskEngine } from "../engines/ProcessRiskEngine";

export const processCenterKeys = {
  all: ['process-center'] as const,
  details: () => [...processCenterKeys.all, 'detail'] as const,
  detail: (id: string) => [...processCenterKeys.details(), id] as const,
  metrics: (id: string) => [...processCenterKeys.all, 'metrics', id] as const,
  health: (id: string) => [...processCenterKeys.all, 'health', id] as const,
  risk: (id: string) => [...processCenterKeys.all, 'risk', id] as const,
  suggestions: (id: string) => [...processCenterKeys.all, 'suggestions', id] as const,
  timeline: (id: string) => [...processCenterKeys.all, 'timeline', id] as const,
  documents: (id: string) => [...processCenterKeys.all, 'documents', id] as const,
  checklist: (id: string) => [...processCenterKeys.all, 'checklist', id] as const,
  ocr: (id: string) => [...processCenterKeys.all, 'ocr', id] as const,
  signatures: (id: string) => [...processCenterKeys.all, 'signatures', id] as const,
};

/**
 * Unified hook for Process Center data
 */
export function useProcessCenterData(processId: string) {
  return {
    queryKey: processCenterKeys.detail(processId),
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
      const riskReport = ProcessRiskEngine.evaluate(processId, docStats, healthReport.overallScore);
      const suggestions = OperationalSuggestionEngine.generate(processId, docStats, process);
      const timeInProgress = calculateTimeInProgress(process.created_at, process.finalized_at);

      return {
        process,
        docStats,
        healthReport,
        riskReport,
        suggestions,
        timeInProgress
      };
    }
  };
}
