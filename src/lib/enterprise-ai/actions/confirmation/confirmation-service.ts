import { createHash, randomBytes } from 'crypto';
import { supabase } from '@/integrations/supabase/client';
import { 
  ActionConfirmation, 
  ConfirmationStatus, 
  CreateConfirmationParams, 
  ValidationResult 
} from './confirmation-types';
import { generatePayloadHash } from './payload-hash';
import { 
  ConfirmationNotFoundError, 
  ConfirmationExpiredError,
  ConfirmationRejectedError,
  ConfirmationAlreadyConsumedError,
  ConfirmationUserMismatchError,
  ConfirmationTenantMismatchError,
  ConfirmationPayloadMismatchError,
  ConfirmationInvalidStatusError,
  ConfirmationExecutionError
} from './confirmation-errors';

export class ConfirmationService {
  private readonly DEFAULT_TTL_MINUTES = 10;

  /**
   * Creates a new confirmation request.
   * Returns the public (unhashed) token to be sent to the client.
   */
  async createConfirmation(params: CreateConfirmationParams): Promise<{ id: string; publicToken: string }> {
    const publicToken = this.generateSecureToken();
    const tokenHash = this.hashToken(publicToken);
    const payloadHash = generatePayloadHash(params.payload);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresInMinutes || this.DEFAULT_TTL_MINUTES));

    const { data, error } = await supabase
      .from('ai_action_confirmations')
      .insert({
        token_hash: tokenHash,
        action_id: params.actionId,
        user_id: params.userId,
        company_id: params.companyId,
        process_id: params.processId,
        resource_id: params.resourceId,
        operation: params.operation,
        payload_hash: payloadHash,
        status: ConfirmationStatus.PENDING,
        expires_at: expiresAt.toISOString(),
        metadata: params.metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating confirmation:', error);
      throw new ConfirmationExecutionError(`Failed to create confirmation: ${error.message}`);
    }

    return { id: data.id, publicToken };
  }

  /**
   * Marks a confirmation as confirmed by the user.
   */
  async confirm(publicToken: string, userId: string, companyId: string): Promise<void> {
    const tokenHash = this.hashToken(publicToken);
    
    // Validate status first
    const confirmation = await this.getConfirmationByHash(tokenHash);
    
    if (confirmation.userId !== userId) throw new ConfirmationUserMismatchError();
    if (confirmation.companyId !== companyId) throw new ConfirmationTenantMismatchError();
    if (confirmation.status !== ConfirmationStatus.PENDING) {
      throw new ConfirmationInvalidStatusError(confirmation.status);
    }
    
    const now = new Date();
    if (new Date(confirmation.expiresAt) < now) {
      await this.updateStatus(confirmation.id, ConfirmationStatus.EXPIRED);
      throw new ConfirmationExpiredError();
    }

    const { error } = await supabase
      .from('ai_action_confirmations')
      .update({
        status: ConfirmationStatus.CONFIRMED,
        confirmed_at: now.toISOString()
      })
      .eq('id', confirmation.id);

    if (error) throw new ConfirmationExecutionError(error.message);
  }

  /**
   * Marks a confirmation as rejected by the user.
   */
  async reject(publicToken: string, userId: string, companyId: string): Promise<void> {
    const tokenHash = this.hashToken(publicToken);
    const confirmation = await this.getConfirmationByHash(tokenHash);

    if (confirmation.userId !== userId) throw new ConfirmationUserMismatchError();
    if (confirmation.companyId !== companyId) throw new ConfirmationTenantMismatchError();
    if (confirmation.status !== ConfirmationStatus.PENDING) {
      throw new ConfirmationInvalidStatusError(confirmation.status);
    }

    const { error } = await supabase
      .from('ai_action_confirmations')
      .update({
        status: ConfirmationStatus.REJECTED,
        rejected_at: new Date().toISOString()
      })
      .eq('id', confirmation.id);

    if (error) throw new ConfirmationExecutionError(error.message);
  }

  /**
   * Validates and consumes a confirmation atomically.
   * This is used during the actual action execution.
   */
  async validateAndConsume(
    publicToken: string, 
    payload: Record<string, any>,
    userId: string,
    companyId: string
  ): Promise<ActionConfirmation> {
    const tokenHash = this.hashToken(publicToken);
    const payloadHash = generatePayloadHash(payload);

    const { data, error } = await supabase.rpc('consume_ai_action_confirmation', {
      p_token_hash: tokenHash,
      p_payload_hash: payloadHash,
      p_user_id: userId,
      p_company_id: companyId
    });

    if (error) {
      console.error('RPC Error consuming confirmation:', error);
      throw new ConfirmationExecutionError(error.message);
    }

    const result = data[0];
    if (!result.ok) {
      switch (result.error_code) {
        case 'CONFIRMATION_NOT_FOUND': throw new ConfirmationNotFoundError();
        case 'CONFIRMATION_USER_MISMATCH': throw new ConfirmationUserMismatchError();
        case 'CONFIRMATION_TENANT_MISMATCH': throw new ConfirmationTenantMismatchError();
        case 'CONFIRMATION_PAYLOAD_MISMATCH': throw new ConfirmationPayloadMismatchError();
        case 'CONFIRMATION_ALREADY_CONSUMED': throw new ConfirmationAlreadyConsumedError();
        case 'CONFIRMATION_REJECTED': throw new ConfirmationRejectedError();
        case 'CONFIRMATION_EXPIRED': throw new ConfirmationExpiredError();
        default: throw new ConfirmationExecutionError(result.error_code || 'Validation failed');
      }
    }

    // Return the consumed confirmation
    const { data: conf, error: fetchError } = await supabase
      .from('ai_action_confirmations')
      .select('*')
      .eq('id', result.confirmation_id)
      .single();

    if (fetchError) throw new ConfirmationExecutionError(fetchError.message);
    
    return this.mapFromDb(conf);
  }

  /**
   * Internal helper to get confirmation by hash.
   */
  private async getConfirmationByHash(tokenHash: string): Promise<ActionConfirmation> {
    const { data, error } = await supabase
      .from('ai_action_confirmations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) throw new ConfirmationExecutionError(error.message);
    if (!data) throw new ConfirmationNotFoundError();

    return this.mapFromDb(data);
  }

  private async updateStatus(id: string, status: ConfirmationStatus): Promise<void> {
    await supabase.from('ai_action_confirmations').update({ status }).eq('id', id);
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapFromDb(db: any): ActionConfirmation {
    return {
      id: db.id,
      tokenHash: db.token_hash,
      executionId: db.execution_id,
      actionId: db.action_id,
      userId: db.user_id,
      companyId: db.company_id,
      processId: db.process_id,
      resourceId: db.resource_id,
      operation: db.operation,
      payloadHash: db.payload_hash,
      status: db.status as ConfirmationStatus,
      expiresAt: db.expires_at,
      confirmedAt: db.confirmed_at,
      rejectedAt: db.rejected_at,
      consumedAt: db.consumed_at,
      createdAt: db.created_at,
      metadata: db.metadata
    };
  }
}

export const confirmationService = new ConfirmationService();
