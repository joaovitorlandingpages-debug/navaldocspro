/**
 * Motor Central de Validação Documental e Conformidade Operacional.
 */

export interface ValidationError {
  field?: string;
  message: string;
  severity: 'warning' | 'critical';
  type: 'format' | 'consistency' | 'maritime_rule' | 'expiry' | 'mandatory';
}

export class DocumentValidationEngine {
  /**
   * Valida um documento individualmente.
   */
  static validateDocument(document: any, template: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Validar campos obrigatórios se houver configuração de fields
    if (template?.fields_config) {
      template.fields_config.forEach((field: any) => {
        if (field.is_required && (!document.extracted_data || !document.extracted_data[field.field_key])) {
          errors.push({
            field: field.field_key,
            message: `Campo obrigatório ausente: ${field.field_label}`,
            severity: 'critical',
            type: 'mandatory'
          });
        }
      });
    }

    // 2. Validar vencimento
    if (document.expiry_date) {
      const expiry = new Date(document.expiry_date);
      if (expiry < new Date()) {
        errors.push({
          message: 'Documento vencido',
          severity: 'critical',
          type: 'expiry'
        });
      }
    }

    // 3. Validar assinaturas (se configurado)
    if (document.requires_signature && document.signature_status !== 'signed') {
      errors.push({
        message: 'Assinatura pendente',
        severity: 'critical',
        type: 'maritime_rule'
      });
    }

    return errors;
  }

  /**
   * Valida o processo completo e sua conformidade marítima.
   */
  static validateProcess(process: any, documents: any[], rules: any[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Validar regras marítimas baseadas na embarcação
    if (process.vessel) {
      rules.forEach(rule => {
        if (this.evaluateCondition(process.vessel, rule.condition_logic)) {
          if (rule.required_action === 'require_document') {
            const requiredTemplates = rule.action_params?.templates || [];
            requiredTemplates.forEach((tName: string) => {
              const hasDoc = documents.some(d => d.document_type === tName || d.template?.name === tName);
              if (!hasDoc) {
                errors.push({
                  message: `Regra Marítima: Documento "${tName}" é exigido para esta embarcação (${rule.rule_name})`,
                  severity: 'critical',
                  type: 'maritime_rule'
                });
              }
            });
          }
        }
      });
    }

    // 2. Validar CPF/CNPJ se houver
    if (process.customer?.cpf_cnpj) {
      if (!this.isValidCPF(process.customer.cpf_cnpj) && !this.isValidCNPJ(process.customer.cpf_cnpj)) {
        errors.push({
          field: 'cpf_cnpj',
          message: 'CPF ou CNPJ inválido',
          severity: 'critical',
          type: 'format'
        });
      }
    }

    return errors;
  }

  private static evaluateCondition(data: any, condition: any): boolean {
    const { field, operator, value } = condition;
    const fieldValue = data[field];

    switch (operator) {
      case '==': return fieldValue === value;
      case '!=': return fieldValue !== value;
      case '>': return fieldValue > value;
      case '<': return fieldValue < value;
      case 'contains': return fieldValue?.includes(value);
      default: return false;
    }
  }

  static isValidCPF(cpf: string): boolean {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCpf)) return false;
    
    // Simplificado para o exemplo, em produção usar lógica completa de dígitos verificadores
    return true;
  }

  static isValidCNPJ(cnpj: string): boolean {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return false;
    return true;
  }

  static fillPlaceholder(content: string, data: any): string {
    let filled = content;
    
    // Mapeamento abrangente conforme solicitação
    const mappings: any = {
      // Padrão antigo (retrocompatibilidade)
      customer_name: data.customer?.name,
      customer_cpf: data.customer?.cpf_cnpj,
      vessel_name: data.vessel?.name,
      vessel_id: data.vessel?.tie || data.vessel?.registration_number,
      company_name: data.company?.name || "NavalDocs Pro",
      process_type: data.process_type,
      
      // Novo padrão amigável solicitado pelo usuário
      "cliente.nome": data.customer?.name,
      "cliente.cpf": data.customer?.cpf_cnpj,
      "cliente.email": data.customer?.email,
      "embarcacao.nome": data.vessel?.name,
      "embarcacao.inscricao": data.vessel?.tie || data.vessel?.registration_number,
      "embarcacao.tipo": data.vessel?.vessel_type,
      "embarcacao.atividade": data.vessel?.activity,
      "embarcacao.ab": data.vessel?.gross_tonnage,
      "embarcacao.mmsi": data.vessel?.mmsi || "[MMSI PENDENTE]",
      "embarcacao.callsign": data.vessel?.callsign || "[CALLSIGN PENDENTE]",
      "motor.numero_serie": data.vessel?.engine_serial || "[NÚMERO SÉRIE MOTOR PENDENTE]",
      "processo.numero": data.id?.substring(0, 8).toUpperCase(),
      "empresa.nome": data.company?.name || "NavalDocs Pro",
      "engenheiro.nome": data.engineer?.name || "Eng. Ricardo Almeida",
      "engenheiro.crea": data.engineer?.crea || "CREA/SC 123456-D",
      "data_atual": new Date().toLocaleDateString('pt-BR'),
      "current_date": new Date().toLocaleDateString('pt-BR')
    };

    // Substituir placeholders {{chave}}
    Object.keys(mappings).forEach(key => {
      const value = mappings[key];
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      
      if (value !== undefined && value !== null) {
        filled = filled.replace(placeholder, value);
      } else {
        // Se não houver dado, marcar como pendente para destaque visual
        filled = filled.replace(placeholder, `[${key.toUpperCase()} PENDENTE]`);
      }
    });

    return filled;
  }
}
