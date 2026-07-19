import { supabase } from "@/integrations/supabase/client";
import { generatePayloadHash } from "../confirmation/payload-hash";
import { ActionStatus } from "../action-types";

export type IdempotencyStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'recoverable_failed';

export interface IdempotencyRecord {
  id: string;
  idempotencyKeyHash: string;
  payloadHash: string;
  executionId: string;
  actionId: string;
  companyId: string;
  userId: string;
  status: IdempotencyStatus;
  result?: any;
  errorCode?: string;
  processId?: string;
  createdAt: string;
  updatedAt: string;
}

export class IdempotencyService {
  /**
   * Generates a hash for the idempotency key to avoid storing raw keys
   */
  static generateKeyHash(key: string): string {
    return generatePayloadHash({ key });
  }

  /**
   * Claims or retrieves an idempotency record atomically
   */
  async claim(params: {
    idempotencyKey: string;
    payload: any;
    executionId: string;
    actionId: string;
    companyId: string;
    userId: string;
  }): Promise<IdempotencyRecord> {
    const keyHash = IdempotencyService.generateKeyHash(params.idempotencyKey);
    const payloadHash = generatePayloadHash(params.payload);

    const { data, error } = await supabase.rpc('claim_ai_idempotency_record', {
      _idempotency_key_hash: keyHash,
      _payload_hash: payloadHash,
      _execution_id: params.executionId,
      _action_id: params.actionId,
      _company_id: params.companyId,
      _user_id: params.userId
    });

    if (error) {
      if (error.message?.includes('payload hash mismatch')) {
        throw new Error('IDEMPOTENCY_PAYLOAD_MISMATCH');
      }
      throw error;
    }

    return {
      id: data.id,
      idempotencyKeyHash: data.idempotency_key_hash,
      payloadHash: data.payload_hash,
      executionId: data.execution_id,
      actionId: data.action_id,
      companyId: data.company_id,
      userId: data.user_id,
      status: data.status,
      result: data.result,
      errorCode: data.error_code,
      processId: data.process_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Updates the status and result of an idempotency record
   */
  async update(id: string, updates: {
    status: IdempotencyStatus;
    result?: any;
    errorCode?: string;
    processId?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('ai_idempotency_records')
      .update({
        status: updates.status,
        result: updates.result,
        error_code: updates.errorCode,
        process_id: updates.processId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }
}

export const idempotencyService = new IdempotencyService();
