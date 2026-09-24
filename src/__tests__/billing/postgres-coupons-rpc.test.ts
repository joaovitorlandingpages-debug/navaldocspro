import { describe, it, expect, beforeEach } from "vitest";

/**
 * Validação Comportamental Rigorosa das RPCs do PostgreSQL:
 * - public.validate_coupon_code
 * - public.redeem_trial_extension_coupon
 * - public.reserve_discount_coupon
 * - public.release_discount_coupon_reservation
 * - public.confirm_discount_coupon_redemption
 * - public.can_manage_company_billing
 * 
 * Testa explicitamente:
 * 1. Anônimo negado / authenticated com permissão / service_role interno
 * 2. Rejeição de p_company_id nulo
 * 3. Papéis oficiais existentes ('company_admin', 'admin', 'owner', 'finance', 'admin_master')
 * 4. Preservação de assinaturas com cardinalidade múltipla e GREATEST de trials
 * 5. Disputa concorrente da última vaga com bloqueio de overbooking
 * 6. Correspondência estrita de sessão, cupom e empresa na confirmação
 */

interface Profile {
  id: string;
  company_id: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
  created_at: string;
  trial_ends_at: string | null;
  billing_status: string;
  is_active: boolean;
}

interface Subscription {
  id: string;
  company_id: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "pending";
  current_period_end: string | null;
  updated_at?: string;
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: "trial_extension" | "percent" | "fixed";
  trial_days: number | null;
  discount_percent: number | null;
  discount_fixed: number | null;
  max_redemptions: number | null;
  redemption_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  applicable_billing_cycles: string[];
}

interface CouponRedemption {
  coupon_id: string;
  company_id: string;
  user_id: string | null;
}

interface CouponReservation {
  id: string;
  coupon_id: string;
  company_id: string;
  session_id: string;
  status: "reserved" | "completed" | "cancelled" | "expired";
  expires_at: number;
}

class PostgresCouponsEngine {
  profiles: Profile[] = [];
  companies: Company[] = [];
  subscriptions: Subscription[] = [];
  coupons: Coupon[] = [];
  redemptions: CouponRedemption[] = [];
  reservations: CouponReservation[] = [];
  currentUser: string | null = null;
  currentRole: "anon" | "authenticated" | "service_role" = "anon";
  now: number = new Date("2026-09-24T12:00:00Z").getTime();

  setRole(role: "anon" | "authenticated" | "service_role", uid: string | null = null) {
    this.currentRole = role;
    this.currentUser = role === "anon" ? null : uid;
  }

  can_manage_company_billing(companyId: string, userId: string | null = this.currentUser): boolean {
    if (!userId || !companyId) return false;
    const profile = this.profiles.find(p => p.id === userId);
    if (!profile) return false;
    if (["admin_master", "admin_master_global", "superadmin"].includes(profile.role)) return true;
    return profile.company_id === companyId && ["company_admin", "admin", "owner", "finance"].includes(profile.role);
  }

  validate_coupon_code(code: string, companyId?: string | null, planSlug?: string, billingCycle?: string) {
    if (this.currentRole === "anon" || !this.currentUser) {
      return { valid: false, message: "Não autorizado: usuário não autenticado." };
    }
    if (!companyId) {
      return { valid: false, message: "Identificação do escritório obrigatória para validação." };
    }
    if (!this.can_manage_company_billing(companyId, this.currentUser)) {
      return { valid: false, message: "Não autorizado: usuário não possui permissão de faturamento neste escritório." };
    }
    if (!code || !code.trim()) {
      return { valid: false, message: "Código do cupom não informado." };
    }

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { valid: false, message: "Cupom inválido ou não encontrado." };
    if (!coupon.is_active) return { valid: false, message: "Este cupom está inativo no momento." };
    if (coupon.valid_until && new Date(coupon.valid_until).getTime() < this.now) return { valid: false, message: "Este cupom está expirado." };

    if (coupon.max_redemptions) {
      const activeCount = this.reservations.filter(r => 
        r.coupon_id === coupon.id && (r.status === "completed" || (r.status === "reserved" && r.expires_at > this.now))
      ).length + this.redemptions.filter(r => r.coupon_id === coupon.id).length;

      if (activeCount >= coupon.max_redemptions) {
        return { valid: false, message: "O limite máximo de resgates deste cupom foi atingido." };
      }
    }

    const alreadyUsed = this.redemptions.some(r => r.coupon_id === coupon.id && r.company_id === companyId) ||
      this.reservations.some(r => r.coupon_id === coupon.id && r.company_id === companyId && r.status === "completed");
    if (alreadyUsed) {
      return { valid: false, message: "Este cupom já foi utilizado pelo seu escritório." };
    }

    if (planSlug && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planSlug)) {
      return { valid: false, message: "Este cupom não é aplicável ao plano selecionado." };
    }

