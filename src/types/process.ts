export interface ProcessType {
  id: string;
  name: string;
  description: string;
  icon: string;
  estimated_days: number;
  category: string;
}

export interface ProcessDocumentPackage {
  id: string;
  process_type_id: string;
  template_id: string;
  is_mandatory: boolean;
  document_role: 'input' | 'output' | 'signature' | 'validation';
  order_index: number;
  conditional_rule?: any;
  template?: {
    name: string;
    description: string;
    category: string;
  };
}

export type ProcessStatus = 
  | 'Pendente' 
  | 'Enviado' 
  | 'Em análise' 
  | 'Validado' 
  | 'Precisa correção' 
  | 'Gerado' 
  | 'Assinado' 
  | 'Arquivado';

export interface Process {
  id: string;
  process_type: string;
  process_type_id?: string;
  status: string;
  compliance_status?: 'conforme' | 'incompleto' | 'pendente' | 'divergente' | 'vencido' | 'reprovado';
  compliance_score?: number;
  customer_id: string;
  vessel_id?: string;
  due_date?: string;
  priority: string;
  is_blocked?: boolean;
  validation_errors?: any[];
  customer?: {
    id: string;
    name: string;
    cpf_cnpj?: string;
    email?: string;
    phone?: string;
  };
  vessel?: {
    id: string;
    name: string;
    tie?: string;
    hull_number?: string;
    vessel_type?: string;
    activity?: string;
    has_radio?: boolean;
    gross_tonnage?: number;
  };
}

export interface ProcessAutomationState {
  id: string;
  process_id: string;
  checklist_status: {
    template_id: string;
    name: string;
    is_mandatory: boolean;
    status: 'missing' | 'uploaded' | 'validated' | 'expired';
    document_id?: string;
  }[];
  data_completeness: {
    entity: 'customer' | 'vessel';
    field: string;
    value: any;
    is_missing: boolean;
  }[];
  pending_items: string[];
  is_ready_for_generation: boolean;
  next_suggested_steps: string[];
  last_analyzed_at: string;
  completion_percentage?: number;
}
