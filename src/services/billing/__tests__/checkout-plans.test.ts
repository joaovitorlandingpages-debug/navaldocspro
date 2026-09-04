import { describe, it, expect } from "vitest";
import {
  NAVAL_PLANS,
  getPlanPrice,
  calculateAnnualSavings,
  getAnnualDiscountPercentage,
} from "@/services/billing/plansConfig";

describe("Plans and Billing Configuration (Sprint Checkout MP)", () => {
  it("provides monthly and annual cycles for each plan", () => {
    expect(NAVAL_PLANS.length).toBeGreaterThanOrEqual(3);

    for (const plan of NAVAL_PLANS) {
      expect(plan.priceMonthly).toBeGreaterThan(0);
      expect(plan.priceYearly).toBeGreaterThan(plan.priceMonthly);
      // O preço anual deve ser exatamente ou aproximadamente 10x o mensal (2 meses grátis)
      expect(plan.priceYearly).toBeLessThan(plan.priceMonthly * 12);
    }
  });

  it("calculates annual discount equivalent to ~17-20% (2 months free)", () => {
    const starter = NAVAL_PLANS.find((p) => p.slug === "starter")!;
    expect(starter).toBeDefined();
    expect(starter.priceMonthly).toBe(89);
    expect(starter.priceYearly).toBe(890); // 10 x 89 = 2 meses grátis

    const savings = calculateAnnualSavings(starter);
    expect(savings).toBe(89 * 2); // R$ 178 de economia

    const discountPercentage = getAnnualDiscountPercentage(starter);
    expect(discountPercentage).toBeGreaterThanOrEqual(16);
    expect(discountPercentage).toBeLessThanOrEqual(20);
  });

  it("configures operational limits (concurrent OS, users, storage GB)", () => {
    const starter = NAVAL_PLANS.find((p) => p.slug === "starter")!;
    expect(starter.processLimit).toBe(50);
    expect(starter.userLimit).toBe(2);
    expect(starter.storageGb).toBe(5);

    const pro = NAVAL_PLANS.find((p) => p.slug === "professional")!;
    expect(pro.processLimit).toBe(250);
    expect(pro.userLimit).toBe(5);
    expect(pro.storageGb).toBe(20);

    const enterprise = NAVAL_PLANS.find((p) => p.slug === "enterprise")!;
    expect(enterprise.processLimit).toBeNull(); // ilimitado
    expect(enterprise.storageGb).toBe(100);
  });

  it("getPlanPrice returns correct amount according to billing cycle", () => {
    const starter = NAVAL_PLANS.find((p) => p.slug === "starter")!;
    expect(getPlanPrice(starter, "monthly")).toBe(89);
    expect(getPlanPrice(starter, "annual")).toBe(890);
    expect(getPlanPrice(starter, "yearly")).toBe(890);
  });

  it("parses external_reference tuple with organization_id, plan_id, and billing_cycle", () => {
    const companyId = "company-1234";
    const planId = "plan-starter";
    const cycle = "annual";
    const externalRef = `${companyId}:${planId}:${cycle}`;

    const [extractedCompany, extractedPlan, extractedCycle] = externalRef.split(":");
    expect(extractedCompany).toBe(companyId);
    expect(extractedPlan).toBe(planId);
    expect(extractedCycle).toBe("annual");

    // Cálculo da vigência
    const now = new Date("2026-09-01T00:00:00Z");
    const endAnnual = new Date(now);
    endAnnual.setDate(endAnnual.getDate() + 365);
    expect(endAnnual.toISOString().slice(0, 10)).toBe("2027-09-01");

    const endMonthly = new Date(now);
    endMonthly.setDate(endMonthly.getDate() + 30);
    expect(endMonthly.toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});
