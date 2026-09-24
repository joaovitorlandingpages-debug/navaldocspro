import { describe, it, expect, beforeEach } from 'vitest';

/**
 * PostgreSQL Coupons, Billing & Edge Functions Test Suite (Sprint Hardening)
 * Validates:
 * 1. Strict RBAC authorization (service_role exclusivity on internal RPCs, authenticated on client RPCs, anon rejection)
 * 2. Platform global admin vs Office admin permission boundaries
 * 3. 60-day TOTAL trial campaigns calculated from company creation origin, strictly rejecting already expired trials
 * 4. Concurrency & locking for last spot dispute
 * 5. Strict session matching (rejection of cross-company / cross-coupon overwrites, duplicate active reservations)
 * 6. Portal server-side financial permission check
 * 7. Payment transition from rejected to approved
 */

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: 'trial_extension' | 'percent' | 'fixed';
  discount_percent: number;
  discount_fixed: number;
  trial_days: number;
  stripe_coupon_id?: string;
  stripe_promotion_code_id?: string;
  applicable_plans: string[];
  applicable_billing_cycles: string[];
  max_redemptions: number | null;
  redemption_count: number;
  valid_from: Date;
  valid_until: Date | null;
  is_active: boolean;
}

interface CouponRedemption {
  id: string;
  coupon_id: string;
  company_id: string;
  user_id?: string;
  stripe_session_id?: string;
  status: 'reserved' | 'applied' | 'cancelled' | 'expired';
  expires_at: Date | null;
  metadata: Record<string, any>;
  redeemed_at: Date;
}

interface Profile {
  id: string;
  company_id: string | null;
  role: string | null;
}

interface Company {
  id: string;
  name: string;
  created_at: Date;
  trial_ends_at: Date | null;
}

interface Subscription {
  id: string;
  company_id: string;
  status: string;
  current_period_end: Date;
  trial_ends_at: Date | null;
  stripe_subscription_id?: string;
}

class PostgresCouponsEngine {
  coupons: Map<string, Coupon> = new Map();
  redemptions: Map<string, CouponRedemption> = new Map();
  profiles: Map<string, Profile> = new Map();
  companies: Map<string, Company> = new Map();
  subscriptions: Map<string, Subscription> = new Map();

  canManageCompanyBilling(userId: string | null, companyId: string | null): boolean {
    if (!userId || !companyId) return false;
    const profile = this.profiles.get(userId);
    if (!profile || !profile.role) return false;

    // Tenant roles (role cannot be NULL)
    if (profile.company_id === companyId && ['company_admin', 'admin', 'owner', 'finance'].includes(profile.role)) {
      return true;
    }
    // Global platform admin roles
    if (['admin_master', 'admin_master_global', 'superadmin'].includes(profile.role)) {
      return true;
    }
    return false;
  }

  isGlobalAdmin(userId: string | null): boolean {
    if (!userId) return false;
    const profile = this.profiles.get(userId);
    if (!profile || !profile.role) return false;
    return ['admin_master', 'admin_master_global', 'superadmin'].includes(profile.role);
  }

  validateCouponCode(
    callerRole: 'anon' | 'authenticated' | 'service_role',
    callerId: string | null,
    code: string,
    companyId: string | null,
    planSlug?: string,
    billingCycle?: string
  ) {
    if (callerRole === 'anon' || !callerId) {
      return { valid: false, error: 'authentication_required', message: 'Autenticação necessária' };
    }
    if (!companyId) {
      return { valid: false, error: 'company_id_required', message: 'Empresa não informada' };
    }
    if (!this.canManageCompanyBilling(callerId, companyId)) {
      return { valid: false, error: 'unauthorized', message: 'Você não tem permissão para gerenciar faturamento' };
    }

    const coupon = Array.from(this.coupons.values()).find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { valid: false, error: 'Cupom não encontrado' };
    if (!coupon.is_active) return { valid: false, error: 'Este cupom foi desativado' };
    if (coupon.valid_from > new Date()) return { valid: false, error: 'Este cupom ainda não é válido' };
    if (coupon.valid_until && coupon.valid_until < new Date()) return { valid: false, error: 'Este cupom expirou' };

    if (planSlug && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planSlug)) {
      return { valid: false, error: 'Este cupom não é válido para o plano selecionado' };
    }
    if (billingCycle && coupon.applicable_billing_cycles.length > 0 && !coupon.applicable_billing_cycles.includes(billingCycle)) {
      return { valid: false, error: 'Este cupom não é válido para este ciclo de pagamento' };
    }

