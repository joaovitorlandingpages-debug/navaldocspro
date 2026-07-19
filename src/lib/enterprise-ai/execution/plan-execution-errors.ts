export enum PlanExecutionErrorCode {
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  DUPLICATE_SESSION = "DUPLICATE_SESSION",
  STEP_DEPENDENCY_NOT_MET = "STEP_DEPENDENCY_NOT_MET",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  PLAN_CANCELLED = "PLAN_CANCELLED",
  INVALID_PLAN = "INVALID_PLAN",
}

export class PlanExecutionError extends Error {
  constructor(public code: PlanExecutionErrorCode, message: string) {
    super(message);
    this.name = "PlanExecutionError";
  }
}
