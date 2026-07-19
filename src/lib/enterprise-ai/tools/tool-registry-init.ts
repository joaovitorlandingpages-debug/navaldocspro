import { ToolRegistry } from "./tool-registry";
import { 
  searchProcessesTool, 
  getProcessTool, 
  getProcessHealthTool, 
  getProcessRiskTool 
} from "./process-tools";

export function registerTools() {
  ToolRegistry.register(searchProcessesTool);
  ToolRegistry.register(getProcessTool);
  ToolRegistry.register(getProcessHealthTool);
  ToolRegistry.register(getProcessRiskTool);
}
