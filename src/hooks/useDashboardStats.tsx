import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardStats {
  activeCustomers: number;
  totalVessels: number;
  openProcesses: number;
  generatedDocuments: number;
  ocrUsage: number;
  urgentProcesses: number;
  missingDocuments: number;
  trends: {
    customers: string;
    vessels: string;
    processes: string;
    documents: string;
  };
}


export const useDashboardStats = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", profile?.company_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!profile?.company_id) throw new Error("No company ID");

      const [
        { count: customersCount },
        { count: vesselsCount },
        { count: processesCount },
        { count: documentsCount },
        { data: ocrData },
        { count: urgentCount }
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("vessels").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).neq("status", "completed"),
        supabase.from("generated_documents").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("ocr_usage").select("total_jobs").eq("company_id", profile.company_id).eq("month", new Date().getMonth() + 1).maybeSingle(),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("priority", "high").neq("status", "completed")
      ]);

      return {
        activeCustomers: customersCount || 0,
        totalVessels: vesselsCount || 0,
        openProcesses: processesCount || 0,
        generatedDocuments: documentsCount || 0,
        ocrUsage: ocrData?.total_jobs || 0,
        urgentProcesses: urgentCount || 0,
        missingDocuments: 3, // Mocked for now
        trends: {

          customers: "+0%",
          vessels: "+0%",
          processes: "Estável",
          documents: "+0%"
        }
      };
    },
    enabled: !!profile?.company_id,
  });
};
