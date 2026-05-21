import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessAutomationState } from "@/types/process";
import { DocumentAutomationEngine } from "@/services/automation/documentAutomationEngine";
import { toast } from "sonner";

export function useProcessAutomation(processId?: string) {
  const [automationState, setAutomationState] = useState<ProcessAutomationState | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAutomationState = async () => {
    if (!processId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_automation_state')
        .select('*')
        .eq('process_id', processId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAutomationState(data as unknown as ProcessAutomationState);
      } else {
        // Se não existir, tenta analisar pela primeira vez
        const newState = await DocumentAutomationEngine.analyzeProcess(processId);
        setAutomationState(newState);
      }

      // 1.5 Gerar insights de IA após carregar/atualizar o estado
      await DocumentAutomationEngine.generateInsights(processId);

      // Fetch logs
      const { data: logsData } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setLogs(logsData || []);

    } catch (error) {
      console.error("Error fetching automation state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reanalyze = async () => {
    if (!processId) return;
    setIsLoading(true);
    const newState = await DocumentAutomationEngine.analyzeProcess(processId);
    if (newState) {
      setAutomationState(newState);
      toast.success("Análise concluída: O motor de automação atualizou os requisitos do processo.");
      fetchAutomationState(); // Refresh logs too
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAutomationState();

    // Subscribe to changes in documents and process automation state
    const channel = supabase
      .channel(`process-automation-${processId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'documents',
        filter: `process_id=eq.${processId}`
      }, () => {
        reanalyze();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'process_automation_state',
        filter: `process_id=eq.${processId}`
      }, (payload: any) => {
        setAutomationState(payload.new as unknown as ProcessAutomationState);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processId]);

  return { automationState, logs, isLoading, reanalyze };
}