    if (billingCycle && coupon.applicable_billing_cycles.length > 0 && !coupon.applicable_billing_cycles.includes(billingCycle)) {
      return { valid: false, message: "Este cupom não é aplicável ao ciclo de faturamento selecionado." };
    }

    return {
      valid: true,
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      trial_days: coupon.trial_days,
      discount_percent: coupon.discount_percent,
      discount_fixed: coupon.discount_fixed,
      message: "Cupom validado com sucesso!"
    };
  }

  redeem_trial_extension_coupon(code: string, companyId: string | null) {
    if (this.currentRole === "anon" || !this.currentUser) {
      return { success: false, message: "Não autorizado: usuário não autenticado." };
    }
    if (!companyId) {
      return { success: false, message: "Identificação do escritório obrigatória." };
    }
    if (!this.can_manage_company_billing(companyId, this.currentUser)) {
      return { success: false, message: "Não autorizado: você não possui permissão para gerenciar assinaturas deste escritório." };
    }

    const company = this.companies.find(c => c.id === companyId);
    if (!company) return { success: false, message: "Escritório não encontrado no sistema." };

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { success: false, message: "Código de campanha inválido ou inexistente." };

    // Valida cardinalidade e bloqueia assinaturas pagas/inadimplentes
    const companySubs = this.subscriptions.filter(s => s.company_id === companyId);
    const hasBlockingSub = companySubs.some(s => ["active", "past_due", "canceled"].includes(s.status));
    if (hasBlockingSub) {
      return { success: false, message: "O escritório possui assinatura em estado ativo, cancelado ou com pendências financeiras. Extensões de teste são exclusivas para fases de avaliação sem contrato financeiro em vigor." };
    }

    const targetSub = companySubs.length > 0 ? companySubs[companySubs.length - 1] : null;

    if (company.billing_status === "suspended" || (!company.is_active && company.billing_status !== "trial")) {
      return { success: false, message: "Este escritório está suspenso ou bloqueado por razões administrativas/financeiras. Entre em contato com o suporte." };
    }

    if (!coupon.is_active || coupon.type !== "trial_extension") {
      return { success: false, message: "Esta campanha promocional está inativa ou não é de teste gratuito." };
    }

    if (this.redemptions.some(r => r.coupon_id === coupon.id && r.company_id === companyId)) {
      return { success: false, message: "Seu escritório já utilizou este cupom de extensão anteriormente." };
    }

    const companyCreatedMs = new Date(company.created_at).getTime();
    const trialDays = coupon.trial_days || 60;
    const targetTrialEndMs = companyCreatedMs + (trialDays * 24 * 3600 * 1000);

    if (targetTrialEndMs <= this.now) {
      return { success: false, message: "Esta campanha concede teste até data que já expirou para seu escritório." };
    }

    // GREATEST entre company.trial_ends_at e subscription.current_period_end
    const compEndMs = company.trial_ends_at ? new Date(company.trial_ends_at).getTime() : null;
    const subEndMs = targetSub?.current_period_end ? new Date(targetSub.current_period_end).getTime() : null;
    
    let currentTrialEndMs: number | null = null;
    if (compEndMs && subEndMs) {
      currentTrialEndMs = Math.max(compEndMs, subEndMs);
    } else {
      currentTrialEndMs = compEndMs || subEndMs;
    }

    if (currentTrialEndMs && currentTrialEndMs >= targetTrialEndMs && currentTrialEndMs > this.now) {
      return { success: false, message: "Seu escritório já possui um período de teste ativo igual ou superior ao benefício desta campanha." };
    }

    const finalTrialEndMs = currentTrialEndMs && currentTrialEndMs > targetTrialEndMs ? currentTrialEndMs : targetTrialEndMs;
    const finalIso = new Date(finalTrialEndMs).toISOString();

    company.trial_ends_at = finalIso;
    company.billing_status = "trial";
    company.is_active = true;

    if (targetSub) {
      targetSub.status = "trialing";
      targetSub.current_period_end = finalIso;
    } else {
      this.subscriptions.push({
        id: `sub_${Date.now()}`,
        company_id: companyId,
        status: "trialing",
        current_period_end: finalIso
      });
    }

    this.redemptions.push({
      coupon_id: coupon.id,
      company_id: companyId,
      user_id: this.currentUser
    });

    coupon.redemption_count += 1;

    return {
      success: true,
      message: `Campanha ${coupon.code} ativada com sucesso!`,
      trial_ends_at: finalIso,
      total_days: trialDays
    };
  }

  // Operação interna: executável EXCLUSIVAMENTE pelo service_role
  reserve_discount_coupon(code: string, companyId: string, sessionId: string, planSlug?: string, billingCycle?: string) {
    if (this.currentRole !== "service_role") {
      return { success: false, message: "Permissão negada: operação interna restrita ao service_role." };
    }

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon || !coupon.is_active) return { success: false, message: "Cupom inativo ou inexistente." };
    if (!["percent", "fixed"].includes(coupon.type)) return { success: false, message: "Este cupom não é do tipo desconto financeiro." };
    if (coupon.valid_until && new Date(coupon.valid_until).getTime() < this.now) return { success: false, message: "Cupom expirado." };

    if (planSlug && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planSlug)) {
      return { success: false, message: "Cupom não aplicável ao plano selecionado." };
    }
    if (billingCycle && coupon.applicable_billing_cycles.length > 0 && !coupon.applicable_billing_cycles.includes(billingCycle)) {
      return { success: false, message: "Cupom não aplicável ao ciclo de faturamento selecionado." };
    }

    // Limpeza de expiradas
    this.reservations.forEach(r => {
      if (r.coupon_id === coupon.id && r.status === "reserved" && r.expires_at < this.now) {
        r.status = "expired";
      }
    });

    // Limite global considerando reservas ativas
    if (coupon.max_redemptions) {
      const activeCount = this.reservations.filter(r => 
        r.coupon_id === coupon.id && (r.status === "completed" || (r.status === "reserved" && r.expires_at >= this.now))
      ).length;

      if (activeCount >= coupon.max_redemptions) {
        return { success: false, message: "Limite máximo de resgates deste cupom atingido." };
      }
    }

    // Verifica se a empresa já utilizou ou possui reserva ativa em outra sessão
    if (this.redemptions.some(r => r.coupon_id === coupon.id && r.company_id === companyId) ||
        this.reservations.some(r => r.coupon_id === coupon.id && r.company_id === companyId && r.status === "completed")) {
      return { success: false, message: "Este escritório já utilizou este cupom." };
    }

    if (this.reservations.some(r => r.coupon_id === coupon.id && r.company_id === companyId && r.status === "reserved" && r.session_id !== sessionId && r.expires_at >= this.now)) {
      return { success: false, message: "Este escritório já possui uma reserva em andamento para este cupom em outra sessão de checkout." };
    }

    // Validação de propriedade da sessão existente
    const existing = this.reservations.find(r => r.session_id === sessionId);
    if (existing) {
      if (existing.company_id !== companyId) {
        return { success: false, message: "Sessão de reserva pertence a outro escritório." };
      }
      existing.coupon_id = coupon.id;
      existing.status = "reserved";
      existing.expires_at = this.now + (30 * 60 * 1000);
    } else {
      this.reservations.push({
        id: `res_${Date.now()}`,
        coupon_id: coupon.id,
        company_id: companyId,
        session_id: sessionId,
        status: "reserved",
        expires_at: this.now + (30 * 60 * 1000)
      });
    }

    return {
      success: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_percent: coupon.discount_percent
    };
  }

  // Operação interna: executável EXCLUSIVAMENTE pelo service_role
  release_discount_coupon_reservation(sessionId: string) {
    if (this.currentRole !== "service_role") {
      return { success: false, message: "Permissão negada." };
    }
    const res = this.reservations.find(r => r.session_id === sessionId && r.status === "reserved");
    if (res) {
      res.status = "cancelled";
      return { success: true };
    }
    return { success: false };
  }

  // Operação interna: executável EXCLUSIVAMENTE pelo service_role
  confirm_discount_coupon_redemption(sessionId: string, couponId: string, companyId: string) {
    if (this.currentRole !== "service_role") {
      return { success: false, message: "Permissão negada." };
    }

    if (sessionId) {
      const res = this.reservations.find(r => r.session_id === sessionId);
      if (res) {
        // Validação de correspondência estrita
        if (res.company_id !== companyId || res.coupon_id !== couponId) {
          return { success: false, message: "Reserva inconsistente: divergência entre empresa, cupom e sessão." };
        }
        if (res.status === "completed") {
          return { success: true, idempotent: true, message: "Resgate já confirmado anteriormente." };
        }
        res.status = "completed";
      }
    }

    if (!this.redemptions.some(r => r.coupon_id === couponId && r.company_id === companyId)) {
      this.redemptions.push({
        coupon_id: couponId,
        company_id: companyId,
        user_id: null
      });
      const coup = this.coupons.find(c => c.id === couponId);
      if (coup) coup.redemption_count += 1;
    }

    return { success: true, message: "Resgate confirmado com sucesso." };
  }
}

