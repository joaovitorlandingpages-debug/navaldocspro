export class ActionExecutionError extends Error {
  constructor(message: string, public code: string = 'ACTION_EXECUTION_ERROR') {
    super(message);
    this.name = 'ActionExecutionError';
  }
}

export class ActionNotFoundError extends ActionExecutionError {
  constructor(actionId: string) {
    super(`Action not found: ${actionId}`, 'ACTION_NOT_FOUND');
    this.name = 'ActionNotFoundError';
  }
}

export class ActionValidationError extends ActionExecutionError {
  constructor(public errors: string[]) {
    super(`Action validation failed: ${errors.join(', ')}`, 'ACTION_VALIDATION_ERROR');
    this.name = 'ActionValidationError';
  }
}

export class ActionPermissionDeniedError extends ActionExecutionError {
  constructor(message: string = 'Permission denied for this action') {
    super(message, 'ACTION_PERMISSION_DENIED');
    this.name = 'ActionPermissionDeniedError';
  }
}
