import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";

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
    console.log("DOSSIER_DEEP_AUDIT_STARTED", processId);
    
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
      customer:customers!processes_customer_id_fkey(*),
      vessel:vessels!processes_vessel_id_fkey(*),
      company:companies(*)
    `).eq('id', processId).single();

    if (!process) throw new Error("Process not found");

    const [
      documents,
      generatedDocuments,
      signatures,
      auditLogs,
      timelineEvents
    ] = await Promise.all([
      fetchTable('documents', supabase.from('documents').select('*').eq('process_id', processId)),
      fetchTable('generated_documents', supabase.from('generated_documents').select('*').eq('process_id', processId)),
      fetchTable('digital_signatures', supabase.from('digital_signatures').select('*').eq('process_id', processId)),
      fetchTable('audit_logs', supabase.from('document_audit_logs').select('*, profiles(full_name)').eq('document_id', processId).order('created_at', { ascending: true })),
      fetchTable('activity_logs', supabase.from('activity_logs').select('*').eq('resource_id', processId).order('created_at', { ascending: true }))
    ]);

    return {
      process,
      customer: process.customer,
      vessel: process.vessel,
      documents: [...(generatedDocuments || []), ...(documents || [])],
      signatures: signatures || [],
      timeline: timelineEvents || [],
      auditLogs: auditLogs || [],
      checklist: (process.automation_metadata as any)?.checklist_status || []
    };
  },

  async generateDossier(processId: string, companyId: string) {
    try {
      const { limitsEngine } = await import("@/services/limitsEngine");
      const allowed = await limitsEngine.enforce("dossier_export", 1, companyId);
      if (!allowed) throw new Error("Limite de dossiês atingido para o plano atual.");

      const { data: existingDossier } = await supabase
        .from('process_dossiers')
        .select('version')
        .eq('process_id', processId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (existingDossier?.version || 0) + 1;

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
      console.log("DOSSIER_GENERATION_OK", { documents: data.documents.length, signatures: data.signatures.length });

      // Build real ZIP bundle
      const zip = new JSZip();
      const manifest: any = {
        generated_at: new Date().toISOString(),
        process_id: processId,
        version: nextVersion,
        client: data.customer?.name ?? null,
        vessel: data.vessel?.name ?? null,
        contents: [] as any[],
      };

      // Cover PDF
      const cover = new jsPDF("p", "mm", "a4");
      cover.setFontSize(18);
      cover.text("Dossiê do Processo Naval", 20, 25);
      cover.setFontSize(11);
      cover.text(`Processo: ${data.process.process_type || processId}`, 20, 40);
      cover.text(`Protocolo: ${data.process.protocol_number || "—"}`, 20, 48);
      cover.text(`Cliente: ${data.customer?.name || "—"}`, 20, 56);
      cover.text(`Embarcação: ${data.vessel?.name || "—"}`, 20, 64);
      cover.text(`Versão: v${nextVersion}`, 20, 72);
      cover.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 80);
      cover.text(`Documentos: ${data.documents.length}`, 20, 92);
      cover.text(`Assinaturas: ${data.signatures.length}`, 20, 100);
      const coverBlob = cover.output("blob");
      zip.file("00_capa.pdf", coverBlob);
      manifest.contents.push({ path: "00_capa.pdf", type: "cover" });

      // Helper to download a storage object into the zip
      const addFromStorage = async (bucket: string, path: string, zipPath: string, type: string) => {
        if (!path) return false;
        try {
          const { data: blob, error } = await supabase.storage.from(bucket).download(path);
          if (error || !blob) { console.warn("[DOSSIER_MISS]", bucket, path, error?.message); return false; }
          zip.file(zipPath, blob);
          manifest.contents.push({ path: zipPath, type, source: `${bucket}/${path}` });
          return true;
        } catch (e: any) {
          console.warn("[DOSSIER_MISS_EXC]", bucket, path, e?.message);
          return false;
        }
      };

      // Generated documents
      let idx = 1;
      for (const d of data.documents) {
        const url: string | null = d.generated_file_url || d.file_url || null;
        if (!url) continue;
        const name = (d.name || d.document_type || `documento_${idx}`).toString().replace(/[^\w.\-]+/g, "_");
        await addFromStorage("generated-documents", url, `03_Documentos/${String(idx).padStart(2, "0")}_${name}.pdf`, "generated_document");
        idx++;
      }

      // Signed PDFs + certificates
      let sIdx = 1;
      for (const s of data.signatures as any[]) {
        if (s.final_signed_pdf_url) {
          await addFromStorage("signed-documents", s.final_signed_pdf_url,
            `05_Assinaturas/${String(sIdx).padStart(2, "0")}_assinado.pdf`, "signed_pdf");
        }
        if (s.evidence_certificate_url) {
          await addFromStorage("signed-documents", s.evidence_certificate_url,
            `05_Assinaturas/${String(sIdx).padStart(2, "0")}_certificado.pdf`, "certificate");
        }
        sIdx++;
      }

      // Attachments
      const { data: attachments } = await supabase.from("process_attachments" as any)
        .select("*").eq("process_id", processId);
      let aIdx = 1;
      for (const a of (attachments as any[] | null) || []) {
        if (!a.file_url) continue;
        const name = (a.file_name || `anexo_${aIdx}`).replace(/[^\w.\-]+/g, "_");
        await addFromStorage("process-attachments", a.file_url,
          `07_Anexos/${String(aIdx).padStart(2, "0")}_${name}`, "attachment");
        aIdx++;
      }

      // Info JSON files
      zip.file("01_Cliente/info.json", JSON.stringify(data.customer, null, 2));
      zip.file("02_Embarcacao/info.json", JSON.stringify(data.vessel, null, 2));
      zip.file("06_Timeline/timeline.json", JSON.stringify(data.timeline, null, 2));
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipPath = `${companyId}/${processId}/dossier_v${nextVersion}.zip`;

      const { error: upErr } = await supabase.storage
        .from("process-dossiers")
        .upload(zipPath, zipBlob, {
          contentType: "application/zip",
          upsert: true,
        });
      if (upErr) throw new Error(`Upload do dossiê falhou: ${upErr.message}`);

      await supabase
        .from('process_dossiers')
        .update({
          status: 'generated',
          file_url: zipPath,
          metadata: {
            generated_at: new Date().toISOString(),
            bucket: "process-dossiers",
            zip_path: zipPath,
            zip_size: zipBlob.size,
            document_count: data.documents.length,
            signature_count: data.signatures.length,
            attachment_count: ((attachments as any[] | null) || []).length,
            client_name: data.customer?.name,
            vessel_name: data.vessel?.name,
            manifest_entries: manifest.contents.length,
          }
        })
        .eq('id', dossier.id);

      try {
        await limitsEngine.consume("dossier_export", 1, { process_id: processId, version: nextVersion }, dossier.id, companyId);
      } catch (e) { console.warn("[DOSSIER_CONSUME_FAIL]", e); }

      await supabase
        .from('processes')
        .update({
          automation_metadata: {
            ...(data.process.automation_metadata as any || {}),
            dossier_ready: true
          }
        })
        .eq('id', processId);

      console.log("ENTERPRISE_DOSSIER_COMPLETE", zipPath, zipBlob.size);
      return { ...dossier, status: 'generated', file_url: zipPath, metadata: { zip_path: zipPath, zip_size: zipBlob.size } };
    } catch (error) {
      console.error("Dossier generation error:", error);
      throw error;
    }
  },

  async downloadDossier(dossierRow: { file_url: string; company_id: string; process_id: string }) {
    const path = dossierRow.file_url;
    const bucket = path.endsWith(".zip") ? "process-dossiers" : "generated-documents";
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
    if (error || !data) throw new Error(error?.message || "Falha ao gerar URL");
    window.open(data.signedUrl, "_blank");
  },

  async exportZip(data: DossierData) {
    console.log("DOSSIER_ZIP_OK");
    const zip = new JSZip();
    const root = zip.folder(`Processo_Naval_${data.process.id.substring(0, 8)}`);
    
    // Folder Structure
    root?.folder("01_Cliente")?.file("info.json", JSON.stringify(data.customer, null, 2));
    root?.folder("02_Embarcacao")?.file("info.json", JSON.stringify(data.vessel, null, 2));
    
    const docs = root?.folder("03_Documentos");
    const ocr = root?.folder("04_OCR");
    const signatures = root?.folder("05_Assinaturas");
    const dossierFinal = root?.folder("06_Dossie");
    
    data.documents.forEach((doc, i) => {
      docs?.file(`${doc.document_type || 'Documento'}_${i}.json`, JSON.stringify(doc, null, 2));
    });

    signatures?.file("assinaturas.json", JSON.stringify(data.signatures, null, 2));
    ocr?.file("ocr_data.json", JSON.stringify(data.documents.filter(d => d.extracted_data), null, 2));
    
    dossierFinal?.file("resumo_executivo.json", JSON.stringify({
      generated_at: new Date().toISOString(),
      process_id: data.process.id,
      version: data.dossier?.version || 1,
      timeline: data.timeline
    }, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `NavalDocs_Dossie_${data.process.id.substring(0, 8)}.zip`);
    toast.success("Exportação ZIP concluída!");
  },

  async exportPdf(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error("Elemento de visualização não encontrado.");
      return;
    }

    toast.info("Processando PDF de alta fidelidade...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // ~210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // ~297 mm
      const imgProps = pdf.getImageProperties(imgData);
      const totalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = totalPdfHeight;
      let position = 0;

      // Primeira página
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, totalPdfHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // Páginas subsequentes com quebra limpa
      while (heightLeft > 2) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, totalPdfHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      // Gatilho universal (compatível com Safari iOS e Chrome Android/Desktop)
      const { downloadOrOpenPdf } = await import("@/utils/pdf-export");
      downloadOrOpenPdf(pdf, filename);

      console.log("DOSSIER_PDF_OK");
      toast.success("Exportação PDF concluída!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Erro ao gerar PDF.");
    }
  }
};
