import { supabase } from "@/integrations/supabase/client";

export async function checkOperationalAnomalies(processId: string, companyId: string) {
  try {
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('process_id', processId);

    if (!documents || documents.length === 0) return;

    const anomalies: any[] = [];

    // 1. Detect Divergent Motor Numbers in OCR Data
    const motorNumbers = documents
      .filter((d: any) => d.extracted_data && d.extracted_data.motor_number)
      .map((d: any) => d.extracted_data.motor_number);
    
    if (new Set(motorNumbers).size > 1) {
      anomalies.push({
        alert_type: 'divergence',
        severity: 'critical',
        description: 'Divergência detectada no número do motor entre os documentos enviados.',
        field_ref: 'motor_number'
      });
    }

    // 2. Detect Expired Documents
    const now = new Date();
    documents.forEach((doc: any) => {
      if (doc.expiry_date && new Date(doc.expiry_date) < now) {
        anomalies.push({
          alert_type: 'expired',
          severity: 'critical',
          description: `O documento ${doc.document_type} está vencido.`,
          document_id: doc.id
        });
      }
    });

    // 3. Detect Missing GRU
    const hasGru = documents.some((d: any) => d.document_type === 'FINANCIAL_GRU');
    if (!hasGru) {
      anomalies.push({
        alert_type: 'missing_data',
        severity: 'warning',
        description: 'GRU de pagamento não identificada neste processo.'
      });
    }

    // Save alerts to DB
    if (anomalies.length > 0) {
      await supabase.from('operational_alerts').insert(
        anomalies.map(a => ({ ...a, process_id: processId, company_id: companyId }))
      );
      
      // Also update process status to blocked if critical
      if (anomalies.some(a => a.severity === 'critical')) {
        await supabase.from('processes').update({ is_blocked: true }).eq('id', processId);
      }
    }

  } catch (error) {
    console.error("Anomaly Detection Error:", error);
  }
}
