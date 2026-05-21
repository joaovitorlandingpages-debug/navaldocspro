import { supabase } from "@/integrations/supabase/client";

export async function seedPremiumDemo(companyId: string, userId: string) {
  console.log("Seeding Premium Demo for company:", companyId);

  // 1. Create a Demo Customer
  const { data: customer } = await supabase.from('customers').insert({
    company_id: companyId,
    name: 'Marítima Global S.A.',
    email: 'contato@maritima.com.br',
    phone: '(21) 99999-0000',
    document_number: '12.345.678/0001-99',
    status: 'active'
  }).select().single();

  if (customer) {
    // 2. Create a Demo Vessel
    const { data: vessel } = await supabase.from('vessels').insert({
      company_id: companyId,
      customer_id: customer.id,
      name: 'Phoenix Explorer II',
      registration_number: '381-000456-1',
      vessel_type: 'Rebocador',
      status: 'active'
    }).select().single();

    if (vessel) {
      // 3. Create a Demo Process
      const { data: process } = await supabase.from('processes').insert({
        company_id: companyId,
        customer_id: customer.id,
        vessel_id: vessel.id,
        process_type: 'Renovação de Certificados',
        status: 'in_progress',
        priority: 'high'
      }).select().single();

      if (process) {
        // 4. Create Demo Documents with OCR already "processed"
        await supabase.from('documents').insert([
          {
            company_id: companyId,
            process_id: process.id,
            document_type: 'TIE',
            file_name: 'TIE_PHOENIX_EXP.pdf',
            status: 'validado',
            compliance_status: 'conforme'
          },
          {
            company_id: companyId,
            process_id: process.id,
            document_type: 'RG do Proprietário',
            file_name: 'RG_DOUGLAS.jpg',
            status: 'validado',
            compliance_status: 'conforme'
          }
        ]);

        // 5. Create Timeline Events
        await supabase.from('process_timeline').insert([
          { process_id: process.id, company_id: companyId, user_id: userId, type: 'creation', description: 'Processo aberto via Assistente IA' },
          { process_id: process.id, company_id: companyId, user_id: userId, type: 'ocr_processed', description: 'OCR finalizado: TIE identificado com 99% confiança' }
        ]);
      }
    }
  }

  // 6. Create Intelligence Insights
  const insights = [
    {
      company_id: companyId,
      user_id: userId,
      type: 'automation',
      message: 'O processo Phoenix Explorer II já possui todos os dados extraídos via OCR para emissão do BCE.',
      action_label: 'Gerar BCE Agora',
      confidence_score: 0.99
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'critical',
      message: 'Divergência crítica resolvida: O número do motor no TIE coincide agora com o Memorial.',
      action_label: 'Ver Histórico',
      confidence_score: 1.0
    }
  ];

  await supabase.from('operational_insights').insert(insights);

  // 7. Create Automation Stats
  const stats = [
    { company_id: companyId, module_name: 'OCR Core', total_executions: 1250, successful_executions: 1245, time_saved_seconds: 1250 * 60 },
    { company_id: companyId, module_name: 'Doc Generator', total_executions: 840, successful_executions: 838, time_saved_seconds: 840 * 300 },
    { company_id: companyId, module_name: 'Auto Filler', total_executions: 2100, successful_executions: 2095, time_saved_seconds: 2100 * 120 }
  ];

  await supabase.from('automation_statistics').upsert(stats, { onConflict: 'company_id,module_name' });

  return { success: true };
}