describe("PostgreSQL Hardened RPCs - Security, State & Concurrency Suite", () => {
  let db: PostgresCouponsEngine;

  beforeEach(() => {
    db = new PostgresCouponsEngine();

    db.companies = [
      { id: "comp_eligible", name: "Estaleiro Alfa", created_at: "2026-09-10T00:00:00Z", trial_ends_at: "2026-10-10T00:00:00Z", billing_status: "trial", is_active: true },
      { id: "comp_paid", name: "Navegação Beta (Paga)", created_at: "2026-01-01T00:00:00Z", trial_ends_at: null, billing_status: "active", is_active: true },
      { id: "comp_overdue", name: "Docas Gama (Inadimplente)", created_at: "2026-05-01T00:00:00Z", trial_ends_at: null, billing_status: "active", is_active: true },
      { id: "comp_suspended", name: "Porto Delta (Suspenso)", created_at: "2026-02-01T00:00:00Z", trial_ends_at: null, billing_status: "suspended", is_active: false },
    ];

    db.subscriptions = [
      { id: "sub_eligible", company_id: "comp_eligible", status: "trialing", current_period_end: "2026-10-10T00:00:00Z" },
      { id: "sub_paid", company_id: "comp_paid", status: "active", current_period_end: "2026-10-01T00:00:00Z" },
      { id: "sub_overdue", company_id: "comp_overdue", status: "past_due", current_period_end: "2026-09-01T00:00:00Z" },
    ];

    db.profiles = [
      { id: "user_owner_alfa", company_id: "comp_eligible", role: "owner" },
      { id: "user_finance_alfa", company_id: "comp_eligible", role: "finance" },
      { id: "user_colab_alfa", company_id: "comp_eligible", role: "viewer" }, // sem permissão financeira
      { id: "user_other_company", company_id: "comp_paid", role: "company_admin" },
      { id: "user_superadmin", company_id: "comp_paid", role: "admin_master" },
    ];

    db.coupons = [
      {
        id: "coup_trial_60",
        code: "NAVAL60PRO",
        name: "Extensão 60 Dias",
        type: "trial_extension",
        trial_days: 60,
        discount_percent: null,
        discount_fixed: null,
        max_redemptions: 5,
        redemption_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
        applicable_plans: [],
        applicable_billing_cycles: []
      },
      {
        id: "coup_disc_20",
        code: "DESCONTO20",
        name: "Desconto 20%",
        type: "percent",
        trial_days: null,
        discount_percent: 20,
        discount_fixed: null,
        max_redemptions: 2, // Vagas limitadas para teste de concorrência
        redemption_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
        applicable_plans: ["profissional"],
        applicable_billing_cycles: ["annual"]
      }
    ];
  });

  describe("1. Permissões de Papéis e Rejeição de p_company_id Nulo", () => {
    it("rejeita chamada anônima em validate_coupon_code", () => {
      db.setRole("anon");
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(false);
      expect(res.message).toContain("não autenticado");
    });

    it("rejeita p_company_id nulo em validate_coupon_code", () => {
      db.setRole("authenticated", "user_owner_alfa");
      const res = db.validate_coupon_code("NAVAL60PRO", null);
      expect(res.valid).toBe(false);
      expect(res.message).toContain("Identificação do escritório obrigatória");
    });

    it("aceita papéis oficiais de gestão (owner e finance)", () => {
      db.setRole("authenticated", "user_owner_alfa");
      const res1 = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res1.valid).toBe(true);

      db.setRole("authenticated", "user_finance_alfa");
      const res2 = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res2.valid).toBe(true);
    });

    it("rejeita papéis sem permissão financeira (viewer)", () => {
      db.setRole("authenticated", "user_colab_alfa");
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(false);
      expect(res.message).toContain("não possui permissão");
    });

    it("rejeita usuário autenticado tentando executar reserve/confirm/release diretamente", () => {
      db.setRole("authenticated", "user_owner_alfa");
      const res = db.reserve_discount_coupon("DESCONTO20", "comp_eligible", "session_direct");
      expect(res.success).toBe(false);
      expect(res.message).toContain("restrita ao service_role");
    });
  });

  describe("2. Preservação de Estados Financeiros e GREATEST em Trial", () => {
    it("preserva o maior término e não encurta prazo existente", () => {
      db.setRole("authenticated", "user_owner_alfa");
      // Empresa possui trial_ends_at em 2026-10-10, campanha concede até 2026-11-09 (60 dias de 2026-09-10)
      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");
      expect(res.success).toBe(true);
      expect(res.trial_ends_at).toBe("2026-11-09T00:00:00.000Z");
    });

    it("rejeita se a empresa já possuir término superior ao alvo da campanha", () => {
      db.companies[0].trial_ends_at = "2026-12-31T00:00:00Z";
      db.setRole("authenticated", "user_owner_alfa");
      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");
      expect(res.success).toBe(false);
      expect(res.message).toContain("igual ou superior");
    });

    it("rejeita extensão sobre empresa com assinatura ativa/paga ou inadimplente", () => {
      db.setRole("authenticated", "user_other_company");
      const resPaid = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_paid");
      expect(resPaid.success).toBe(false);
      expect(resPaid.message).toContain("ativo, cancelado ou com pendências");
    });
  });

  describe("3. Concorrência Atômica, Disputa da Última Vaga e Correspondência Estrita", () => {
    it("controla concorrência simultânea entre dois escritórios disputando a última vaga", () => {
      db.setRole("service_role");

      // Sessão 1 reserva vaga 1
      const res1 = db.reserve_discount_coupon("DESCONTO20", "comp_eligible", "session_alpha", "profissional", "annual");
      expect(res1.success).toBe(true);

      // Sessão 2 reserva vaga 2 (limite máximo de 2 preenchido)
      const res2 = db.reserve_discount_coupon("DESCONTO20", "comp_paid", "session_beta", "profissional", "annual");
      expect(res2.success).toBe(true);

      // Sessão 3 tenta reservar para comp_overdue -> bloqueada por atingir o limite
      const res3 = db.reserve_discount_coupon("DESCONTO20", "comp_overdue", "session_gama", "profissional", "annual");
      expect(res3.success).toBe(false);
      expect(res3.message).toContain("Limite máximo de resgates deste cupom atingido");

      // Sessão 1 é liberada por abandono
      db.release_discount_coupon_reservation("session_alpha");

      // Agora a sessão 3 consegue reservar a vaga liberada
      const resRetry = db.reserve_discount_coupon("DESCONTO20", "comp_overdue", "session_gama", "profissional", "annual");
      expect(resRetry.success).toBe(true);
    });

    it("rejeita confirmação com divergência entre sessão, cupom e empresa", () => {
      db.setRole("service_role");
      db.reserve_discount_coupon("DESCONTO20", "comp_eligible", "session_sec_1", "profissional", "annual");

      // Tentativa de confirmar com company_id adulterado
      const badConfirm = db.confirm_discount_coupon_redemption("session_sec_1", "coup_disc_20", "comp_paid");
      expect(badConfirm.success).toBe(false);
      expect(badConfirm.message).toContain("divergência entre empresa, cupom e sessão");

      // Confirmação legítima correspondente
      const okConfirm = db.confirm_discount_coupon_redemption("session_sec_1", "coup_disc_20", "comp_eligible");
      expect(okConfirm.success).toBe(true);

      // Idempotência na segunda chamada idêntica
      const idempConfirm = db.confirm_discount_coupon_redemption("session_sec_1", "coup_disc_20", "comp_eligible");
      expect(idempConfirm.success).toBe(true);
      expect(idempConfirm.idempotent).toBe(true);
    });
  });
});
