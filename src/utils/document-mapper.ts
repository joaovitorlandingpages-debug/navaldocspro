/**
 * Engine de mapeamento de campos para documentos marítimos.
 * Suporta campos simples, tabelas (tripulação, certificados) e listas técnicas.
 */

export interface MappingSource {
  vessel?: any;
  customer?: any;
  process?: any;
  user?: any;
  extra_data?: any;
}

export function mapFields(templateFields: any[], source: MappingSource) {
  return templateFields.map(field => {
    let value = '';
    
    if (field.mapping_path) {
      value = getNestedValue(source, field.mapping_path);
    }
    
    // Suporte a campos complexos
    if (field.field_type === 'table' || field.field_type === 'array') {
      // Se for uma tabela de tripulação, por exemplo
      if (field.field_key === 'crew_list') {
        value = source.vessel?.crew || [];
      } else if (field.field_key === 'engine_list') {
        value = source.vessel?.engines || [];
      }
    }
    
    return {
      ...field,
      current_value: value || field.default_value || ''
    };
  });
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Valida os campos mapeados com base nas regras de negócio navais.
 */
export function validateMapping(mappedFields: any[]) {
  const errors = [];
  
  for (const field of mappedFields) {
    if (field.is_required && !field.current_value) {
      errors.push({
        field_key: field.field_key,
        message: `O campo ${field.field_label} é obrigatório.`
      });
    }
    
    // Validações específicas navais (ex: CPF, TIE, etc.)
    if (field.field_key === 'tie' && field.current_value) {
      if (!/^\d{9}-\d{1}$/.test(field.current_value)) {
        // Exemplo de validação de formato TIE
      }
    }
  }
  
  return {
    is_valid: errors.length === 0,
    errors
  };
}
