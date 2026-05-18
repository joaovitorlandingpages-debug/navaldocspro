import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProcessRequirements(processType?: string) {
  const { data: requirements, isLoading } = useQuery({
    queryKey: ["process-requirements", processType],
    queryFn: async () => {
      if (!processType) return [];
      
      const { data, error } = await supabase
        .from("process_type_requirements")
        .select(`
          *,
          template:document_templates(*)
        `)
        .eq("process_type", processType);

      if (error) throw error;
      return data;
    },
    enabled: !!processType,
  });

  return {
    requirements,
    isLoading,
  };
}
