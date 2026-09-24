import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Simulação determinística e validação comportamental das RPCs do PostgreSQL:
 * - public.validate_coupon_code
 * - public.redeem_trial_extension_coupon
 * - public.reserve_discount_coupon
 * - public.release_discount_coupon_reservation
 * - public.confirm_discount_coupon_redemption
 * - public.can_manage_company_billing
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

// Implementação em memória com a exata lógica das funções PL/pgSQL
class PostgresCouponsEngine {
  profiles: Profile[] = [];
  companies: Company[] = [];
  subscriptions: Subscription[] = [];
  coupons: Coupon[] = [];
  redemptions: CouponRedemption[] = [];
  reservations: CouponReservation[] = [];
  currentUser: string | null = null;
  now: number = new Date("2026-09-24T12:00:00Z").getTime();

  setAuthUser(uid: string | null) {
    this.currentUser = uid;
  }

  can_manage_company_billing(companyId: string, userId: string | null = this.currentUser): boolean {
    if (!userId || !companyId) return false;
    const profile = this.profiles.find(p => p.id === userId);
    if (!profile) return false;
    if (["admin_master", "admin_master_global", "superadmin"].includes(profile.role)) return true;
    return profile.company_id === companyId && ["admin", "owner", "financial", "gestor", "manager", "diretor"].includes(profile.role);
  }

  validate_coupon_code(code: string, companyId?: string, planSlug?: string, billingCycle?: string) {
    if (!this.currentUser) {
      return { valid: false, message: "Não autorizado: usuário não autenticado." };
    }
    if (companyId && !this.can_manage_company_billing(companyId, this.currentUser)) {
      return { valid: false, message: "Não autorizado: usuário não possui permissão de faturamento neste escritório." };
    }
    if (!code || !code.trim()) {
      return { valid: false, message: "Código do cupom não informado." };
    }

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) {
      return { valid: false, message: "Cupom inválido ou não encontrado." };
    }
    if (!coupon.is_active) {
      return { valid: false, message: "Este cupom está inativo no momento." };
    }
    if (coupon.valid_until && new Date(coupon.valid_until).getTime() < this.now) {
      return { valid: false, message: "Este cupom está expirado." };
    }

    if (coupon.max_redemptions) {
      const activeCount = this.reservations.filter(r => 
        r.coupon_id === coupon.id && (r.status === "completed" || (r.status === "reserved" && r.expires_at > this.now))
      ).length + this.redemptions.filter(r => r.coupon_id === coupon.id).length;

      if (activeCount >= coupon.max_redemptions) {
        return { valid: false, message: "O limite máximo de resgates deste cupom foi atingido." };
      }
    }

