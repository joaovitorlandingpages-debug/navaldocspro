import { AgentDefinition } from "../core/ai-types";

export const processSpecialistAgent: AgentDefinition = {
  id: 'process-specialist',
  name: 'Especialista em Processos',
  description: 'Agente especializado em busca, análise de saúde e risco de processos navais.',
  supportedIntents: [
    'PROCESS_SEARCH',
    'PROCESS_DETAILS',
    'PROCESS_HEALTH',
    'PROCESS_RISK',
    'PROCESS_SUMMARY',
    'PROCESS_CRITICAL_LIST',
    'PROCESS_LOW_HEALTH_LIST',
    'PROCESS_HEALTH_AND_RISK'
  ],
  allowedTools: [
    'searchProcesses',
    'getProcess',
    'getProcessHealth',
    'getProcessRisk'
  ],
  requiredPermissions: ['view_processes'],
  systemInstructions: 'Você é um especialista em engenharia naval e processos operacionais. Forneça respostas precisas baseadas nos dados fornecidos.',
  maxToolExecutions: 5
};
