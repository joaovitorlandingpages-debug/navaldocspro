import { v4 as uuidv4 } from "uuid";
import { 
  PlannerRequest, 
  ExecutionPlan, 
  ExecutionStep, 
  ExecutionPlanSchema 
} from "./planner-types";
import { PlannerError, PlannerErrorCodes } from "./planner-errors";
import { calculateOverallRisk, ActionMetadata, DEFAULT_INTENT_RULES } from "./planner-rules";
import { ActionRegistry } from "../actions/action-registry";
import { ConfirmationPolicy } from "../actions/action-types";

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

    // 1. Discovery from ActionRegistry
    const actions = ActionRegistry.list().filter(a => a.metadata.supportsPlanner && a.metadata.enabled);
    
    // 2. Intent Resolution (Declarative)
    const resolvedActionIds = this.resolveIntent(request.intent);
    
    // 3. Expand with transitive dependencies
    const matchedActionIds = this.expandDependencies(resolvedActionIds, actions);
    const intentActions = actions.filter(a => matchedActionIds.includes(a.id));
    
    // 3. Step Generation
    const steps = this.generateSteps(matchedActionIds, actions);

    if (steps.length === 0) {
      throw new PlannerError(
        PlannerErrorCodes.PLAN_EMPTY,
        "No actions could be determined from the provided intent."
      );
    }


    this.validateSteps(steps, intentActions);
    this.detectCircularDependencies(steps);

    const requiresConfirmation = steps.some((s: ExecutionStep) => s.confirmationRequired);
    const riskLevel = calculateOverallRisk(intentActions.map(a => ({ 
      actionId: a.id, 
      riskLevel: a.metadata.riskLevel 
    })));

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

  private expandDependencies(actionIds: string[], availableActions: import("../actions/action-types").AIAction[]): string[] {
    const result = new Set<string>(actionIds);
    let size: number;
    
    do {
      size = result.size;
      for (const id of Array.from(result)) {
        const action = availableActions.find(a => a.id === id);
        if (action) {
          action.metadata.dependencies.forEach(depId => result.add(depId));
        }
      }
    } while (result.size > size);
    
    return Array.from(result);
  }

  private resolveIntent(intent: string): string[] {
    const normalized = intent.toLowerCase();
    const matches = DEFAULT_INTENT_RULES
      .filter(rule => rule.intentKeywords.some(kw => normalized.includes(kw.toLowerCase())))
      .sort((a, b) => b.priority - a.priority);
    
    return Array.from(new Set(matches.map(m => m.actionId)));
  }

  private generateSteps(matchedActionIds: string[], availableActions: import("../actions/action-types").AIAction[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const stepIdMap = new Map<string, string>(); // actionId -> stepId
    
    // 1. Create IDs for all matched actions
    matchedActionIds.forEach(id => {
      stepIdMap.set(id, uuidv4());
    });

    // 2. Build steps
    matchedActionIds.forEach(actionId => {
      const action = availableActions.find(a => a.id === actionId);
      if (!action) return;

      const stepId = stepIdMap.get(actionId)!;
      const dependencies = action.metadata.dependencies
        .map(depActionId => stepIdMap.get(depActionId))
        .filter((sid): sid is string => !!sid);

      steps.push({
        stepId,
        actionId,
        dependsOn: dependencies,
        status: "PENDING",
        requiredPermissions: action.metadata.requiredPermissions,
        confirmationRequired: action.metadata.confirmationPolicy !== ConfirmationPolicy.NONE,
        estimatedDuration: action.metadata.estimatedDuration,
        input: {},
      });
    });

    this.validateSteps(steps, availableActions);
    this.detectCircularDependencies(steps);

    return steps;
  }

  private validateSteps(steps: ExecutionStep[], availableActions: import("../actions/action-types").AIAction[]) {
    const stepIds = new Set(steps.map(s => s.stepId));
    
    for (const step of steps) {
      // 1. Validate dependencies exist in the same plan
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          throw new PlannerError(
            PlannerErrorCodes.INVALID_DEPENDENCY,
            `Step ${step.stepId} depends on non-existent step ${depId}`
          );
        }
      }

      // 2. Validate action existence and dependencies in metadata
      const action = availableActions.find(a => a.id === step.actionId);
      if (action) {
        for (const depActionId of action.metadata.dependencies) {
          if (!steps.some(s => s.actionId === depActionId)) {
             throw new PlannerError(
              PlannerErrorCodes.INVALID_DEPENDENCY,
              `Action ${action.id} requires ${depActionId} which is missing from the plan`
            );
          }
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
