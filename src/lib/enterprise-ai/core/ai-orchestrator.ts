import { AIIntent, AIRequest, AIResponse, AgentDefinition, ToolExecutionResult } from "./ai-types";
import { AgentRegistry } from "../agents/agent-registry";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/tool-executor";
import { AIProvider } from "../providers/ai-provider";
import { AIError, PermissionError } from "./ai-errors";
import { IntentClassifier } from "../intents/intent-classifier";
import { ExecutionPlanner } from "../planning/execution-planner";
import { ConversationRepository } from "../conversations/conversation-repository";
import { ContextEngine } from "../context/context-engine";
import { ResponseBuilder } from "../responses/response-builder";

export class AIOrchestrator {
  private classifier = new IntentClassifier();
  private planner = new ExecutionPlanner();
  private conversationRepo = new ConversationRepository();
  private contextEngine = new ContextEngine();
  private responseBuilder = new ResponseBuilder();

  constructor(
    private agentRegistry: AgentRegistry,
    private toolRegistry: ToolRegistry,
    private toolExecutor: ToolExecutor,
    private provider: AIProvider
  ) {}

  async process(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const { message, conversationId, userId, companyId } = request;

    if (!userId || !companyId) {
      return this.responseBuilder.buildError(request, 'permission_denied', 'Usuário não autenticado.');
    }

    // 1. Intent Classification
    const classification = this.classifier.classify(message);

    // 2. Load Conversation and Context
    let conversation = conversationId ? await this.conversationRepo.getConversation(conversationId, companyId) : null;
    if (!conversation && conversationId) {
      return this.responseBuilder.buildError(request, 'execution_failed', 'Conversa não encontrada.');
    }

    const contextState = conversation?.contextState || {};

    // 3. Resolve References
    const resolution = this.contextEngine.resolveReferences(message, contextState as any);
    if (resolution.entityType !== 'none' && resolution.entityId) {
       // Add resolved entity to classification entities
       classification.entities.processId = resolution.entityId;
    }

    // 4. Select Agent
    const agent = this.agentRegistry.findAgentByIntent(classification.intent);
    if (!agent) {
      return this.responseBuilder.buildError(request, 'unsupported_intent', 'Não encontrei um agente para processar sua solicitação.');
    }

    // 5. Create Execution Plan
    const plan = this.planner.createPlan(classification.intent, classification.entities, contextState);

    // 6. Execute Tools
    const toolResults: ToolExecutionResult[] = [];
    for (const step of plan.steps) {
      if (step.toolId) {
        const result = await this.toolExecutor.execute(
          step.toolId,
          { userId, companyId, role: 'user', permissions: [], locale: 'pt-BR', conversationId, contextState },
          step.input
        );
        toolResults.push(result);
        step.status = result.success ? 'completed' : 'failed';
      }
    }

    // 7. Generate Answer via Provider
    const providerResponse = await this.provider.generateResponse({
      agent,
      intent: classification.intent,
      plan,
      results: toolResults,
      context: contextState,
      history: [] // Should load from DB
    });

    // 8. Update Context State
    const updatedState = this.contextEngine.updateState(contextState as any, {
      lastIntent: classification.intent,
      lastExecutedTools: plan.requiredTools,
      // Update IDs if found in results
      ...(classification.entities.processId ? { lastProcessId: classification.entities.processId } : {})
    });

    if (conversationId) {
      await this.conversationRepo.updateContextState(conversationId, companyId, updatedState);
    }

    // 9. Final Response
    const response = this.responseBuilder.buildSuccess(
      request,
      providerResponse.answer,
      plan,
      toolResults.map(r => ({
        toolId: r.toolId,
        success: r.success,
        durationMs: r.durationMs,
        error: r.error,
        data: r.data
      })),
      providerResponse.references || [],
      updatedState
    );

    response.durationMs = Date.now() - startTime;
    return response;
  }
}
