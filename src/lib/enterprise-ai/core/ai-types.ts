export type AIIntent = 'search_processes' | 'get_process_details' | 'get_process_health' | 'get_process_risk' | 'unsupported_intent';

export interface AIExecutionContext {
  userId: string;
  companyId: string;
  role: string;
  permissions: string[];
  locale: string;
  conversationId?: string;
  entityContext?: {
    processId?: string;
  };
}

export interface AIRequest {
  message: string;
  conversationId?: string;
  entityContext?: {
    processId?: string;
  };
}

export interface AIResponse {
  answer: string;
  selectedAgent?: string;
  executedTools: {
    toolId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }[];
  references?: {
    type: 'process' | 'document' | 'vessel';
    id: string;
    label: string;
  }[];
  suggestedActions?: {
    label: string;
    action: string;
    path?: string;
  }[];
  warnings?: string[];
  executionId: string;
  durationMs: number;
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
  inputSchema: any; // Ideally Zod schema
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
