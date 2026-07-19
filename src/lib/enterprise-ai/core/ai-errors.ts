export class AIError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'AIError';
  }
}

export class PermissionDeniedError extends AIError {
  constructor(message = 'Permission denied') {
    super('PERMISSION_DENIED', message);
  }
}

export class ToolNotFoundError extends AIError {
  constructor(toolId: string) {
    super('TOOL_NOT_FOUND', `Tool ${toolId} not found`);
  }
}

export class AgentNotFoundError extends AIError {
  constructor(agentId: string) {
    super('AGENT_NOT_FOUND', `Agent ${agentId} not found`);
  }
}

export class ToolExecutionError extends AIError {
  constructor(toolId: string, message: string) {
    super('TOOL_EXECUTION_FAILED', `Tool ${toolId} failed: ${message}`);
  }
}
