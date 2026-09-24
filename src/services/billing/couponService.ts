import { supabase } from "@/integrations/supabase/client";

export interface CouponItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: "trial_extension" | "percent" | "fixed";
  trial_days?: number | null;
  discount_percent?: number | null;
  discount_fixed?: number | null;
  discount_duration?: "once" | "repeating" | "forever";
  duration_in_months?: number | null;
  applicable_plans?: string[];
  applicable_billing_cycles?: string[];
  max_redemptions?: number | null;
  redemption_count?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  stripe_coupon_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ValidatedCouponResult {
  valid: boolean;
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  type?: "trial_extension" | "percent" | "fixed";
  trial_days?: number;
  discount_percent?: number;
  discount_fixed?: number;
  discount_duration?: string;
  message?: string;
}

export const couponService = {
  /**
   * Validação de cupom pelo cliente usando endpoint seguro RPC (SECURITY DEFINER).
   * Não expõe o catálogo de códigos nem chaves internas da Stripe para o cliente.
   */
  async validateCoupon(
    code: string,
    companyId?: string,
    planSlug?: string,
    billingCycle?: string
  ): Promise<ValidatedCouponResult> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, message: "Informe um código de cupom válido." };
    }

    try {
      const { data, error } = await supabase.rpc("validate_coupon_code", {
        p_code: cleanCode,
        p_company_id: companyId || null,
        p_plan_slug: planSlug || null,
        p_billing_cycle: billingCycle || null
      });

      if (error) {
        console.warn("Erro ao validar cupom via RPC:", error);
        return { valid: false, message: "Não foi possível validar o cupom no momento." };
      }

      return data as ValidatedCouponResult;
    } catch (err: any) {
      return { valid: false, message: err.message || "Erro na validação do cupom." };
    }
  },

  /**
   * Resgate seguro de campanha de extensão de teste gratuito (ex: 60 dias totais).
   * Funciona sem cartão de crédito, totaliza 60 dias a partir da criação e preserva prazos mais longos.
   */
  async redeemTrialExtension(
    code: string,
    companyId: string
  ): Promise<{ success: boolean; message: string; trial_ends_at?: string; total_days?: number }> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Código não informado." };
    }

    try {
      const { data, error } = await supabase.rpc("redeem_trial_extension_coupon", {
        p_code: cleanCode,
        p_company_id: companyId
      });

      if (error) {
        return { success: false, message: error.message || "Falha ao ativar campanha promocional." };
      }

      return data as { success: boolean; message: string; trial_ends_at?: string; total_days?: number };
    } catch (err: any) {
      return { success: false, message: err.message || "Erro de conexão ao ativar campanha." };
    }
  },

  // ==========================================
  // MÉTODOS EXCLUSIVOS DO ADMINISTRADOR MASTER
  // ==========================================

  /**
   * Lista todos os cupons/campanhas para o painel de administração
   */
  async listAdminCoupons(): Promise<CouponItem[]> {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar cupons admin:", error);
      throw error;
    }

    return (data || []) as CouponItem[];
  },

  /**
   * Cria um novo cupom ou campanha promocional
   */
  async createCoupon(payload: Omit<CouponItem, "id" | "created_at" | "updated_at" | "redemption_count">): Promise<CouponItem> {
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        description: payload.description || null,
        type: payload.type,
        trial_days: payload.type === "trial_extension" ? (payload.trial_days || 60) : null,
        discount_percent: payload.type === "percent" ? payload.discount_percent : null,
        discount_fixed: payload.type === "fixed" ? payload.discount_fixed : null,
        discount_duration: payload.discount_duration || "once",
        duration_in_months: payload.discount_duration === "repeating" ? payload.duration_in_months : null,
        applicable_plans: payload.applicable_plans || [],
        applicable_billing_cycles: payload.applicable_billing_cycles || [],
        max_redemptions: payload.max_redemptions || 100,
        valid_from: payload.valid_from || new Date().toISOString(),
        valid_until: payload.valid_until || null,
        is_active: payload.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar cupom:", error);
      throw error;
    }

    return data as CouponItem;
  },

  /**
   * Atualiza um cupom existente
   */
  async updateCoupon(id: string, payload: Partial<CouponItem>): Promise<CouponItem> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (payload.code !== undefined) updateData.code = payload.code.trim().toUpperCase();
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.trial_days !== undefined) updateData.trial_days = payload.trial_days;
    if (payload.discount_percent !== undefined) updateData.discount_percent = payload.discount_percent;
    if (payload.discount_fixed !== undefined) updateData.discount_fixed = payload.discount_fixed;
    if (payload.discount_duration !== undefined) updateData.discount_duration = payload.discount_duration;
    if (payload.duration_in_months !== undefined) updateData.duration_in_months = payload.duration_in_months;
    if (payload.applicable_plans !== undefined) updateData.applicable_plans = payload.applicable_plans;
    if (payload.applicable_billing_cycles !== undefined) updateData.applicable_billing_cycles = payload.applicable_billing_cycles;
    if (payload.max_redemptions !== undefined) updateData.max_redemptions = payload.max_redemptions;
    if (payload.valid_from !== undefined) updateData.valid_from = payload.valid_from;
    if (payload.valid_until !== undefined) updateData.valid_until = payload.valid_until;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { data, error } = await supabase
      .from("coupons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar cupom:", error);
      throw error;
    }

    return data as CouponItem;
  },

  /**
   * Alterna status ativo/inativo de um cupom
   */
  async toggleCouponActive(id: string, currentStatus: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Erro ao alternar status do cupom:", error);
      throw error;
    }

    return !currentStatus;
  }
};
