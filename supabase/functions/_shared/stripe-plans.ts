import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface ResolvedPlan {
  planId: string;
  planDbId?: string;
  name: string;
  billingCycle: 'monthly' | 'annual';
  priceId?: string;
  unitAmount: number;
  currency: string;
  version: number;
  appsIncluded: string[];
}

// UUID v4 regex (PostgreSQL format)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Localiza o plano de forma segura no catálogo public.plans.
 * 
 * Blindagem rigorosa de checkout:
 * - Rejeita planos arquivados, inativos ou rascunhos.
 * - Rejeita planos sem sincronização confirmada pela Stripe (stripe_sync_status != 'synced').
 * - Rejeita ciclos de cobrança inválidos.
 * - Rejeita planos sem Price ID oficial da Stripe correspondente ao ciclo escolhido.
 * - Retorna versão imutável da oferta comercial para preservação em subscriptions.metadata.
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

  const PLAN_FIELDS = 'id, slug, name, price, price_yearly, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, is_active, status, stripe_sync_status, features';

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

  // 2. Busca por slug (fallback para identificadores não-UUID)
  if (!plan) {
    const { data, error } = await adminClient
      .from('plans')
      .select(PLAN_FIELDS)
      .eq('slug', cleanIdLower)
      .maybeSingle();
    if (!error) plan = data;
  }

  if (!plan) return null;

  // 1. Bloqueia planos arquivados, inativos ou rascunhos
  if (plan.is_active === false) {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" está inativo (is_active=false). Contratação bloqueada.`);
    return null;
  }
  if (plan.status && plan.status !== 'published') {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" tem status "${plan.status}". Apenas planos publicados podem ser contratados.`);
    return null;
  }

  // 2. Bloqueia planos pendentes de sincronização ou com falha
  if (plan.stripe_sync_status && plan.stripe_sync_status !== 'synced') {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" está com stripe_sync_status="${plan.stripe_sync_status}". Contratação bloqueada até sincronização concluída.`);
    return null;
  }

  const isAnnual = cycle === 'annual';
  const priceId = isAnnual ? plan.stripe_price_yearly_id : plan.stripe_price_monthly_id;

  // 3. Bloqueia se o Price ID não existir ou for inválido
  if (!priceId || !priceId.startsWith('price_')) {
    console.error(`resolvePlanFromDatabase: plano "${plan.name}" não possui Price ID da Stripe para ciclo ${cycle}.`);
    return null;
  }

  const rawPrice = isAnnual
    ? (plan.price_yearly || (plan.price ? plan.price * 10 : 0))
    : (plan.price || 0);
  const unitAmount = Math.round(Number(rawPrice) * 100);

  const feat = plan.features || {};
  const version = Number(plan.version ?? feat?.version ?? 1);
  const apps = Array.isArray(plan.apps_included) 
    ? plan.apps_included 
    : (Array.isArray(feat?.appsIncluded) ? feat.appsIncluded : ['navaldocs']);

  return {
    planId: plan.slug || plan.id,
    planDbId: plan.id,
    name: plan.name || 'Plano NavalDocs Pro',
    billingCycle: cycle,
    priceId,
    unitAmount,
    currency: 'brl',
    version,
    appsIncluded: apps
  };
}

export async function findPlanByPriceIdInDatabase(
  adminClient: SupabaseClient,
  priceId?: string | null
): Promise<{ planId: string; billingCycle: string; planDbId: string } | null> {
  if (!priceId) return null;

  // Busca por price_id mensal ou anual
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
