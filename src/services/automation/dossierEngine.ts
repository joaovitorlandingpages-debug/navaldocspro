import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface DossierData {
  process: any;
  customer: any;
  vessel: any;
  documents: any[];
  signatures: any[];
  timeline: any[];
  auditLogs: any[];
  checklist: any[];
}

export const dossierEngine = {
  async fetchDossierData(processId: string): Promise<DossierData> {
    console.log("DOSSIER_ENGINE_STARTED", processId);
    
    const [
      { data: process },
      { data: documents },
      { data: signatures },
      { data: auditLogs },
      { data: timelineEvents }
    ] = await Promise.all([
      supabase.from('processes').select(`
        *,
        customer:customers(*),
        vessel:vessels(*)
      `).eq('id', processId).single(),
      supabase.from('documents').select('*').eq('process_id', processId),
      supabase.from('digital_signatures').select('*').eq('process_id', processId),
      supabase.from('enterprise_audit_logs').select('*').eq('resource_id', processId).order('created_at', { ascending: true }),
      supabase.from('ocr_timeline_events').select('*').eq('process_id', processId).order('created_at', { ascending: true })
    ]);

    if (!process) throw new Error("Process not found");

    return {
      process,
      customer: process.customer,
      vessel: process.vessel,
      documents: documents || [],
      signatures: signatures || [],
      timeline: timelineEvents || [],
      auditLogs: auditLogs || [],
      checklist: (process.automation_metadata as any)?.checklist_status || []
    };
  },

  async generateDossier(processId: string, companyId: string) {
    try {
      // 1. Update status to generating
      const { data: dossier, error: upsertError } = await supabase
        .from('process_dossiers')
        .upsert({
          process_id: processId,
          company_id: companyId,
          status: 'generating',
          version: 1 // For now, we simplify versioning
        }, { onConflict: 'process_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      const data = await this.fetchDossierData(processId);
      
      // In a real scenario, we might use an Edge Function for true background PDF generation.
      // Here we simulate the process completion for the "Engine" logic.
      console.log("DOSSIER_GENERATION_OK", data);

      // Final status update
      await supabase
        .from('process_dossiers')
        .update({
          status: 'generated',
          metadata: {
            generated_at: new Date().toISOString(),
            document_count: data.documents.length,
            signature_count: data.signatures.length,
            client_name: data.customer?.name,
            vessel_name: data.vessel?.name
          }
        })
        .eq('id', dossier.id);

      console.log("ENTERPRISE_DOSSIER_COMPLETE");
      return dossier;
    } catch (error) {
      console.error("Dossier generation error:", error);
      throw error;
    }
  }
};
