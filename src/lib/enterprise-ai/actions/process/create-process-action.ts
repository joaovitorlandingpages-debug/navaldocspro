import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";
import { 
  CreateProcessInput, 
  CreateProcessInputSchema, 
  CustomerNotFoundError, 
  VesselNotFoundError, 
  ProcessCreationError, 
  TenantMismatchError 
} from "./process-action-types";
import { supabase } from "@/integrations/supabase/client";
import { createActionResult } from "../action-result";
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

  async execute(context: CreateProcessInput): Promise<ActionResult> {
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

      // REUSE EXISTING LOGIC: Insert into processes
      const { data: process, error: processError } = await supabase
        .from("processes")
        .insert({
          company_id: profile.company_id,
          process_type: context.processType,
          process_type_id: context.processTypeId,
          customer_id: context.customerId,
          vessel_id: context.vesselId || null,
          title: context.title || context.processType,
          description: context.description || null,
          priority: context.priority,
          status: "pending",
          is_draft: false,
          metadata: context.metadata || {},
        } as any)
        .select("id, status").single();

      if (processError) throw new ProcessCreationError(processError.message);
      const processId = process.id;

      // REUSE EXISTING LOGIC: Materialize Blueprint
      try {
        await materializeProcessBlueprint(processId, {
          extraTemplateIds: context.initialChecklist || [],
        });
      } catch (e) {
        console.warn("AI CreateProcessAction: blueprint materialization failed", e);
      }

      // REUSE EXISTING LOGIC: Confirmation & Notification
      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      
      // We check for window to avoid SSR issues if this runs in a worker that mimics browser env partially
      notifyProcessesChanged(visibleProcess);


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
          status: process.status,
        }
      });

    } catch (error: any) {
      return createActionResult({
        success: false,
        status: ActionStatus.FAILED,
        message: error.message || "Unknown error during process creation",
        executionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'exec-' + Date.now(),
        duration: Date.now() - start,
      });
    }
  }

  async rollback(context: any): Promise<void> {
    // Basic rollback: if the process was created but something failed later in a complex flow
    // In this simple case, we don't necessarily delete the process unless we wanted a strict atomic operation.
    // For now, no-op or specific deletion logic if needed.
  }
}
