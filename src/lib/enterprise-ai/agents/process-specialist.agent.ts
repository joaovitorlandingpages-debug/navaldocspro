import { AgentDefinition } from "../core/ai-types";
import { AgentRegistry } from "./agent-registry";

export const processSpecialistAgent: AgentDefinition = {
  id: 'process-specialist',
  name: 'Especialista em Processos Navais',
  description: 'Agente especializado em localização, resumo e análise de saúde/risco de processos navais.',
  supportedIntents: [
    'search_processes',
    'get_process_details',
    'get_process_health',
    'get_process_risk'
  ],
  allowedTools: [
    'searchProcesses',
    'getProcess',
    'getProcessHealth',
    'getProcessRisk'
  ],
  requiredPermissions: ['processes.read'],
  systemInstructions: `Você é o Especialista em Processos Navais do NavalDocs Pro.
Sua missão é ajudar o usuário a gerenciar seus processos com precisão técnica e eficiência.
Ao responder:
1. Use os dados retornados pelas ferramentas de forma objetiva.
2. Identifique gargalos documentais ou riscos críticos.
3. Sugira o próximo passo lógico baseado no status do processo.
4. Mantenha um tom profissional, mas ágil.
5. Se não encontrar um processo, peça clarificação (número, cliente ou embarcação).
Nunca invente dados que não foram retornados pelas ferramentas.`,
  maxToolExecutions: 3
};

export function registerAgents() {
  AgentRegistry.register(processSpecialistAgent);
}
