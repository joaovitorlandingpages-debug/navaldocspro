import React, { createContext, useContext } from 'react';
import { useSubscription, Plan, Subscription } from '@/hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PlanLimitContextType {
  subscription: (Subscription & { plan: Plan }) | null | undefined;
  isLoading: boolean;
  checkLimit: (resource: 'customers' | 'documents' | 'users' | 'ocr') => Promise<{ reached: boolean; current: number; limit: number | null }>;
}

const PlanLimitContext = createContext<PlanLimitContextType | undefined>(undefined);

export function PlanLimitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subscription, isLoadingSubscription } = useSubscription();

  const checkLimit = async (resource: 'customers' | 'documents' | 'users' | 'ocr') => {
    try {
      if (!subscription || !subscription.plan) {
        // Default limits if no subscription found (could be a trial period or free tier)
        return { reached: false, current: 0, limit: null };
      }

      const plan = subscription.plan;
      const limit = resource === 'customers' ? plan.customer_limit : 
                    resource === 'documents' ? plan.document_limit : 
                    resource === 'users' ? plan.user_limit :
                    plan.ocr_limit;

      if (limit === null || limit === undefined) return { reached: false, current: 0, limit: null };

      let current = 0;
      if (resource === 'customers') {
        const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
        current = count || 0;
      } else if (resource === 'documents') {
        const { count } = await supabase.from('generated_documents').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
        current = count || 0;
      } else if (resource === 'users') {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', subscription.company_id);
        current = count || 0;
      } else if (resource === 'ocr') {
        // Assuming OCR jobs are in a table, or we count logs
        const { count } = await supabase.from('payment_logs').select('*', { count: 'exact', head: true })
            .eq('company_id', subscription.company_id)
            .eq('event_type', 'ocr_processed');
        current = count || 0;
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
