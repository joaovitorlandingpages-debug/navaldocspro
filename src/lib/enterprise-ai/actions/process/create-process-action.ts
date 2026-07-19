import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy, ActionError } from "../action-types";
import { createActionResult } from "../action-result";
import { 
  CreateProcessInput, 
  CreateProcessInputSchema, 
} from "./process-action-types";
import { supabase } from "@/integrations/supabase/client";
import { processCreationService } from "@/services/processes/process-creation-service";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";
import { confirmProcessVisible, notifyProcessesChanged } from "@/services/processes/processCreation";

export class CreateProcessAction implements AIAction {
  id = "create-process";
  name = "Create Process";
  description = "Creates a new process with blueprint materialization and tenant isolation";
  
  requiredPermissions = ["PROCESS_CREATE"];
  confirmationPolicy = ConfirmationPolicy.HIGH;
  estimatedRisk = 'MEDIUM' as const;
  estimatedDuration = 5;

  async validate(context: any): Promise<{ valid: boolean; errors?: string[] }> {
    const result = CreateProcessInputSchema.safeParse(context);
    if (!result.success) {
      return { 
        valid: false, 
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      };
    }
    return { valid: true };
  }

  async execute(context: any): Promise<ActionResult> {
    const start = Date.now();
    const input = context as CreateProcessInput;
    const user = (context as any)._user;
    
    if (!user) throw new Error("User context missing in execute");

    console.log('[CreateProcessAction] START execute');


    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    let processId = (context as any).processId;
    let processStatus = 'pending';

    if (!processId) {
      const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
        'low': 'low',
        'normal': 'medium',
        'high': 'high',
        'urgent': 'critical'
      };

      const process = await processCreationService.createProcess({
        companyId: profile.company_id,
        processType: input.processType,
        processTypeId: input.processTypeId,
        customerId: input.customerId,
        vesselId: input.vesselId,
        title: input.title || input.processType,
        description: input.description,
        priority: priorityMap[input.priority] || 'medium',
        metadata: input.metadata,
      });
      processId = process.id;
      processStatus = process.status;
    }

    try {
      await materializeProcessBlueprint(processId, {
        extraTemplateIds: input.initialChecklist || [],
      });
    } catch (e: any) {
      const err = new ActionError(e.message || "Blueprint materialization failed", 'MATERIALIZATION_FAILED');
      (err as any).processId = processId;
      throw err;
    }

    try {
      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      notifyProcessesChanged(visibleProcess);
    } catch (e: any) {
      const err = new ActionError(e.message || "Process visibility confirmation failed", 'VISIBILITY_FAILED');
      (err as any).processId = processId;
      throw err;
    }

    return createActionResult({
      success: true,
      status: ActionStatus.SUCCESS,
      message: `Process "${input.title || input.processType}" created successfully`,
      executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),
      duration: Date.now() - start,
      metadata: {
        processId,
        customerId: input.customerId,
        vesselId: input.vesselId,
        status: processStatus,
      }
    });
  }

  async rollback(context: any): Promise<void> {
  }
}
