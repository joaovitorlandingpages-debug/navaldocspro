/**
 * Motor Central de Validação Documental e Conformidade Operacional.
 */
import { ALIAS_TO_CANONICAL } from "./documentPlaceholders";
import * as N from "./documentNormalizer";


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

    // ALIAS_TO_CANONICAL and N imported statically at top of file


    const isBlank = (v: any) =>
      v === undefined || v === null ||
      (typeof v === "number" && Number.isNaN(v)) ||
      (typeof v === "string" && (v.trim() === "" || /^(undefined|null|nan)$/i.test(v.trim())));

    // Fallback chain: embarcação → cliente → empresa → engenheiro → sistema → "—"
    const pick = (...vals: any[]) => {
      for (const v of vals) if (!isBlank(v)) return v;
      return "";
    };

    const cli = data.customer || {};
    const ves = data.vessel || {};
    const eng = data.engine || {};
    const emp = data.company || {};
    const prof = data.profile || {};
    const proc = data.process || data.processo || {};

    // Mapeamento canônico com normalização aplicada
    const canonical: Record<string, string> = {
      "cliente.nome":      N.cleanString(pick(cli.name, cli.razao_social, data.cliente?.nome)),
      "cliente.cpf":       N.normalizeCpfCnpj(pick(cli.cpf_cnpj, cli.cpf, data.cliente?.cpf)),
      "cliente.rg":        N.cleanString(pick(cli.rg, data.cliente?.rg)),
      "cliente.endereco":  N.cleanString(pick(cli.address, data.cliente?.endereco)),
      "cliente.cidade":    N.cleanString(pick(cli.city, data.cliente?.cidade, emp.city)),
      "cliente.estado":    N.normalizeState(pick(cli.state, data.cliente?.uf, data.cliente?.estado, emp.state)),
      "cliente.telefone":  N.normalizePhone(pick(cli.phone, data.cliente?.telefone)),
      "cliente.email":     N.cleanString(pick(cli.email, data.cliente?.email)),

      "embarcacao.nome":         N.cleanString(pick(ves.name, data.embarcacao?.nome)),
      "embarcacao.inscricao":    N.cleanString(pick(ves.registration_number, ves.tie, data.embarcacao?.inscricao)),
      "embarcacao.tipo":         N.cleanString(pick(ves.vessel_type, ves.type, data.embarcacao?.tipo)),
      "embarcacao.material":     N.cleanString(pick(ves.material, ves.hull_material, data.embarcacao?.material)),
      "embarcacao.comprimento":  N.formatMeasurement(pick(ves.length, data.embarcacao?.comprimento), "m"),
      "embarcacao.boca":         N.formatMeasurement(pick(ves.beam, ves.boca, data.embarcacao?.boca), "m"),
      "embarcacao.pontal":       N.formatMeasurement(pick(ves.depth, ves.pontal, data.embarcacao?.pontal), "m"),
      "embarcacao.capacidade":   N.cleanString(pick(ves.capacity, data.embarcacao?.capacidade)),

      "motor.fabricante":  N.cleanString(pick(eng.manufacturer, ves.engine_manufacturer, ves.engine_brand)),
      "motor.modelo":      N.cleanString(pick(eng.model, ves.engine_model)),
      "motor.potencia":    N.formatPower(pick(eng.power, ves.engine_power)),
      "motor.serie":       N.cleanString(pick(eng.serial_number, ves.engine_serial, ves.engine_serial_number)),

      "empresa.nome":      N.cleanString(pick(emp.name, emp.razao_social)),
      "empresa.cnpj":      N.normalizeCpfCnpj(pick(emp.cnpj)),

      "engenheiro.nome":   N.cleanString(pick(prof.full_name, prof.name)),
      "engenheiro.crea":   N.cleanString(pick(prof.crea)),

      "processo.numero":   N.cleanString(pick(proc.protocol_number, proc.numero, proc.id)),
      "processo.tipo":     N.cleanString(pick(proc.process_type, proc.tipo, proc.type)),

      "sistema.data_atual": new Date().toLocaleDateString("pt-BR"),
      "sistema.local":      N.cleanString(pick(emp.city, data.sistema?.local), "Itajaí"),
      "sistema.hash":       N.cleanString(data.sistema?.hash),
    };

    const placeholderRegex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}|\[\s*([a-zA-Z0-9_.]+)\s*\]/g;
    const unresolved: string[] = [];

    const filled = content.replace(placeholderRegex, (_match, p1, p2) => {
      const raw = (p1 || p2 || "").trim();
      const canonicalKey = ALIAS_TO_CANONICAL[raw] ?? raw;
      const value = canonical[canonicalKey];
      if (!isBlank(value)) return String(value);
      unresolved.push(canonicalKey);
      // NUNCA emitir undefined/null/NaN/[Campo pendente] no PDF final.
      return "—";
    });

    if (unresolved.length) {
      console.warn("[PLACEHOLDER_FALLBACK_TO_DASH]", Array.from(new Set(unresolved)));
    }
    return filled;
  }
}
