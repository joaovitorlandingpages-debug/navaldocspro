import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";
import { createActionResult } from "../action-result";
import { supabase } from "@/integrations/supabase/client";

export class AssociateDocumentAction implements AIAction {
  id = "associate-document";
  metadata = {
    actionId: "associate-document",
    displayName: "Associar Documento",
    description: "Vincula um upload existente a um requisito do checklist do processo.",
    category: "document",
    riskLevel: "LOW" as const,
    requiredPermissions: ["DOCUMENT_MANAGE"],
    confirmationPolicy: ConfirmationPolicy.NONE,
    dependencies: [],
    retryPolicy: {
      maxRetries: 1,
      backoff: "fixed" as const
    },
    estimatedDuration: 2,
    enabled: true,
    supportsRetry: true,
    supportsPlanner: true
  };

  async validate(context: any): Promise<{ valid: boolean; errors?: string[] }> {
    if (!context.processId) return { valid: false, errors: ["ID do processo é obrigatório."] };
    if (!context.uploadId) return { valid: false, errors: ["ID do upload é obrigatório."] };
    if (!context.checklistItemId) return { valid: false, errors: ["ID do item do checklist é obrigatório."] };
    return { valid: true };
  }

  async execute(context: any): Promise<ActionResult> {
    const start = Date.now();
    const { processId, uploadId, checklistItemId, companyId } = context;

    // Logic to associate document
    const { error } = await supabase
      .from("process_document_uploads")
      .update({ checklist_item_id: checklistItemId })
      .eq("id", uploadId)
      .eq("process_id", processId)
      .eq("company_id", companyId);

    if (error) throw error;

    return createActionResult({
      success: true,
      status: ActionStatus.SUCCESS,
      message: "Documento associado com sucesso.",
      executionId: context.executionId,
      duration: Date.now() - start,
      metadata: { processId, uploadId, checklistItemId }
    });
  }

  async rollback(context: any): Promise<void> {
    // Reversible: set checklist_item_id back to null
  }
}
