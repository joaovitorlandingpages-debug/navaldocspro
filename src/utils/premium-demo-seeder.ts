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
        const { data: docs } = await supabase.from('documents').insert([
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
          },
          {
            company_id: companyId,
            process_id: process.id,
            document_type: 'Memorial Descritivo',
            file_name: 'MEMORIAL_PHOENIX.pdf',
            status: 'validado',
            compliance_status: 'conforme'
          }
        ]).select();

        // 5. Create Signatures
        if (docs) {
          await supabase.from('document_signatures').insert(
            docs.map((doc: any) => ({
              document_id: doc.id,
              company_id: companyId,
              signer_name: 'Comandante Silva',
              signer_role: 'Comandante',
              status: 'completed',
              signed_at: new Date().toISOString()
            }))
          );
        }

        // 6. Create Checklist Items
        await supabase.from('process_checklist_items').insert([
          { process_id: process.id, company_id: companyId, title: 'Validar Documentação Técnica', status: 'completed' },
          { process_id: process.id, company_id: companyId, title: 'Assinatura do Proprietário', status: 'completed' },
          { process_id: process.id, company_id: companyId, title: 'Protocolo na Capitania', status: 'pending' }
        ]);

        // 7. Create Timeline Events
        await supabase.from('process_timeline').insert([
          { process_id: process.id, company_id: companyId, user_id: userId, type: 'creation', description: 'Processo aberto via Assistente IA' },
          { process_id: process.id, company_id: companyId, user_id: userId, type: 'ocr_processed', description: 'OCR finalizado: TIE identificado com 99% confiança' },
          { process_id: process.id, company_id: companyId, user_id: userId, type: 'signature_completed', description: 'Documentos assinados digitalmente pelo Comandante' }
        ]);
      }
    }
  }

  // 8. Create Intelligence Insights
  const insights = [
    {
      company_id: companyId,
      user_id: userId,
      type: 'automation',
      title: 'Pronto para gerar BCE',
      description: 'O processo Phoenix Explorer II já possui todos os dados extraídos via OCR para emissão do BCE.',
      action_label: 'Gerar BCE Agora',
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'critical',
      title: 'Divergência resolvida',
      description: 'Divergência crítica resolvida: O número do motor no TIE coincide agora com o Memorial.',
      action_label: 'Ver Histórico',
    },
    {
      company_id: companyId,
      user_id: userId,
      type: 'suggestion',
      title: 'Renovação de CSN próxima',
      description: 'Sugestão IA: Iniciar processo de renovação de CSN (vence em 30 dias).',
      action_label: 'Abrir Renovação',
    }
  ];

  await supabase.from('operational_insights').insert(insights);

  // 9. Create Automation Stats
  const stats = [
    { company_id: companyId, module_name: 'OCR Core', total_executions: 1250, successful_executions: 1245, time_saved_seconds: 1250 * 60 },
    { company_id: companyId, module_name: 'Doc Generator', total_executions: 840, successful_executions: 838, time_saved_seconds: 840 * 300 },
    { company_id: companyId, module_name: 'Auto Filler', total_executions: 2100, successful_executions: 2095, time_saved_seconds: 2100 * 120 },
    { company_id: companyId, module_name: 'Digital Signature', total_executions: 450, successful_executions: 450, time_saved_seconds: 450 * 1800 }
  ];

  await supabase.from('automation_statistics').upsert(stats, { onConflict: 'company_id,module_name' });

  console.log("DEMO_PREMIUM_READY");
  console.log("PILOT_PHASE_OK");
  
  return { success: true };
}
