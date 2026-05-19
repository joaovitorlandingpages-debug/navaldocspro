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
  customer_id: string;
  vessel_id?: string;
  due_date?: string;
  priority: string;
  customer?: {
    name: string;
    cpf_cnpj?: string;
    email?: string;
    phone?: string;
  };
  vessel?: {
    name: string;
    tie?: string;
    hull_number?: string;
    vessel_type?: string;
    activity?: string;
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
}
