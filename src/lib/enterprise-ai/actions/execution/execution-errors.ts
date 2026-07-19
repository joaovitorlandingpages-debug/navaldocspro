export class ActionExecutionError extends Error {
  public errorCode: string;
  public processId?: string;
  public isActionError: boolean = true;

  constructor(message: string, codeOrOptions: string | { errorCode?: string; processId?: string } = 'ACTION_EXECUTION_ERROR') {
    super(message);
    this.name = 'ActionExecutionError';
    
    if (typeof codeOrOptions === 'string') {
      this.errorCode = codeOrOptions;
    } else {
      this.errorCode = codeOrOptions.errorCode || 'ACTION_EXECUTION_ERROR';
      this.processId = codeOrOptions.processId;
    }
    
    // Compatibility with old code using .code
    (this as any).code = this.errorCode;
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
