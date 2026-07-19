import { AgentDefinition } from "./ai-types";
import { AgentNotFoundError } from "./ai-errors";

export class AgentRegistry {
  private static agents: Map<string, AgentDefinition> = new Map();

  static register(agent: AgentDefinition) {
    this.agents.set(agent.id, agent);
  }

  static get(id: string): AgentDefinition {
    const agent = this.agents.get(id);
    if (!agent) throw new AgentNotFoundError(id);
    return agent;
  }

  static list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  static findByIntent(intent: string): AgentDefinition | undefined {
    return this.list().find(a => a.supportedIntents.includes(intent as any));
  }
}
