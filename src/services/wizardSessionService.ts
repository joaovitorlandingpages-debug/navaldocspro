import { supabase } from "@/integrations/supabase/client";
import { WizardState, WizardStep } from "@/components/wizard2/Wizard2Store";

export interface WizardSession {
  id: string;
  company_id: string;
  user_id: string;
  status: 'draft' | 'uploading' | 'processing' | 'review_required' | 'ready_to_create' | 'creating' | 'completed' | 'failed' | 'cancelled';
  current_step: WizardStep;
  selected_service_id: string | null;
  selected_blueprint_id: string | null;
  customer_id: string | null;
  vessel_id: string | null;
  process_id: string | null;
  uploaded_document_ids: string[];
  ocr_job_ids: string[];
  extracted_data: Record<string, any>;
  review_status: Record<string, any>;
  pending_requirements: any;
  created_at: string;
  updated_at: string;
}

export async function createWizardSession(companyId: string, userId: string) {
  const { data, error } = await supabase
    .from("wizard_sessions")
    .insert({
      company_id: companyId,
      user_id: userId,
      status: 'draft',
      current_step: 'documents',
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as WizardSession;
}

export async function updateWizardSession(sessionId: string, patch: Partial<WizardSession>) {
  const { error } = await supabase
    .from("wizard_sessions")
    .update(patch as any)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getWizardSession(sessionId: string) {
  const { data, error } = await supabase
    .from("wizard_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as WizardSession | null;
}

export async function listActiveSessions(companyId: string, userId: string) {
  const { data, error } = await supabase
    .from("wizard_sessions")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as unknown as WizardSession[];
}

export function mapStateToSession(state: WizardState): Partial<WizardSession> {
  return {
    current_step: state.step,
    customer_id: state.customerId,
    vessel_id: state.vesselId,
    selected_service_id: state.processTypeId,
    extracted_data: state.ocrData.extractedFields,
    // Add other fields as needed
  };
}

export function mapSessionToState(session: WizardSession): Partial<WizardState> {
  return {
    step: session.current_step,
    customerId: session.customer_id,
    vesselId: session.vessel_id,
    processTypeId: session.selected_service_id,
    ocrData: {
      isExtracting: session.status === 'processing',
      confidence: (session.extracted_data as any)?.confidence ?? 0,
      extractedFields: session.extracted_data,
    }
  };
}
