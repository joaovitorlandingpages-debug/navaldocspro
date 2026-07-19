import { AIResponse, AIRequest } from "../core/ai-types";
import { ExecutionPlan } from "../planning/plan-types";

export class ResponseBuilder {
  buildSuccess(
    request: AIRequest,
    answer: string,
    plan: ExecutionPlan,
    executedTools: any[],
    references: any[],
    contextUpdates: Record<string, any> = {}
  ): AIResponse {
    return {
      answer,
      conversationId: request.conversationId || '',
      selectedAgent: 'process-specialist',
      intent: plan.intent,
      plan: {
        id: plan.planId,
        steps: plan.steps
      },
      executedTools,
      references,
      suggestedActions: this.deriveActions(plan.intent, references),
      warnings: plan.warnings,
      executionId: crypto.randomUUID(),
      durationMs: 0, // Should be calculated
      confidence: 1,
      contextUpdates,
      status: 'success'
    };
  }

  buildError(request: AIRequest, status: AIResponse['status'], message: string): AIResponse {
    return {
      answer: message,
      conversationId: request.conversationId || '',
      selectedAgent: 'system',
      intent: 'UNKNOWN',
      executedTools: [],
      references: [],
      suggestedActions: [],
      warnings: [],
      executionId: crypto.randomUUID(),
      durationMs: 0,
      confidence: 0,
      contextUpdates: {},
      status
    };
  }

  private deriveActions(intent: string, references: any[]): string[] {
    const actions: string[] = [];
    if (intent.includes('SEARCH') && references.length > 0) {
      actions.push('Ver detalhes do primeiro');
    }
    if (intent.includes('DETAILS')) {
      actions.push('Ver análise de risco');
      actions.push('Ver análise de saúde');
    }
    return actions;
  }
}
