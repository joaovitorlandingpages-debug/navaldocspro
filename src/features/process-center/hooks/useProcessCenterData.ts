import { supabase } from "@/integrations/supabase/client";
import { getProcessDocumentStats, calculateTimeInProgress } from "../utils/processMetrics";
import { ProcessHealthEngine } from "../engines/ProcessHealthEngine";
import { OperationalSuggestionEngine } from "../engines/OperationalSuggestionEngine";
import { ProcessRiskEngine, ProcessRiskContext } from "../engines/ProcessRiskEngine";

export const processCenterKeys = {
  all: ['process-center'] as const,
  details: () => [...processCenterKeys.all, 'detail'] as const,
  detail: (id: string) => [...processCenterKeys.details(), id] as const,
};

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
      
      // Build full Risk Context as required by Gate Final
      const riskContext: ProcessRiskContext = {
        process: {
          id: process.id,
          status: process.status,
          createdAt: process.created_at,
          updatedAt: process.updated_at,
          finalizedAt: process.finalized_at,
          currentStage: process.current_stage || 'initial'
        },
        documentation: {
          ...docStats,
          missing: docStats.totalRequired - docStats.totalAttached,
          blocking: docStats.totalBlocking,
          critical: docStats.totalBlocking, // Simplified for now
          expired: 0,
          expiringSoon: 0,
          waived: 0,
          notApplicable: 0
        },
        checklist: { total: 0, pending: 0, blocking: 0, completed: 0, waivedWithoutReason: 0 },
        ocr: { pending: 0, failed: 0, lowConfidence: 0, missingRequiredFields: 0, divergences: 0 },
        signatures: { pending: 0, expired: 0, expiringSoon: 0, requiredNotCreated: 0, completedNotAdvanced: 0 },
        review: { pending: docStats.totalPending, overdue: 0, rejected: docStats.totalRejected, adjustmentsRequested: 0 },
        deadlines: { overdue: false, daysRemaining: 10, inactivityDays: 0 },
        dataIntegrity: {
          customerIncomplete: !process.customer?.cpf_cnpj,
          vesselIncomplete: !process.vessel?.registration_number,
          ownerIncomplete: false,
          engineIncomplete: false,
          inconsistencies: 0
        },
        security: { integrityViolation: false, finalizedMutationAttempt: false }
      };

      const riskReport = ProcessRiskEngine.evaluate(riskContext);
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
