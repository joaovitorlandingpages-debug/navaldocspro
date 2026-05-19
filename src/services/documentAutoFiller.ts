/**
 * Motor de Preenchimento Automático de Templates Documentais.
 * Substitui placeholders {{field}} pelos dados reais do processo, cliente e embarcação.
 */

export interface DocumentDataPayload {
  customer?: any;
  vessel?: any;
  process?: any;
  company?: any;
  engineer?: any;
  current_date?: string;
  location?: string;
}

export class DocumentAutoFiller {
  /**
   * Preenche um texto base com os dados fornecidos.
   */
  static fill(baseContent: string, data: DocumentDataPayload): string {
    if (!baseContent) return "";
    
    let filledContent = baseContent;
    
    // Mapeamento de placeholders comuns
    const mappings: Record<string, any> = {
      "customer_name": data.customer?.name,
      "customer_cpf": data.customer?.cpf_cnpj,
      "customer_address": data.customer?.address,
      "customer_phone": data.customer?.phone,
      "customer_email": data.customer?.email,
      
      "vessel_name": data.vessel?.name,
      "vessel_id": data.vessel?.tie || data.vessel?.registration_number,
      "vessel_type": data.vessel?.vessel_type,
      "vessel_activity": data.vessel?.activity,
      "vessel_length": data.vessel?.length,
      "vessel_engine": data.vessel?.engine_model,
      
      "company_name": data.company?.name,
      "company_cnpj": data.company?.cnpj,
      "company_responsible": data.company?.responsible_name,
      
      "process_type": data.process?.process_type,
      "process_id": data.process?.id?.substring(0, 8),
      
      "engineer_name": data.engineer?.name,
      "engineer_crea": data.engineer?.crea,
      
      "current_date": data.current_date || new Date().toLocaleDateString('pt-BR'),
      "location": data.location || "Brasil"
    };

    // Substituição via Regex para suportar {{placeholder}}
    Object.keys(mappings).forEach(key => {
      const value = mappings[key] || `[${key.toUpperCase()} PENDENTE]`;
      const regex = new RegExp(`{{${key}}}`, 'g');
      filledContent = filledContent.replace(regex, value);
    });

    return filledContent;
  }

  /**
   * Detecta campos que não puderam ser preenchidos.
   */
  static getMissingFields(content: string): string[] {
    const regex = /{{(.*?)}}/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return matches.map(m => m.replace(/{{|}}/g, ''));
  }
}
