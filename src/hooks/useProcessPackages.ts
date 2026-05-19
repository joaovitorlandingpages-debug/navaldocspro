import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProcessPackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["document-process-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_process_packages")
        .select(`
          *,
          items:document_process_package_items(
            *,
            template:document_templates(*)
          )
        `)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  return { packages, isLoading };
}

export function useProcessPackage(processType?: string) {
  const { data: pkg, isLoading } = useQuery({
    queryKey: ["document-process-package", processType],
    queryFn: async () => {
      if (!processType) return null;
      const { data, error } = await supabase
        .from("document_process_packages")
        .select(`
          *,
          items:document_process_package_items(
            *,
            template:document_templates(*)
          )
        `)
        .eq("process_type", processType)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!processType
  });

  return { pkg, isLoading };
}
