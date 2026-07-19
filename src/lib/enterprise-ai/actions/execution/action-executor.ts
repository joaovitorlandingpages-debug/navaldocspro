import { ActionRegistry } from '../action-registry';
import { ActionValidator } from '../security/action-validator';
import { PermissionGuard } from '../security/permission-guard';
import { SecurityContext } from '../security/permission-types';
import { ActionStatus } from '../action-types';
import { ExecutionContext } from './execution-context';
import { ExecutionResult } from './execution-result';
import { auditLogger } from '../audit/audit-logger';
import { 
  ActionNotFoundError, 
  ActionValidationError, 
  ActionPermissionDeniedError,
  ActionExecutionError 
} from './execution-errors';
// ID generation using built-in crypto or fallback

export class ActionExecutor {
  constructor(
    private registry: typeof ActionRegistry,
    private validator: ActionValidator,
    private guard: PermissionGuard
  ) {}

  async execute(
    actionId: string, 
    input: any, 
    authContext: SecurityContext,
    options: { requestId?: string; conversationId?: string; provider?: string } = {}
  ): Promise<ExecutionResult> {
    const startedAt = new Date();
    const executionId = this.generateId();
    
    try {
      // 1. Fetch action
      const action = this.registry.get(actionId);
      if (!action) {
        throw new ActionNotFoundError(actionId);
      }

      // 2. Audit Start (Enterprise Audit Logger Integration)
      try {
        await auditLogger.logStart({
          executionId,
          actionId,
          actionName: action.name,
          userId: authContext.userId,
          companyId: authContext.companyId,
          processId: input.processId,
          conversationId: options.conversationId,
          provider: options.provider,
          metadata: input.metadata
        });
      } catch (auditError) {
        console.warn('Audit start failed, continuing action execution:', auditError);
      }

      // 3. Build Context (Strictly using authContext for identity/tenant)
      const context: ExecutionContext = {
        executionId,
        requestId: options.requestId || this.generateId(),
        actionId,
        userId: authContext.userId,
        companyId: authContext.companyId,
        conversationId: options.conversationId,
        provider: options.provider,
        startedAt,
        metadata: input.metadata
      };

      // 3. ActionValidator (Coordinates everything including security check internally if implemented that way)
      // Note: In Sprint 4.2 ActionValidator calls PermissionGuard.
      const validation = await this.validator.validate(actionId, authContext, input);
      if (!validation.success) {
        if (validation.status === 'PERMISSION_DENIED' || validation.status === 'ROLE_DENIED' || validation.status === 'AUTH_REQUIRED') {
          throw new ActionPermissionDeniedError(validation.errors?.[0] || 'Unauthorized');
        }
        throw new ActionValidationError(validation.errors || ['Validation failed']);
      }

      // 4. Double check PermissionGuard explicitly if needed by requirements
      // Requirement: "PermissionGuard is executed after the Validator."
      // In Sprint 4.2 ActionValidator already does this, but for strict pipeline adherence:
      const security = this.guard.validateContext(authContext, action.requiredPermissions, action.requiredRole);
      if (!security.success) {
        throw new ActionPermissionDeniedError(security.errors?.[0]);
      }

      // 5. Execute
      const result = await action.execute({ ...input, ...context, input });

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      // Audit Success
      try {
        await auditLogger.logSuccess(executionId, {
          finishedAt,
          durationMs,
          metadata: result.metadata,
          warnings: result.warnings,
          documentId: result.metadata?.documentId
        });
      } catch (auditError) {
        console.warn('Audit success log failed:', auditError);
      }

      return {
        success: result.success,
        status: result.status,
        executionId,
        actionId,
        startedAt,
        finishedAt,
        durationMs,
        data: result.metadata, // Following ActionResult pattern
        warnings: result.warnings,
        errors: result.errors,
        metadata: result.metadata
      };

    } catch (error: any) {
      const finishedAt = new Date();
      let status = ActionStatus.FAILED;
      let errors = [error.message || 'Unknown execution error'];

      if (error instanceof ActionNotFoundError) {
        status = ActionStatus.FAILED;
      } else if (error instanceof ActionValidationError) {
        status = ActionStatus.VALIDATION_ERROR;
        errors = error.errors;
      } else if (error instanceof ActionPermissionDeniedError) {
        status = ActionStatus.PERMISSION_DENIED;
      }

      // Audit Failure
      try {
        await auditLogger.logFailure(executionId, {
          error: errors,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          metadata: { errorCode: error.code }
        });
      } catch (auditError) {
        console.warn('Audit failure log failed:', auditError);
      }

      return {
        success: false,
        status,
        executionId,
        actionId,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        errors,
        metadata: { errorCode: error.code }
      };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
