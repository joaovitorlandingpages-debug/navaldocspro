import { PlannerEngine } from "./planner-engine";
import { PlannerRequest, ExecutionPlan } from "./planner-types";

/**
 * Multi-Action Planner
 * 
 * FASE 1: Architectural implementation of the Planning library.
 * This class serves as the main entry point for generating execution plans.
 * It is decoupled from business logic and existing actions.
 */
export class Planner {
  private engine: PlannerEngine;

  constructor() {
    this.engine = PlannerEngine.getInstance();
  }

  /**
   * Generates a validated execution plan based on user intent and context.
   */
  public async generatePlan(request: PlannerRequest): Promise<ExecutionPlan> {
    // In Fase 1, we just delegate to the engine.
    // Future: Add caching, detailed audit logging here.
    return this.engine.plan(request);
  }
}

// Export singleton instance
export const planner = new Planner();
