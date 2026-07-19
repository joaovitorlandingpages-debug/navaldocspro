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

/** 
 * Pipeline Real de OCR para o Onboarding 
 */
export async function runSmartOcr(args: {
  file: File;
  companyId: string;
  userId: string;
  sessionId: string;
}) {
  const BUCKET = "ocr-documents";
  const safeName = args.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${args.companyId}/wizard/${args.sessionId}/${Date.now()}_${safeName}`;
  
  // 1. Upload Real para Storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, args.file, { contentType: args.file.type, upsert: false });
  if (upErr) throw upErr;

  // 2. Registrar Documento (uploaded_files)
  const { data: fileRecord, error: fileErr } = await supabase
    .from("uploaded_files")
    .insert({
      company_id: args.companyId,
      file_url: path,
      file_name: args.file.name,
      file_type: args.file.type,
      file_size: args.file.size,
      uploaded_by: args.userId,
      category: "smart_onboarding",
      status: "active",
      metadata: { wizard_session_id: args.sessionId }
    })
    .select("*")
    .single();
  if (fileErr) throw fileErr;

  // 3. Criar OCR Job
  const { data: job, error: jobErr } = await supabase
    .from("ocr_jobs")
    .insert({
      company_id: args.companyId,
      uploaded_file_id: fileRecord.id,
      status: "queued",
    })
    .select("*")
    .single();
  if (jobErr) throw jobErr;

  // 4. Disparar Pipeline OCR Real (Edge Function)
  const { data: ocrResult, error: invokeErr } = await supabase.functions.invoke("process-ocr-document", {
    body: { jobId: job.id },
  });
  if (invokeErr) throw invokeErr;

  // 5. Buscar resultado final persistido pela função
  const { data: finalJob, error: finalErr } = await supabase
    .from("ocr_jobs")
    .select("*")
    .eq("id", job.id)
    .single();
  if (finalErr) throw finalErr;

  return {
    jobId: job.id,
    documentType: finalJob.identified_document_type,
    extractedFields: finalJob.extracted_data as Record<string, any>,
    confidence: finalJob.confidence_score ?? 0,
    confidenceByField: finalJob.confidence_by_field as Record<string, number>,
  };
}

/**
 * Detecção de Cliente Existente
 */
export async function detectExistingCustomer(args: {
  cpf_cnpj?: string;
  name?: string;
  companyId: string;
}) {
  if (!args.cpf_cnpj && !args.name) return null;

  let query = supabase.from("customers").select("*").eq("company_id", args.companyId);

  if (args.cpf_cnpj) {
    const { data } = await query.eq("cpf_cnpj", args.cpf_cnpj).maybeSingle();
    if (data) return { match: "exact", customer: data };
  }

  if (args.name) {
    const { data: list } = await query.ilike("name", `%${args.name}%`).limit(1);
    if (list && list.length > 0) return { match: "partial", customer: list[0] };
  }

  return null;
}

/**
 * Detecção de Embarcação Existente
 */
export async function detectExistingVessel(args: {
  registration_number?: string;
  name?: string;
  companyId: string;
}) {
  if (!args.registration_number && !args.name) return null;

  let query = supabase.from("vessels").select("*").eq("company_id", args.companyId);

  if (args.registration_number) {
    const { data } = await query.eq("registration_number", args.registration_number).maybeSingle();
    if (data) return { match: "exact", vessel: data };
  }

  if (args.name) {
    const { data: list } = await query.ilike("name", `%${args.name}%`).limit(1);
    if (list && list.length > 0) return { match: "partial", vessel: list[0] };
  }

  return null;
}

