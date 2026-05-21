import React, { createContext, useContext } from 'react';
import { useSubscription, Plan, Subscription } from '@/hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PlanLimitContextType {
  subscription: (Subscription & { plan: Plan }) | null | undefined;
  isLoading: boolean;
  checkLimit: (resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files') => Promise<{ reached: boolean; current: number; limit: number | null }>;
}


const PlanLimitContext = createContext<PlanLimitContextType | undefined>(undefined);

export function PlanLimitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subscription, isLoadingSubscription } = useSubscription();

  const checkLimit = async (resource: 'customers' | 'vessels' | 'processes' | 'documents' | 'ocr' | 'users' | 'files') => {
    console.log("PLAN_LIMIT_OK", resource);
    console.log("LIMIT_CONTROL_OK");

    try {
      if (!subscription || !subscription.plan) {
        return { reached: false, current: 0, limit: 5 }; 
      }

      const plan = subscription.plan;
      // Map resources to plan columns
      const limit = resource === 'customers' ? (plan as any).customer_limit : 
                    resource === 'documents' ? (plan as any).document_limit : 
                    resource === 'users' ? plan.user_limit :
                    resource === 'ocr' ? (plan as any).ocr_limit :
                    resource === 'vessels' ? (plan as any).process_limit : // Vessels use process_limit logic as fleet cap
                    resource === 'processes' ? (plan as any).process_limit :
                    null;

      if (limit === null || limit === undefined) return { reached: false, current: 0, limit: null };

      let current = 0;
      
      // Try fetching from real-time usage metrics first for high-load resources
      if (resource === 'ocr' || resource === 'files' || resource === 'documents') {
          const { data: usage } = await supabase.from('usage_metrics').select('*').eq('company_id', subscription.company_id).maybeSingle();
          if (usage) {
              if (resource === 'ocr') current = usage.ocr_usage || 0;
              else if (resource === 'documents') current = usage.docs_generated || 0;
              else if (resource === 'files') current = Math.round((usage.storage_usage_bytes || 0) / (1024 * 1024 * 1024)); // GB
          }
      }

      // Fallback or count-based resources
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
          const { count } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
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
    <PlanLimitContext.Provider value={{ subscription, isLoading: isLoadingSubscription, checkLimit }}>
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
