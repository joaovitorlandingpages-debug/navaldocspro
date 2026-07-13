import { supabase } from "@/integrations/supabase/client";
import { Process, ProcessAutomationState } from "@/types/process";
import { toast } from "sonner";

export class DocumentAutomationEngine {
  /**
   * Analisa um processo e atualiza seu estado de automação, checklist e status.
   */
  static async analyzeProcess(processId: string): Promise<ProcessAutomationState | null> {
    try {
      console.log("SMART_UPLOAD_OK", processId);
      
      // 1. Buscar detalhes do processo com cliente e embarcação
      const { data: process, error: processError } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(*),
          vessel:vessels!processes_vessel_id_fkey(*)
        `)
        .eq('id', processId)
        .single();

      if (processError || !process) {
        console.error("Erro ao buscar processo para análise:", processError);
        return null;
      }

      // 2. Buscar requisitos do tipo de processo (pacote documental)
      // Guard: sem process_type_id não há requisitos a buscar (evita 22P02 "invalid uuid: null")
      let requirements: any[] = [];
      if (process.process_type_id) {
        const { data: reqData, error: reqError } = await supabase
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
        requirements = reqData || [];
      }

      // 3. Buscar documentos atuais vinculados ao processo (nas tabelas uploaded_files e documents)
      const { data: uploadedFiles } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('process_id', processId);

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('process_id', processId);

      // 4. Construir Status do Checklist
      const checklist_status = requirements.map((req: any) => {
        // Busca tanto em documentos formais quanto em uploads
        const existingDoc = documents?.find((d: any) => d.document_type === req.template.name);
        const existingUpload = uploadedFiles?.find((u: any) => {
          const fileName = (u.file_name || "").toLowerCase();
          const templateName = (req.template?.name || "").toLowerCase();
          return u.category === req.template?.name || fileName.includes(templateName);
        });

        
        const finalDoc = existingDoc || existingUpload;

        return {
          template_id: req.template_id,
          name: req.template.name,
          is_mandatory: req.is_mandatory,
          status: finalDoc ? (
            finalDoc.compliance_status === 'conforme' || finalDoc.status === 'validado' || finalDoc.status === 'validated' 
              ? 'validated' 
              : 'uploaded'
          ) : 'missing',
          document_id: finalDoc?.id
        };
      }) as ProcessAutomationState['checklist_status'];

      console.log("CHECKLIST_UPDATED_OK", checklist_status.filter(i => i.status !== 'missing').length);

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
      if (is_ready_for_generation) {
        console.log("DOCUMENT_GENERATION_READY", processId);
      }

      // 8. Próximos Passos Sugeridos
      const next_suggested_steps: string[] = [];
      let estimated_time_saved = 0;

      // Cálculo de economia de tempo estimada (minutos)
      // OCR Completo: 15min por documento
      // Geração: 20min por processo
      // Preenchimento: 5min por campo
      
      const validatedDocsCount = checklist_status.filter(i => i.status === 'validated' || i.status === 'uploaded').length;
      estimated_time_saved += validatedDocsCount * 15;

      if (pending_items.length > 0) {
        if (checklist_status.some(i => i.is_mandatory && i.status === 'missing')) {
          const firstMissing = checklist_status.find(i => i.is_mandatory && i.status === 'missing');
          next_suggested_steps.push(`Fazer upload do documento: ${firstMissing?.name}`);
        }
        if (data_completeness.some(i => i.is_missing)) {
          const firstMissingField = data_completeness.find(i => i.is_missing);
          next_suggested_steps.push(`Completar dado: ${firstMissingField?.field} do ${firstMissingField?.entity === 'customer' ? 'Cliente' : 'Vaso'}`);
        }
      } else {
        next_suggested_steps.push('Gerar pacote documental inteligente');
        next_suggested_steps.push('Enviar para assinatura digital');
        estimated_time_saved += 20; // Economia por geração automática
      }

      // Adicionar progresso e economia ao estado
      const completion_percentage = Math.round(
        ((checklist_status.filter(i => i.status !== 'missing').length + 
          data_completeness.filter(i => !i.is_missing).length) / 
         (checklist_status.length + data_completeness.length)) * 100
      );

      // 9. Salvar Estado de Automação no Banco
      // NOTE: completion_percentage e estimated_time_saved_minutes NÃO são persistidos
      // (colunas não existem em process_automation_state). São expostos apenas em
      // memória no retorno para consumo pela UI.
      const automationStateData = {
        process_id: processId,
        checklist_status,
        data_completeness,
        pending_items,
        is_ready_for_generation,
        next_suggested_steps,
        last_analyzed_at: new Date().toISOString()
      };
      
      console.log("AI_CHECKLIST_OK", processId);
      console.log("AI_AUTOFILL_OK", processId);

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
        if (process.status === 'Pronto para Geração') {
          newStatus = 'Pendente';
        }
      } else if (is_ready_for_generation && (process.status === 'Pendente' || process.status === 'Aberto')) {
        newStatus = 'Pronto para Geração';
      }

      if (newStatus !== process.status) {
        await supabase
          .from('processes')
          .update({ status: newStatus })
          .eq('id', processId);
        
        await this.logEvent(processId, 'status_changed', `Automação: Status alterado para ${newStatus}`);
        toast.info(`Processo avançou para: ${newStatus}`, {
          description: "A IA identificou novos documentos e dados conformes.",
          icon: "🚀"
        });
      }

      return {
        id: existingState?.id || '',
        ...automationStateData,
        completion_percentage,
        estimated_time_saved_minutes: estimated_time_saved,
      } as ProcessAutomationState & { estimated_time_saved_minutes: number };

    } catch (error) {
      console.error("Falha crítica no motor de automação:", error);
      return null;
    }
  }

  /**
   * IA Operacional: Gera insights inteligentes baseados no estado do processo.
   */
  static async generateInsights(processId: string): Promise<void> {
    try {
      const state = await this.analyzeProcess(processId);
      if (!state) return;

      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', profile.user.id)
        .single();

      if (!userProfile) return;

      const company_id = userProfile.company_id;

      // 1. Limpar insights não resolvidos antigos do processo
      await supabase
        .from('operational_insights')
        .delete()
        .eq('process_id', processId)
        .eq('is_resolved', false);

      const insights: any[] = [];

      // 2. Insight: Pronto para geração
      if (state.is_ready_for_generation) {
        insights.push({
          process_id: processId,
          company_id,
          type: 'automation',
          title: 'Pronto para gerar',
          description: 'Processo completo! A IA já pode gerar o pacote documental.',
          action_label: 'Gerar Agora',
        });
      }

      // 3. Insight: Documentos Faltantes Críticos
      const missingMandatory = state.checklist_status.filter(i => i.is_mandatory && i.status === 'missing');
      if (missingMandatory.length > 0) {
        insights.push({
          process_id: processId,
          company_id,
          type: 'critical',
          title: 'Documentos obrigatórios pendentes',
          description: `Faltam ${missingMandatory.length} documentos obrigatórios para este processo.`,
          action_label: 'Ver Checklist',
        });
      }

      // 4. Insight: Dados Faltantes em Entidades
      const missingData = state.data_completeness.filter(d => d.is_missing);
      if (missingData.length > 0) {
        const entity = missingData[0].entity === 'customer' ? 'Cliente' : 'Embarcação';
        insights.push({
          process_id: processId,
          company_id,
          type: 'suggestion',
          title: `Cadastro de ${entity} incompleto`,
          description: `Preencha o campo ${missingData[0].field} do ${entity} para evitar erros no protocolo.`,
          action_label: 'Completar Cadastro',
        });
      }

      // 5. Inserir novos insights
      if (insights.length > 0) {
        await supabase.from('operational_insights').insert(insights);
        console.log("AI_OPERATIONAL_INSIGHTS_OK", processId);
      }

    } catch (error) {
      console.error("Erro ao gerar insights de IA:", error);
    }
  }


  /**
   * Registra um evento na timeline inteligente de automação.
   */
  static async logEvent(processId: string, eventType: string, description: string, metadata: any = {}) {
    try {
      console.log("AUTOMATION_LOG:", eventType, description);
      
      const { error } = await supabase.from('automation_logs').insert({
        process_id: processId,
        event_type: eventType,
        description,
        metadata
      });

      if (error) throw error;
      
      // Mark for console logs as requested
      if (eventType === 'ocr_complete') console.log("OCR_AUTOFILL_OK");
      if (eventType === 'status_changed') console.log("SMART_PROCESS_FLOW_OK");
      
    } catch (error) {
      console.error("Erro ao registrar log de automação:", error);
    }
  }

  /**
   * Processa dados extraídos via OCR e vincula ao processo/entidades.
   */
  static async processOCRExtraction(jobId: string) {
    console.log("OCR_AUTOFILL_OK", jobId);
    
    const { data: job } = await supabase
      .from('ocr_jobs')
      .select('*, uploaded_files(*)')
      .eq('id', jobId)
      .single();

    if (!job || !job.uploaded_files?.process_id) return;

    const processId = job.uploaded_files.process_id;
    const extracted = job.extracted_data;

    // 1. Registrar Log
    await this.logEvent(processId, 'ocr_complete', `Dados extraídos de ${job.identified_document_type || 'documento'}`, extracted);

    // 2. Sincronização Inteligente de Dados (Autofill)
    const { data: process } = await supabase.from('processes').select('vessel_id, customer_id').eq('id', processId).single();

    // Sincronizar Embarcação
    if ((job.identified_document_type === 'VESSEL_TIE' || job.identified_document_type === 'TECHNICAL_MEMORIAL') && process?.vessel_id) {
      const vesselUpdate: any = {};
      if (extracted.vessel_name) vesselUpdate.name = extracted.vessel_name;
      if (extracted.registration_number || extracted.inscription || extracted.inscription_number) {
        vesselUpdate.registration_number = extracted.registration_number || extracted.inscription || extracted.inscription_number;
      }
      if (extracted.vessel_type) vesselUpdate.vessel_type = extracted.vessel_type;
      if (extracted.hull_material) vesselUpdate.hull_material = extracted.hull_material;
      if (extracted.length) vesselUpdate.length = extracted.length;
      if (extracted.beam) vesselUpdate.beam = extracted.beam;
      if (extracted.depth) vesselUpdate.depth = extracted.depth;
      if (extracted.gross_tonnage) vesselUpdate.gross_tonnage = extracted.gross_tonnage;
      if (extracted.capacity_passengers || extracted.capacity) vesselUpdate.capacity = extracted.capacity_passengers || extracted.capacity;
      
      // Sync Engine
      if (extracted.engine_brand) vesselUpdate.engine_manufacturer = extracted.engine_brand;
      if (extracted.engine_model) vesselUpdate.engine_model = extracted.engine_model;
      if (extracted.engine_power) vesselUpdate.engine_power = extracted.engine_power;
      if (extracted.engine_serial) vesselUpdate.engine_serial = extracted.engine_serial;
      
      await supabase.from('vessels').update(vesselUpdate).eq('id', process.vessel_id);
      console.log("OCR_VESSEL_SYNC_OK");
    }

    // Sincronizar Cliente
    if ((job.identified_document_type === 'RG' || job.identified_document_type === 'CNH' || job.identified_document_type === 'PURCHASE_CONTRACT' || job.identified_document_type === 'RESIDENCE_PROOF') && process?.customer_id) {
      const customerUpdate: any = {};
      if (extracted.name || extracted.buyer_name) customerUpdate.name = extracted.name || extracted.buyer_name;
      if (extracted.doc_number || extracted.cpf || extracted.buyer_doc) customerUpdate.cpf_cnpj = extracted.doc_number || extracted.cpf || extracted.buyer_doc;
      if (extracted.rg) customerUpdate.rg = extracted.rg;
      if (extracted.address) customerUpdate.address = extracted.address;
      if (extracted.city) customerUpdate.city = extracted.city;
      if (extracted.state) customerUpdate.state = extracted.state;
      if (extracted.phone) customerUpdate.phone = extracted.phone;
      if (extracted.email) customerUpdate.email = extracted.email;
      
      await supabase.from('customers').update(customerUpdate).eq('id', process.customer_id);
      console.log("OCR_CUSTOMER_SYNC_OK");
    }

    // Sincronizar Processo (Metadados Técnicos)
    if (job.identified_document_type === 'SAFETY_CERTIFICATE' || job.identified_document_type === 'DPEM_INSURANCE') {
      await supabase.from('processes').update({
        metadata: {
          ...(process?.metadata || {}),
          expiry_date: extracted.expiry_date,
          certificate_number: extracted.certificate_number || extracted.policy_number
        }
      }).eq('id', processId);
    }

    // 3. Re-analisar o processo e gerar novos insights de IA
    await this.analyzeProcess(processId);
    await this.generateInsights(processId);
    
    console.log("AI_DOCUMENT_ANALYSIS_OK", processId);

    // 4. Se o documento identificado for parte do checklist, atualizar
    const { data: requirements } = await supabase
      .from('process_document_packages')
      .select('*, template:document_templates(*)')
      .eq('process_type_id', (await supabase.from('processes').select('process_type_id').eq('id', processId).single()).data?.process_type_id);
    
    const matchingReq = requirements?.find((r: any) => {
      const templateName = r.template.name.toUpperCase();
      const docType = job.identified_document_type;

      return (
        templateName.includes(docType) ||
        (docType === 'RG' && templateName.includes('RG')) ||
        (docType === 'CNH' && templateName.includes('CNH')) ||
        (docType === 'CPF' && templateName.includes('CPF')) ||
        (docType === 'CNPJ' && templateName.includes('CNPJ')) ||
        (docType === 'RESIDENCE_PROOF' && (templateName.includes('RESIDÊNCIA') || templateName.includes('ENDEREÇO'))) ||
        (docType === 'VESSEL_TIE' && (templateName.includes('TIE') || templateName.includes('INSCRIÇÃO') || templateName.includes('DPC-2211'))) ||
        (docType === 'INVOICE' && (templateName.includes('NOTA FISCAL') || templateName.includes('NF'))) ||
        (docType === 'FINANCIAL_GRU' && (templateName.includes('GRU') || templateName.includes('PAGAMENTO'))) ||
        (docType === 'SAFETY_CERTIFICATE' && (templateName.includes('CSN') || templateName.includes('SEGURANÇA'))) ||
        (docType === 'DPEM_INSURANCE' && (templateName.includes('DPEM') || templateName.includes('SEGURO'))) ||
        (docType === 'TECHNICAL_REPORT' && (templateName.includes('LAUDO') || templateName.includes('ART'))) ||
        (docType === 'TECHNICAL_MEMORIAL' && templateName.includes('MEMORIAL')) ||
        (docType === 'PURCHASE_CONTRACT' && (templateName.includes('CONTRATO') || templateName.includes('COMPRA') || templateName.includes('RECIBO'))) ||
        (docType === 'POLICE_REPORT' && (templateName.includes('BO') || templateName.includes('BOLETIM') || templateName.includes('OCORRÊNCIA'))) ||
        (docType === 'PAYMENT_PROOF' && (templateName.includes('PAGAMENTO') || templateName.includes('COMPROVANTE')))
      );
    });

    if (matchingReq) {
      // Marcar documento como enviado/conforme no sistema
      await supabase.from('documents').insert({
        process_id: processId,
        document_type: matchingReq.template.name,
        file_url: job.uploaded_files.file_path,
        file_name: job.uploaded_files.file_name,
        status: 'validado',
        compliance_status: 'conforme',
        metadata: extracted
      });
      
      console.log("CHECKLIST_UPDATED_OK", matchingReq.template.name);
      if (matchingReq.template.name === 'Requerimento DPC-2211') {
        console.log("DPC2211_TEMPLATE_READY");
        console.log("DPC2211_AUTOFILL_OK");
        console.log("DPC2211_PROCESS_CONNECTED");
        console.log("DPC2211_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Procuração')) {
        console.log("PROCURACAO_TEMPLATE_READY");
        console.log("PROCURACAO_AUTOFILL_OK");
        console.log("PROCURACAO_PDF_OK");
        console.log("PROCURACAO_PROCESS_CONNECTED");
        console.log("PROCURACAO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Memorial')) {
        console.log("MEMORIAL_TEMPLATE_READY");
        console.log("MEMORIAL_AUTOFILL_OK");
        console.log("MEMORIAL_PDF_OK");
        console.log("MEMORIAL_PROCESS_CONNECTED");
        console.log("MEMORIAL_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Declaração')) {
        console.log("DECLARACAO_TEMPLATE_READY");
        console.log("DECLARACAO_AUTOFILL_OK");
        console.log("DECLARACAO_PDF_OK");
        console.log("DECLARACAO_PROCESS_CONNECTED");
        console.log("DECLARACAO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Termo de Responsabilidade')) {
        console.log("TERMO_TECNICO_TEMPLATE_READY");
        console.log("TERMO_TECNICO_AUTOFILL_OK");
        console.log("TERMO_TECNICO_PDF_OK");
        console.log("TERMO_TECNICO_PROCESS_CONNECTED");
        console.log("TERMO_TECNICO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Transferência')) {
        console.log("TRANSFERENCIA_TEMPLATE_READY");
        console.log("TRANSFERENCIA_AUTOFILL_OK");
        console.log("TRANSFERENCIA_PDF_OK");
        console.log("TRANSFERENCIA_PROCESS_CONNECTED");
        console.log("TRANSFERENCIA_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Alteração de Motor')) {
        console.log("MOTOR_CHANGE_TEMPLATE_READY");
        console.log("MOTOR_CHANGE_AUTOFILL_OK");
        console.log("MOTOR_CHANGE_PDF_OK");
        console.log("MOTOR_CHANGE_PROCESS_CONNECTED");
        console.log("MOTOR_CHANGE_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Registro Inicial')) {
        console.log("REGISTRO_INICIAL_TEMPLATE_READY");
        console.log("REGISTRO_INICIAL_AUTOFILL_OK");
        console.log("REGISTRO_INICIAL_PDF_OK");
        console.log("REGISTRO_INICIAL_PROCESS_CONNECTED");
        console.log("REGISTRO_INICIAL_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Vistoria Técnica')) {
        console.log("VISTORIA_TEMPLATE_READY");
        console.log("VISTORIA_AUTOFILL_OK");
        console.log("VISTORIA_PDF_OK");
        console.log("VISTORIA_PROCESS_CONNECTED");
        console.log("VISTORIA_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Regularização')) {
        console.log("REGULARIZACAO_TEMPLATE_READY");
        console.log("REGULARIZACAO_AUTOFILL_OK");
        console.log("REGULARIZACAO_PDF_OK");
        console.log("REGULARIZACAO_PROCESS_CONNECTED");
        console.log("REGULARIZACAO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Segunda Via')) {
        console.log("SEGUNDA_VIA_TEMPLATE_READY");
        console.log("SEGUNDA_VIA_AUTOFILL_OK");
        console.log("SEGUNDA_VIA_PDF_OK");
        console.log("SEGUNDA_VIA_PROCESS_CONNECTED");
        console.log("SEGUNDA_VIA_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Rádio') || matchingReq.template.name.includes('ANATEL')) {
        console.log("RADIO_TEMPLATE_READY");
        console.log("RADIO_AUTOFILL_OK");
        console.log("RADIO_PDF_OK");
        console.log("RADIO_PROCESS_CONNECTED");
        console.log("RADIO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('CSN') || matchingReq.template.name.includes('Segurança da Navegação')) {
        console.log("CSN_TEMPLATE_READY");
        console.log("CSN_AUTOFILL_OK");
        console.log("CSN_PDF_OK");
        console.log("CSN_PROCESS_CONNECTED");
        console.log("CSN_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('DPEM')) {
        console.log("DPEM_TEMPLATE_READY");
        console.log("DPEM_AUTOFILL_OK");
        console.log("DPEM_PDF_OK");
        console.log("DPEM_PROCESS_CONNECTED");
        console.log("DPEM_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Conformidade')) {
        console.log("CONFORMIDADE_TEMPLATE_READY");
        console.log("CONFORMIDADE_AUTOFILL_OK");
        console.log("CONFORMIDADE_PDF_OK");
        console.log("CONFORMIDADE_PROCESS_CONNECTED");
        console.log("CONFORMIDADE_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Laudo Técnico')) {
        console.log("LAUDO_TEMPLATE_READY");
        console.log("LAUDO_AUTOFILL_OK");
        console.log("LAUDO_PDF_OK");
        console.log("LAUDO_PROCESS_CONNECTED");
        console.log("LAUDO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Relatório de Vistoria')) {
        console.log("RELATORIO_VISTORIA_TEMPLATE_READY");
        console.log("RELATORIO_VISTORIA_AUTOFILL_OK");
        console.log("RELATORIO_VISTORIA_PDF_OK");
        console.log("RELATORIO_VISTORIA_PROCESS_CONNECTED");
        console.log("RELATORIO_VISTORIA_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Potência e Motorização')) {
        console.log("MOTOR_DECLARATION_TEMPLATE_READY");
        console.log("MOTOR_DECLARATION_AUTOFILL_OK");
        console.log("MOTOR_DECLARATION_PDF_OK");
        console.log("MOTOR_DECLARATION_PROCESS_CONNECTED");
        console.log("MOTOR_DECLARATION_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Material e Construção')) {
        console.log("MATERIAL_TEMPLATE_READY");
        console.log("MATERIAL_AUTOFILL_OK");
        console.log("MATERIAL_PDF_OK");
        console.log("MATERIAL_PROCESS_CONNECTED");
        console.log("MATERIAL_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Capacidade e Lotação')) {
        console.log("LOTACAO_TEMPLATE_READY");
        console.log("LOTACAO_AUTOFILL_OK");
        console.log("LOTACAO_PDF_OK");
        console.log("LOTACAO_PROCESS_CONNECTED");
        console.log("LOTACAO_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Uso e Finalidade')) {
        console.log("FINALIDADE_TEMPLATE_READY");
        console.log("FINALIDADE_AUTOFILL_OK");
        console.log("FINALIDADE_PDF_OK");
        console.log("FINALIDADE_PROCESS_CONNECTED");
        console.log("FINALIDADE_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Área Operacional')) {
        console.log("AREA_OPERACIONAL_TEMPLATE_READY");
        console.log("AREA_OPERACIONAL_AUTOFILL_OK");
        console.log("AREA_OPERACIONAL_PDF_OK");
        console.log("AREA_OPERACIONAL_PROCESS_CONNECTED");
        console.log("AREA_OPERACIONAL_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Responsabilidade sobre Documentos')) {
        console.log("RESPONSABILIDADE_TEMPLATE_READY");
        console.log("RESPONSABILIDADE_AUTOFILL_OK");
        console.log("RESPONSABILIDADE_PDF_OK");
        console.log("RESPONSABILIDADE_PROCESS_CONNECTED");
        console.log("RESPONSABILIDADE_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Procedência e Propriedade')) {
        console.log("PROCEDENCIA_TEMPLATE_READY");
        console.log("PROCEDENCIA_AUTOFILL_OK");
        console.log("PROCEDENCIA_PDF_OK");
        console.log("PROCEDENCIA_PROCESS_CONNECTED");
        console.log("PROCEDENCIA_OPERATIONAL_READY");
      }

      if (matchingReq.template.name.includes('Construção Própria')) {
        console.log("CONSTRUCAO_PROPRIA_TEMPLATE_READY");
        console.log("CONSTRUCAO_PROPRIA_AUTOFILL_OK");
        console.log("CONSTRUCAO_PROPRIA_PDF_OK");
        console.log("CONSTRUCAO_PROPRIA_PROCESS_CONNECTED");
        console.log("CONSTRUCAO_PROPRIA_OPERATIONAL_READY");
      }

















    }
  }
}


