import { 
  AIRequest, 
  AIResponse, 
  AIExecutionContext, 
  AIIntent,
  ToolExecutionResult 
} from "./ai-types";
import { AgentRegistry } from "../agents/agent-registry";
import { ToolExecutor } from "../tools/tool-registry";
import { MockProvider } from "../providers/mock-provider";
import { AIError } from "./ai-errors";

export class AIOrchestrator {
  private static provider = new MockProvider();

  static async process(request: AIRequest, context: AIExecutionContext): Promise<AIResponse> {
    const start = Date.now();
    
    // 1. Detect Intent
    const intent = this.detectIntent(request.message);
    
    if (intent === 'unsupported_intent') {
      return {
        answer: "Desculpe, ainda não consigo processar essa solicitação específica. Posso ajudar você a pesquisar processos ou analisar a saúde e o risco de um processo.",
        executedTools: [],
        executionId: Math.random().toString(36).substring(7),
        durationMs: Date.now() - start,
        warnings: ["unsupported_intent"]
      };
    }

    // 2. Select Agent
    const agent = AgentRegistry.findByIntent(intent);
    if (!agent) {
      throw new AIError('AGENT_NOT_FOUND', `Nenhum agente disponível para a intenção: ${intent}`);
    }

    // 3. Determine and Execute Tools
    const toolResults: ToolExecutionResult[] = [];
    
    if (intent === 'search_processes') {
      const result = await ToolExecutor.execute('searchProcesses', context, { query: request.message });
      toolResults.push(result);
    } else if (intent === 'get_process_details' && context.entityContext?.processId) {
      const result = await ToolExecutor.execute('getProcess', context, { processId: context.entityContext.processId });
      toolResults.push(result);
    } else if (intent === 'get_process_health' && context.entityContext?.processId) {
      const result = await ToolExecutor.execute('getProcessHealth', context, { processId: context.entityContext.processId });
      toolResults.push(result);
    } else if (intent === 'get_process_risk' && context.entityContext?.processId) {
      const result = await ToolExecutor.execute('getProcessRisk', context, { processId: context.entityContext.processId });
      toolResults.push(result);
    }

    // 4. Generate Response via Provider
    const response = await this.provider.generateResponse(agent, context, request.message, toolResults);
    
    return {
      ...response,
      durationMs: Date.now() - start
    };
  }

  private static detectIntent(message: string): AIIntent {
    const msg = message.toLowerCase();
    
    if (msg.includes('pesquisar') || msg.includes('listar') || msg.includes('procurar') || msg.includes('quais processos')) {
      return 'search_processes';
    }
    
    if (msg.includes('detalhe') || msg.includes('sobre o processo') || msg.includes('abrir processo')) {
      return 'get_process_details';
    }
    
    if (msg.includes('saúde') || msg.includes('health') || msg.includes('está saudável')) {
      return 'get_process_health';
    }
    
    if (msg.includes('risco') || msg.includes('risk') || msg.includes('perigoso')) {
      return 'get_process_risk';
    }

    return 'unsupported_intent';
  }
}
