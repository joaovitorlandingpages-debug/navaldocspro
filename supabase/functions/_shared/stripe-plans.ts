import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface ResolvedPlan {
  planId: string;
  planDbId?: string;
  name: string;
  billingCycle: 'monthly' | 'annual';
  priceId?: string;
  unitAmount: number;
  currency: string;
}

/**
 * Consulta dinâmica de plano diretamente da tabela public.plans.
 * Novos planos criados no painel de administração e sincronizados com a Stripe funcionam sem editar código.
 */
export async function resolvePlanFromDatabase(
  adminClient: SupabaseClient,
  planIdentifier: string,
  billingCycle: string = 'monthly'
): Promise<ResolvedPlan | null> {
  if (!planIdentifier) return null;

  const cycle = (billingCycle === 'annual' || billingCycle === 'yearly') ? 'annual' : 'monthly';
  const cleanId = planIdentifier.trim().toLowerCase();

  // Busca plano no banco por slug ou id
  const { data: plan, error } = await adminClient
    .from('plans')
    .select('id, slug, name, price, price_yearly, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, is_active, status')
    .or(`slug.eq.${cleanId},id.eq.${cleanId}`)
    .maybeSingle();

  if (error || !plan) {
    return null;
  }

  const isAnnual = cycle === 'annual';
  const priceId = isAnnual ? plan.stripe_price_yearly_id : plan.stripe_price_monthly_id;
  const rawPrice = isAnnual ? (plan.price_yearly || (plan.price ? plan.price * 10 : 0)) : (plan.price || 0);
  const unitAmount = Math.round(Number(rawPrice) * 100);

  return {
    planId: plan.slug || plan.id,
    planDbId: plan.id,
    name: plan.name || 'Plano NavalDocs Pro',
    billingCycle: cycle,
    priceId: (priceId && priceId.startsWith('price_')) ? priceId : undefined,
    unitAmount,
    currency: 'brl',
  };
}

export async function findPlanByPriceIdInDatabase(
  adminClient: SupabaseClient,
  priceId?: string | null
): Promise<{ planId: string; billingCycle: string; planDbId: string } | null> {
  if (!priceId) return null;

  const { data: plan } = await adminClient
    .from('plans')
    .select('id, slug, stripe_price_monthly_id, stripe_price_yearly_id')
    .or(`stripe_price_monthly_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`)
    .maybeSingle();

  if (!plan) return null;

  const isAnnual = plan.stripe_price_yearly_id === priceId;
  return {
    planId: plan.slug || plan.id,
    planDbId: plan.id,
    billingCycle: isAnnual ? 'annual' : 'monthly',
  };
}
