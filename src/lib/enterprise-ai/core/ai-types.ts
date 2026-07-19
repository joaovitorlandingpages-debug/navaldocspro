export type AIIntent = 
  | 'PROCESS_SEARCH' 
  | 'PROCESS_DETAILS' 
  | 'PROCESS_HEALTH' 
  | 'PROCESS_RISK' 
  | 'PROCESS_SUMMARY' 
  | 'PROCESS_CRITICAL_LIST' 
  | 'PROCESS_LOW_HEALTH_LIST' 
  | 'PROCESS_HEALTH_AND_RISK' 
  | 'CONVERSATION_HELP' 
  | 'UNKNOWN';

export interface AIExecutionContext {
  userId: string;
  companyId: string;
  role: string;
  permissions: string[];
  locale: string;
  conversationId?: string;
  contextState?: Record<string, any>;
}

export interface AIRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  companyId?: string;
}

export interface AIResponse {
  answer: string;
  conversationId: string;
  selectedAgent: string;
  intent: AIIntent;
  plan?: {
    id: string;
    steps: {
      id: string;
      description: string;
      status: string;
    }[];
  };
  executedTools: {
    toolId: string;
    success: boolean;
    durationMs: number;
    error?: string;
    data?: any;
  }[];
  references: {
    type: 'process' | 'document' | 'vessel' | 'customer';
    id: string;
    label: string;
    metadata?: any;
  }[];
  suggestedActions: {
    label: string;
    action: string;
    path?: string;
  }[];
  warnings: string[];
  executionId: string;
  durationMs: number;
  confidence: number;
  contextUpdates: Record<string, any>;
  status: 'success' | 'partial_success' | 'unsupported_intent' | 'context_reference_missing' | 'permission_denied' | 'execution_failed';
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  supportedIntents: AIIntent[];
  allowedTools: string[];
  requiredPermissions: string[];
  systemInstructions: string;
  maxToolExecutions: number;
}

export interface ToolDefinition {
  id: string;
  category: 'process' | 'document' | 'ocr' | 'signature' | 'management';
  description: string;
  inputSchema: any;
  requiredPermissions: string[];
  timeoutMs: number;
  cachePolicy: 'none' | 'short' | 'long';
  execute: (context: AIExecutionContext, input: any) => Promise<any>;
}

export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
}
