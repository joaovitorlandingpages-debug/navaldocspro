import { ToolDefinition, AIExecutionContext } from "../core/ai-types";
import { supabase } from "@/integrations/supabase/client";
import { getProcessDocumentStats } from "@/features/process-center/utils/processMetrics";
import { ProcessHealthEngine } from "@/features/process-center/engines/ProcessHealthEngine";
import { ProcessRiskEngine, ProcessRiskContext } from "@/features/process-center/engines/ProcessRiskEngine";

export const searchProcessesTool: ToolDefinition = {
  id: 'searchProcesses',
  category: 'process',
  description: 'Search for processes by vessel name, customer name or process number',
  inputSchema: {
    query: 'string'
  },
  requiredPermissions: ['processes.read'],
  timeoutMs: 5000,
  cachePolicy: 'short',
  execute: async (context, input) => {
    const { query } = input;
    const { data, error } = await supabase
      .from('processes')
      .select(`
        id, 
        process_number, 
        status, 
        created_at,
        customer:customers!processes_customer_id_fkey(name),
        vessel:vessels!processes_vessel_id_fkey(name)
      `)
      .or(`process_number.ilike.%${query}%,vessel_id.in.(select id from vessels where name.ilike.%${query}%),customer_id.in.(select id from customers where name.ilike.%${query}%)`)
      .eq('company_id', context.companyId)
      .limit(10);

    if (error) throw error;
    return data;
  }
};

export const getProcessTool: ToolDefinition = {
  id: 'getProcess',
  category: 'process',
  description: 'Get detailed information about a specific process',
  inputSchema: {
    processId: 'string'
  },
  requiredPermissions: ['processes.read'],
  timeoutMs: 3000,
  cachePolicy: 'short',
  execute: async (context, input) => {
    const { processId } = input;
    const { data, error } = await supabase
      .from('processes')
      .select(`
        *,
        customer:customers!processes_customer_id_fkey(*),
        vessel:vessels!processes_vessel_id_fkey(*)
      `)
      .eq('id', processId)
      .eq('company_id', context.companyId)
      .single();

    if (error) throw error;
    return data;
  }
};

export const getProcessHealthTool: ToolDefinition = {
  id: 'getProcessHealth',
  category: 'process',
  description: 'Get health report for a specific process',
  inputSchema: {
    processId: 'string'
  },
  requiredPermissions: ['processes.read'],
  timeoutMs: 5000,
  cachePolicy: 'short',
  execute: async (context, input) => {
    const { processId } = input;
    const stats = await getProcessDocumentStats(processId);
    const healthReport = await ProcessHealthEngine.calculate(processId, stats);
    return healthReport;
  }
};

export const getProcessRiskTool: ToolDefinition = {
  id: 'getProcessRisk',
  category: 'process',
  description: 'Get risk evaluation for a specific process',
  inputSchema: {
    processId: 'string'
  },
  requiredPermissions: ['processes.read'],
  timeoutMs: 5000,
  cachePolicy: 'short',
  execute: async (context, input) => {
    const { processId } = input;
    
    // Fetch process data for risk context
    const { data: process, error } = await supabase
      .from('processes')
      .select(`
        *,
        customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj),
        vessel:vessels!processes_vessel_id_fkey(id, name, registration_number)
      `)
      .eq('id', processId)
      .eq('company_id', context.companyId)
      .single();

    if (error) throw error;
    
    const docStats = await getProcessDocumentStats(processId);
    
    // Construct Risk Context (simplified version of useProcessCenterData)
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
        critical: docStats.totalBlocking,
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
    return riskReport;
  }
};
