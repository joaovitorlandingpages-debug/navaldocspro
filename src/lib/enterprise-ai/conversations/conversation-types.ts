export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIConversation {
  id: string;
  companyId: string;
  userId: string;
  title: string | null;
  status: 'active' | 'archived' | 'deleted';
  summary: string | null;
  contextState: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversationMessage {
  id: string;
  conversationId: string;
  companyId: string;
  userId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  agentId?: string;
  executionId?: string;
  toolCalls: any[];
  references: any[];
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateConversationParams {
  title?: string;
}

export interface AppendMessageParams {
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  agentId?: string;
  executionId?: string;
  toolCalls?: any[];
  references?: any[];
  metadata?: Record<string, any>;
}
