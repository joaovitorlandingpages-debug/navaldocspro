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
    
    // Logs de Auditoria
    console.log("BASE_CONTENT_RENDER_STARTED");
    console.log("DOCUMENT_RENDER_ENGINE_FIXED");

    // Flatten values for replacement
    const flat: any = {};
    const flatten = (obj: any, prefix = "") => {
      for (const [k, v] of Object.entries(obj || {})) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
          flatten(v, key);
        } else {
          flat[key] = v;
        }
      }
    };

    flatten(data);

    // Common nautical mappings (backwards compatibility)
    const mappings: any = {
      "cliente.nome": data.customer?.name || data.customer?.razao_social,
      "cliente.cpf": data.customer?.cpf_cnpj || data.customer?.cpf,
      "cliente.rg": data.customer?.rg,
      "cliente.endereco": data.customer?.address,
      "embarcacao.nome": data.vessel?.name,
      "embarcacao.inscricao": data.vessel?.registration_number || data.vessel?.tie,
      "data_atual": new Date().toLocaleDateString('pt-BR'),
      "sistema.data_atual": new Date().toLocaleDateString('pt-BR'),
      "sistema.local": data.company?.city || "Itajaí",
    };

    const allValues = { ...flat, ...mappings };

    // Replace placeholders {{key}}
    Object.keys(allValues).forEach(key => {
      const value = allValues[key];
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      
      if (value !== undefined && value !== null && value !== "") {
        filled = filled.replace(placeholder, String(value));
      } else {
        filled = filled.replace(placeholder, `____________________`);
      }
    });

    // Limpeza de placeholders residuais
    filled = filled.replace(/\{\{\s*.*?\s*\}\}/g, '____________________');

    return filled;
  }
}
