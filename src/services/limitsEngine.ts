import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ResourceKey =
  | "ocr"
  | "ai_chat"
  | "pdf_generation"
  | "dossier_export"
  | "signature_request"
  | "upload_file"
  | "storage_gb"
  | "premium_template"
  | "portal_share";

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  daily_used?: number;
  daily_limit?: number | null;
  monthly_used?: number;
  monthly_limit?: number | null;
  percent_day?: number;
  percent_month?: number;
  renews_at?: string;
}

export interface ResourceStatus {
  resource_key: ResourceKey;
  label: string;
  unit: string;
  daily_used: number;
  daily_limit: number | null;
  monthly_used: number;
  monthly_limit: number | null;
  percent_day: number;
  percent_month: number;
  renews_at: string;
}

const REASON_LABEL: Record<string, string> = {
  company_not_found: "Empresa não encontrada.",
  company_inactive: "Empresa desativada.",
  company_suspended: "Empresa suspensa. Regularize a cobrança.",
  billing_overdue: "Cobrança vencida. Quite o pagamento para liberar.",
  daily_limit_exceeded: "Limite diário atingido. Tente novamente amanhã ou adquira um pacote adicional.",
  monthly_limit_exceeded: "Limite mensal atingido. Faça upgrade do plano ou adquira um pacote adicional.",
};

import { getCurrentCompanyId } from "@/lib/currentCompany";

async function currentCompanyId(): Promise<string | null> {
  // Onda 3C.2: use process-wide cache to avoid re-querying profiles per action.
  return getCurrentCompanyId();
}

export const limitsEngine = {
  async check(resource: ResourceKey, amount = 1, companyId?: string): Promise<LimitCheckResult> {
    const cid = companyId ?? (await currentCompanyId());
    if (!cid) return { allowed: false, reason: "company_not_found" };
    const { data, error } = await supabase.rpc("limits_check" as any, {
      p_company: cid, p_resource: resource, p_amount: amount,
    });
    if (error) {
      console.error("limits_check error", error);
      return { allowed: true }; // fail-open para não travar UX por erro de infra
    }
    return (data ?? { allowed: true }) as LimitCheckResult;
  },

  async enforce(resource: ResourceKey, amount = 1, companyId?: string): Promise<boolean> {
    const r = await this.check(resource, amount, companyId);
    if (!r.allowed) {
      toast.error(REASON_LABEL[r.reason ?? ""] ?? "Ação bloqueada pelos limites do plano.", {
        description:
          r.monthly_limit != null
            ? `Mensal: ${r.monthly_used ?? 0}/${r.monthly_limit}`
            : undefined,
      });
    }
    return r.allowed;
  },

  async consume(
    resource: ResourceKey,
    amount = 1,
    metadata: Record<string, any> = {},
    requestId?: string,
    companyId?: string,
  ): Promise<LimitCheckResult> {
    const cid = companyId ?? (await currentCompanyId());
    if (!cid) return { allowed: false, reason: "company_not_found" };
    const { data, error } = await supabase.rpc("limits_consume" as any, {
      p_company: cid, p_resource: resource, p_amount: amount,
      p_metadata: metadata, p_request_id: requestId ?? null,
    });
    if (error) {
      console.error("limits_consume error", error);
      const m = /limit_blocked:(.*)$/.exec(error.message ?? "");
      if (m) {
        try { return JSON.parse(m[1]) as LimitCheckResult; } catch { /* */ }
      }
      return { allowed: false, reason: "consume_failed" };
    }
    return (data ?? { allowed: true }) as LimitCheckResult;
  },

  async status(companyId?: string): Promise<ResourceStatus[]> {
    const cid = companyId ?? (await currentCompanyId());
    if (!cid) return [];
    const { data, error } = await supabase.rpc("limits_status" as any, { p_company: cid });
    if (error) { console.error("limits_status error", error); return []; }
    return (data ?? []) as ResourceStatus[];
  },
};
