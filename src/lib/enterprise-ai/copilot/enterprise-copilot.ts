import { v4 as uuidv4 } from "uuid";
import { CopilotContext, CopilotResponse, ConversationMessage } from "./copilot-types";
import { ConversationMemory } from "./conversation-memory";
import { CopilotResponseBuilder } from "./copilot-response-builder";
import { MockIntentProvider } from "../intent/intent-interpreter";
import { PlannerEngine } from "../planner/planner-engine";
import { PlanExecutionEngine } from "../execution/plan-execution-engine";
import { ActionRegistry } from "../actions/action-registry";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";
import { ActionExecutor } from "../actions/execution/action-executor";
import { initializeEACC } from "..";

export class EnterpriseCopilot {
  private intentInterpreter = new MockIntentProvider();
  private planner = PlannerEngine.getInstance();
  private executionEngine: PlanExecutionEngine;

  constructor() {
    // Ensure actions are registered
    initializeEACC();
    
    // PlanExecutionEngine requires an ActionExecutor
    const validator = new ActionValidator();
    const guard = new PermissionGuard();
    const executor = new ActionExecutor(ActionRegistry, validator, guard);
    this.executionEngine = new PlanExecutionEngine(executor);
  }

  async processMessage(
    sessionId: string,
    text: string,
    context: CopilotContext
  ): Promise<CopilotResponse> {
    // 1. Get or create session
    await ConversationMemory.getOrCreateSession(sessionId, context.userId, context.companyId);

    // 2. Add user message to history
    const userMessage: ConversationMessage = {
      id: uuidv4(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    await ConversationMemory.addMessage(sessionId, userMessage);

    // 3. Simple Command handling (Cancel)
    if (text.toLowerCase() === "cancelar") {
      await this.executionEngine.cancel(sessionId);
      return CopilotResponseBuilder.buildCancellation(sessionId);
    }

    try {
      // 4. Intent Interpretation
      const intent = await this.intentInterpreter.interpret(text);
      await ConversationMemory.updateLastIntent(sessionId, intent);

      // Memory enrichment: if intent lacks customer/vessel but memory has them
      const memory = await ConversationMemory.getMemoryContext(sessionId);
      if (!intent.entities.customerId && memory.lastCustomerId) {
        intent.entities.customerId = memory.lastCustomerId;
      }
      if (!intent.entities.vesselId && memory.lastVesselId) {
        intent.entities.vesselId = memory.lastVesselId;
      }

      // 5. Planning
      const plan = await this.planner.plan({
        intent,
        context: {
          userId: context.userId,
          companyId: context.companyId,
          permissions: context.permissions,
          tenantId: context.tenant
        }
      });

      // 6. Execution Start
      const authContext = {
        userId: context.userId,
        companyId: context.companyId,
        role: "user", // Default for copilot context
        permissions: context.permissions,
        isAuthenticated: true
      };

      const executionSession = await this.executionEngine.execute(plan, authContext);

      // 7. Handle Response
      if (executionSession.state === "WAITING_CONFIRMATION") {
        return CopilotResponseBuilder.buildWaitingConfirmation(sessionId, plan.planId);
      }

      if (executionSession.state === "COMPLETED") {
        return CopilotResponseBuilder.buildSuccess(sessionId, "Ação concluída com sucesso.", {
          planId: plan.planId,
          executionId: executionSession.sessionId
        });
      }

      return CopilotResponseBuilder.buildSuccess(sessionId, "Execução iniciada.", {
        planId: plan.planId,
        executionId: executionSession.sessionId,
        state: executionSession.state
      });

    } catch (error: any) {
      return CopilotResponseBuilder.buildError(sessionId, error);
    }
  }

  async confirm(sessionId: string, context: CopilotContext): Promise<CopilotResponse> {
    try {
      // resume() in PlanExecutionEngine requires plan and authContext
      const session = await ConversationMemory.getOrCreateSession(sessionId, context.userId, context.companyId);
      if (!session.lastExecutionPlan) {
         throw new Error("Nenhum plano pendente encontrado para confirmação.");
      }

      const authContext = {
        userId: context.userId,
        companyId: context.companyId,
        role: "user",
        permissions: context.permissions,
        isAuthenticated: true
      };

      const executionSession = await this.executionEngine.resume(
        sessionId, 
        session.lastExecutionPlan, 
        authContext
      );
      
      if (executionSession.state === "COMPLETED") {
        return CopilotResponseBuilder.buildSuccess(sessionId, "Ação confirmada e concluída com sucesso.");
      }

      return CopilotResponseBuilder.buildSuccess(sessionId, "Ação retomada.", {
        state: executionSession.state
      });
    } catch (error: any) {
      return CopilotResponseBuilder.buildError(sessionId, error);
    }
  }
}

