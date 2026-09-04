import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  NAVAL_PLANS, 
  TRIAL_CONFIG, 
  GRACE_PERIOD_CONFIG, 
  isHomologationBypass 
} from "@/services/billing/plansConfig";
import { mercadoPagoService } from "@/services/billing/mercadoPagoService";

export interface Plan {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  billing_cycle?: string;
  customer_limit: number | null;
  vessel_limit?: number | null;
  process_limit?: number | null;
  document_limit: number | null;
  user_limit: number | null;
  ocr_limit: number | null;
  storage_gb?: number | null;
  features: string[];
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending' | 'lifetime';
  mercado_pago_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  isInGracePeriod?: boolean;
  graceDaysLeft?: number;
  plan?: Plan;
}

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || (user as any)?.user_metadata?.company_id;
  const role = profile?.role;
  const isLifetimeAdmin = role === 'admin' || role === 'admin_master' || role === 'admin_master_global';

  // 1. Carregar planos do banco de dados (tabela plans no Supabase) com fallback para o catálogo padrão NAVAL_PLANS
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (!error && data && data.length > 0) {
          return (data as any[]).map((p) => ({
            id: p.id,
            slug: p.slug || undefined,
            name: p.name,
            description: p.description || "",
            price: Number(p.price) || 0,
            billing_cycle: p.billing_cycle || "monthly",
            customer_limit: p.customer_limit,
            vessel_limit: p.customer_limit, // fallback caso vessel_limit não exista na tabela legada
            process_limit: p.process_limit,
            document_limit: p.document_limit,
            user_limit: p.user_limit,
            ocr_limit: p.ocr_limit,
            storage_gb: p.storage_limit_gb,
            features: Array.isArray(p.features) ? p.features.map(String) : [],
          })) as Plan[];
        }
      } catch (e) {
        console.warn("Utilizando catálogo padrão oficial de planos:", e);
      }

      // Fallback para os planos oficiais
      return NAVAL_PLANS.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.priceMonthly,
        billing_cycle: p.billingCycle,
        customer_limit: p.customerLimit,
        vessel_limit: p.vesselLimit,
        process_limit: p.processLimit,
        document_limit: p.documentLimit,
        user_limit: p.userLimit,
        ocr_limit: p.ocrLimit,
        storage_gb: p.storageGb,
        features: p.features,
      })) as Plan[];
    },
    enabled: !!user,
  });

  // 2. Consultar informações da empresa diretamente do Supabase
  const { data: companyData } = useQuery({
    queryKey: ["company-info", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, created_at, plan, plan_id, onboarding_status, is_demo, is_pilot, billing_status")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar dados da empresa:", error);
        return null;
      }
      return data;
    },
    enabled: !!companyId,
  });

  // Verificação de bypass seguro para tenant de homologação/validação
  const isHomologation = isHomologationBypass(
    companyId,
    companyData?.name,
    companyData?.is_pilot || companyData?.is_demo
  );

  // 3. Consultar a assinatura ativa diretamente da tabela 'subscriptions' no Supabase
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["subscription", companyId, isLifetimeAdmin, isHomologation],
    queryFn: async () => {
      // 3.1. ADMINS OU TENANTS DE HOMOLOGAÇÃO NUNCA FICAM BLOQUEADOS
      if (isLifetimeAdmin || isHomologation) {
        return {
          id: isLifetimeAdmin ? "sub-lifetime-admin" : "sub-homologation-bypass",
          company_id: companyId || "admin-homologation",
          plan_id: "plan-enterprise",
          status: "lifetime" as const,
          cancel_at_period_end: false,
          current_period_end: "2099-12-31T23:59:59Z",
          plan: {
            id: "plan-enterprise",
            name: isLifetimeAdmin 
              ? "Enterprise (Acesso Vitalício Admin)" 
              : `Enterprise (${companyData?.name || 'Oficina Homologação'} - Bypass Ativo)`,
            description: isLifetimeAdmin
              ? "Acesso permanente e irrestrito para administradores."
              : "Tenant de validação/homologação com cotas ilimitadas.",
            price: 0,
            customer_limit: null,
            vessel_limit: null,
            process_limit: null,
            document_limit: null,
            user_limit: null,
            ocr_limit: null,
            storage_gb: 1000,
            features: [
              "Acesso Completo Irrestrito",
              "Todas as Cotas Ilimitadas",
              "Bypass Seguro de Homologação Ativo",
              "Ambiente de Validação Contínua"
            ],
          }
        } as (Subscription & { plan: Plan });
      }

      if (!companyId) return null;

      const now = Date.now();
      const gracePeriodMs = GRACE_PERIOD_CONFIG.days * 24 * 60 * 60 * 1000;

      // 3.2. Consulta direta à tabela de assinaturas no Supabase (NADA de localStorage)
      try {
        const { data: subRow, error: subError } = await supabase
          .from("subscriptions")
          .select("*, plan:plans(*)")
          .eq("company_id", companyId)
          .maybeSingle();

        if (!subError && subRow) {
          const row = subRow as any;
          const periodEndMs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
          const isOverdue = periodEndMs ? now > periodEndMs : false;

          let rawStatus = (row.status || "active") as Subscription['status'];
          let inGrace = false;
          let daysLeftInGrace = 0;

          // Se venceu, calcular período de carência
          if (isOverdue && periodEndMs) {
            const overdueMs = now - periodEndMs;
            if (overdueMs <= gracePeriodMs) {
              // Dentro da carência de 5 dias
              inGrace = true;
              daysLeftInGrace = Math.max(1, Math.ceil((gracePeriodMs - overdueMs) / (1000 * 60 * 60 * 24)));
              rawStatus = "past_due";
            } else {
              // Passou da carência
              rawStatus = row.status === "canceled" ? "canceled" : "past_due";
            }
          }

          // Montar plano associado
          const planRecord = row.plan || NAVAL_PLANS.find(p => p.id === row.plan_id) || NAVAL_PLANS[1];
          const mappedPlan: Plan = {
            id: planRecord.id,
            slug: planRecord.slug,
            name: planRecord.name,
            description: planRecord.description || "",
            price: Number(planRecord.price ?? planRecord.priceMonthly ?? 0),
            billing_cycle: planRecord.billing_cycle || "monthly",
            customer_limit: planRecord.customer_limit ?? planRecord.customerLimit ?? null,
            vessel_limit: planRecord.vessel_limit ?? planRecord.vesselLimit ?? null,
            process_limit: planRecord.process_limit ?? planRecord.processLimit ?? null,
            document_limit: planRecord.document_limit ?? planRecord.documentLimit ?? null,
            user_limit: planRecord.user_limit ?? planRecord.userLimit ?? null,
            ocr_limit: planRecord.ocr_limit ?? planRecord.ocrLimit ?? null,
            storage_gb: planRecord.storage_limit_gb ?? planRecord.storageGb ?? null,
            features: Array.isArray(planRecord.features) ? planRecord.features : NAVAL_PLANS[1].features,
          };

          return {
            id: row.id,
            company_id: companyId,
            plan_id: row.plan_id || mappedPlan.id,
            status: rawStatus,
            mercado_pago_subscription_id: row.mercado_pago_subscription_id,
            current_period_start: row.current_period_start,
            current_period_end: row.current_period_end,
            cancel_at_period_end: !!row.cancel_at_period_end,
            isInGracePeriod: inGrace,
            graceDaysLeft: daysLeftInGrace,
            plan: mappedPlan
          } as (Subscription & { plan: Plan });
        }
      } catch (e) {
        console.warn("Assinatura não encontrada no banco ou erro na consulta. Calculando período de teste via data de criação:", e);
      }

      // 3.3. Se não há registro na tabela subscriptions, calcula os 14 dias de Trial baseado no created_at do banco
      const createdAt = companyData?.created_at ? new Date(companyData.created_at) : new Date();
      const trialDurationMs = TRIAL_CONFIG.days * 24 * 60 * 60 * 1000;
      const trialEndsAt = new Date(createdAt.getTime() + trialDurationMs);
      const isStillInTrial = trialEndsAt.getTime() > now;

      let trialStatus: Subscription['status'] = "trialing";
      let trialInGrace = false;
      let trialDaysInGrace = 0;

      if (!isStillInTrial) {
        const overdueMs = now - trialEndsAt.getTime();
        if (overdueMs <= gracePeriodMs) {
          trialInGrace = true;
          trialDaysInGrace = Math.max(1, Math.ceil((gracePeriodMs - overdueMs) / (1000 * 60 * 60 * 24)));
          trialStatus = "past_due";
        } else {
          trialStatus = "past_due";
        }
      }

      return {
        id: "sub-trial",
        company_id: companyId,
        plan_id: "plan-professional",
        status: trialStatus,
        cancel_at_period_end: false,
        current_period_end: trialEndsAt.toISOString(),
        isInGracePeriod: trialInGrace,
        graceDaysLeft: trialDaysInGrace,
        plan: {
          id: "plan-professional",
          name: isStillInTrial 
            ? "Professional (14 Dias Grátis)" 
            : trialInGrace 
              ? "Período de Teste Vencido (Carência Ativa)" 
              : "Período de Teste Expirado",
          description: isStillInTrial 
            ? "Acesso completo de demonstração para testes navais." 
            : "Escolha um plano para continuar criando processos e gerando documentos.",
          price: 299,
          customer_limit: TRIAL_CONFIG.limits.customerLimit,
          vessel_limit: TRIAL_CONFIG.limits.vesselLimit,
          process_limit: TRIAL_CONFIG.limits.processLimit,
          document_limit: TRIAL_CONFIG.limits.documentLimit,
          user_limit: TRIAL_CONFIG.limits.userLimit,
          ocr_limit: TRIAL_CONFIG.limits.ocrLimit,
          storage_gb: TRIAL_CONFIG.limits.storageGb,
          features: NAVAL_PLANS[1].features,
        }
      } as (Subscription & { plan: Plan });
    },
    enabled: !!companyId || isLifetimeAdmin,
  });

  // Cálculos de dias restantes e flags operacionais
  const createdAtMs = companyData?.created_at ? new Date(companyData.created_at).getTime() : Date.now();
  const trialDaysPassed = Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24));
  const trialDaysLeft = Math.max(0, TRIAL_CONFIG.days - trialDaysPassed);

  const isTrial = !isLifetimeAdmin && !isHomologation && subscription?.status === "trialing";
  const isInGracePeriod = !!subscription?.isInGracePeriod;
  const graceDaysLeft = subscription?.graceDaysLeft ?? 0;
  const isPastDue = subscription?.status === "past_due";
  const isCanceled = subscription?.status === "canceled";

  // O teste está expirado se não é admin/homologação, não está ativo e ultrapassou a carência
  const isTrialExpired = !isLifetimeAdmin && !isHomologation && (
    (subscription?.status === "past_due" && !isInGracePeriod) ||
    (isTrial && trialDaysLeft <= 0 && !isInGracePeriod)
  );

  // REGRA RÍGIDA: Acesso para LEITURA e CONSULTA é sempre preservado (não-bloqueante)
  const canAccess = true;

  // Apenas a CRIAÇÃO de novos registros é restrita quando expirado pós-carência
  const canCreate = isLifetimeAdmin || isHomologation || subscription?.status === "active" || (isTrial && trialDaysLeft > 0) || isInGracePeriod;

  // 4. Mutação para Checkout Mercado Pago / Pix
  const createPreference = useMutation({
    mutationFn: async (planSlug: string) => {
      if (!companyId) {
        throw new Error("Identificação da empresa não encontrada. Verifique seu login antes de prosseguir.");
      }

      const selectedPlan = NAVAL_PLANS.find(p => p.slug === planSlug) || NAVAL_PLANS[1];
      
      const result = await mercadoPagoService.createCheckoutPreference({
        planId: selectedPlan.id,
        planSlug: selectedPlan.slug,
        planName: selectedPlan.name,
        amount: selectedPlan.priceMonthly,
        billingCycle: "monthly",
        companyId: companyId,
        customerEmail: user?.email || "financeiro@empresa.com.br",
        customerName: profile?.name || companyData?.name || "Cliente NavalDocs"
      });

      if (!result.success) {
        throw new Error(result.message || "Erro ao conectar com o gateway do Mercado Pago.");
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.initPoint) {
        toast.success("Redirecionando para o pagamento seguro via Pix / Cartão no Mercado Pago...");
        window.location.href = data.initPoint;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Não foi possível iniciar o checkout.");
    }
  });

  return {
    plans,
    subscription,
    isLoadingSubscription,
    isLifetimeAdmin,
    isHomologation,
    isTrial,
    trialDaysLeft,
    isTrialExpired,
    isInGracePeriod,
    graceDaysLeft,
    isPastDue,
    isCanceled,
    canAccess,
    canCreate,
    createPreference
  };
};
