export class ConfirmationError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ConfirmationError';
  }
}

export class ConfirmationNotFoundError extends ConfirmationError {
  constructor() {
    super('Confirmation request not found', 'CONFIRMATION_NOT_FOUND', 404);
  }
}

export class ConfirmationRequiredError extends ConfirmationError {
  constructor(public summary: string, public publicToken: string) {
    super('Human confirmation required', 'CONFIRMATION_REQUIRED', 403);
  }
}

export class ConfirmationExpiredError extends ConfirmationError {
  constructor() {
    super('Confirmation request has expired', 'CONFIRMATION_EXPIRED', 410);
  }
}

export class ConfirmationRejectedError extends ConfirmationError {
  constructor() {
    super('Confirmation request was rejected', 'CONFIRMATION_REJECTED', 403);
  }
}

export class ConfirmationAlreadyConsumedError extends ConfirmationError {
  constructor() {
    super('Confirmation request has already been used', 'CONFIRMATION_ALREADY_CONSUMED', 409);
  }
}

export class ConfirmationUserMismatchError extends ConfirmationError {
  constructor() {
    super('Confirmation request belongs to another user', 'CONFIRMATION_USER_MISMATCH', 403);
  }
}

export class ConfirmationTenantMismatchError extends ConfirmationError {
  constructor() {
    super('Confirmation request belongs to another tenant', 'CONFIRMATION_TENANT_MISMATCH', 403);
  }
}

export class ConfirmationPayloadMismatchError extends ConfirmationError {
  constructor() {
    super('Payload does not match the confirmed request', 'CONFIRMATION_PAYLOAD_MISMATCH', 400);
  }
}

export class ConfirmationInvalidStatusError extends ConfirmationError {
  constructor(status: string) {
    super(`Invalid confirmation status: ${status}`, 'CONFIRMATION_INVALID_STATUS', 400);
  }
}

export class ConfirmationExecutionError extends ConfirmationError {
  constructor(message: string) {
    super(message, 'CONFIRMATION_EXECUTION_ERROR', 500);
  }
}
