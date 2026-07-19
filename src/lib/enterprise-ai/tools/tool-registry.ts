import { ToolDefinition, ToolExecutionResult, AIExecutionContext } from "../core/ai-types";
import { ToolNotFoundError, PermissionDeniedError, ToolExecutionError } from "../core/ai-errors";

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  static get(id: string): ToolDefinition {
    const tool = this.tools.get(id);
    if (!tool) throw new ToolNotFoundError(id);
    return tool;
  }

  static list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

export class ToolExecutor {
  static async execute(toolId: string, context: AIExecutionContext, input: any): Promise<ToolExecutionResult> {
    const start = Date.now();
    try {
      const tool = ToolRegistry.get(toolId);

      // Permission Guard
      if (!context.permissions.some(p => tool.requiredPermissions.includes(p)) && tool.requiredPermissions.length > 0) {
        throw new PermissionDeniedError(`Insufficient permissions for tool ${toolId}`);
      }

      // Execution
      const data = await tool.execute(context, input);
      
      return {
        toolId,
        success: true,
        data,
        durationMs: Date.now() - start
      };
    } catch (error: any) {
      return {
        toolId,
        success: false,
        error: error.message,
        durationMs: Date.now() - start
      };
    }
  }
}
