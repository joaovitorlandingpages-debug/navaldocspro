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
          console.log('ActionExecutor Recovery: Injecting processId', record.processId);
          input = { ...input, processId: record.processId };
        }
      }

      // 2. Audit Start
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

      // 3. Build Context
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

      // 4. Validation & Permissions
      const validation = await this.validator.validate(actionId, authContext, input);
      if (!validation.success) {
        console.log('ActionExecutor Validation Failure:', { status: validation.status, errors: validation.errors });
        if (validation.status === 'PERMISSION_DENIED' || validation.status === 'ROLE_DENIED' || validation.status === 'AUTH_REQUIRED') {
          throw new ActionPermissionDeniedError(validation.errors?.[0] || 'Unauthorized');
        }
        throw new ActionValidationError(validation.errors || ['Validation failed']);
      }


      const security = this.guard.validateContext(authContext, action.requiredPermissions, action.requiredRole);
      if (!security.success) {
        throw new ActionPermissionDeniedError(security.errors?.[0]);
      }

      // 5. Handle Confirmation Token
      let confirmationMetadata = {};
      if (input.confirmationToken) {
        try {
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
          throw confError;
        }
      }

      // 6. Execute
      const inputWithContext = { 
        ...input, 
        ...context, 
        ...confirmationMetadata, 
        _user: { id: authContext.userId }
      };

      console.log('ActionExecutor Execute Call:', { actionId, processId: inputWithContext.processId });
      
      let result;
      try {
        result = await action.execute(inputWithContext);
      } catch (innerError: any) {
        // NORMALIZATION: Capture error details explicitly
        const innerErrorCode = innerError.errorCode || innerError.code;
        const innerProcessId = innerError.processId || inputWithContext.processId;
        
        console.log('ActionExecutor Catch Normalization (Read):', { 
          innerErrorCode, 
          innerProcessId, 
          msg: innerError.message 
        });

        // CRITICAL FIX: To avoid Vitest/Environment property stripping,
        // we encode the metadata directly into the error message as a JSON string
        const metadata = {
          errorCode: innerErrorCode || 'ACTION_EXECUTION_ERROR',
          processId: innerProcessId,
          isActionError: true,
          _isEncoded: true
        };
        
        const encodedError: any = new Error(`ACTION_EXECUTION_FAILED_METADATA:${JSON.stringify(metadata)}:${innerError.message || ''}`);
        // Keep properties for local access just in case
        encodedError.errorCode = metadata.errorCode;
        encodedError.processId = metadata.processId;
        
        console.log('ActionExecutor Catch Normalization (Encoded String):', encodedError.message);

        throw encodedError;
      }





      // 7. Success Finalization
      if (idempotencyRecordId && result.success) {
        await idempotencyService.update(idempotencyRecordId, {
          status: 'completed',
          result: result.metadata,
          processId: result.metadata?.processId
        });
      }

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

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
        data: result.metadata,
        warnings: result.warnings,
        errors: result.errors,
        metadata: result.metadata
      };

    } catch (error: any) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      
      let errorCode = error.errorCode || error.code || 'ACTION_EXECUTION_ERROR';
      let processId = error.processId;
      let errorMessage = error.message || 'Unknown execution error';

      // Attempt to decode metadata from message string
      if (errorMessage.startsWith('ACTION_EXECUTION_FAILED_METADATA:')) {
        try {
          const parts = errorMessage.split(':');
          const metadataJson = parts[1];
          const metadata = JSON.parse(metadataJson);
          errorCode = metadata.errorCode;
          processId = metadata.processId;
          errorMessage = parts.slice(2).join(':'); // Restore original message
          console.log('ActionExecutor DEBUG - Decoded metadata from string:', { errorCode, processId, errorMessage });
        } catch (e) {
          console.warn('ActionExecutor failed to decode error metadata string', e);
        }
      }
      
      let status = error.status || ActionStatus.FAILED;
      let errors = [errorMessage];

      console.log('ActionExecutor Catch DEBUG (Final External):', { 
        name: error.name, 
        errorCode, 
        processId,
        errorMessage,
        allKeys: Object.keys(error)
      });



      if (error instanceof ActionNotFoundError) {
        status = ActionStatus.FAILED;
      } else if (error instanceof ActionValidationError) {
        status = ActionStatus.VALIDATION_ERROR;
        errors = error.errors;
      } else if (error instanceof ActionPermissionDeniedError) {
        status = ActionStatus.PERMISSION_DENIED;
      } else if (error instanceof BaseConfirmationRequiredError || error.code === 'CHECKLIST_CONFIRMATION_REQUIRED') {
        status = ActionStatus.FAILED; 
      }
      const effectiveErrorCode = errorCode;


      try {
        if (idempotencyRecordId) {
          const isRecoverable = effectiveErrorCode === 'MATERIALIZATION_FAILED' || effectiveErrorCode === 'VISIBILITY_FAILED';
          const finalProcessId = processId || (error as any).processId || (input as any).processId;
          
          console.log('ActionExecutor Idempotency Update (Final):', {
            id: idempotencyRecordId,
            status: isRecoverable ? 'recoverable_failed' : 'failed',
            errorCode: effectiveErrorCode,
            processId: finalProcessId
          });

          await idempotencyService.update(idempotencyRecordId, {
            status: isRecoverable ? 'recoverable_failed' : 'failed',
            errorCode: effectiveErrorCode,
            processId: finalProcessId
          });
        }

        await auditLogger.logFailure(executionId, {
          error: errors,
          finishedAt,
          durationMs,
          metadata: { errorCode: effectiveErrorCode, processId: error.processId }
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
        durationMs,
        errors,
        metadata: { 
          errorCode: effectiveErrorCode, 
          processId: processId || (error as any).processId || (input as any).processId,

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
