import React, { createContext, useContext } from 'react';
import { useSubscription, Plan, Subscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

export interface CheckLimitResult {
  reached: boolean;
  current: number;
  limit: number | null;
  allowed?: boolean;
  reason?: string;
}

export interface PlanLimitContextType {
  subscription: (Subscription & { plan: Plan }) | null | undefined;
  isLoading: boolean;
  isLifetimeAdmin: boolean;
  isHomologation: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  isInGracePeriod: boolean;
  graceDaysLeft: number;
  isPastDue: boolean;
  isCanceled: boolean;
  canAccess: boolean;
  canCreate: boolean;
  checkLimit: (resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files') => Promise<CheckLimitResult>;
}

const PlanLimitContext = createContext<PlanLimitContextType | undefined>(undefined);

export function PlanLimitProvider({ children }: { children: React.ReactNode }) {
  const { 
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
    canCreate
  } = useSubscription();

  const checkLimit = async (
    resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files'
  ): Promise<CheckLimitResult> => {
    try {
      // 1. ADMINS OU TENANTS DE HOMOLOGAÇÃO: ACESSO TOTAL ILIMITADO (NUNCA BLOQUEIA)
      if (isLifetimeAdmin || isHomologation) {
        return { reached: false, current: 0, limit: null, allowed: true };
      }

      // 2. TRIAL OU ASSINATURA EXPIRADA FORA DA CARÊNCIA: BLOQUEIA APENAS CRIAÇÃO DE NOVOS ITENS
      if (isTrialExpired || (!canCreate && !isInGracePeriod)) {
        return { 
          reached: true, 
          current: 999, 
          limit: 0, 
          allowed: false,
          reason: "Período de teste ou assinatura expirado. Regularize seu plano para criar novos registros."
        };
      }

      if (!subscription || !subscription.plan) {
        return { reached: false, current: 0, limit: null, allowed: true }; 
      }

      const plan = subscription.plan;
      const limit = resource === 'customers' ? plan.customer_limit : 
                    resource === 'documents' ? plan.document_limit : 
                    resource === 'users' ? plan.user_limit :
                    resource === 'ocr' ? plan.ocr_limit :
                    resource === 'vessels' ? (plan.vessel_limit ?? plan.customer_limit) :
                    resource === 'processes' ? plan.process_limit :
                    null;

      // Se o recurso não tem limite definido (ilimitado)
      if (limit === null || limit === undefined) {
        return { reached: false, current: 0, limit: null, allowed: true };
      }

      let current = 0;
      
      // Checagem via usage_metrics para recursos de consumo
      if (resource === 'ocr' || resource === 'files' || resource === 'documents') {
        const { data: usage } = await supabase
          .from('usage_metrics')
          .select('*')
          .eq('company_id', subscription.company_id)
          .maybeSingle();

        if (usage) {
          if (resource === 'ocr') current = usage.ocr_usage || 0;
          else if (resource === 'documents') current = usage.docs_generated || 0;
          else if (resource === 'files') current = Math.round((usage.storage_usage_bytes || 0) / (1024 * 1024 * 1024));
        }
      }

      // Contagem exata das tabelas no banco de dados
      if (current === 0) {
        if (resource === 'customers') {
          const { count } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'users') {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'vessels') {
          const { count } = await supabase
            .from('vessels')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'processes') {
          const { count } = await supabase
            .from('processes')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', subscription.company_id)
            .is('deleted_at', null);
          current = count || 0;
        }
      }

      const reached = current >= limit;

      return {
        reached,
        current,
        limit,
        allowed: !reached,
        reason: reached 
          ? `Limite de ${resource} atingido (${current}/${limit}). Faça upgrade do plano para expandir.` 
          : undefined
      };
    } catch (err) {
      console.error("Erro ao verificar limites do plano:", err);
      // Em caso de falha transitória de infraestrutura, fail-open para não travar operação
      return { reached: false, current: 0, limit: null, allowed: true };
    }
  };

  return (
    <PlanLimitContext.Provider value={{ 
      subscription, 
      isLoading: isLoadingSubscription, 
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
      checkLimit 
    }}>
      {children}
    </PlanLimitContext.Provider>
  );
}

export const usePlanLimits = () => {
  const context = useContext(PlanLimitContext);
  if (context === undefined) {
    throw new Error('usePlanLimits must be used within a PlanLimitProvider');
  }
  return context;
};
