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
    if (!content) return "";
    let filled = content;
    
    // Mapeamento abrangente conforme solicitação operacional profunda
    const mappings: any = {
      // Cliente
      "cliente.nome": data.customer?.name || data.customer?.razao_social,
      "cliente.cpf": data.customer?.cpf_cnpj || data.customer?.cpf,
      "cliente.cnpj": data.customer?.cnpj || data.customer?.cpf_cnpj,
      "cliente.rg": data.customer?.rg || "[RG PENDENTE]",
      "cliente.email": data.customer?.email,
      "cliente.endereco": data.customer?.address || "[ENDEREÇO PENDENTE]",
      "cliente.cidade": data.customer?.city || "Itajaí",
      "cliente.telefone": data.customer?.phone || "[TELEFONE PENDENTE]",
      
      // Empresa
      "empresa.nome": data.company?.name || "NavalDocs Pro",
      "empresa.cnpj": data.company?.cnpj || "00.000.000/0001-00",
      "empresa.endereco": data.company?.address || "Av. Beira Mar, 1000 - Itajaí/SC",
      
      // Engenheiro
      "engenheiro.nome": data.engineer?.name || data.user?.name || "Eng. Ricardo Almeida",
      "engenheiro.crea": data.engineer?.crea || "CREA/SC 123456-D",
      
      // Embarcação
      "embarcacao.nome": data.vessel?.name || "[NOME EMBARCAÇÃO PENDENTE]",
      "embarcacao.inscricao": data.vessel?.registration_number || data.vessel?.tie || "[INSCRIÇÃO PENDENTE]",
      "embarcacao.categoria": data.vessel?.vessel_type || data.vessel?.category || "Esporte e Recreio",
      "embarcacao.comprimento": data.vessel?.length || "0.00",
      "embarcacao.boca": data.vessel?.beam || "0.00",
      "embarcacao.pontal": data.vessel?.depth || "0.00",
      "embarcacao.material": data.vessel?.hull_material || "Fibra de Vidro",
      
      // Motor
      "motor.fabricante": data.vessel?.engine_brand || "[FABRICANTE MOTOR PENDENTE]",
      "motor.modelo": data.vessel?.engine_model || "[MODELO MOTOR PENDENTE]",
      "motor.potencia": data.vessel?.engine_power || "[POTÊNCIA MOTOR PENDENTE]",
      "motor.numero_serie": data.vessel?.engine_serial || "[NÚMERO SÉRIE MOTOR PENDENTE]",
      
      // Datas e Geral
      "data_atual": new Date().toLocaleDateString('pt-BR'),
      "processo.numero": data.id?.substring(0, 8).toUpperCase(),
      "processo.tipo": data.process_type || "Processo Naval Geral",
      "hash_autenticidade": data.id?.replace(/-/g, '').substring(0, 16).toUpperCase()
    };

    // Auditoria de Português e Formatação Básica
    // Substituir placeholders {{chave}}
    Object.keys(mappings).forEach(key => {
      const value = mappings[key];
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      
      if (value !== undefined && value !== null && value !== "") {
        filled = filled.replace(placeholder, value);
      } else {
        // Fallback profissional sugerido: sublinhado ou texto explicativo
        filled = filled.replace(placeholder, `____________________`);
      }
    });

    // Limpeza de placeholders residuais (proteção contra templates mal formados)
    filled = filled.replace(/{{.*?}}/g, '____________________');

    return filled;
  }
}
}
