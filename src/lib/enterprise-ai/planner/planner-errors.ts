export class PlannerError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "PlannerError";
  }
}

export const PlannerErrorCodes = {
  INVALID_INTENT: "INVALID_INTENT",
  ACTION_NOT_FOUND: "ACTION_NOT_FOUND",
  ACTION_DISABLED: "ACTION_DISABLED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_TENANT: "INVALID_TENANT",
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  INVALID_DEPENDENCY: "INVALID_DEPENDENCY",
  PLAN_EMPTY: "PLAN_EMPTY",
  VALIDATION_FAILED: "VALIDATION_FAILED",
};
