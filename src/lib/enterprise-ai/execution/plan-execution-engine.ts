import { ExecutionPlan, ExecutionStep } from "../planner/planner-types";
import { ActionExecutor } from "../actions/execution/action-executor";
import { SecurityContext } from "../actions/security/permission-types";
import { PlanStatus, ExecutionSession, StepStatus } from "./plan-execution-types";
import { sessionManager } from "./execution-session";
import { PlanExecutionError, PlanExecutionErrorCode } from "./plan-execution-errors";
import { ActionStatus } from "../actions/action-types";

export class PlanExecutionEngine {
  constructor(private executor: ActionExecutor) {}

  async execute(plan: ExecutionPlan, authContext: SecurityContext): Promise<ExecutionSession> {
    const session = sessionManager.createSession(plan.planId, authContext.companyId, authContext.userId);
    
    try {
      sessionManager.updateSession(session.sessionId, { state: "VALIDATING" });
      this.validatePlan(plan);
      
      sessionManager.updateSession(session.sessionId, { state: "RUNNING" });
      return await this.runExecutionLoop(session.sessionId, plan, authContext);
    } catch (error: any) {
      const state = (error instanceof PlanExecutionError && error.code === PlanExecutionErrorCode.PLAN_CANCELLED) 
        ? "CANCELLED" as PlanStatus
        : "FAILED" as PlanStatus;
        
      return sessionManager.updateSession(session.sessionId, { 
        state,
        finishedAt: new Date(),
        auditMetadata: { ...session.auditMetadata, lastError: error.message }
      });
    }
  }

  async resume(sessionId: string, plan: ExecutionPlan, authContext: SecurityContext): Promise<ExecutionSession> {
    const session = sessionManager.getSession(sessionId);
    if (!session) throw new PlanExecutionError(PlanExecutionErrorCode.SESSION_NOT_FOUND, "Session not found");

    sessionManager.updateSession(sessionId, { state: "RUNNING" });
    return await this.runExecutionLoop(sessionId, plan, authContext);
  }

  async cancel(sessionId: string): Promise<ExecutionSession> {
    return sessionManager.updateSession(sessionId, { 
      state: "CANCELLED",
      finishedAt: new Date()
    });
  }

  private validatePlan(plan: ExecutionPlan) {
    if (!plan.steps || plan.steps.length === 0) {
      throw new PlanExecutionError(PlanExecutionErrorCode.INVALID_PLAN, "Plan has no steps");
    }
  }

  private async runExecutionLoop(sessionId: string, plan: ExecutionPlan, authContext: SecurityContext): Promise<ExecutionSession> {
    let session = sessionManager.getSession(sessionId)!;

    while (session.state === "RUNNING") {
      const nextStep = this.getNextStep(plan, session);
      
      if (!nextStep) {
        return sessionManager.updateSession(sessionId, { 
          state: "COMPLETED",
          finishedAt: new Date()
        });
      }

      session = sessionManager.updateSession(sessionId, { currentStepId: nextStep.stepId });
      
      const result = await this.executeStep(nextStep, authContext, session);
      
      session = sessionManager.getSession(sessionId)!;

      if (result.status === ActionStatus.SUCCESS) {
        session = sessionManager.updateSession(sessionId, {
          completedSteps: [...session.completedSteps, nextStep.stepId],
          stepResults: { ...session.stepResults, [nextStep.stepId]: result.data }
        });
      } else {
        const isRecoverable = result.metadata?.errorCode === 'MATERIALIZATION_FAILED' || result.metadata?.errorCode === 'VISIBILITY_FAILED';
        const newState: PlanStatus = isRecoverable ? "RECOVERABLE_FAILED" : "FAILED";



        
        return sessionManager.updateSession(sessionId, {
          state: newState,
          failedSteps: [...session.failedSteps, nextStep.stepId],
          finishedAt: newState === "FAILED" ? new Date() : undefined
        });
      }
      
      // Check for confirmation requirement from metadata or executor result
      if (nextStep.confirmationRequired && !nextStep.input.confirmationToken) {
         return sessionManager.updateSession(sessionId, { state: "WAITING_CONFIRMATION" });
      }
    }

    return session;
  }

  private getNextStep(plan: ExecutionPlan, session: ExecutionSession): ExecutionStep | undefined {
    return plan.steps.find(step => 
      !session.completedSteps.includes(step.stepId) && 
      !session.failedSteps.includes(step.stepId) &&
      step.dependsOn.every(depId => session.completedSteps.includes(depId))
    );
  }

  private async executeStep(step: ExecutionStep, authContext: SecurityContext, session: ExecutionSession) {
    // Generate idempotency key for the step
    const idempotencyKey = `step-${session.sessionId}-${step.stepId}`;
    
    // Inject results from previous steps into input if needed (simple implementation)
    const stepInput = { 
      ...step.input, 
      idempotencyKey,
      _planContext: {
        sessionId: session.sessionId,
        planId: session.planId,
        completedSteps: session.completedSteps
      }
    };

    return await this.executor.execute(step.actionId, stepInput, authContext);
  }
}
