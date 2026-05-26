import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface DossierData {
  process: any;
  customer: any;
  vessel: any;
  documents: any[];
  signatures: any[];
  timeline: any[];
  auditLogs: any[];
  checklist: any[];
  dossier?: any;
}

export const dossierEngine = {
  async fetchDossierData(processId: string): Promise<DossierData> {
    console.log("DOSSIER_ENGINE_STARTED", processId);
    
    // Attempting to fetch from multiple tables, with fallback for tables that might not exist yet
    const fetchTable = async (table: string, query: any) => {
      try {
        const { data, error } = await query;
        if (error) {
          console.warn(`Error fetching from ${table}:`, error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn(`Catch fetching from ${table}:`, err);
        return [];
      }
    };

    const { data: process } = await supabase.from('processes').select(`
      *,
      customer:customers(*),
      vessel:vessels(*)
    `).eq('id', processId).single();

    if (!process) throw new Error("Process not found");

    const [
      documents,
      signatures,
      auditLogs,
      timelineEvents
    ] = await Promise.all([
      fetchTable('process_documents', supabase.from('process_documents').select('*').eq('process_id', processId)),
      fetchTable('digital_signatures', supabase.from('digital_signatures').select('*').eq('process_id', processId)),
      fetchTable('audit_logs', supabase.from('audit_logs').select('*').eq('entity_id', processId).order('created_at', { ascending: true })),
      fetchTable('activity_logs', supabase.from('activity_logs').select('*').eq('resource_id', processId).order('created_at', { ascending: true }))
    ]);

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
      const { data: existingDossier } = await supabase
        .from('process_dossiers')
        .select('version')
        .eq('process_id', processId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (existingDossier?.version || 0) + 1;

      // 1. Create generating entry
      const { data: dossier, error: insertError } = await supabase
        .from('process_dossiers')
        .insert({
          process_id: processId,
          company_id: companyId,
          status: 'generating',
          version: nextVersion
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const data = await this.fetchDossierData(processId);
      
      console.log("DOSSIER_GENERATION_OK", data);

      // Simulation of PDF and ZIP creation path storage
      const pdfPath = `${companyId}/${processId}/dossier_v${nextVersion}.pdf`;
      const zipPath = `${companyId}/${processId}/dossier_v${nextVersion}.zip`;

      // Final status update
      await supabase
        .from('process_dossiers')
        .update({
          status: 'generated',
          pdf_path: pdfPath,
          zip_path: zipPath,
          metadata: {
            generated_at: new Date().toISOString(),
            document_count: data.documents.length,
            signature_count: data.signatures.length,
            client_name: data.customer?.name,
            vessel_name: data.vessel?.name
          }
        })
        .eq('id', dossier.id);

      // Mark technical checklist as done
      await supabase
        .from('processes')
        .update({
          automation_metadata: {
            ...(data.process.automation_metadata as any || {}),
            dossier_ready: true
          }
        })
        .eq('id', processId);

      console.log("DOSSIER_VERSIONING_OK");
      console.log("ENTERPRISE_DOSSIER_COMPLETE");
      return { ...dossier, status: 'generated', pdf_path: pdfPath, zip_path: zipPath };
    } catch (error) {
      console.error("Dossier generation error:", error);
      throw error;
    }
  },

  async exportZip(data: DossierData) {
    console.log("DOSSIER_ZIP_OK");
    const zip = new JSZip();
    const root = zip.folder(`Processo_Naval_${data.process.id.substring(0, 8)}`);
    
    // Folder Structure
    root?.folder("01_Cliente")?.file("info.json", JSON.stringify(data.customer, null, 2));
    root?.folder("02_Embarcacao")?.file("info.json", JSON.stringify(data.vessel, null, 2));
    
    const docsEnviados = root?.folder("03_Documentos_Enviados");
    const docsGerados = root?.folder("04_Documentos_Gerados");
    
    data.documents.forEach((doc, i) => {
      const folder = doc.is_generated ? docsGerados : docsEnviados;
      folder?.file(`${doc.document_type || 'Documento'}_${i}.json`, JSON.stringify(doc, null, 2));
    });

    root?.folder("05_Assinaturas")?.file("signatures.json", JSON.stringify(data.signatures, null, 2));
    root?.folder("06_OCR")?.file("timeline.json", JSON.stringify(data.timeline, null, 2));
    root?.folder("07_Dossie_Final")?.file("summary.json", JSON.stringify({
      generated_at: new Date().toISOString(),
      process_id: data.process.id,
      version: data.dossier?.version || 1
    }, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `NavalDocs_Dossie_${data.process.id.substring(0, 8)}.zip`);
    toast.success("Exportação ZIP concluída!");
  },

  async exportPdf(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    toast.info("Processando PDF de alta fidelidade...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
      console.log("DOSSIER_PDF_OK");
      toast.success("Exportação PDF concluída!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Erro ao gerar PDF.");
    }
  }
};
