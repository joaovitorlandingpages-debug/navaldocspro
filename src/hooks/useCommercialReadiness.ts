import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCommercialMetrics() {
  return useQuery({
    queryKey: ["saas-commercial-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_commercial_metrics')
        .select('*')
        .order('recorded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useProductionReadiness() {
  return useQuery({
    queryKey: ["production-readiness-checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_readiness_checks')
        .select('*')
        .order('category');
      
      if (error) throw error;
      return data;
    }
  });
}
