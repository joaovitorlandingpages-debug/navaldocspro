import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from '../action-types';
import { RequestSignatureInput, DocumentNotFoundError, SignatureExecutionError } from './signature-action-types';
import { signaturesService } from '@/services/signatures';
import { supabase } from '@/integrations/supabase/client';
import { AIPermission } from '../security/permission-types';

export class RequestSignatureAction implements AIAction {
  id = 'request-signature';
  metadata = {
    actionId: 'request-signature',
    displayName: 'Request Signature',
    description: 'Creates electronic signature requests for generated documents.',
    category: 'signature',
    riskLevel: 'HIGH' as const,
    requiredPermissions: [
      AIPermission.DOCUMENT_READ,
      AIPermission.SIGNATURE_CREATE,
      AIPermission.PROCESS_READ
    ],
    confirmationPolicy: ConfirmationPolicy.HIGH,
    dependencies: ['generate-pdf'],
    retryPolicy: {
      maxRetries: 3,
      backoff: 'exponential' as const
    },
    estimatedDuration: 3,
    enabled: true,
    supportsRetry: true,
    supportsPlanner: true
  };


  async validate(context: RequestSignatureInput & { companyId: string }): Promise<{ valid: boolean; errors?: string[] }> {
    const { processId, documentId, participants, companyId } = context;
    const errors: string[] = [];

    if (!processId) errors.push("processId is required");
    if (!documentId) errors.push("documentId is required");
    if (!participants || participants.length === 0) errors.push("at least one participant is required");

    if (errors.length > 0) return { valid: false, errors };

    try {
      // Verify document exists and belongs to company
      const { data: document, error: docError } = await supabase
        .from('generated_documents')
        .select('id, process_id')
        .eq('id', documentId)
        .eq('company_id', companyId)
        .single();

      if (docError || !document) {
        return { valid: false, errors: [`Document ${documentId} not found or access denied`] };
      }

      if (document.process_id !== processId) {
        return { valid: false, errors: [`Document ${documentId} does not belong to process ${processId}`] };
      }

      // Verify process exists and belongs to company
      const { data: process, error: procError } = await supabase
        .from('processes')
        .select('id')
        .eq('id', processId)
        .eq('company_id', companyId)
        .single();

      if (procError || !process) {
        return { valid: false, errors: [`Process ${processId} not found or access denied`] };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, errors: [err.message] };
    }
  }

  async execute(context: RequestSignatureInput & { 
    companyId: string; 
    userId: string; 
    executionId: string;
  }): Promise<ActionResult> {
    const startTime = Date.now();
    const { processId, documentId, participants, expirationDate, message, companyId, userId, executionId } = context;

    try {
      // 1. Fetch process to get customer_id
      const { data: process, error: procError } = await supabase
        .from('processes')
        .select('customer_id, title')
        .eq('id', processId)
        .single();

      if (procError || !process) {
        throw new SignatureExecutionError(`Process ${processId} not found`);
      }

      // 2. Fetch document to get its title
      const { data: document, error: docError } = await supabase
        .from('generated_documents')
        .select('title')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new DocumentNotFoundError(documentId);
      }

      // 3. Map participants
      const serviceParticipants = participants.map((p: any) => ({
        name: p.name,
        email: p.email,
        role: p.role,
        signing_order: p.signingOrder,
        customer_id: p.participantId 
      }));

      // 4. Call existing Signature Service
      const result = await signaturesService.create({
        company_id: companyId,
        title: message || `Assinatura: ${document.title || 'Documento'}`,
        process_id: processId,
        document_id: documentId,
        customer_id: process.customer_id,
        signing_order: 'sequential', 
        expires_at: expirationDate,
        participants: serviceParticipants,
        created_by: userId
      });

      return {
        success: true,
        status: ActionStatus.SUCCESS,
        message: 'Signature request created successfully',
        executionId,
        duration: (Date.now() - startTime) / 1000,
        metadata: {
          signatureRequestId: result.request.id,
          documentId,
          processId,
          participants: result.participants.map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            status: p.status
          })),
          expirationDate,
          status: result.request.status
        }
      };

    } catch (error: any) {
      return {
        success: false,
        status: ActionStatus.FAILED,
        message: error.message || 'Failed to request signature',
        executionId,
        duration: (Date.now() - startTime) / 1000,
        errors: [error.message]
      };
    }
  }

  async rollback(context: any): Promise<void> {
    // In a real scenario, we might want to cancel the signature request
    console.log("Rollback for RequestSignatureAction not yet implemented");
  }
}
