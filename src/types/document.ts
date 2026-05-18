export interface Document {
  id: string;
  document_type: string;
  file_url: string | null;
  status: string;
  expiry_date: string | null;
  issue_date: string | null;
  process_id: string | null;
  customer_id: string | null;
  vessel_id: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  ocr_enabled: boolean;
  file_type: string | null;
}
