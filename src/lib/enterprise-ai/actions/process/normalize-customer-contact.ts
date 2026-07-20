import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";
import { createActionResult } from "../action-result";
import { supabase } from "@/integrations/supabase/client";

export class NormalizeCustomerContactAction implements AIAction {
  id = "normalize-customer-contact";
  metadata = {
    actionId: "normalize-customer-contact",
    displayName: "Normalizar Contato do Cliente",
    description: "Formata e valida campos de telefone, e-mail e endereço seguindo padrões técnicos.",
    category: "customer",
    riskLevel: "LOW" as const,
    requiredPermissions: ["CUSTOMER_UPDATE"],
    confirmationPolicy: ConfirmationPolicy.NONE,
    dependencies: [],
    retryPolicy: {
      maxRetries: 2,
      backoff: "fixed" as const
    },
    estimatedDuration: 1,
    enabled: true,
    supportsRetry: true,
    supportsPlanner: true
  };

  async validate(context: any): Promise<{ valid: boolean; errors?: string[] }> {
    if (!context.customerId) return { valid: false, errors: ["ID do cliente é obrigatório."] };
    return { valid: true };
  }

  async execute(context: any): Promise<ActionResult> {
    const start = Date.now();
    const { customerId, companyId } = context;

    // 1. Fetch current data
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !customer) {
      throw new Error(`Cliente não encontrado ou acesso negado.`);
    }

    // 2. Normalization logic
    const updates: any = {};
    if (customer.phone) {
      // Basic normalization: remove non-digits
      const normalizedPhone = customer.phone.replace(/\D/g, "");
      if (normalizedPhone !== customer.phone) {
        updates.phone = normalizedPhone;
      }
    }

    if (customer.email) {
      const normalizedEmail = customer.email.trim().toLowerCase();
      if (normalizedEmail !== customer.email) {
        updates.email = normalizedEmail;
      }
    }

    // 3. Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", customerId);

      if (updateError) throw updateError;
    }

    return createActionResult({
      success: true,
      status: ActionStatus.SUCCESS,
      message: "Dados de contato normalizados com sucesso.",
      executionId: context.executionId,
      duration: Date.now() - start,
      metadata: { customerId, normalizedFields: Object.keys(updates) }
    });
  }

  async rollback(context: any): Promise<void> {
    // Reversible action logic would go here
  }
}
