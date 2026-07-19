import { AIOrchestrator } from "./core/ai-orchestrator";
import { AgentRegistry } from "./agents/agent-registry";
import { ToolRegistry } from "./tools/tool-registry";
import { processSpecialistAgent } from "./agents/process-specialist.agent";

export { AIOrchestrator } from "./core/ai-orchestrator";
export * from "./core/ai-types";
export * from "./core/ai-errors";
export { AgentRegistry } from "./agents/agent-registry";
export { ToolRegistry } from "./tools/tool-registry";

// Initialization helper (Side effect registration)
export function initializeEACC() {
  // Register agents
  AgentRegistry.register(processSpecialistAgent);
  
  // Tools are usually registered in their own files or a central init
  // For now, we assume they are registered via side effects or a registry-init file
  
  return {
    orchestrator: new AIOrchestrator()
  };
}