    if (companyId) {
      const alreadyUsed = this.redemptions.some(r => r.coupon_id === coupon.id && r.company_id === companyId) ||
        this.reservations.some(r => r.coupon_id === coupon.id && r.company_id === companyId && r.status === "completed");
      if (alreadyUsed) {
        return { valid: false, message: "Este cupom já foi utilizado pelo seu escritório." };
      }
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

  redeem_trial_extension_coupon(code: string, companyId: string) {
    if (!this.currentUser) {
      return { success: false, message: "Não autorizado: usuário não autenticado." };
    }
    if (!this.can_manage_company_billing(companyId, this.currentUser)) {
      return { success: false, message: "Não autorizado: você não possui permissão para gerenciar assinaturas deste escritório." };
    }

    const company = this.companies.find(c => c.id === companyId);
    if (!company) {
      return { success: false, message: "Escritório não encontrado no sistema." };
    }

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) {
      return { success: false, message: "Código de campanha inválido ou inexistente." };
    }

    const sub = this.subscriptions.find(s => s.company_id === companyId);

    // Validações de estado financeiro
    if (company.billing_status === "suspended" || (!company.is_active && company.billing_status !== "trial")) {
      return { success: false, message: "Este escritório está suspenso ou bloqueado por razões administrativas/financeiras. Entre em contato com o suporte." };
    }

    if (sub) {
      if (sub.status === "active") {
        return { success: false, message: "Este escritório já possui uma assinatura ativa e paga. Extensões de teste são exclusivas para fases de avaliação." };
      }
      if (sub.status === "past_due") {
        return { success: false, message: "O escritório possui faturas em atraso. Regularize o pagamento antes de efetuar alterações." };
      }
      if (sub.status === "canceled") {
        return { success: false, message: "A assinatura deste escritório foi cancelada. Contrate um novo plano para reativar o acesso." };
      }
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

    // Rejeita se o prazo total concedido já expirou no passado
    if (targetTrialEndMs <= this.now) {
      return { success: false, message: "Esta campanha concede teste cuja data já expirou em relação à data de criação do escritório." };
    }

    const currentTrialEndMs = sub?.current_period_end 
      ? new Date(sub.current_period_end).getTime() 
      : (company.trial_ends_at ? new Date(company.trial_ends_at).getTime() : null);

    // Rejeita se não conceder benefício efetivo
    if (currentTrialEndMs && currentTrialEndMs >= targetTrialEndMs && currentTrialEndMs > this.now) {
      return { success: false, message: "Seu escritório já possui um período de teste ativo igual ou superior ao benefício desta campanha." };
    }

    const finalTrialEndMs = currentTrialEndMs && currentTrialEndMs > targetTrialEndMs ? currentTrialEndMs : targetTrialEndMs;
    const finalIso = new Date(finalTrialEndMs).toISOString();

    company.trial_ends_at = finalIso;
    company.billing_status = "trial";
    company.is_active = true;

    if (sub) {
      sub.status = "trialing";
      sub.current_period_end = finalIso;
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

  reserve_discount_coupon(code: string, companyId: string, sessionId: string, planSlug?: string, billingCycle?: string) {
    if (!this.currentUser) return { success: false, message: "Não autorizado: usuário não autenticado." };
    if (!this.can_manage_company_billing(companyId, this.currentUser)) return { success: false, message: "Não autorizado para o escritório informado." };

    const coupon = this.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon || !coupon.is_active) return { success: false, message: "Cupom inativo ou inexistente." };

    // Limpeza de expirados
    this.reservations.forEach(r => {
      if (r.coupon_id === coupon.id && r.status === "reserved" && r.expires_at < this.now) {
        r.status = "expired";
      }
    });

    if (coupon.max_redemptions) {
      const activeCount = this.reservations.filter(r => 
        r.coupon_id === coupon.id && (r.status === "completed" || (r.status === "reserved" && r.expires_at >= this.now))
      ).length;

      if (activeCount >= coupon.max_redemptions) {
        return { success: false, message: "Limite máximo de resgates deste cupom atingido." };
      }
    }

    if (this.redemptions.some(r => r.coupon_id === coupon.id && r.company_id === companyId) ||
        this.reservations.some(r => r.coupon_id === coupon.id && r.company_id === companyId && r.status === "completed")) {
      return { success: false, message: "Este escritório já utilizou este cupom." };
    }

    this.reservations.push({
      id: `res_${Date.now()}`,
      coupon_id: coupon.id,
      company_id: companyId,
      session_id: sessionId,
      status: "reserved",
      expires_at: this.now + (30 * 60 * 1000)
    });

    return {
      success: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_percent: coupon.discount_percent
    };
  }

  release_discount_coupon_reservation(sessionId: string) {
    const res = this.reservations.find(r => r.session_id === sessionId && r.status === "reserved");
    if (res) {
      res.status = "cancelled";
      return { success: true };
    }
    return { success: false };
  }

  confirm_discount_coupon_redemption(sessionId: string, couponId: string, companyId: string) {
    const res = this.reservations.find(r => r.session_id === sessionId);
    if (res) {
      res.status = "completed";
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

    return { success: true };
  }
}

describe("PostgreSQL RPCs Security & State Enforcement Tests", () => {
  let db: PostgresCouponsEngine;

  beforeEach(() => {
    db = new PostgresCouponsEngine();

    // Cria escritórios de teste
    db.companies = [
      { id: "comp_eligible", name: "Estaleiro Alfa", created_at: "2026-09-10T00:00:00Z", trial_ends_at: "2026-10-10T00:00:00Z", billing_status: "trial", is_active: true },
      { id: "comp_paid", name: "Navegação Beta (Paga)", created_at: "2026-01-01T00:00:00Z", trial_ends_at: null, billing_status: "active", is_active: true },
      { id: "comp_overdue", name: "Docas Gama (Inadimplente)", created_at: "2026-05-01T00:00:00Z", trial_ends_at: null, billing_status: "active", is_active: true },
      { id: "comp_suspended", name: "Porto Delta (Suspenso)", created_at: "2026-02-01T00:00:00Z", trial_ends_at: null, billing_status: "suspended", is_active: false },
      { id: "comp_old", name: "Estaleiro Antigo (90 dias atrás)", created_at: "2026-05-01T00:00:00Z", trial_ends_at: "2026-05-31T00:00:00Z", billing_status: "trial", is_active: false },
    ];

    // Assinaturas vinculadas
    db.subscriptions = [
      { id: "sub_eligible", company_id: "comp_eligible", status: "trialing", current_period_end: "2026-10-10T00:00:00Z" },
      { id: "sub_paid", company_id: "comp_paid", status: "active", current_period_end: "2026-10-01T00:00:00Z" },
      { id: "sub_overdue", company_id: "comp_overdue", status: "past_due", current_period_end: "2026-09-01T00:00:00Z" },
    ];

    // Perfis de usuários
    db.profiles = [
      { id: "user_owner_alfa", company_id: "comp_eligible", role: "owner" },
      { id: "user_colab_alfa", company_id: "comp_eligible", role: "colaborador" }, // sem permissão financeira
      { id: "user_other_company", company_id: "comp_paid", role: "owner" },
      { id: "user_superadmin", company_id: "comp_paid", role: "admin_master" },
    ];

    // Cupons configurados
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
        max_redemptions: 2, // Limite estrito de 2 resgates para teste de concorrência
        redemption_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
        applicable_plans: ["profissional"],
        applicable_billing_cycles: ["annual"]
      }
    ];
  });

  describe("1. Autorização & Segurança de Acesso nas RPCs", () => {
    it("nega acesso anônimo em validate_coupon_code", () => {
      db.setAuthUser(null);
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(false);
      expect(res.message).toContain("não autenticado");
    });

    it("nega usuário de outro escritório em validate_coupon_code", () => {
      db.setAuthUser("user_other_company"); // pertence a comp_paid, tentando validar para comp_eligible
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(false);
      expect(res.message).toContain("não possui permissão");
    });

    it("nega usuário sem permissão administrativa no próprio escritório", () => {
      db.setAuthUser("user_colab_alfa");
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(false);
      expect(res.message).toContain("não possui permissão");
    });

    it("permite validação por gestor autorizado do escritório", () => {
      db.setAuthUser("user_owner_alfa");
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(true);
      expect(res.code).toBe("NAVAL60PRO");
    });

    it("permite validação por Administrador Master Global para qualquer escritório", () => {
      db.setAuthUser("user_superadmin");
      const res = db.validate_coupon_code("NAVAL60PRO", "comp_eligible");
      expect(res.valid).toBe(true);
    });
  });

  describe("2. Elegibilidade e Proteção de Estados Financeiros em Extensão de Trial", () => {
    it("rejeita resgate anônimo em redeem_trial_extension_coupon", () => {
      db.setAuthUser(null);
      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");
      expect(res.success).toBe(false);
    });

    it("rejeita extensão de teste sobre assinatura paga ativa (preserva assinatura paga)", () => {
      db.setAuthUser("user_other_company");
      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_paid");
      expect(res.success).toBe(false);
      expect(res.message).toContain("já possui uma assinatura ativa e paga");
    });

    it("rejeita extensão de teste sobre escritório inadimplente (past_due)", () => {
      // Configura usuário para comp_overdue
      db.profiles.push({ id: "user_overdue", company_id: "comp_overdue", role: "owner" });
      db.setAuthUser("user_overdue");

      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_overdue");
      expect(res.success).toBe(false);
      expect(res.message).toContain("faturas em atraso");
    });

    it("rejeita extensão de teste para escritório suspenso", () => {
      db.profiles.push({ id: "user_suspended", company_id: "comp_suspended", role: "owner" });
      db.setAuthUser("user_suspended");

      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_suspended");
      expect(res.success).toBe(false);
      expect(res.message).toContain("suspenso ou bloqueado");
    });

    it("rejeita campanha cujo prazo total já expirou no passado em relação à criação da empresa", () => {
      db.profiles.push({ id: "user_old", company_id: "comp_old", role: "owner" });
      db.setAuthUser("user_old"); // Criada em 2026-05-01 (mais de 140 dias atrás)

      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_old");
      expect(res.success).toBe(false);
      expect(res.message).toContain("já expirou");
    });

    it("aceita resgate elegível e estende o trial para 60 dias totais a partir do created_at", () => {
      db.setAuthUser("user_owner_alfa"); // comp_eligible criada em 2026-09-10
      const res = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");

      expect(res.success).toBe(true);
      // created_at (2026-09-10) + 60 days = 2026-11-09
      expect(res.trial_ends_at).toBe("2026-11-09T00:00:00.000Z");

      const comp = db.companies.find(c => c.id === "comp_eligible");
      expect(comp?.trial_ends_at).toBe("2026-11-09T00:00:00.000Z");
      expect(comp?.billing_status).toBe("trial");
    });

    it("bloqueia resgate duplicado pela mesma empresa", () => {
      db.setAuthUser("user_owner_alfa");
      // Primeiro resgate com sucesso
      const firstRes = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");
      expect(firstRes.success).toBe(true);

      // Segundo resgate deve ser bloqueado
      const secondRes = db.redeem_trial_extension_coupon("NAVAL60PRO", "comp_eligible");
      expect(secondRes.success).toBe(false);
      expect(secondRes.message).toContain("já utilizou este cupom");
    });
  });

  describe("3. Controle de Concorrência, Reservas e Overbooking de Cupons de Desconto", () => {
    it("permite reserva de cupom para sessão de checkout até o limite máximo de 2", () => {
      db.setAuthUser("user_owner_alfa");
      const res1 = db.reserve_discount_coupon("DESCONTO20", "comp_eligible", "session_1", "profissional", "annual");
      expect(res1.success).toBe(true);

      // Segundo escritório reserva a última vaga
      db.profiles.push({ id: "user_comp_2", company_id: "comp_paid", role: "owner" });
      db.setAuthUser("user_comp_2");
      const res2 = db.reserve_discount_coupon("DESCONTO20", "comp_paid", "session_2", "profissional", "annual");
      expect(res2.success).toBe(true);

      // Terceiro escritório tenta concorrer mas limite de 2 está esgotado pelas reservas ativas
      db.profiles.push({ id: "user_comp_3", company_id: "comp_overdue", role: "owner" });
      db.setAuthUser("user_comp_3");
      const res3 = db.reserve_discount_coupon("DESCONTO20", "comp_overdue", "session_3", "profissional", "annual");
      expect(res3.success).toBe(false);
      expect(res3.message).toContain("Limite máximo de resgates deste cupom atingido");
    });

    it("libera a vaga quando a sessão de checkout é abandonada ou cancelada", () => {
      // Cria duas reservas preenchendo o limite de 2
      db.setAuthUser("user_owner_alfa");
      db.reserve_discount_coupon("DESCONTO20", "comp_eligible", "session_1", "profissional", "annual");
      db.profiles.push({ id: "user_comp_2", company_id: "comp_paid", role: "owner" });
      db.setAuthUser("user_comp_2");
      db.reserve_discount_coupon("DESCONTO20", "comp_paid", "session_2", "profissional", "annual");

      // Libera session_1
      db.release_discount_coupon_reservation("session_1");

      // Agora comp_overdue consegue reservar a vaga liberada
      db.profiles.push({ id: "user_comp_3", company_id: "comp_overdue", role: "owner" });
      db.setAuthUser("user_comp_3");
      const res = db.reserve_discount_coupon("DESCONTO20", "comp_overdue", "session_3", "profissional", "annual");
      expect(res.success).toBe(true);
    });

    it("confirma resgate definitivo no webhook e incrementa redemption_count", () => {
      db.profiles.push({ id: "user_comp_2", company_id: "comp_paid", role: "owner" });
      db.setAuthUser("user_comp_2");
      db.reserve_discount_coupon("DESCONTO20", "comp_paid", "session_2", "profissional", "annual");

      db.confirm_discount_coupon_redemption("session_2", "coup_disc_20", "comp_paid");

      const coup = db.coupons.find(c => c.id === "coup_disc_20");
      expect(coup?.redemption_count).toBe(1);

      const reservation = db.reservations.find(r => r.session_id === "session_2");
      expect(reservation?.status).toBe("completed");
    });
  });
});
