import { v4 as uuidv4 } from "uuid";
import { 
  PlannerRequest, 
  ExecutionPlan, 
  ExecutionStep, 
  ExecutionPlanSchema 
} from "./planner-types";
import { PlannerError, PlannerErrorCodes } from "./planner-errors";
import { calculateOverallRisk, RequiredPermissions } from "./planner-rules";

export class PlannerEngine {
  private static instance: PlannerEngine;

  private constructor() {}

  public static getInstance(): PlannerEngine {
    if (!PlannerEngine.instance) {
      PlannerEngine.instance = new PlannerEngine();
    }
    return PlannerEngine.instance;
  }

  public async plan(request: PlannerRequest): Promise<ExecutionPlan> {
    this.validateRequest(request);

    // In a real scenario, this would involve LLM or complex logic to map intent to actions.
    // For Fase 1, we implement the architectural logic and a mock mapping.
    const steps = this.mapIntentToSteps(request);

    if (steps.length === 0) {
      throw new PlannerError(
        PlannerErrorCodes.PLAN_EMPTY,
        "No actions could be determined from the provided intent."
      );
    }

    this.validateSteps(steps, request);
    this.detectCircularDependencies(steps);

    const requiresConfirmation = steps.some(s => s.confirmationRequired);
    const riskLevel = calculateOverallRisk(steps);

    const plan: ExecutionPlan = {
      planId: uuidv4(),
      intent: request.intent,
      steps,
      riskLevel,
      estimatedActions: steps.length,
      requiresConfirmation,
      status: "READY",
      companyId: request.context.companyId,
      userId: request.context.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };

    return ExecutionPlanSchema.parse(plan);
  }

  private validateRequest(request: PlannerRequest) {
    if (!request.intent || request.intent.trim().length === 0) {
      throw new PlannerError(PlannerErrorCodes.INVALID_INTENT, "Intent is required");
    }
    if (!request.context.userId || !request.context.companyId) {
      throw new PlannerError(PlannerErrorCodes.INVALID_TENANT, "User and Company context are required");
    }
  }

  private mapIntentToSteps(request: PlannerRequest): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const intent = request.intent.toLowerCase();

    // Mock logic for mapping intent to predefined actions
    // In Fase 2, this will be dynamic.
    
    let lastStepId: string | null = null;

    if (intent.includes("processo") || intent.includes("process")) {
      const stepId = uuidv4();
      steps.push(this.createStep("create-process", stepId, []));
      lastStepId = stepId;
    }

    if (intent.includes("pdf") || intent.includes("documento")) {
      const stepId = uuidv4();
      steps.push(this.createStep("generate-pdf", stepId, lastStepId ? [lastStepId] : []));
      lastStepId = stepId;
    }

    if (intent.includes("checklist")) {
      const stepId = uuidv4();
      steps.push(this.createStep("complete-checklist", stepId, lastStepId ? [lastStepId] : []));
      lastStepId = stepId;
    }

    if (intent.includes("assinatura") || intent.includes("signature")) {
      const stepId = uuidv4();
      steps.push(this.createStep("request-signature", stepId, lastStepId ? [lastStepId] : []));
      lastStepId = stepId;
    }

    return steps;
  }

  private createStep(actionId: string, stepId: string, dependsOn: string[]): ExecutionStep {
    const permissions = RequiredPermissions[actionId] || [];
    
    // For simulation, signature and process creation require confirmation
    const confirmationRequired = ["create-process", "request-signature"].includes(actionId);

    return {
      stepId,
      actionId,
      dependsOn,
      status: "PENDING",
      requiredPermissions: permissions,
      confirmationRequired,
      estimatedDuration: 30,
      input: {}, // Will be populated by LLM/mapping in later phases
    };
  }

  private validateSteps(steps: ExecutionStep[], request: PlannerRequest) {
    const userPermissions = new Set(request.context.permissions);

    for (const step of steps) {
      // 1. Validate permissions
      for (const perm of step.requiredPermissions) {
        if (!userPermissions.has(perm)) {
          throw new PlannerError(
            PlannerErrorCodes.PERMISSION_DENIED,
            `Missing required permission: ${perm} for action: ${step.actionId}`
          );
        }
      }

      // 2. Validate dependencies exist in the same plan
      const stepIds = new Set(steps.map(s => s.stepId));
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          throw new PlannerError(
            PlannerErrorCodes.INVALID_DEPENDENCY,
            `Step ${step.stepId} depends on non-existent step ${depId}`
          );
        }
      }
    }
  }

  private detectCircularDependencies(steps: ExecutionStep[]) {
    const adj = new Map<string, string[]>();
    for (const step of steps) {
      adj.set(step.stepId, step.dependsOn);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (u: string): boolean => {
      if (!visited.has(u)) {
        visited.add(u);
        recStack.add(u);

        const neighbors = adj.get(u) || [];
        for (const v of neighbors) {
          if (!visited.has(v) && hasCycle(v)) return true;
          else if (recStack.has(v)) return true;
        }
      }
      recStack.delete(u);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.stepId)) {
        throw new PlannerError(
          PlannerErrorCodes.CIRCULAR_DEPENDENCY,
          "Circular dependency detected in execution plan"
        );
      }
    }
  }
}
