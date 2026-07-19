import { PlanStatus, StepStatus } from "./plan-execution-types";
import { PlanExecutionError, PlanExecutionErrorCode } from "./plan-execution-errors";

export class ExecutionStateMachine {
  private static readonly VALID_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
    PENDING: ["VALIDATING", "CANCELLED"],
    VALIDATING: ["RUNNING", "FAILED", "CANCELLED"],
    RUNNING: ["COMPLETED", "FAILED", "RECOVERABLE_FAILED", "WAITING_CONFIRMATION", "CANCELLED", "PAUSED"],
    WAITING_CONFIRMATION: ["RUNNING", "CANCELLED"],
    PAUSED: ["RUNNING", "CANCELLED"],
    RECOVERABLE_FAILED: ["RUNNING", "CANCELLED", "FAILED"],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
  };

  static validateTransition(current: PlanStatus, next: PlanStatus): void {
    if (!this.VALID_TRANSITIONS[current].includes(next)) {
      throw new PlanExecutionError(
        PlanExecutionErrorCode.INVALID_STATE_TRANSITION,
        `Cannot transition from ${current} to ${next}`
      );
    }
  }

  static getInitialStatus(): PlanStatus {
    return "PENDING";
  }
}
