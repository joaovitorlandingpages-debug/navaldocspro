import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentAutomationEngine } from "./documentAutomationEngine";
import {
  runCanonicalBatch,
  type CanonicalBatchItem,
  type CanonicalBatchReport,
} from "@/services/documents/canonicalBatchRunner";

export class BatchGenerationService {
  /**
   * Gera todos os documentos obrigatórios pendentes de um processo.
   *
   * Sub-sub-fatia F.2.c — C7 migrado:
   *   delega ao pipeline canônico via `runCanonicalBatch`.
   *   Não invoca Edge, não monta idempotency key, não insere em
   *   `generated_documents`, não resolve template.
   */
  static async generateAllMissing(processId: string): Promise<CanonicalBatchReport | null> {
    try {
      const { data: state } = await supabase
        .from('process_automation_state')
        .select('*')
        .eq('process_id', processId)
        .single();

      if (!state || !state.checklist_status) {
        toast.error("Estado de automação não encontrado para este processo.");
        return null;
      }

      const missingDocs = (state.checklist_status as any[]).filter(
        (item: any) => item.is_mandatory && item.status === 'missing',
      );

      if (missingDocs.length === 0) {
        toast.info("Todos os documentos obrigatórios já estão presentes.");
        return null;
      }

      toast.info(`Iniciando geração de ${missingDocs.length} documento(s)...`);

      const items: CanonicalBatchItem[] = missingDocs
        .filter((d: any) => d.template_id || d.category)
        .map((d: any) => ({
          key: String(d.checklist_id ?? d.id ?? d.template_id ?? d.name),
          label: String(d.name ?? d.item_name ?? "documento"),
          input: {
            processId,
            templateId: d.template_id ?? null,
            category: d.category ?? null,
            checklistItemId: d.checklist_id ?? d.id ?? null,
            actionIntent: "automation_batch_generate",
          },
        }));

      const skippedNoTemplate = missingDocs.length - items.length;
      const report = await runCanonicalBatch(items);

      if (report.generated > 0 || report.reused > 0) {
        const parts = [
          report.generated ? `${report.generated} gerado(s)` : null,
          report.reused ? `${report.reused} reaproveitado(s)` : null,
          report.failed ? `${report.failed} falha(s)` : null,
          report.skipped + skippedNoTemplate
            ? `${report.skipped + skippedNoTemplate} ignorado(s)`
            : null,
        ].filter(Boolean);
        toast.success(`Lote concluído: ${parts.join(", ")}.`);
        await DocumentAutomationEngine.logEvent(
          processId,
          'batch_generation',
          `Lote canônico: ${report.generated} gerado(s), ${report.reused} reaproveitado(s), ${report.failed} falha(s).`,
        );
        await DocumentAutomationEngine.analyzeProcess(processId);
      } else if (report.failed > 0) {
        toast.error(`Falha ao gerar documentos em lote (${report.failed} item(ns)).`);
      } else {
        toast.info("Nenhum documento gerado — verifique modelos vinculados.");
      }

      return report;
    } catch (error) {
      console.error("Erro na geração em lote:", error);
      toast.error("Ocorreu um erro inesperado na geração em lote.");
      return null;
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
