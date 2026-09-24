export interface PlanConfig {
  planId: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly?: string;
  priceIdYearly?: string;
}

export const KNOWN_PLANS: Record<string, PlanConfig> = {
  essencial: {
    planId: "essencial",
    name: "Essencial",
    priceMonthly: 149,
    priceYearly: 1490,
  },
  profissional: {
    planId: "profissional",
    name: "Profissional",
    priceMonthly: 299,
    priceYearly: 2990,
  },
  equipe: {
    planId: "equipe",
    name: "Equipe",
    priceMonthly: 599,
    priceYearly: 5990,
  },
};

export function resolvePlan(planId: string, billingCycle = "monthly"): { planId: string; billingCycle: string; priceId?: string; unitAmount: number; name: string } | null {
  const cleanId = planId.toLowerCase().trim();
  const plan = KNOWN_PLANS[cleanId];
  if (!plan) return null;

  const isYearly = billingCycle === "annual" || billingCycle === "yearly";
  const unitAmount = isYearly ? Math.round(plan.priceYearly * 100) : Math.round(plan.priceMonthly * 100);

  return {
    planId: plan.planId,
    billingCycle: isYearly ? "annual" : "monthly",
    priceId: isYearly ? plan.priceIdYearly : plan.priceIdMonthly,
    unitAmount,
    name: plan.name,
  };
}

export function findPlanByPriceId(priceId?: string | null): { planId: string; billingCycle: string } | null {
  if (!priceId) return null;
  for (const [key, plan] of Object.entries(KNOWN_PLANS)) {
    if (plan.priceIdMonthly === priceId) {
      return { planId: key, billingCycle: "monthly" };
    }
    if (plan.priceIdYearly === priceId) {
      return { planId: key, billingCycle: "annual" };
    }
  }
  return null;
}
