import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlanExecutionEngine } from "../execution/plan-execution-engine";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ExecutionPlan } from "../planner/planner-types";
import { ActionStatus } from "../actions/action-types";
import { sessionManager } from "../execution/execution-session";

describe("PlanExecutionEngine", () => {
  let executor: any;
  let engine: PlanExecutionEngine;
  const authContext = { userId: "user-1", companyId: "comp-1", permissions: ["admin"], role: "user", isAuthenticated: true };

  beforeEach(() => {
    executor = {
      execute: vi.fn()
    };
    engine = new PlanExecutionEngine(executor as any);
    // Clear sessions between tests
    (sessionManager as any).sessions.clear();
  });

  const createMockPlan = (steps: any[]): ExecutionPlan => ({
    planId: crypto.randomUUID(),
    intent: "test intent",
    steps: steps.map(s => ({
      stepId: crypto.randomUUID(),
      actionId: "mock-action",
      dependsOn: [],
      status: "PENDING",
      requiredPermissions: [],
      confirmationRequired: false,
      input: {},
      ...s
    })),
    riskLevel: "LOW",
    estimatedActions: steps.length,
    requiresConfirmation: false,
    status: "READY",
    companyId: "comp-1",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {}
  });

  it("should execute a simple plan successfully", async () => {
    executor.execute.mockResolvedValue({ success: true, status: ActionStatus.SUCCESS, data: { ok: true } });
    const plan = createMockPlan([{ actionId: "action-1" }]);
    
    const session = await engine.execute(plan, authContext);
    
    expect(session.state).toBe("COMPLETED");
    expect(session.completedSteps).toHaveLength(1);
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it("should respect step dependencies", async () => {
    executor.execute.mockResolvedValue({ success: true, status: ActionStatus.SUCCESS, data: { ok: true } });
    
    const step1Id = crypto.randomUUID();
    const plan = createMockPlan([
      { stepId: step1Id, actionId: "action-1" },
      { actionId: "action-2", dependsOn: [step1Id] }
    ]);

    const session = await engine.execute(plan, authContext);
    
    expect(session.state).toBe("COMPLETED");
    expect(session.completedSteps).toHaveLength(2);
    expect(executor.execute).toHaveBeenCalledTimes(2);
    
    // Check call order
    expect(executor.execute.mock.calls[0][0]).toBe("action-1");
    expect(executor.execute.mock.calls[1][0]).toBe("action-2");
  });

  it("should stop on WAITING_CONFIRMATION when action requires confirmation", async () => {
    executor.execute.mockResolvedValue({ 
      success: true, 
      status: ActionStatus.SUCCESS, 
      data: { ok: true } 
    });
    
    const plan = createMockPlan([{ actionId: "action-1", confirmationRequired: true }]);
    
    const session = await engine.execute(plan, authContext);
    
    expect(session.state).toBe("WAITING_CONFIRMATION");
    expect(session.completedSteps).toHaveLength(1);
  });

  it("should resume exactly from where it stopped", async () => {
    executor.execute.mockResolvedValue({ success: true, status: ActionStatus.SUCCESS, data: { ok: true } });
    
    const step1Id = crypto.randomUUID();
    const step2Id = crypto.randomUUID();
    const plan = createMockPlan([
      { stepId: step1Id, actionId: "action-1", confirmationRequired: true },
      { stepId: step2Id, actionId: "action-2", dependsOn: [step1Id] }
    ]);

    let session = await engine.execute(plan, authContext);
    expect(session.state).toBe("WAITING_CONFIRMATION");
    expect(session.completedSteps).toContain(step1Id);
    expect(executor.execute).toHaveBeenCalledTimes(1);

    // Resume
    session = await engine.resume(session.sessionId, plan, authContext);
    expect(session.state).toBe("COMPLETED");
    expect(session.completedSteps).toContain(step2Id);
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it("should handle recoverable failures", async () => {
    executor.execute.mockResolvedValue({ 
      success: false, 
      status: ActionStatus.FAILED, 
      metadata: { errorCode: "MATERIALIZATION_FAILED" } 
    });
    
    const plan = createMockPlan([{ actionId: "action-1" }]);
    const session = await engine.execute(plan, authContext);
    
    expect(session.state).toBe("RECOVERABLE_FAILED");
    expect(session.failedSteps).toHaveLength(1);
    expect(session.finishedAt).toBeUndefined();
  });

  it("should handle permanent failures", async () => {
    executor.execute.mockResolvedValue({ 
      success: false, 
      status: ActionStatus.FAILED, 
      metadata: { errorCode: "VALIDATION_FAILED" } 
    });
    
    const plan = createMockPlan([{ actionId: "action-1" }]);
    const session = await engine.execute(plan, authContext);
    
    expect(session.state).toBe("FAILED");
    expect(session.finishedAt).toBeDefined();
  });

  it("should allow cancellation", async () => {
    executor.execute.mockResolvedValue({ success: true, status: ActionStatus.SUCCESS, data: {} });
    const plan = createMockPlan([{ actionId: "action-1", confirmationRequired: true }]);
    const session = await engine.execute(plan, authContext);
    
    const cancelledSession = await engine.cancel(session.sessionId);
    expect(cancelledSession.state).toBe("CANCELLED");
  });

  it("should use step-specific idempotency keys", async () => {
    executor.execute.mockResolvedValue({ success: true, status: ActionStatus.SUCCESS, data: {} });
    const plan = createMockPlan([{ actionId: "action-1" }]);
    const step = plan.steps[0];
    
    const session = await engine.execute(plan, authContext);
    
    expect(executor.execute).toHaveBeenCalledWith(
      "action-1",
      expect.objectContaining({
        idempotencyKey: `step-${session.sessionId}-${step.stepId}`
      }),
      authContext
    );
  });
});
