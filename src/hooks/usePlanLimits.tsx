import React, { createContext, useContext } from 'react';
import { useSubscription, Plan, Subscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface PlanLimitContextType {
  subscription: (Subscription & { plan: Plan }) | null | undefined;
  isLoading: boolean;
  isLifetimeAdmin: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  canAccess: boolean;
  checkLimit: (resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files') => Promise<{ reached: boolean; current: number; limit: number | null }>;
}

const PlanLimitContext = createContext<PlanLimitContextType | undefined>(undefined);

export function PlanLimitProvider({ children }: { children: React.ReactNode }) {
  const { 
    subscription, 
    isLoadingSubscription, 
    isLifetimeAdmin,
    isTrial,
    trialDaysLeft,
    isTrialExpired,
    canAccess 
  } = useSubscription();

  const checkLimit = async (resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files') => {
    try {
      // 1. ADMINS TEM ACESSO VITALÍCIO ILIMITADO
      if (isLifetimeAdmin) {
        return { reached: false, current: 0, limit: null };
      }

      // 2. TRIAL EXPIRADO
      if (isTrialExpired) {
        return { reached: true, current: 999, limit: 0 };
      }

      // 3. TRIAL ATIVO (14 DIAS GRÁTIS) - ACESSO TOTAL
      if (isTrial && trialDaysLeft > 0) {
        return { reached: false, current: 0, limit: null };
      }

      if (!subscription || !subscription.plan) {
        return { reached: false, current: 0, limit: null }; 
      }

      const plan = subscription.plan;
      const limit = resource === 'customers' ? plan.customer_limit : 
                    resource === 'documents' ? plan.document_limit : 
                    resource === 'users' ? plan.user_limit :
                    resource === 'ocr' ? plan.ocr_limit :
                    resource === 'vessels' ? (plan.vessel_limit ?? plan.customer_limit) :
                    resource === 'processes' ? plan.process_limit :
                    null;

      if (limit === null || limit === undefined) {
        return { reached: false, current: 0, limit: null };
      }

      let current = 0;
      
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

      if (current === 0) {
        if (resource === 'customers') {
          const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'users') {
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'vessels') {
          const { count } = await supabase.from('vessels').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
          current = count || 0;
        } else if (resource === 'processes') {
          const { count } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id).is('deleted_at', null);
          current = count || 0;
        }
      }

      return {
        reached: current >= limit,
        current,
        limit
      };
    } catch (err) {
      console.error("Error checking plan limit:", err);
      return { reached: false, current: 0, limit: null };
    }
  };

  return (
    <PlanLimitContext.Provider value={{ 
      subscription, 
      isLoading: isLoadingSubscription, 
      isLifetimeAdmin,
      isTrial,
      trialDaysLeft,
      isTrialExpired,
      canAccess,
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
