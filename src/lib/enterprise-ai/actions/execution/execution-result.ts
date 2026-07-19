import { ActionStatus } from '../action-types';

export interface ExecutionResult {
  success: boolean;
  status: ActionStatus;
  executionId: string;
  actionId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  data?: any;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}
