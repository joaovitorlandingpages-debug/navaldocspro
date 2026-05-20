import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessDocumentPackage, ProcessType } from "@/types/process";

export function useProcessRequirements(processTypeId?: string) {
  const [requirements, setRequirements] = useState<ProcessDocumentPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processType, setProcessType] = useState<ProcessType | null>(null);

  useEffect(() => {
    async function fetchRequirements() {
      if (!processTypeId) {
        setRequirements([]);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch requirements
        const { data: reqData, error: reqError } = await supabase
          .from('process_document_packages')
          .select(`
            *,
            template:document_templates(id, name, description, category_id)
          `)
          .eq('process_type_id', processTypeId)
          .order('order_index', { ascending: true });

        if (reqError) throw reqError;
        setRequirements(reqData || []);

        // Fetch process type info
        const { data: typeData, error: typeError } = await supabase
          .from('process_types')
          .select('*')
          .eq('id', processTypeId)
          .single();

        if (typeError) throw typeError;
        setProcessType(typeData);
      } catch (error) {
        console.error("Error fetching process requirements:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequirements();
  }, [processTypeId]);

  return { requirements, processType, isLoading };
}

export function useProcessTypes() {
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTypes() {
      try {
        const { data, error } = await supabase
          .from('process_types')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setProcessTypes(data || []);
      } catch (error) {
        console.error("Error fetching process types:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTypes();
  }, []);

  return { processTypes, isLoading };
}
