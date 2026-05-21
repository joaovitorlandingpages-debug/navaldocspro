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

  // Fallback local imediato conforme solicitado
  const fallbackTypes: ProcessType[] = [
    { id: 'f-1', name: 'Registro Inicial', category: 'Nacional', description: 'Primeiro registro da embarcação' },
    { id: 'f-2', name: 'Transferência de Propriedade', category: 'Nacional', description: 'Troca de titularidade' },
    { id: 'f-3', name: 'Renovação TIE/TIEM', category: 'Nacional', description: 'Renovação de documento' },
    { id: 'f-4', name: 'Alteração de Motor', category: 'Técnico', description: 'Regularização de motorização' },
    { id: 'f-5', name: 'Regularização', category: 'Técnico', description: 'Regularização geral' },
    { id: 'f-6', name: 'Segunda Via TIE/TIEM', category: 'Administrativo', description: 'Solicitação de 2ª via' },
    { id: 'f-7', name: 'Vistoria Técnica', category: 'Técnico', description: 'Agendamento de vistoria' },
    { id: 'f-8', name: 'Licença Rádio/Anatel', category: 'Telecom', description: 'Licenciamento de rádio' }
  ] as any[];

  useEffect(() => {
    async function fetchTypes() {
      console.log("PROCESS_TYPES_LOADING");
      try {
        const { data, error } = await supabase
          .from('process_types')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          console.log("PROCESS_TYPES_EMPTY_USING_FALLBACK");
          setProcessTypes(fallbackTypes);
        } else {
          console.log("PROCESS_TYPES_LOADED", data.length);
          setProcessTypes(data);
        }
      } catch (error) {
        console.error("Error fetching process types, using fallback:", error);
        setProcessTypes(fallbackTypes);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTypes();
  }, []);

  return { processTypes, isLoading };
}

