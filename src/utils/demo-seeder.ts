import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function seedDemoData(companyId: string) {
  try {
    // 1. Create a Demo Vessel
    const { data: vessel, error: vError } = await supabase
      .from('vessels')
      .insert({
        company_id: companyId,
        name: 'NAVIGATOR ONE (DEMO)',
        type: 'CARGO',
        registration_number: 'PR-2024-001X',
      })
      .select()
      .single();
    
    if (vError) throw vError;

    // 2. Create a Demo Customer
    const { data: customer, error: cError } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: 'MARÍTIMA GLOBAL LTDA (DEMO)',
        email: 'contato@maritimaglobal.demo',
        document_number: '00.000.000/0001-00',
      })
      .select()
      .single();

    if (cError) throw cError;

    // 3. Create a Demo Process
    const { data: process, error: pError } = await supabase
      .from('processes')
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        vessel_id: vessel.id,
        status: 'in_progress',
        process_type: 'RENOVAÇÃO_TIE',
        title: 'RENOVAÇÃO ANUAL TIE - NAVIGATOR ONE',
        completion_percentage: 65,
      })
      .select()
      .single();

    if (pError) throw pError;

    // 4. Create Demo Tasks
    await supabase.from('operational_tasks').insert([
      { company_id: companyId, process_id: process.id, title: 'Validar OCR da CNH do Comandante', priority: 'high', status: 'pending' },
      { company_id: companyId, process_id: process.id, title: 'Gerar Memorial Técnico', priority: 'medium', status: 'pending' }
    ]);

    toast.success("Ambiente de demonstração gerado com sucesso!");
    return true;
  } catch (error: any) {
    console.error("Seeding error:", error);
    toast.error("Erro ao gerar dados demo: " + error.message);
    return false;
  }
}
