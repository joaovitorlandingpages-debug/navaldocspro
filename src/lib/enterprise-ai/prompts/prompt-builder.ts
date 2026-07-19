import { AIExecutionContext, AgentDefinition, ToolExecutionResult } from "../core/ai-types";

export class PromptBuilder {
  static build(
    agent: AgentDefinition,
    context: AIExecutionContext,
    message: string,
    toolResults: ToolExecutionResult[]
  ): string {
    const sections: string[] = [];

    // System Instructions
    sections.push(`Role: ${agent.name}`);
    sections.push(`Instructions: ${agent.systemInstructions}`);

    // Context
    sections.push(`\nContext:`);
    sections.push(`- User ID: ${context.userId}`);
    sections.push(`- Company ID: ${context.companyId}`);
    sections.push(`- Role: ${context.role}`);
    sections.push(`- Permissions: ${context.permissions.join(', ')}`);

    // Tools Data
    if (toolResults.length > 0) {
      sections.push(`\nExecuted Tools Data:`);
      toolResults.forEach(result => {
        if (result.success) {
          sections.push(`- Tool: ${result.toolId}`);
          sections.push(`  Data: ${JSON.stringify(result.data, null, 2)}`);
        } else {
          sections.push(`- Tool: ${result.toolId} FAILED: ${result.error}`);
        }
      });
    }

    // User Message
    sections.push(`\nUser Question: ${message}`);
    sections.push(`\nLanguage: ${context.locale}`);

    return sections.join('\n');
  }
}
