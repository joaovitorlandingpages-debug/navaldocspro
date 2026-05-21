import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeatureFlags = () => {
  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("is_enabled", true);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isEnabled = (flagName: string) => {
    return flags?.some(f => f.name === flagName) ?? false;
  };

  return { isEnabled, isLoading, flags };
};
