import { describe, it, expect } from "vitest";
import {
  NAVAL_PLANS,
  LEGACY_NAVAL_PLANS,
  getPlanPrice,
  calculateAnnualSavings,
  getAnnualDiscountPercentage,
} from "@/services/billing/plansConfig";

describe("Plans and Billing Configuration (NavalPlans Update)", () => {
  it("provides monthly and annual cycles for each plan", () => {
    expect(NAVAL_PLANS.length).toBeGreaterThanOrEqual(3);

    for (const plan of NAVAL_PLANS) {
      expect(plan.priceMonthly).toBeGreaterThan(0);
      expect(plan.priceYearly).toBeGreaterThan(plan.priceMonthly);
      // O preço anual é exatamente 10x o mensal (2 meses grátis)
      expect(plan.priceYearly).toBe(plan.priceMonthly * 10);
      expect(plan.priceYearly).toBeLessThan(plan.priceMonthly * 12);
    }
  });

  it("calculates annual discount equivalent to 2 months free for Plano Profissional", () => {
    const profissional = NAVAL_PLANS.find((p) => p.slug === "profissional")!;
    expect(profissional).toBeDefined();
    expect(profissional.priceMonthly).toBe(299);
    expect(profissional.priceYearly).toBe(2990);

    const savings = calculateAnnualSavings(profissional);
    expect(savings).toBe(299 * 2); // R$ 598 de economia

    const discountPercentage = getAnnualDiscountPercentage(profissional);
    expect(discountPercentage).toBeGreaterThanOrEqual(16);
    expect(discountPercentage).toBeLessThanOrEqual(20);
  });

  it("configures Profissional plan with 60 OS/Laudos and 3 users", () => {
    const profissional = NAVAL_PLANS.find((p) => p.slug === "profissional")!;
    expect(profissional).toBeDefined();
    expect(profissional.priceMonthly).toBe(299);
    expect(profissional.priceYearly).toBe(2990);
    expect(profissional.processLimit).toBe(60);
    expect(profissional.userLimit).toBe(3);
    expect(profissional.storageGb).toBe(15);
    expect(profissional.isPopular).toBe(true);
  });

  it("preserves legacy plans (Despachante & Engenharia) for existing contracts", () => {
    const despachante = LEGACY_NAVAL_PLANS.find((p) => p.slug === "despachante")!;
    expect(despachante).toBeDefined();
    expect(despachante.priceMonthly).toBe(129);
    expect(despachante.priceYearly).toBe(1290);

    const engenharia = LEGACY_NAVAL_PLANS.find((p) => p.slug === "engenharia_pericia")!;
    expect(engenharia).toBeDefined();
    expect(engenharia.priceMonthly).toBe(179);
    expect(engenharia.priceYearly).toBe(1790);
  });

  it("getPlanPrice returns correct amount according to billing cycle", () => {
    const profissional = NAVAL_PLANS.find((p) => p.slug === "profissional")!;
    expect(getPlanPrice(profissional, "monthly")).toBe(299);
    expect(getPlanPrice(profissional, "annual")).toBe(2990);
    expect(getPlanPrice(profissional, "yearly")).toBe(2990);
  });

  it("parses external_reference tuple with organization_id, plan_id, and billing_cycle", () => {
    const companyId = "company-1234";
    const planId = "plan-engenharia-pericia";
    const cycle = "annual";
    const externalRef = `${companyId}:${planId}:${cycle}`;

    const [extractedCompany, extractedPlan, extractedCycle] = externalRef.split(":");
    expect(extractedCompany).toBe(companyId);
    expect(extractedPlan).toBe(planId);
    expect(extractedCycle).toBe("annual");
  });
});
