import { registerAgents } from "./agents/process-specialist.agent";
import { registerTools } from "./tools/tool-registry-init";

let initialized = false;

export function initializeAI() {
  if (initialized) return;
  
  registerAgents();
  registerTools();
  
  initialized = true;
  console.log("Enterprise AI System Initialized");
}

export * from "./core/ai-types";
export * from "./core/ai-errors";
export * from "./core/ai-orchestrator";
export * from "./agents/agent-registry";
export * from "./tools/tool-registry";
