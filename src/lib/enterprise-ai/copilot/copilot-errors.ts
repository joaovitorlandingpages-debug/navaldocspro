export enum CopilotErrorCode {
  SESSION_NOT_FOUND = "COPILOT_SESSION_NOT_FOUND",
  INVALID_CONTEXT = "COPILOT_INVALID_CONTEXT",
  EXECUTION_FAILED = "COPILOT_EXECUTION_FAILED",
  VALIDATION_ERROR = "COPILOT_VALIDATION_ERROR",
  MEMORIZATION_ERROR = "COPILOT_MEMORIZATION_ERROR",
  AUDIT_FAILED = "COPILOT_AUDIT_FAILED",
}

export class CopilotError extends Error {
  constructor(
    public code: CopilotErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "CopilotError";
  }
}
