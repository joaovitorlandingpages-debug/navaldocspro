import { AIAction, AIActionContext, ActionMetadata } from '../action-types';
import { ExecutionResult } from '../execution/execution-result';
import { RequestSignatureInput, RequestSignatureResult } from './signature-action-types';
import { signaturesService } from '@/services/signatures';
import { supabase } from '@/integrations/supabase/client';
import { AIPermission } from '../security/permission-types';
import { 
  DocumentNotFoundError, 
  SignatureExecutionError 
} from '../execution/execution-errors';

export class RequestSignatureAction implements AIAction<RequestSignatureInput, RequestSignatureResult> {
  public metadata: ActionMetadata = {
    id: 'request-signature',
    name: 'Request Signature',
    description: 'Creates electronic signature requests for generated documents.',
    category: 'document-operation',
    risk: 'high',
    requiresConfirmation: true,
    requiredPermissions: [
      AIPermission.DOCUMENT_READ,
      AIPermission.SIGNATURE_CREATE,
      AIPermission.PROCESS_READ
    ]
  };

  async execute(
    input: RequestSignatureInput,
    context: AIActionContext
  ): Promise<ExecutionResult<RequestSignatureResult>> {
    const { userId, companyId } = context.security;
    const executionId = crypto.randomUUID();

    try {
      // 1. Validations
      // Verify document exists and belongs to company
      const { data: document, error: docError } = await supabase
        .from('generated_documents')
        .select('id, process_id, title')
        .eq('id', input.documentId)
        .eq('company_id', companyId)
        .single();

      if (docError || !document) {
        throw new DocumentNotFoundError(input.documentId);
      }

      // Verify document belongs to the specified process
      if (document.process_id !== input.processId) {
        throw new SignatureExecutionError(
          `Document ${input.documentId} does not belong to process ${input.processId}`
        );
      }

      // Verify process exists and belongs to company
      const { data: process, error: procError } = await supabase
        .from('processes')
        .select('id, customer_id')
        .eq('id', input.processId)
        .eq('company_id', companyId)
        .single();

      if (procError || !process) {
        throw new SignatureExecutionError(`Process ${input.processId} not found or access denied`);
      }

      // 2. Prepare payload for signaturesService
      // Map participants to service format
      const participants = input.participants.map(p => ({
        name: p.name,
        email: p.email,
        role: p.role,
        signing_order: p.signingOrder,
        customer_id: p.participantId // Reusing participantId as customer_id if provided
      }));

      // 3. Call existing Signature Service
      const result = await signaturesService.create({
        company_id: companyId,
        title: input.message || `Assinatura: ${document.title || 'Documento'}`,
        process_id: input.processId,
        document_id: input.documentId,
        customer_id: process.customer_id,
        signing_order: 'sequential', // Default to sequential for AI-triggered requests
        expires_at: input.expirationDate,
        participants: participants,
        created_by: userId
      });

      // 4. Return formatted result
      const actionResult: RequestSignatureResult = {
        success: true,
        executionId,
        signatureRequestId: result.request.id,
        documentId: input.documentId,
        processId: input.processId,
        participants: result.participants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email || '',
          status: p.status
        })),
        expirationDate: input.expirationDate,
        status: result.request.status,
        metadata: {
          title: result.request.title
        }
      };

      return {
        success: true,
        executionId,
        actionId: this.metadata.id,
        data: actionResult,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('[RequestSignatureAction] Execution failed:', error);
      
      return {
        success: false,
        executionId,
        actionId: this.metadata.id,
        error: {
          code: error.code || 'SIGNATURE_EXECUTION_ERROR',
          message: error.message || 'Failed to request signature',
          details: error
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
