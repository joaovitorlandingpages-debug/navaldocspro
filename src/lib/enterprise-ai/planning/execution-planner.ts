import { AIIntent } from "../intents/intent-types";
import { ExecutionPlan, ExecutionStep } from "./plan-types";

export class ExecutionPlanner {
  createPlan(intent: AIIntent, entities: Record<string, any>, context: any): ExecutionPlan {
    const planId = crypto.randomUUID();
    const steps: ExecutionStep[] = [];
    const warnings: string[] = [];

    switch (intent) {
      case AIIntent.PROCESS_SEARCH:
        steps.push({
          id: 'search',
          description: 'Buscando processos',
          toolId: 'searchProcesses',
          input: { query: entities.query || '' },
          status: 'pending'
        });
        break;

      case AIIntent.PROCESS_DETAILS:
        steps.push({
          id: 'details',
          description: 'Obtendo detalhes do processo',
          toolId: 'getProcess',
          input: { processId: entities.processId || context.lastProcessId },
          status: 'pending'
        });
        break;

      case AIIntent.PROCESS_HEALTH:
        steps.push({
          id: 'health',
          description: 'Analisando saúde do processo',
          toolId: 'getProcessHealth',
          input: { processId: entities.processId || context.lastProcessId },
          status: 'pending'
        });
        break;

      case AIIntent.PROCESS_RISK:
        steps.push({
          id: 'risk',
          description: 'Analisando risco do processo',
          toolId: 'getProcessRisk',
          input: { processId: entities.processId || context.lastProcessId },
          status: 'pending'
        });
        break;

      case AIIntent.PROCESS_SUMMARY:
        steps.push(
          { id: 'get', description: 'Obtendo dados', toolId: 'getProcess', input: { processId: entities.processId || context.lastProcessId }, status: 'pending' },
          { id: 'health', description: 'Analisando saúde', toolId: 'getProcessHealth', input: { processId: entities.processId || context.lastProcessId }, status: 'pending' },
          { id: 'risk', description: 'Analisando risco', toolId: 'getProcessRisk', input: { processId: entities.processId || context.lastProcessId }, status: 'pending' }
        );
        break;
        
      default:
        warnings.push(`Intenção ${intent} não possui plano de execução definido.`);
    }

    return {
      planId,
      intent,
      steps,
      requiredTools: steps.map(s => s.toolId!).filter(Boolean),
      executionMode: 'sequential',
      estimatedComplexity: steps.length > 2 ? 'medium' : 'low',
      warnings
    };
  }
}
