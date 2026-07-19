import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "./action-types";
import { ActionRegistry } from "./action-registry";
import { createActionResult } from "./action-result";

export class ActionEngine {
  async execute(actionId: string, context: any): Promise<ActionResult> {
    const action = ActionRegistry.get(actionId);
    if (!action) {
      return createActionResult({
        success: false,
        status: ActionStatus.FAILED,
        message: `Action ${actionId} not found`,
        executionId: crypto.randomUUID(),
      });
    }

    const start = Date.now();
    try {
      return await action.execute(context);
    } catch (error: any) {
      return createActionResult({
        success: false,
        status: ActionStatus.FAILED,
        message: error.message || "Unknown execution error",
        executionId: crypto.randomUUID(),
        duration: Date.now() - start,
      });
    }
  }
}

// Stubs for Sprint 4.1
export class BaseStubAction implements AIAction {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public confirmationPolicy: ConfirmationPolicy = ConfirmationPolicy.MEDIUM
  ) {}

  requiredPermissions: string[] = [];
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  estimatedDuration: number = 5;

  async validate(): Promise<{ valid: boolean }> {
    return { valid: true };
  }

  async execute(): Promise<ActionResult> {
    return createActionResult({
      success: false,
      status: ActionStatus.NOT_IMPLEMENTED,
      message: "Action not implemented yet (Sprint 4.1 stub)",
      executionId: crypto.randomUUID(),
    });
  }

  async rollback(): Promise<void> {}
}

// Register stubs
export const registerStubs = () => {
  const stubs = [
    new BaseStubAction("create-process", "Create Process", "Creates a new process"),
    new BaseStubAction("generate-pdf", "Generate PDF", "Generates a PDF document"),
    new BaseStubAction("request-signature", "Request Signature", "Requests an electronic signature"),
    new BaseStubAction("complete-checklist", "Complete Checklist", "Marks a checklist as completed"),
  ];

  stubs.forEach(stub => ActionRegistry.register(stub));
};
