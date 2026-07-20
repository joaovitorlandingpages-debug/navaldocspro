import { z } from "zod";
import { ActionStatus } from "../action-types";

export const ActionRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type ActionRiskLevel = z.infer<typeof ActionRiskLevelSchema>;

export const ActionExecutionStatusSchema = z.enum([
  "DRAFT",
  "AWAITING_CONFIRMATION",
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "PARTIALLY_SUCCEEDED",
  "FAILED",
  "COMPENSATING",
  "COMPENSATED",
  "CANCELLED",
  "EXPIRED"
]);
export type ActionExecutionStatus = z.infer<typeof ActionExecutionStatusSchema>;

export interface ActionExecutionRecord {
  id: string;
  company_id: string;
  process_id: string | null;
  analysis_id: string | null;
  finding_id: string | null;
  action_key: string;
  action_version: string;
  status: ActionExecutionStatus;
  risk_level: ActionRiskLevel;
  requested_by: string;
  confirmed_by: string | null;
  confirmation_id: string | null;
  idempotency_key: string | null;
  input_snapshot: any;
  before_snapshot: any;
  after_snapshot: any;
  result: any;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}