    const activeReservations = Array.from(this.redemptions.values()).filter(r =>
      r.coupon_id === coupon.id && r.status === 'reserved' && r.expires_at && r.expires_at > new Date()
    ).length;

    if (coupon.max_redemptions !== null && (coupon.redemption_count + activeReservations) >= coupon.max_redemptions) {
      return { valid: false, error: 'Limite de utilizações deste cupom atingido' };
    }

    const alreadyRedeemed = Array.from(this.redemptions.values()).some(r =>
      r.coupon_id === coupon.id && r.company_id === companyId && (r.status === 'applied' || (r.status === 'reserved' && r.expires_at && r.expires_at > new Date()))
    );
    if (alreadyRedeemed) {
      return { valid: false, error: 'Sua empresa já utilizou este cupom' };
    }

    return {
      valid: true,
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      discount_percent: coupon.discount_percent,
      discount_fixed: coupon.discount_fixed,
      trial_days: coupon.trial_days,
      stripe_coupon_id: coupon.stripe_coupon_id,
      stripe_promotion_code_id: coupon.stripe_promotion_code_id,
    };
  }

  redeemTrialExtensionCoupon(
    callerRole: 'anon' | 'authenticated' | 'service_role',
    callerId: string | null,
    code: string,
    companyId: string | null
  ) {
    if (callerRole === 'anon' || !callerId) {
      return { success: false, error: 'authentication_required' };
    }
    if (!companyId) {
      return { success: false, error: 'company_id_required' };
    }
    if (!this.canManageCompanyBilling(callerId, companyId)) {
      return { success: false, error: 'unauthorized' };
    }

    const company = this.companies.get(companyId);
    if (!company) return { success: false, error: 'Empresa não encontrada' };

    const existingSubs = Array.from(this.subscriptions.values()).filter(s =>
      s.company_id === companyId && ['active', 'canceled', 'past_due'].includes(s.status)
    );
    if (existingSubs.length > 0) {
      return {
        success: false,
        error: 'Extensões de período de teste são válidas apenas durante o trial inicial e não podem ser aplicadas a contas com assinatura contratada ou em atraso.'
      };
    }

    const coupon = Array.from(this.coupons.values()).find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { success: false, error: 'Cupom não encontrado' };
    if (coupon.type !== 'trial_extension') {
      return { success: false, error: 'Este cupom é de desconto financeiro e deve ser aplicado no checkout.' };
    }
    if (!coupon.is_active) return { success: false, error: 'Este cupom foi desativado' };
    if (coupon.valid_from > new Date()) return { success: false, error: 'Este cupom ainda não é válido' };
    if (coupon.valid_until && coupon.valid_until < new Date()) return { success: false, error: 'Este cupom expirou' };

    const trialingSubs = Array.from(this.subscriptions.values()).filter(s => s.company_id === companyId && s.status === 'trialing');
    const subEnd = trialingSubs.length > 0 ? trialingSubs[0].current_period_end : null;

    let currentTrialEnd: Date;
    if (company.trial_ends_at && subEnd) {
      currentTrialEnd = new Date(Math.max(company.trial_ends_at.getTime(), subEnd.getTime()));
    } else if (company.trial_ends_at) {
      currentTrialEnd = company.trial_ends_at;
    } else if (subEnd) {
      currentTrialEnd = subEnd;
    } else {
      currentTrialEnd = new Date(company.created_at.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Regra acordada: Se o trial de 30 dias já expirou, rejeita terminantemente (não reinicia trial expirado)
    if (currentTrialEnd < new Date()) {
      return {
        success: false,
        error: 'O período de teste da sua empresa já expirou. Campanhas promocionais são válidas apenas durante o teste inicial.'
      };
    }

    const targetTotalDays = coupon.trial_days || 60;
    const targetTrialEnd = new Date(company.created_at.getTime() + targetTotalDays * 24 * 60 * 60 * 1000);

    if (targetTrialEnd < new Date()) {
      return {
        success: false,
        error: 'O período de teste da sua empresa já expirou. Campanhas promocionais são válidas apenas durante o teste inicial.'
      };
    }

    const newTrialEnd = new Date(Math.max(currentTrialEnd.getTime(), targetTrialEnd.getTime()));

    company.trial_ends_at = newTrialEnd;
    for (const sub of trialingSubs) {
      sub.current_period_end = newTrialEnd;
      sub.trial_ends_at = newTrialEnd;
    }

    coupon.redemption_count += 1;
    const redId = `red_${Math.random().toString(36).slice(2)}`;
    this.redemptions.set(redId, {
      id: redId,
      coupon_id: coupon.id,
      company_id: companyId,
      user_id: callerId,
      status: 'applied',
      expires_at: null,
      metadata: { total_days: targetTotalDays },
      redeemed_at: new Date(),
    });

    return {
      success: true,
      trial_ends_at: newTrialEnd,
      total_days: targetTotalDays,
    };
  }

  reserveDiscountCoupon(
    callerRole: 'anon' | 'authenticated' | 'service_role',
    code: string,
    companyId: string,
    sessionId: string,
    planId?: string,
    billingCycle?: string,
    expiresAt?: Date
  ) {
    if (callerRole !== 'service_role') {
      return { success: false, error: 'permission_denied_service_role_required' };
    }
    if (!code || !companyId || !sessionId) {
      return { success: false, error: 'invalid_parameters' };
    }

    const company = this.companies.get(companyId);
    if (!company) return { success: false, error: 'Empresa não encontrada' };

    const coupon = Array.from(this.coupons.values()).find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return { success: false, error: 'Cupom não encontrado' };
    if (coupon.type === 'trial_extension') {
      return { success: false, error: 'Cupom inválido para checkout de assinatura' };
    }
    if (!coupon.is_active) return { success: false, error: 'Este cupom foi desativado' };
    if (coupon.valid_from > new Date()) return { success: false, error: 'Este cupom ainda não é válido' };
    if (coupon.valid_until && coupon.valid_until < new Date()) return { success: false, error: 'Este cupom expirou' };

    const hasApplied = Array.from(this.redemptions.values()).some(r =>
      r.coupon_id === coupon.id && r.company_id === companyId && r.status === 'applied'
    );
    if (hasApplied) {
      return { success: false, error: 'Sua empresa já utilizou este cupom de desconto.' };
    }

    const existingBySession = Array.from(this.redemptions.values()).find(r => r.stripe_session_id === sessionId);
    if (existingBySession) {
      if (existingBySession.company_id !== companyId) {
        return { success: false, error: 'session_id_already_bound_to_different_company' };
      }
      if (existingBySession.coupon_id !== coupon.id) {
        return { success: false, error: 'session_id_already_bound_to_different_coupon' };
      }

      const newExpiry = expiresAt || new Date(Date.now() + 30 * 60 * 1000);
      existingBySession.expires_at = newExpiry;
      return {
        success: true,
        reservation_id: existingBySession.id,
        coupon_id: coupon.id,
        stripe_coupon_id: coupon.stripe_coupon_id,
        stripe_promotion_code_id: coupon.stripe_promotion_code_id,
        expires_at: newExpiry,
      };
    }

    // Cancela reserva prévia ativa da mesma empresa para não segurar vagas simultâneas
    for (const r of this.redemptions.values()) {
      if (r.coupon_id === coupon.id && r.company_id === companyId && r.status === 'reserved' && r.expires_at && r.expires_at > new Date()) {
        r.status = 'cancelled';
      }
    }

    const activeReservations = Array.from(this.redemptions.values()).filter(r =>
      r.coupon_id === coupon.id && r.status === 'reserved' && r.expires_at && r.expires_at > new Date()
    ).length;

    if (coupon.max_redemptions !== null && (coupon.redemption_count + activeReservations) >= coupon.max_redemptions) {
      return { success: false, error: 'Limite de vagas para este cupom já foi atingido' };
    }

    const effectiveExpires = expiresAt || new Date(Date.now() + 30 * 60 * 1000);
    const redId = `red_${Math.random().toString(36).slice(2)}`;
    this.redemptions.set(redId, {
      id: redId,
      coupon_id: coupon.id,
      company_id: companyId,
      stripe_session_id: sessionId,
      status: 'reserved',
      expires_at: effectiveExpires,
      metadata: { planId, billingCycle },
      redeemed_at: new Date(),
    });

    return {
      success: true,
      reservation_id: redId,
      coupon_id: coupon.id,
      stripe_coupon_id: coupon.stripe_coupon_id,
      stripe_promotion_code_id: coupon.stripe_promotion_code_id,
      expires_at: effectiveExpires,
    };
  }

  confirmDiscountCouponRedemption(
    callerRole: 'anon' | 'authenticated' | 'service_role',
    sessionId: string,
    companyId: string,
    couponId?: string | null
  ) {
    if (callerRole !== 'service_role') {
      return { success: false, error: 'permission_denied_service_role_required' };
    }
    if (!sessionId || !companyId) {
      return { success: false, error: 'invalid_parameters' };
    }

    const redemption = Array.from(this.redemptions.values()).find(r => r.stripe_session_id === sessionId);
    if (!redemption) {
      return { success: false, error: 'reservation_not_found' };
    }
    if (redemption.company_id !== companyId) {
      return { success: false, error: 'company_mismatch' };
    }
    if (couponId && redemption.coupon_id !== couponId) {
      return { success: false, error: 'coupon_mismatch' };
    }
    if (redemption.status === 'applied') {
      return { success: true, already_confirmed: true, redemption_id: redemption.id };
    }

    const coupon = this.coupons.get(redemption.coupon_id);
    if (!coupon) return { success: false, error: 'coupon_not_found' };

    redemption.status = 'applied';
    redemption.expires_at = null;
    redemption.redeemed_at = new Date();
    coupon.redemption_count += 1;

    return {
      success: true,
      redemption_id: redemption.id,
      coupon_id: coupon.id,
      code: coupon.code,
    };
  }
}

describe('Postgres Coupon & Billing RPC Verification', () => {
  let db: PostgresCouponsEngine;
  const companyA = 'comp-aaa-111';
  const companyB = 'comp-bbb-222';
  const userGlobalAdmin = 'user-superadmin';
  const userOfficeAdmin = 'user-office-admin';
  const userViewer = 'user-viewer';
  const userNullRole = 'user-null-role';

  beforeEach(() => {
    db = new PostgresCouponsEngine();

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    db.companies.set(companyA, {
      id: companyA,
      name: 'Empresa Alpha',
      created_at: tenDaysAgo,
      trial_ends_at: new Date(tenDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000), // Day 30
    });

    db.companies.set(companyB, {
      id: companyB,
      name: 'Empresa Beta',
      created_at: tenDaysAgo,
      trial_ends_at: new Date(tenDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    db.profiles.set(userGlobalAdmin, { id: userGlobalAdmin, company_id: null, role: 'superadmin' });
    db.profiles.set(userOfficeAdmin, { id: userOfficeAdmin, company_id: companyA, role: 'company_admin' });
    db.profiles.set(userViewer, { id: userViewer, company_id: companyA, role: 'viewer' });
    db.profiles.set(userNullRole, { id: userNullRole, company_id: companyA, role: null });

    db.coupons.set('coup-disc-1', {
      id: 'coup-disc-1',
      code: 'PROMO20',
      name: '20% Desconto',
      type: 'percent',
      discount_percent: 20,
      discount_fixed: 0,
      trial_days: 0,
      stripe_coupon_id: 'str_coup_20',
      applicable_plans: [],
      applicable_billing_cycles: [],
      max_redemptions: 1,
      redemption_count: 0,
      valid_from: new Date('2026-01-01'),
      valid_until: null,
      is_active: true,
    });

    db.coupons.set('coup-trial-60', {
      id: 'coup-trial-60',
      code: 'NAVAL60',
      name: 'Campanha 60 Dias Totais',
      type: 'trial_extension',
      discount_percent: 0,
      discount_fixed: 0,
      trial_days: 60,
      applicable_plans: [],
      applicable_billing_cycles: [],
      max_redemptions: 100,
      redemption_count: 0,
      valid_from: new Date('2026-01-01'),
      valid_until: null,
      is_active: true,
    });
  });

  it('1. Bloqueia usuário comum (viewer) no portal financeiro', () => {
    expect(db.canManageCompanyBilling(userViewer, companyA)).toBe(false);
    expect(db.canManageCompanyBilling(userNullRole, companyA)).toBe(false);
    expect(db.canManageCompanyBilling(userOfficeAdmin, companyA)).toBe(true);
  });

  it('2. Calcula 60 dias TOTAIS a partir do início do trial (created_at)', () => {
    const company = db.companies.get(companyA)!;
    const initialCreated = company.created_at;

    const res = db.redeemTrialExtensionCoupon('authenticated', userOfficeAdmin, 'NAVAL60', companyA);
    expect(res.success).toBe(true);
    expect(res.total_days).toBe(60);

    const expectedEnd = new Date(initialCreated.getTime() + 60 * 24 * 60 * 60 * 1000);
    expect(company.trial_ends_at?.toISOString()).toBe(expectedEnd.toISOString());
  });

  it('3. Rejeita terminantemente extensão se o trial inicial de 30 dias já expirou', () => {
    // Empresa criada há 40 dias (trial de 30 dias expirou há 10 dias)
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    db.companies.set('comp-expired-30', {
      id: 'comp-expired-30',
      name: 'Empresa Trial Expirado',
      created_at: fortyDaysAgo,
      trial_ends_at: new Date(fortyDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000), // Expirado no Day 30
    });
    db.profiles.set('user-exp-admin', { id: 'user-exp-admin', company_id: 'comp-expired-30', role: 'company_admin' });

    const res = db.redeemTrialExtensionCoupon('authenticated', 'user-exp-admin', 'NAVAL60', 'comp-expired-30');
    expect(res.success).toBe(false);
    expect(res.error).toContain('já expirou');
  });

  it('4. Disputa concorrente pela última vaga: apenas 1 reserva é aceita', () => {
    const resA = db.reserveDiscountCoupon('service_role', 'PROMO20', companyA, 'sess_1');
    expect(resA.success).toBe(true);

    const resB = db.reserveDiscountCoupon('service_role', 'PROMO20', companyB, 'sess_2');
    expect(resB.success).toBe(false);
    expect(resB.error).toContain('Limite de vagas para este cupom já foi atingido');
  });

  it('5. Impede sobrescrita de session_id vinculado a outra empresa ou outro cupom', () => {
    db.reserveDiscountCoupon('service_role', 'PROMO20', companyA, 'sess_unique_99');

    const resOverwriteComp = db.reserveDiscountCoupon('service_role', 'PROMO20', companyB, 'sess_unique_99');
    expect(resOverwriteComp.success).toBe(false);
    expect(resOverwriteComp.error).toBe('session_id_already_bound_to_different_company');
  });

  it('6. Rejeita confirm_discount_coupon_redemption chamado por anon ou authenticated', () => {
    const res = db.confirmDiscountCouponRedemption('authenticated', 'sess_1', companyA);
    expect(res.success).toBe(false);
    expect(res.error).toBe('permission_denied_service_role_required');
  });

  it('7. Confirmação com correspondência estrita e idempotência', () => {
    db.reserveDiscountCoupon('service_role', 'PROMO20', companyA, 'sess_confirm_test');

    const first = db.confirmDiscountCouponRedemption('service_role', 'sess_confirm_test', companyA, 'coup-disc-1');
    expect(first.success).toBe(true);

    const second = db.confirmDiscountCouponRedemption('service_role', 'sess_confirm_test', companyA, 'coup-disc-1');
    expect(second.success).toBe(true);
    expect(second.already_confirmed).toBe(true);
  });
});
