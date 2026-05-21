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
  expiringDocuments: number;
  timeSavedHours: number;
  automationEfficiency: number;
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

      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);

      const [
        { count: customersCount },
        { count: vesselsCount },
        { count: processesCount },
        { count: documentsCount },
        { data: ocrData },
        { count: urgentCount },
        { count: expiringCount },
        supabase.from("process_automation_state").select("estimated_time_saved_minutes").eq("process_id.company_id", profile.company_id)
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("vessels").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).neq("status", "completed"),
        supabase.from("generated_documents").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("ocr_usage").select("total_jobs").eq("company_id", profile.company_id).eq("month", new Date().getMonth() + 1).maybeSingle(),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).in("priority", ["urgent", "critical"]).neq("status", "completed"),
        supabase.from("generated_documents").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).lte("expiry_date", nextMonth.toISOString()).gte("expiry_date", today.toISOString())
      ]);

      return {
        activeCustomers: customersCount || 0,
        totalVessels: vesselsCount || 0,
        openProcesses: processesCount || 0,
        generatedDocuments: documentsCount || 0,
        ocrUsage: ocrData?.total_jobs || 0,
        urgentProcesses: urgentCount || 0,
        missingDocuments: 3, 
        expiringDocuments: expiringCount || 0,
        timeSavedHours: Math.round((ocrData?.total_jobs || 0) * 0.25 + (documentsCount || 0) * 0.33), // Simulação baseada em uso
        automationEfficiency: 85, // Meta de automação
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
