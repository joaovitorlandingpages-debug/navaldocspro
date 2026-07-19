import { AIResponse, AIRequest, AIIntent } from "../core/ai-types";
import { ExecutionPlan } from "../planning/plan-types";

export interface SuggestedAction {
  label: string;
  action: string;
  path?: string;
}

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
      intent: plan.intent as AIIntent,
      plan: {
        id: plan.planId,
        steps: plan.steps.map(s => ({
          id: s.id,
          description: s.description,
          status: s.status
        }))
      },
      executedTools,
      references,
      suggestedActions: this.deriveActions(plan.intent as AIIntent, references),
      warnings: plan.warnings,
      executionId: crypto.randomUUID(),
      durationMs: 0,
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

  private deriveActions(intent: AIIntent, references: any[]): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    if (intent.includes('SEARCH') && references.length > 0) {
      actions.push({
        label: 'Ver detalhes do primeiro',
        action: 'PROCESS_DETAILS',
        path: `/admin/process-center/${references[0].id}`
      });
    }
    if (intent.includes('DETAILS')) {
      actions.push({ label: 'Ver análise de risco', action: 'PROCESS_RISK' });
      actions.push({ label: 'Ver análise de saúde', action: 'PROCESS_HEALTH' });
    }
    return actions;
  }
}
