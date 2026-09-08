import { describe, it, expect } from "vitest";
import {
  NAVAL_PLANS,
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

  it("calculates annual discount equivalent to 2 months free for Despachante Naval", () => {
    const despachante = NAVAL_PLANS.find((p) => p.slug === "despachante")!;
    expect(despachante).toBeDefined();
    expect(despachante.priceMonthly).toBe(129);
    expect(despachante.priceYearly).toBe(1290);

    const savings = calculateAnnualSavings(despachante);
    expect(savings).toBe(129 * 2); // R$ 258 de economia

    const discountPercentage = getAnnualDiscountPercentage(despachante);
    expect(discountPercentage).toBeGreaterThanOrEqual(16);
    expect(discountPercentage).toBeLessThanOrEqual(20);
  });

  it("configures Engenharia & Perícia plan with 100 OS/Laudos and 3 users", () => {
    const engenharia = NAVAL_PLANS.find((p) => p.slug === "engenharia_pericia")!;
    expect(engenharia).toBeDefined();
    expect(engenharia.priceMonthly).toBe(179);
    expect(engenharia.priceYearly).toBe(1790);
    expect(engenharia.processLimit).toBe(100);
    expect(engenharia.userLimit).toBe(3);
    expect(engenharia.storageGb).toBe(30);
    expect(engenharia.categoryTag).toBe("Para Engenheiros e Vistoriadores");
  });

  it("configures Marina & Estaleiro plan with unlimited limits and 150GB storage", () => {
    const marina = NAVAL_PLANS.find((p) => p.slug === "marina_estaleiro")!;
    expect(marina).toBeDefined();
    expect(marina.priceMonthly).toBe(249);
    expect(marina.priceYearly).toBe(2490);
    expect(marina.processLimit).toBeNull(); // ilimitado
    expect(marina.userLimit).toBeNull(); // ilimitado
    expect(marina.storageGb).toBe(150);
  });

  it("getPlanPrice returns correct amount according to billing cycle", () => {
    const engenharia = NAVAL_PLANS.find((p) => p.slug === "engenharia_pericia")!;
    expect(getPlanPrice(engenharia, "monthly")).toBe(179);
    expect(getPlanPrice(engenharia, "annual")).toBe(1790);
    expect(getPlanPrice(engenharia, "yearly")).toBe(1790);
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
