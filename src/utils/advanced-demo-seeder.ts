import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function seedAdvancedDemo(companyId: string) {
  try {
    // 1. Create a Deep Process with Insights and Alerts
    const { data: vessel } = await supabase.from('vessels').insert({
      company_id: companyId,
      name: 'OCEAN MASTER (DEMO)',
      type: 'TUG',
      registration_number: 'PR-2024-999Z',
    }).select().single();

    const { data: process } = await supabase.from('processes').insert({
      company_id: companyId,
      vessel_id: vessel?.id,
      title: 'VISTORIA DE ARQUEAÇÃO - OCEAN MASTER',
      process_type: 'VISTORIA',
      status: 'in_progress',
      completion_percentage: 85,
      is_blocked: true,
      sla_status: 'warning'
    }).select().single();

    // 2. Add Critical Anomaly
    await supabase.from('operational_alerts').insert({
      process_id: process?.id,
      company_id: companyId,
      alert_type: 'divergence',
      severity: 'critical',
      description: 'Divergência Crítica: Número do motor no TIE não coincide com o Memorial Técnico.',
      field_ref: 'motor_number'
    });

    // 3. Add AI Insights
    await supabase.from('process_insights').insert([
      { process_id: process?.id, company_id: companyId, type: 'automation', message: 'Dados suficientes para gerar Requerimento DPC.', metadata: { action: 'generate_dpc' } },
      { process_id: process?.id, company_id: companyId, type: 'bottleneck', message: 'Aguardando confirmação de vistoria pelo engenheiro responsável.', metadata: { delay_hours: 72 } }
    ]);

    toast.success("Cenário de Inteligência Operacional gerado!");
    return true;
  } catch (error: any) {
    toast.error("Erro ao gerar demo avançada: " + error.message);
    return false;
  }
}
