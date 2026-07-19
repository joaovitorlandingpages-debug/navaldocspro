import { supabase } from '@/integrations/supabase/client';
import { ActionStatus } from '../action-types';
import { ActionAudit, AuditFilters } from './audit-types';
import { AuditResult } from './audit-result';
import { AuditPersistenceError } from './audit-errors';

export class AuditLogger {
  /**
   * Registra o início de uma execução.
   * Falha na auditoria não deve impedir a Action.
   */
  async logStart(params: {
    executionId: string;
    actionId: string;
    actionName: string;
    userId: string;
    companyId: string;
    processId?: string;
    conversationId?: string;
    provider?: string;
    metadata?: any;
  }): Promise<AuditResult> {
    try {
      const { data, error } = await supabase
        .from('ai_action_audits')
        .insert({
          execution_id: params.executionId,
          action_id: params.actionId,
          action_name: params.actionName,
          user_id: params.userId,
          company_id: params.companyId,
          process_id: params.processId,
          conversation_id: params.conversationId,
          provider: params.provider,
          status: ActionStatus.PENDING,
          started_at: new Date().toISOString(),
          metadata: params.metadata || {}
        })
        .select('id, execution_id, action_id, action_name, user_id, company_id, process_id, conversation_id, provider, status, started_at, finished_at, duration_ms, warnings, errors, metadata, created_at')
        .single();

      if (error) throw error;

      return { success: true, audit: data as ActionAudit };
    } catch (error: any) {
      console.warn('AuditLogger.logStart failed:', error.message);
      return { 
        success: false, 
        warning: `Failed to log audit start: ${error.message}` 
      };
    }
  }

  async logSuccess(executionId: string, params: {
    finishedAt?: Date;
    durationMs?: number;
    metadata?: any;
    warnings?: string[];
    documentId?: string;
  }): Promise<AuditResult> {
    return this.update(executionId, {
      status: ActionStatus.SUCCESS,
      finished_at: (params.finishedAt || new Date()).toISOString(),
      duration_ms: params.durationMs,
      metadata: params.metadata,
      warnings: params.warnings,
      document_id: params.documentId
    });
  }

  async logFailure(executionId: string, params: {
    error: any;
    finishedAt?: Date;
    durationMs?: number;
    metadata?: any;
  }): Promise<AuditResult> {
    return this.update(executionId, {
      status: ActionStatus.FAILED,
      finished_at: (params.finishedAt || new Date()).toISOString(),
      duration_ms: params.durationMs,
      errors: params.error,
      metadata: params.metadata
    });
  }

  async update(executionId: string, updates: Partial<ActionAudit>): Promise<AuditResult> {
    try {
      const { data, error } = await supabase
        .from('ai_action_audits')
        .update(updates)
        .eq('execution_id', executionId)
        .select('id, execution_id, action_id, action_name, user_id, company_id, process_id, conversation_id, provider, status, started_at, finished_at, duration_ms, warnings, errors, metadata, created_at')
        .single();

      if (error) throw error;

      return { success: true, audit: data as ActionAudit };
    } catch (error: any) {
      console.warn('AuditLogger.update failed:', error.message);
      return { 
        success: false, 
        warning: `Failed to update audit: ${error.message}` 
      };
    }
  }

  async findByExecutionId(executionId: string): Promise<ActionAudit | null> {
    const { data, error } = await supabase
      .from('ai_action_audits')
      .select('*')
      .eq('execution_id', executionId)
      .maybeSingle();
    
    if (error) throw error;
    return data as ActionAudit | null;
  }

  async list(filters: AuditFilters = {}): Promise<ActionAudit[]> {
    let query = supabase.from('ai_action_audits').select('*').order('created_at', { ascending: false });

    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.actionId) query = query.eq('action_id', filters.actionId);
    if (filters.processId) query = query.eq('process_id', filters.processId);
    if (filters.status) query = query.eq('status', filters.status);
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ActionAudit[];
  }
}

export const auditLogger = new AuditLogger();
