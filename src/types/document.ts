export interface Document {
  id: string;
  document_type: string;
  file_url: string | null;
  file_name?: string;
  status: string;
  compliance_status?: 'conforme' | 'incompleto' | 'pendente' | 'divergente' | 'vencido' | 'reprovado';
  expiry_date: string | null;
  issue_date: string | null;
  process_id: string | null;
  customer_id: string | null;
  vessel_id: string | null;
  company_id: string;
  validation_errors?: any[];
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  category_id?: string;
  ocr_enabled: boolean;
  file_type: string | null;
  is_active?: boolean;
  version?: number;
  fields_config?: DocumentTemplateField[];
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export interface DocumentTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'table' | 'array' | 'signature';
  is_required: boolean;
  mapping_path?: string;
  validation_rules?: any;
  position_config?: {
    x: number;
    y: number;
    page: number;
    width: number;
    height: number;
  };
  options?: any;
}

export interface DocumentChecklistItem {
  id: string;
  process_id: string;
  item_name: string;
  is_mandatory: boolean;
  status: 'pending' | 'completed' | 'failed' | 'waived';
  document_id?: string;
  notes?: string;
  completed_at?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  created_by?: string;
  change_summary?: string;
  created_at: string;
}
