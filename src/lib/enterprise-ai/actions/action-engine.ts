import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "./action-types";
import { ActionRegistry } from "./action-registry";
import { createActionResult } from "./action-result";
import { GeneratePdfAction } from "./pdf/generate-pdf-action";
import { CompleteChecklistAction } from "./checklist/complete-checklist-action";
import { RequestSignatureAction } from "./signatures/request-signature-action";




export class ActionEngine {
  async execute(actionId: string, context: any): Promise<ActionResult> {
    const action = ActionRegistry.get(actionId);
    

    if (!action) {
      return createActionResult({
        success: false,
        status: ActionStatus.FAILED,
        message: `Action ${actionId} not found`,
        executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),

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
        executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),
        duration: Date.now() - start,
      });
    }

  }
}

// Global default instances for testing or direct usage
export const actionEngine = new ActionEngine();


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
      executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),
    });
  }

  async rollback(): Promise<void> {}
}

// Register stubs
export const registerStubs = () => {
  const stubs: AIAction[] = [
    
    // new BaseStubAction("request-signature", "Request Signature", "Requests an electronic signature"),

  ];

  stubs.forEach(stub => ActionRegistry.register(stub));

  
  // Register Real Actions
  ActionRegistry.register(new GeneratePdfAction());
  ActionRegistry.register(new RequestSignatureAction());
};


