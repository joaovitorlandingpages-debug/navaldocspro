import { supabase } from "@/integrations/supabase/client";
import { ActionRegistry } from "../action-registry";
import { ActionStatus, AIAction } from "../action-types";
import { ActionExecutor } from "./action-executor";
import { ActionValidator } from "../security/action-validator";
import { PermissionGuard } from "../security/permission-guard";
import { ExecutionResult } from "./execution-result";
import { SecurityContext } from "../security/permission-types";
import { auditLogger } from "../audit/audit-logger";

/**
 * Action Engine Service
 * Orchestrates the execution of AI-driven actions with persistence,
 * auditing, and state management.
 */
export class ActionEngineService {
  private static instance: ActionEngineService;
  private executor: ActionExecutor;

  private constructor() {
    // Initialize components
    const validator = new ActionValidator();
    const guard = new PermissionGuard();
    this.executor = new ActionExecutor(ActionRegistry, validator, guard);
  }

  public static getInstance(): ActionEngineService {
    if (!ActionEngineService.instance) {
      ActionEngineService.instance = new ActionEngineService();
    }
    return ActionEngineService.instance;
  }

  /**
   * Executes an action and persists its state.
   */
  public async executeAction(args: {
    actionId: string;
    input: any;
    authContext: SecurityContext;
    findingId?: string;
    analysisId?: string;
    processId?: string;
    requestId?: string;
    conversationId?: string;
  }): Promise<ExecutionResult> {
    const { actionId, input, authContext, findingId, analysisId, processId, requestId, conversationId } = args;

    // 1. Initial State Persistence (PENDING)
    const startedAt = new Date().toISOString();
    try {
      await auditLogger.logStart({
        executionId: requestId || Math.random().toString(36).substring(7),
        actionId,
        actionName: actionId, // Registry will handle display name
        userId: authContext.userId,
        companyId: authContext.companyId,
        processId,
        conversationId,
        metadata: input
      });
    } catch (auditError) {
      console.warn('Audit start failed, continuing action execution:', auditError);
    }

    // 2. Execute via ActionExecutor
    const result = await this.executor.execute(actionId, input, authContext, {
      requestId,
      conversationId
    });

    // 3. Post-execution logic (Persistence handled by ActionExecutor)
    if (result.success && result.data?.processId) {
      console.log(`Action ${actionId} succeeded for process ${result.data.processId}`);
    }

    return result;
  }

  /**
   * Retrieves available actions for a specific finding.
   */
  public getAvailableActionsForFinding(findingType: string): AIAction[] {
    const registry = ActionRegistry.list();
    // Logic to filter actions based on finding type mapping
    // This will be expanded in future sprints.
    return registry.filter(action => {
       // Mock logic: some actions are generic
       return true;
    });
  }
}

export const actionEngineService = ActionEngineService.getInstance();
