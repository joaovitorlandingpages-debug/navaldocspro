import { ActionAudit } from './audit-types';

export interface AuditResult {
  success: boolean;
  audit?: ActionAudit;
  warning?: string;
  error?: string;
}
