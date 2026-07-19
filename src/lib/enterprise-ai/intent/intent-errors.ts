export enum IntentErrorCodes {
  INTERPRETATION_FAILED = "INTERPRETATION_FAILED",
  AMBIGUOUS_INTENT = "AMBIGUOUS_INTENT",
  MISSING_REQUIRED_ENTITIES = "MISSING_REQUIRED_ENTITIES",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  VALIDATION_ERROR = "VALIDATION_ERROR"
}

export class IntentError extends Error {
  constructor(
    public readonly code: IntentErrorCodes,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "IntentError";
  }
}
