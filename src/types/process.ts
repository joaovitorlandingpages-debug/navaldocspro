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
  };
  vessel?: {
    name: string;
  };
}
