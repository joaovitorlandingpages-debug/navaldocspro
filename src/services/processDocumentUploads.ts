import { supabase } from "@/integrations/supabase/client";

export type ProcessDocUploadStatus = "pendente" | "processando" | "concluido" | "falhou" | "ignorado";
export type ProcessDocValidationStatus =
  | "pendente" | "conferido" | "baixa_confianca" | "divergente" | "ausente" | "falhou";

export interface ProcessDocumentUpload {
  id: string;
  process_document_id: string;
  process_id: string;
  company_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  detected_document_type: string | null;
  ocr_status: ProcessDocUploadStatus;
  ocr_text: string | null;
  extracted_fields: Record<string, any>;
  confidence_score: number | null;
  validation_status: ProcessDocValidationStatus;
  validation_errors: Array<{ field?: string; message: string; severity?: string }>;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const BUCKET = "process-document-uploads";

export async function listProcessDocumentUploads(processDocumentId: string) {
  const { data, error } = await supabase
    .from("process_document_uploads")
    .select("*")
    .eq("process_document_id", processDocumentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProcessDocumentUpload[];
}

export async function uploadProcessDocumentFile(args: {
  file: File;
  processDocumentId: string;
  processId: string;
  companyId: string;
  userId?: string;
}) {
  const safeName = args.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${args.companyId}/${args.processId}/${args.processDocumentId}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, args.file, { contentType: args.file.type, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("process_document_uploads")
    .insert({
      process_document_id: args.processDocumentId,
      process_id: args.processId,
      company_id: args.companyId,
      file_url: path,
      file_name: args.file.name,
      file_type: args.file.type,
      file_size: args.file.size,
      uploaded_by: args.userId ?? null,
      ocr_status: "pendente",
    })
    .select("*")
    .single();
  if (error) throw error;
  console.log("[process_document_upload_created]", data.id);
  return data as unknown as ProcessDocumentUpload;
}

export async function runProcessDocumentOcr(uploadId: string) {
  const { data, error } = await supabase.functions.invoke("process-document-ocr", {
    body: { uploadId },
  });
  if (error) throw error;
  console.log("[process_document_fields_extracted]", uploadId);
  return data as { ok: boolean; document_type?: string; fields?: Record<string, any>; confidence?: number };
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function updateExtractedField(uploadId: string, field: string, value: any) {
  const { data: cur, error: e1 } = await supabase
    .from("process_document_uploads")
    .select("extracted_fields")
    .eq("id", uploadId)
    .single();
  if (e1) throw e1;
  const next = { ...((cur?.extracted_fields as any) ?? {}), [field]: value };
  const { error } = await supabase
    .from("process_document_uploads")
    .update({ extracted_fields: next })
    .eq("id", uploadId);
  if (error) throw error;
  console.log("[process_document_field_edited]", uploadId, field);
}

export async function setValidationStatus(
  uploadId: string,
  status: ProcessDocValidationStatus,
  errors: ProcessDocumentUpload["validation_errors"] = []
) {
  const { error } = await supabase
    .from("process_document_uploads")
    .update({ validation_status: status, validation_errors: errors })
    .eq("id", uploadId);
  if (error) throw error;
  const evt =
    status === "conferido" ? "process_document_validation_passed"
    : status === "divergente" || status === "falhou" ? "process_document_validation_failed"
    : "process_document_validation_warning";
  console.log(`[${evt}]`, uploadId);
}

/** Compare OCR fields with customer/vessel/company. Returns diffs + suggested status. */
export function compareExtractedWith(
  fields: Record<string, any>,
  ctx: { customer?: any; vessel?: any; company?: any; confidence?: number | null }
) {
  const errors: ProcessDocumentUpload["validation_errors"] = [];
  const norm = (v: any) => (v == null ? "" : String(v).replace(/\D+/g, ""));
  const lower = (v: any) => (v == null ? "" : String(v).trim().toLowerCase());

  const checkDoc = (label: string, ocr: any, expected: any) => {
    const a = norm(ocr), b = norm(expected);
    if (a && b && a !== b) errors.push({ field: label, message: `${label} divergente: OCR ${ocr} ≠ cadastro ${expected}`, severity: "high" });
  };
  const checkText = (label: string, ocr: any, expected: any) => {
    const a = lower(ocr), b = lower(expected);
    if (a && b && !a.includes(b) && !b.includes(a)) {
      errors.push({ field: label, message: `${label} divergente: OCR "${ocr}" ≠ cadastro "${expected}"`, severity: "medium" });
    }
  };

  if (ctx.customer) {
    checkDoc("CPF", fields.cpf, ctx.customer.cpf_cnpj);
    checkDoc("CNPJ", fields.cnpj, ctx.customer.cpf_cnpj);
    checkText("Nome", fields.name, ctx.customer.name);
  }
  if (ctx.vessel) {
    checkText("Embarcação", fields.vessel_name, ctx.vessel.name);
    if (fields.registration_number && ctx.vessel.registration_number &&
        String(fields.registration_number).trim() !== String(ctx.vessel.registration_number).trim()) {
      errors.push({ field: "registration_number", message: `Inscrição divergente: ${fields.registration_number} ≠ ${ctx.vessel.registration_number}`, severity: "high" });
    }
  }
  if (fields.expiry_date) {
    const d = new Date(fields.expiry_date);
    if (!isNaN(+d) && d < new Date()) errors.push({ field: "expiry_date", message: "Documento vencido", severity: "high" });
  }

  const lowConf = (ctx.confidence ?? 1) < 0.6;
  let status: ProcessDocValidationStatus = "conferido";
  if (errors.some((e) => e.severity === "high")) status = "divergente";
  else if (errors.length > 0 || lowConf) status = "baixa_confianca";
  return { status, errors };
}

export async function applyDataToProcessDocument(args: {
  uploadId: string;
  processDocumentId: string;
  fields: Record<string, any>;
}) {
  // Persist as metadata on process_documents and bump status
  const { data: pd, error: e1 } = await supabase
    .from("process_documents")
    .select("metadata, status")
    .eq("id", args.processDocumentId)
    .single();
  if (e1) throw e1;
  const meta = { ...((pd?.metadata as any) ?? {}), applied_fields: args.fields, applied_from_upload: args.uploadId, applied_at: new Date().toISOString() };
  const { error: e2 } = await supabase
    .from("process_documents")
    .update({ metadata: meta, status: "em_preenchimento" })
    .eq("id", args.processDocumentId);
  if (e2) throw e2;
  console.log("[process_document_data_applied]", args.processDocumentId);
}
