import { NormalizeCustomerContactAction } from "./process/normalize-customer-contact";
import { AssociateDocumentAction } from "./process/associate-document";
import { AIAction } from "./action-types";

class ActionRegistryImpl {
  private actions = new Map<string, AIAction>();
  constructor() { this.register(new NormalizeCustomerContactAction()); this.register(new AssociateDocumentAction()); }

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
