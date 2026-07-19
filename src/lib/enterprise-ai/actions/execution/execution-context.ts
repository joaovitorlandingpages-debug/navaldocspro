export interface ExecutionContext {
  executionId: string;
  requestId: string;
  actionId: string;
  userId: string;
  companyId: string;
  conversationId?: string;
  provider?: string;
  startedAt: Date;
  metadata?: Record<string, any>;
}
