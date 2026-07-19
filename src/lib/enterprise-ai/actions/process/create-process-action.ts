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
  description = "Creates a complete NavalDocs process using the existing application workflow.";
  requiredPermissions = ["PROCESS_CREATE", "CUSTOMER_READ", "VESSEL_READ"];
  confirmationPolicy = ConfirmationPolicy.HIGH;
  estimatedRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH";
  estimatedDuration = 10;

  async validate(context: any): Promise<{ valid: boolean; errors?: string[] }> {
    const result = CreateProcessInputSchema.safeParse(context);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }

    const { customerId, vesselId } = result.data;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { valid: false, errors: ["User not authenticated"] };

    // Fetch user profile for company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) return { valid: false, errors: ["User profile not found"] };

    // Validate Customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("company_id")
      .eq("id", customerId)
      .maybeSingle();

    if (customerError || !customer) {
      throw new CustomerNotFoundError(customerId);
    }

    if (customer.company_id !== profile.company_id) {
      throw new TenantMismatchError("customer");
    }

    // Validate Vessel if provided
    if (vesselId) {
      const { data: vessel, error: vesselError } = await supabase
        .from("vessels")
        .select("company_id, customer_id")
        .eq("id", vesselId)
        .maybeSingle();

      if (vesselError || !vessel) {
        throw new VesselNotFoundError(vesselId);
      }

      if (vessel.company_id !== profile.company_id) {
        throw new TenantMismatchError("vessel");
      }

      if (vessel.customer_id !== customerId) {
        return { valid: false, errors: ["Vessel does not belong to the selected customer"] };
      }
    }

    return { valid: true };
  }

  async execute(rawInput: CreateProcessInput): Promise<ActionResult> {
    const context = (rawInput as any).input || rawInput;



    const start = Date.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

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
        throw new ProcessCreationError(e.message || "Blueprint materialization failed", 'MATERIALIZATION_FAILED');
      }

      // 3. Confirm Visibility & Notify
      try {
        const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
        notifyProcessesChanged(visibleProcess);
      } catch (e: any) {
        const error = new ProcessCreationError(e.message || "Process visibility confirmation failed", 'VISIBILITY_FAILED');
        (error as any).processId = processId;
        throw error;
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

    } finally {
      // Cleanup if needed
    }

  }

  async rollback(context: any): Promise<void> {
    // Basic rollback: if the process was created but something failed later in a complex flow
    // In this simple case, we don't necessarily delete the process unless we wanted a strict atomic operation.
    // For now, no-op or specific deletion logic if needed.
  }
}
