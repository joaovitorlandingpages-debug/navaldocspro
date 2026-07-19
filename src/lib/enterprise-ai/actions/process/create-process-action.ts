import { 
  CreateProcessInput, 
  CreateProcessInputSchema, 
  ActionError 
} from "./process-action-types";
import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";

import { createActionResult } from "../action-result";
import { supabase } from "@/integrations/supabase/client";


import { processCreationService } from "@/services/processes/process-creation-service";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";
import { confirmProcessVisible, notifyProcessesChanged } from "@/services/processes/processCreation";

export class CreateProcessAction implements AIAction {
  id = "create-process";
  metadata = {
    actionId: "create-process",
    displayName: "Create Process",
    description: "Creates a new process with blueprint materialization and tenant isolation",
    category: "process",
    riskLevel: "MEDIUM" as const,
    requiredPermissions: ["PROCESS_CREATE"],
    confirmationPolicy: ConfirmationPolicy.HIGH,
    dependencies: [],
    retryPolicy: {
      maxRetries: 3,
      backoff: "exponential" as const
    },
    estimatedDuration: 5,
    enabled: true,
    supportsRetry: true,
    supportsPlanner: true
  };

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
    
    console.log('CreateProcessAction DEBUG Execute Start:', { 
      processId: input.processId, 
      hasUser: !!user,
      inputKeys: Object.keys(input)
    });

    if (!user) {
      console.log('CreateProcessAction ERROR: User context missing', { contextKeys: Object.keys(context) });
      throw new Error("User context missing in execute");
    }



    console.log('CreateProcessAction Start profile check for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.log('Profile error or missing:', profileError);
      throw new Error("User profile not found");
    }

    let processId = (context as any).processId;
    console.log('CreateProcessAction ID check:', { processId });
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
      console.log('CreateProcessAction Materializing processId:', processId);
      await materializeProcessBlueprint(processId, {
        extraTemplateIds: input.initialChecklist || [],
      });
    } catch (e: any) {
      console.log('CreateProcessAction Materialization ERROR catch block:', e.message);
      
      // CRITICAL FIX: The ActionExecutor's outer catch block expects properties on the Error object.
      // We must throw a real Error with properties, not a plain object, to survive some middleware.
      const recoveryError: any = new Error(e.message || "Blueprint materialization failed");
      recoveryError.errorCode = 'MATERIALIZATION_FAILED';
      recoveryError.code = 'MATERIALIZATION_FAILED';
      recoveryError.processId = processId;
      recoveryError.isActionError = true;
      recoveryError.name = 'ActionExecutionError';
      
      console.log('CreateProcessAction Materialization ERROR throw (Real Error with props):', {
        message: recoveryError.message,
        errorCode: recoveryError.errorCode,
        processId: recoveryError.processId
      });
      throw recoveryError;
    }




    try {
      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      notifyProcessesChanged(visibleProcess);
    } catch (e: any) {
      const err = new ActionError(e.message || "Process visibility confirmation failed", 'VISIBILITY_FAILED');
      (err as any).processId = processId;
      console.log('CreateProcessAction Visibility ERROR throw:', { code: err.code, processId });
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
