import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { NAVAL_PLANS, NavalPlan } from "@/services/billing/plansConfig";
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
  current_period_end?: string;
  cancel_at_period_end: boolean;
  plan?: Plan;
}

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || (user as any)?.user_metadata?.company_id;
  const role = profile?.role;
  const isLifetimeAdmin = role === 'admin' || role === 'admin_master' || role === 'admin_master_global';

  const queryClient = useQueryClient();

  // 1. Carregar planos do banco de dados ou usar o catálogo padrão oficial NAVAL_PLANS
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
          return data as Plan[];
        }
      } catch (e) {
        console.warn("Usando catálogo padrão de planos:", e);
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

  // 2. Carregar informações da empresa e da assinatura
  const { data: companyData } = useQuery({
    queryKey: ["company-info", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, created_at, plan, onboarding_status")
        .eq("id", companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["subscription", companyId, isLifetimeAdmin],
    queryFn: async () => {
      // ADMINS TEM ACESSO VITALÍCIO DIRETO
      if (isLifetimeAdmin) {
        return {
          id: "sub-lifetime-admin",
          company_id: companyId || "admin-company",
          plan_id: "plan-enterprise",
          status: "lifetime" as const,
          cancel_at_period_end: false,
          current_period_end: "2099-12-31T23:59:59Z",
          plan: {
            id: "plan-enterprise",
            name: "Enterprise (Acesso Vitalício Admin)",
            description: "Acesso permanente e irrestrito para administradores.",
            price: 0,
            customer_limit: null,
            vessel_limit: null,
            process_limit: null,
            document_limit: null,
            user_limit: null,
            ocr_limit: null,
            storage_gb: 1000,
            features: ["Acesso Vitalício Completo", "Recursos Ilimitados", "Painel Master Admin"],
          }
        } as (Subscription & { plan: Plan });
      }

      if (!companyId) return null;

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*, plan:plans(*)")
          .eq("company_id", companyId)
          .maybeSingle();

        if (!error && data) {
          return data as (Subscription & { plan: Plan });
        }
      } catch (e) {
        console.warn("Assinatura não encontrada no banco, calculando trial:", e);
      }

      // Se não há registro explícito, calcula os 14 dias de teste grátis (Trial)
      const createdAt = companyData?.created_at ? new Date(companyData.created_at) : new Date();
      const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
      const trialEndsAt = new Date(createdAt.getTime() + trialDurationMs);
      const isStillInTrial = trialEndsAt.getTime() > Date.now();

      return {
        id: "sub-trial",
        company_id: companyId,
        plan_id: "plan-professional",
        status: isStillInTrial ? "trialing" : "past_due",
        cancel_at_period_end: false,
        current_period_end: trialEndsAt.toISOString(),
        plan: {
          id: "plan-professional",
          name: isStillInTrial ? "Professional (14 Dias Grátis)" : "Período de Teste Expirado",
          description: "Acesso de demonstração com todas as funcionalidades liberadas.",
          price: 299,
          customer_limit: 200,
          vessel_limit: 100,
          process_limit: 250,
          document_limit: 500,
          user_limit: 5,
          ocr_limit: 200,
          storage_gb: 20,
          features: NAVAL_PLANS[1].features,
        }
      } as (Subscription & { plan: Plan });
    },
    enabled: !!companyId || isLifetimeAdmin,
  });

  // Cálculo de dias restantes de teste grátis
  const createdAt = companyData?.created_at ? new Date(companyData.created_at).getTime() : Date.now();
  const trialDaysPassed = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  const trialDaysLeft = Math.max(0, 14 - trialDaysPassed);
  const isTrial = !isLifetimeAdmin && subscription?.status === "trialing";
  const isTrialExpired = !isLifetimeAdmin && (subscription?.status === "past_due" || (isTrial && trialDaysLeft <= 0));
  const canAccess = isLifetimeAdmin || subscription?.status === "active" || (isTrial && trialDaysLeft > 0);

  // 3. Mutação para criar Checkout do Mercado Pago
  const createPreference = useMutation({
    mutationFn: async (planSlug: string) => {
      const selectedPlan = NAVAL_PLANS.find(p => p.slug === planSlug) || NAVAL_PLANS[1];
      
      const result = await mercadoPagoService.createCheckoutPreference({
        planId: selectedPlan.id,
        planSlug: selectedPlan.slug,
        planName: selectedPlan.name,
        amount: selectedPlan.priceMonthly,
        billingCycle: "monthly",
        companyId: companyId || "default-company",
        customerEmail: user?.email || "cliente@navaldocs.com.br",
        customerName: profile?.name || "Cliente NavalDocs"
      });

      if (!result.success) {
        throw new Error(result.message || "Erro ao conectar com o gateway de pagamento.");
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.initPoint) {
        toast.success("Redirecionando para o pagamento seguro no Mercado Pago...");
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
    isTrial,
    trialDaysLeft,
    isTrialExpired,
    canAccess,
    createPreference
  };
};
