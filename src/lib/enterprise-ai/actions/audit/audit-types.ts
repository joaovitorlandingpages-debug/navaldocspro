import { ActionStatus } from '../action-types';

export interface ActionAudit {
  id: string;
  execution_id: string;
  action_id: string;
  action_name: string;
  user_id: string;
  company_id: string;
  process_id?: string | null;
  document_id?: string | null;
  conversation_id?: string | null;
  provider?: string | null;
  status: ActionStatus;
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  warnings?: any;
  errors?: any;
  metadata?: any;
  created_at: string;
}

export interface AuditFilters {
  companyId?: string;
  userId?: string;
  actionId?: string;
  processId?: string;
  status?: ActionStatus;
  startDate?: string;
  endDate?: string;
}
