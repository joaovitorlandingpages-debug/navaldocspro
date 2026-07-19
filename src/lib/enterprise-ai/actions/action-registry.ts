import { AIAction } from "./action-types";

class ActionRegistryImpl {
  private actions = new Map<string, AIAction>();

  register(action: AIAction): void {
    this.actions.set(action.id, action);
  }

  get(id: string): AIAction | undefined {
    return this.actions.get(id);
  }

  list(): AIAction[] {
    return Array.from(this.actions.values());
  }

  exists(id: string): boolean {
    return this.actions.has(id);
  }

  clear(): void {
    this.actions.clear();
  }
}

export const ActionRegistry = new ActionRegistryImpl();
