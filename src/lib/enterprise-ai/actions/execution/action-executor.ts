import { ActionRegistry } from '../action-registry';
import { ActionValidator } from '../security/action-validator';
import { PermissionGuard } from '../security/permission-guard';
import { SecurityContext } from '../security/permission-types';
import { ActionStatus } from '../action-types';
import { ExecutionContext } from './execution-context';
import { ExecutionResult } from './execution-result';
import { auditLogger } from '../audit/audit-logger';
import { confirmationService } from '../confirmation/confirmation-service';
import { idempotencyService } from './idempotency-service';
import { ConfirmationRequiredError as BaseConfirmationRequiredError } from '../confirmation/confirmation-errors';
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
    let idempotencyRecordId: string | undefined;
    
    try {
      // 1. Fetch action
      const action = this.registry.get(actionId);
      if (!action) {
        throw new ActionNotFoundError(actionId);
      }

      // 1.1 Handle Idempotency
      if (input.idempotencyKey) {
        const { idempotencyKey, ...payload } = input;
        const record = await idempotencyService.claim({
          idempotencyKey,
          payload,
          executionId,
          actionId,
          companyId: authContext.companyId,
          userId: authContext.userId
        });

        idempotencyRecordId = record.id;

        if (record.status === 'completed') {
          return {
            success: true,
            status: ActionStatus.SUCCESS,
            executionId: record.executionId,
            actionId,
            startedAt: new Date(record.createdAt),
            finishedAt: new Date(record.updatedAt),
            durationMs: new Date(record.updatedAt).getTime() - new Date(record.createdAt).getTime(),
            data: record.result,
            metadata: { ...record.result, isIdempotentResponse: true }
          };
        }

        if (record.status === 'processing' && record.executionId !== executionId) {
          throw new ActionExecutionError('Concurrent execution in progress for this idempotency key');
        }

        // Recovery: if record is recoverable_failed and has process_id, inject it into input
        if (record.status === 'recoverable_failed' && record.processId) {
          input = { ...input, processId: record.processId };
        }
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

      // 5. Handle Confirmation Token if present
      let confirmationMetadata = {};
      if (input.confirmationToken) {
        try {
          // Prepare sensitive payload for hash comparison
          // We exclude the token itself and other non-functional metadata
          const { confirmationToken, metadata, executionId: _, ...sensitivePayload } = input;
          
          const confirmation = await confirmationService.validateAndConsume(
            input.confirmationToken,
            sensitivePayload,
            authContext.userId,
            authContext.companyId
          );
          
          confirmationMetadata = {
            confirmationId: confirmation.id,
            confirmationValidated: true,
            confirmationConsumed: true,
            payloadHashMatched: true
          };
        } catch (confError: any) {
          // Wrap and rethrow as validation error or specific confirmation error
          throw confError;
        }
      }

      // 6. Execute
      const result = await action.execute({ ...input, ...context, ...confirmationMetadata, input });

      // 6.1 Update Idempotency Record if success
      if (idempotencyRecordId && result.success) {
        await idempotencyService.update(idempotencyRecordId, {
          status: 'completed',
          result: result.metadata,
          processId: result.metadata?.processId
        });
      }

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
      let status = error.status || ActionStatus.FAILED;
      let errors = [error.message || 'Unknown execution error'];

      if (error instanceof ActionNotFoundError) {
        status = ActionStatus.FAILED;
      } else if (error instanceof ActionValidationError) {
        status = ActionStatus.VALIDATION_ERROR;
        errors = error.errors;
      } else if (error instanceof ActionPermissionDeniedError) {
        status = ActionStatus.PERMISSION_DENIED;
      } else if (error instanceof BaseConfirmationRequiredError || error.code === 'CHECKLIST_CONFIRMATION_REQUIRED') {
        // This comes from the action when it needs a confirmation
        status = ActionStatus.FAILED; 
      }

      // Audit Failure
      try {
        if (idempotencyRecordId) {
          const errorCode = error.code || (error as any).errorCode || 'UNKNOWN_ERROR';
          const isRecoverable = errorCode === 'MATERIALIZATION_FAILED' || errorCode === 'VISIBILITY_FAILED';
          await idempotencyService.update(idempotencyRecordId, {
            status: isRecoverable ? 'recoverable_failed' : 'failed',
            errorCode: errorCode,
            processId: (error as any).processId
          });
        }

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
        metadata: { 
          errorCode: error.code,
          confirmationToken: (error as any).publicToken,
          summary: (error as any).summary
        }
      };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
