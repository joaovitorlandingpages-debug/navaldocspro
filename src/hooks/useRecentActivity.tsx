import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: any;
  created_at: string;
  profiles?: {
    name: string;
  };
}

export const useRecentActivity = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["recent-activity", profile?.company_id],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, profiles(name)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.company_id,
  });
};
