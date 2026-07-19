import { AIOrchestrator } from "./core/ai-orchestrator";
import { AgentRegistry } from "./agents/agent-registry";
import { ToolRegistry } from "./tools/tool-registry";
import { ToolExecutor } from "./tools/tool-executor";
import { MockProvider } from "./providers/mock-provider";
import { processSpecialistAgent } from "./agents/process-specialist.agent";
import { initializeToolRegistry } from "./tools/tool-registry-init";

export { AIOrchestrator } from "./core/ai-orchestrator";
export * from "./core/ai-types";
export * from "./core/ai-errors";

// Initialization helper
export function initializeEACC() {
  const agentRegistry = AgentRegistry.getInstance();
  const toolRegistry = ToolRegistry.getInstance();
  
  // Register agents
  agentRegistry.registerAgent(processSpecialistAgent);
  
  // Register tools
  initializeToolRegistry();
  
  return {
    orchestrator: new AIOrchestrator(
      agentRegistry,
      toolRegistry,
      new ToolExecutor(toolRegistry),
      new MockProvider()
    )
  };
}
