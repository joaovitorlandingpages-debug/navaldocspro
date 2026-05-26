import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dossierEngine } from "@/services/automation/dossierEngine";
import { toast } from "sonner";

export function useDossier(processId: string, companyId?: string) {
  const [dossier, setDossier] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDossier = async () => {
    if (!processId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_dossiers')
        .select('*')
        .eq('process_id', processId)
        .maybeSingle();
      
      if (error) throw error;
      setDossier(data);
    } catch (err) {
      console.error("Error fetching dossier:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
    
    const channel = supabase
      .channel(`dossier-${processId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_dossiers', filter: `process_id=eq.${processId}` },
        () => fetchDossier()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processId]);

  const generate = async () => {
    if (!companyId) return;
    try {
      toast.info("Iniciando geração do dossiê enterprise...");
      await dossierEngine.generateDossier(processId, companyId);
      toast.success("Dossiê gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar dossiê: " + err.message);
    }
  };

  return { dossier, isLoading, generate, refresh: fetchDossier };
}
