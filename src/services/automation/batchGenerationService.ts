import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentAutomationEngine } from "./documentAutomationEngine";

export class BatchGenerationService {
  /**
   * Gera todos os documentos obrigatórios pendentes de um processo.
   */
  static async generateAllMissing(processId: string) {
    try {
      // 1. Obter estado de automação
      const { data: state } = await supabase
        .from('process_automation_state')
        .select('*')
        .eq('process_id', processId)
        .single();

      if (!state || !state.checklist_status) {
        toast.error("Estado de automação não encontrado para este processo.");
        return;
      }

      const missingDocs = state.checklist_status.filter((item: any) => 
        item.is_mandatory && item.status === 'missing'
      );

      if (missingDocs.length === 0) {
        toast.info("Todos os documentos obrigatórios já estão presentes.");
        return;
      }

      toast.info(`Iniciando geração de ${missingDocs.length} documentos...`);

      // 2. Para cada documento faltando, chamar o serviço de geração (Edge Function)
      // Aqui simulamos chamando a edge function 'generate-document'
      const generationPromises = missingDocs.map(async (doc: any) => {
        const { error } = await supabase.functions.invoke("generate-document", {
          body: {
            templateId: doc.template_id,
            processId: processId,
            // O serviço deve buscar os dados automaticamente no backend
          },
        });
        return { name: doc.name, success: !error };
      });

      const results = await Promise.all(generationPromises);
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} documentos gerados com sucesso!`);
        await DocumentAutomationEngine.logEvent(processId, 'batch_generation', `${successCount} documentos gerados em lote.`);
        await DocumentAutomationEngine.analyzeProcess(processId);
      } else {
        toast.error("Falha ao gerar documentos em lote.");
      }

    } catch (error) {
      console.error("Erro na geração em lote:", error);
      toast.error("Ocorreu um erro inesperado na geração em lote.");
    }
  }

  /**
   * Cria um pacote ZIP com todos os documentos do processo (Simulado).
   */
  static async createProcessPackage(processId: string) {
    toast.info("Preparando pacote documental para download...");
    
    // Log do evento
    await DocumentAutomationEngine.logEvent(processId, 'package_created', "Pacote documental ZIP solicitado.");
    
    // Simulação de download
    setTimeout(() => {
        toast.success("Pacote pronto! O download iniciará em instantes.");
    }, 2000);
  }
}
