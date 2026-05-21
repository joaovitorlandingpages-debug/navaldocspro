import { supabase } from "@/integrations/supabase/client";

export async function seedPremiumDemo(companyId: string, userId: string) {
  console.log("Seeding Premium Demo for company:", companyId);

  // 1. Create Intelligence Insights
  const insights = [
    {
      company_id: companyId,
      user_id: userId,
      type: 'automation',
      message: 'O processo #2026-NAV-04 já possui todos os dados extraídos via OCR para emissão do BCE.',
      action_label: 'Gerar BCE Agora',
      confidence_score: 0.99
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'automation',
      message: 'O processo #2026-NAV-02 possui documentos validados. Recomendamos gerar o Requerimento DPC-2211.',
      action_label: 'Gerar DPC-2211',
      confidence_score: 0.98
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'critical',
      message: 'Divergência crítica: O número do motor no TIE não coincide com o Memorial Descritivo.',
      action_label: 'Corrigir Dados',
      confidence_score: 0.96
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'bottleneck',
      message: 'Certificado de Segurança Rádio da embarcação "Estrela do Mar" vence em 12 dias.',
      action_label: 'Iniciar Renovação',
      confidence_score: 1.0
    }
  ];

  await supabase.from('operational_insights').insert(insights);

  // 2. Create Automation Stats
  const stats = [
    { company_id: companyId, module_name: 'OCR Core', total_executions: 450, successful_executions: 442, time_saved_seconds: 450 * 60 },
    { company_id: companyId, module_name: 'Doc Generator', total_executions: 320, successful_executions: 318, time_saved_seconds: 320 * 300 },
    { company_id: companyId, module_name: 'Auto Filler', total_executions: 850, successful_executions: 845, time_saved_seconds: 850 * 120 }
  ];

  await supabase.from('automation_statistics').upsert(stats, { onConflict: 'company_id,module_name' });

  // 3. Create Anti-Error Logs
  const errors = [
    { company_id: companyId, error_type: 'divergencia_motor', severity: 'high', description: 'Número do motor divergente entre TIE e Memorial.', is_prevented: true },
    { company_id: companyId, error_type: 'assinatura_ausente', severity: 'medium', description: 'Tentativa de protocolo sem assinatura do proprietário.', is_prevented: true }
  ];

  await supabase.from('anti_error_logs').insert(errors);

  return { success: true };
}
