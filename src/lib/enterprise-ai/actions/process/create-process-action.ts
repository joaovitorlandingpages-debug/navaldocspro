import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";
import { createActionResult } from "../action-result";
import { 
  CreateProcessInput, 
  CreateProcessInputSchema, 
  CustomerNotFoundError, 
  VesselNotFoundError, 
  ProcessCreationError, 
  TenantMismatchError,
  ActionError
} from "./process-action-types";
import { supabase } from "@/integrations/supabase/client";
import { processCreationService } from "@/services/processes/process-creation-service";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";
import { confirmProcessVisible, notifyProcessesChanged } from "@/services/processes/processCreation";

export class CreateProcessAction implements AIAction {
  id = "create-process";
  name = "Create Process";
  description = "Creates a new process with blueprint materialization and tenant isolation";
  
  confirmationPolicy = ConfirmationPolicy.REQUIRED;
  inputSchema = CreateProcessInputSchema;

  async execute(input: CreateProcessInput, user: any): Promise<ActionResult> {
    const start = Date.now();
    const { confirmationToken, ...context } = input;
    const rawInput = input as any;
    
    // 0. AUTH & TENANT CONTEXT
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    // 1. ATOMIC/IDEMPOTENT FLOW: Create or recover base process
    let processId = (rawInput as any).processId;
    let processStatus = 'pending';

    if (!processId) {
      const process = await processCreationService.createProcess({
        companyId: profile.company_id,
        processType: context.processType,
        processTypeId: context.processTypeId || (context as any).process_type_id,
        customerId: context.customerId,
        vesselId: context.vesselId,
        title: context.title || context.processType,
        description: context.description,
        priority: context.priority,
        metadata: context.metadata,
      });
      processId = process.id;
      processStatus = process.status;
    }

    // 2. Materialize Blueprint
    try {
      await materializeProcessBlueprint(processId, {
        extraTemplateIds: context.initialChecklist || [],
      });
    } catch (e: any) {
      const err = new ProcessCreationError(e.message || "Blueprint materialization failed", 'MATERIALIZATION_FAILED');
      (err as any).processId = processId;
      throw err;
    }

    // 3. Confirm Visibility & Notify
    try {
      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      notifyProcessesChanged(visibleProcess);
    } catch (e: any) {
      const err = new ProcessCreationError(e.message || "Process visibility confirmation failed", 'VISIBILITY_FAILED');
      (err as any).processId = processId;
      throw err;
    }

    return createActionResult({
      success: true,
      status: ActionStatus.SUCCESS,
      message: `Process "${context.title || context.processType}" created successfully`,
      executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),
      duration: Date.now() - start,
      metadata: {
        processId,
        customerId: context.customerId,
        vesselId: context.vesselId,
        status: processStatus,
      }
    });
  }

  async rollback(context: any): Promise<void> {
    // No-op for now
  }
}
