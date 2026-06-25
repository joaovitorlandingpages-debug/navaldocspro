import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CompanyAction = "create_process" | "run_ocr" | "create_user" | "view";

export type CanPerformResult = {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
};

const REASON_LABEL: Record<string, string> = {
  company_not_found: "Empresa não encontrada.",
  company_inactive: "Empresa desativada.",
  company_suspended: "Empresa suspensa. Regularize a cobrança para continuar.",
  billing_overdue: "Cobrança vencida. Quite o pagamento para liberar a operação.",
  process_limit_exceeded: "Limite mensal de processos do plano atingido.",
  ocr_limit_exceeded: "Limite mensal de OCR do plano atingido.",
  user_limit_exceeded: "Limite de usuários do plano atingido.",
};

export async function canCompanyPerform(companyId: string, action: CompanyAction): Promise<CanPerformResult> {
  const { data, error } = await supabase.rpc("company_can_perform" as any, {
    p_company_id: companyId,
    p_action: action,
  });
  if (error) {
    console.error("company_can_perform error", error);
    return { allowed: true };
  }
  return (data ?? { allowed: true }) as CanPerformResult;
}

export async function enforceCompanyAction(companyId: string, action: CompanyAction): Promise<boolean> {
  const result = await canCompanyPerform(companyId, action);
  if (!result.allowed) {
    const label = REASON_LABEL[result.reason ?? ""] ?? "Ação bloqueada pelo plano ou cobrança.";
    toast.error(label, {
      description: result.limit !== undefined ? `Uso: ${result.used}/${result.limit}` : undefined,
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("master_audit_logs" as any).insert({
        actor_id: user?.id,
        actor_email: user?.email,
        target_company_id: companyId,
        event_type: "master_limit_exceeded",
        message: label,
        metadata: { action, ...result },
      });
    } catch { /* ignore */ }
  }
  return result.allowed;
}
