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

// UUID v4 regex (PostgreSQL format)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tenta localizar o plano primeiro pelo tipo real de plans.id (UUID),
 * e em seguida pelo slug. Separa as buscas para evitar cast implícito do
 * Supabase ao usar .or() com tipos incompatíveis (uuid vs text).
 *
 * Rejeita planos arquivados, inativos ou rascunhos.
 * Rejeita ciclos de cobrança inválidos em vez de silenciosamente usar 'monthly'.
 */
export async function resolvePlanFromDatabase(
  adminClient: SupabaseClient,
  planIdentifier: string,
  billingCycle: string = 'monthly'
): Promise<ResolvedPlan | null> {
  if (!planIdentifier) return null;

  // Validação explícita de ciclo — rejeita ciclos desconhecidos
  if (billingCycle !== 'monthly' && billingCycle !== 'annual' && billingCycle !== 'yearly') {
    console.error(`resolvePlanFromDatabase: ciclo de cobrança inválido recebido: "${billingCycle}". Esperado: monthly | annual | yearly.`);
    return null;
  }

  const cycle: 'monthly' | 'annual' = (billingCycle === 'annual' || billingCycle === 'yearly') ? 'annual' : 'monthly';
  const cleanId = planIdentifier.trim();
  const cleanIdLower = cleanId.toLowerCase();

  const PLAN_FIELDS = 'id, slug, name, price, price_yearly, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, is_active, status';

  let plan: any = null;

  // 1. Se for UUID, busca por id
  if (UUID_RE.test(cleanId)) {
    const { data, error } = await adminClient
      .from('plans')
      .select(PLAN_FIELDS)
      .eq('id', cleanId)
      .maybeSingle();
    if (!error) plan = data;
  }

  // 2. Busca por slug (always try, fallback para identificadores não-UUID)
  if (!plan) {
    const { data, error } = await adminClient
      .from('plans')
      .select(PLAN_FIELDS)
      .eq('slug', cleanIdLower)
      .maybeSingle();
    if (!error) plan = data;
  }

  if (!plan) return null;

  // Bloqueia planos arquivados, inativos ou rascunhos
  if (plan.is_active === false) {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" está inativo (is_active=false). Contratação bloqueada.`);
    return null;
  }
  if (plan.status && plan.status !== 'published') {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" tem status "${plan.status}". Apenas planos publicados podem ser contratados.`);
    return null;
  }

  const isAnnual = cycle === 'annual';
  const priceId = isAnnual ? plan.stripe_price_yearly_id : plan.stripe_price_monthly_id;
  const rawPrice = isAnnual
    ? (plan.price_yearly || (plan.price ? plan.price * 10 : 0))
    : (plan.price || 0);
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

  // Busca por price_id mensal ou anual — dois .eq() separados para evitar cast entre tipos
  const { data: planMonthly } = await adminClient
    .from('plans')
    .select('id, slug, stripe_price_monthly_id, stripe_price_yearly_id')
    .eq('stripe_price_monthly_id', priceId)
    .maybeSingle();

  if (planMonthly) {
    return {
      planId: planMonthly.slug || planMonthly.id,
      planDbId: planMonthly.id,
      billingCycle: 'monthly',
    };
  }

  const { data: planYearly } = await adminClient
    .from('plans')
    .select('id, slug, stripe_price_monthly_id, stripe_price_yearly_id')
    .eq('stripe_price_yearly_id', priceId)
    .maybeSingle();

  if (planYearly) {
    return {
      planId: planYearly.slug || planYearly.id,
      planDbId: planYearly.id,
      billingCycle: 'annual',
    };
  }

  return null;
}
