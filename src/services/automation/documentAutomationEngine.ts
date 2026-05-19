import { supabase } from "@/integrations/supabase/client";
import { Process, ProcessAutomationState } from "@/types/process";

export class DocumentAutomationEngine {
  /**
   * Analisa um processo e atualiza seu estado de automação, checklist e status.
   */
  static async analyzeProcess(processId: string): Promise<ProcessAutomationState | null> {
    try {
      // 1. Buscar detalhes do processo com cliente e embarcação
      const { data: process, error: processError } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers(*),
          vessel:vessels(*)
        `)
        .eq('id', processId)
        .single();

      if (processError || !process) {
        console.error("Erro ao buscar processo para análise:", processError);
        return null;
      }

      // 2. Buscar requisitos do tipo de processo (pacote documental)
      const { data: requirements, error: reqError } = await supabase
        .from('process_document_packages')
        .select(`
          *,
          template:document_templates(*)
        `)
        .eq('process_type_id', process.process_type_id);

      if (reqError) {
        console.error("Erro ao buscar requisitos:", reqError);
        return null;
      }

      // 3. Buscar documentos atuais vinculados ao processo (nas tabelas uploaded_files e documents)
      const { data: uploadedFiles, error: uploadError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('process_id', processId);

      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('process_id', processId);

      // 4. Construir Status do Checklist
      const checklist_status = requirements.map((req: any) => {
        // Busca tanto em documentos formais quanto em uploads
        const existingDoc = documents?.find((d: any) => d.document_type === req.template.name);
        const existingUpload = uploadedFiles?.find((u: any) => u.category === req.template.name || u.file_name.includes(req.template.name));
        
        const finalDoc = existingDoc || existingUpload;

        return {
          template_id: req.template_id,
          name: req.template.name,
          is_mandatory: req.is_mandatory,
          status: finalDoc ? (finalDoc.status === 'validated' || finalDoc.status === 'validado' ? 'validated' : 'uploaded') : 'missing',
          document_id: finalDoc?.id
        };
      }) as ProcessAutomationState['checklist_status'];

      // 5. Verificar Completude de Dados (Customer & Vessel)
      const data_completeness: ProcessAutomationState['data_completeness'] = [];
      
      // Regras de campos obrigatórios por entidade
      const customerFields = ['name', 'cpf_cnpj', 'email'];
      customerFields.forEach(field => {
        const val = (process.customer as any)?.[field];
        data_completeness.push({
          entity: 'customer',
          field,
          value: val,
          is_missing: !val
        });
      });

      if (process.vessel_id) {
        const vesselFields = ['name', 'registration_number', 'vessel_type'];
        vesselFields.forEach(field => {
          const val = (process.vessel as any)?.[field];
          data_completeness.push({
            entity: 'vessel',
            field,
            value: val,
            is_missing: !val
          });
        });
      }

      // 6. Identificar Itens Pendentes
      const pending_items: string[] = [];
      checklist_status.filter(i => i.is_mandatory && i.status === 'missing').forEach(i => {
        pending_items.push(`Documento faltante: ${i.name}`);
      });
      data_completeness.filter(i => i.is_missing).forEach(i => {
        pending_items.push(`Dado faltante: ${i.entity === 'customer' ? 'Cliente' : 'Embarcação'} - ${i.field}`);
      });

      // 7. Pronto para Geração?
      const is_ready_for_generation = pending_items.length === 0;

      // 8. Próximos Passos Sugeridos
      const next_suggested_steps: string[] = [];
      if (pending_items.length > 0) {
        if (checklist_status.some(i => i.is_mandatory && i.status === 'missing')) {
          next_suggested_steps.push('Fazer upload dos documentos obrigatórios');
        }
        if (data_completeness.some(i => i.is_missing)) {
          next_suggested_steps.push('Completar o cadastro do cliente/embarcação');
        }
      } else {
        next_suggested_steps.push('Gerar pacote documental completo');
        next_suggested_steps.push('Enviar para conferência final');
      }

      // 9. Salvar Estado de Automação no Banco
      const automationStateData = {
        process_id: processId,
        checklist_status,
        data_completeness,
        pending_items,
        is_ready_for_generation,
        next_suggested_steps,
        last_analyzed_at: new Date().toISOString()
      };

      const { data: existingState } = await supabase
        .from('process_automation_state')
        .select('id')
        .eq('process_id', processId)
        .maybeSingle();

      if (existingState) {
        await supabase
          .from('process_automation_state')
          .update(automationStateData)
          .eq('id', existingState.id);
      } else {
        await supabase
          .from('process_automation_state')
          .insert(automationStateData);
      }

      // 10. Atualização Automática de Status do Processo
      let newStatus = process.status;
      if (pending_items.length > 0) {
        // Se houver pendências e o status for 'Pronto para Geração', volta para 'Pendente'
        if (process.status === 'Pronto para Geração') {
          newStatus = 'Pendente';
        }
      } else if (is_ready_for_generation && process.status === 'Pendente') {
        newStatus = 'Pronto para Geração';
      }

      if (newStatus !== process.status) {
        await supabase
          .from('processes')
          .update({ status: newStatus })
          .eq('id', processId);
        
        await this.logEvent(processId, 'status_changed', `Automação: Status alterado para ${newStatus}`);
      }

      return {
        id: existingState?.id || '',
        ...automationStateData
      };

    } catch (error) {
      console.error("Falha crítica no motor de automação:", error);
      return null;
    }
  }

  /**
   * Registra um evento na timeline inteligente de automação.
   */
  static async logEvent(processId: string, eventType: string, description: string, metadata: any = {}) {
    try {
      await supabase.from('automation_logs').insert({
        process_id: processId,
        event_type: eventType,
        description,
        metadata
      });
    } catch (error) {
      console.error("Erro ao registrar log de automação:", error);
    }
  }

  /**
   * Processa dados extraídos via OCR e vincula ao processo/entidades.
   */
  static async processOCRExtraction(documentId: string, extractedData: any) {
    // Buscar documento e processo vinculado
    const { data: document } = await supabase
      .from('documents')
      .select('*, process:processes(*)')
      .eq('id', documentId)
      .single();

    if (!document || !document.process_id) return;

    await this.logEvent(document.process_id, 'ocr_complete', `Dados extraídos do documento ${document.document_type}`, extractedData);

    // Se houver CPF/CNPJ ou dados de embarcação, podemos sugerir atualização (ou atualizar direto se confiável)
    // Para agora, apenas registramos no log e re-analisamos o processo
    await this.analyzeProcess(document.process_id);
  }
}
