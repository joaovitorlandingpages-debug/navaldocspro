import { supabase } from "@/integrations/supabase/client";
import { 
  buildCustomerReview, 
  buildVesselReview 
} from "./documentOcrEngine";
import { 
  ExtractedDocumentReview 
} from "./documentOcrTypes";
import { validateUpload, MAX_ATTACHMENT_BYTES } from "@/lib/storage";

export interface ProcessDocumentOptions {
  file: File;
  companyId: string;
  userId?: string;
  targetEntity: "customer" | "vessel";
  existingData?: Record<string, any> | null;
  onProgress?: (stage: string) => void;
}

/**
 * Pipeline completo de processamento com upload seguro, OCR idempotente e preparação para conferência
 */
export async function processDocumentForReview(
  options: ProcessDocumentOptions
): Promise<ExtractedDocumentReview> {
  const { file, companyId, userId, targetEntity, existingData, onProgress } = options;

  // 1. Validação no cliente
  onProgress?.("Validando formato e integridade do arquivo...");
  const validation = validateUpload(file, {
    maxSize: MAX_ATTACHMENT_BYTES, // 20 MB
    allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
  });

  if (!validation.isValid) {
    throw new Error(validation.error || "Formato de arquivo ou tamanho não suportado.");
  }

  // 2. Upload seguro para o bucket de documentos com isolamento por empresa
  onProgress?.("Enviando arquivo com armazenamento isolado por empresa...");
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const mimeType = file.type || (
    fileExt === "png" ? "image/png" :
    fileExt === "jpg" || fileExt === "jpeg" ? "image/jpeg" :
    fileExt === "webp" ? "image/webp" :
    fileExt === "pdf" ? "application/pdf" : "application/octet-stream"
  );
  const randomId = crypto.randomUUID();
  const folder = targetEntity === "customer" ? "customer-docs" : "vessel-docs";
  let storagePath = `${companyId}/${folder}/${randomId}.${fileExt}`;
  let bucketUsed = targetEntity === "customer" ? "customer-documents" : "vessel-documents";

  // Cria URL de blob local imediata (100% segura, rápida e imune a erros de bucket no iframe)
  const localBlobUrl = URL.createObjectURL(file);

  // Tenta upload no bucket principal do recurso
  let uploadResult = await supabase.storage
    .from(bucketUsed)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });

  if (uploadResult.error) {
    console.warn(`[SmartDocumentService] Falha no bucket principal '${bucketUsed}':`, uploadResult.error.message);
    // Tentativa resiliente no bucket de fallback 'ocr-documents'
    const fallbackBucket = "ocr-documents";
    const fallbackPath = `${companyId}/${folder}/${randomId}.${fileExt}`;
    const fallbackUp = await supabase.storage
      .from(fallbackBucket)
      .upload(fallbackPath, file, { contentType: mimeType, upsert: false });

    if (!fallbackUp.error) {
      bucketUsed = fallbackBucket;
      storagePath = fallbackPath;
      uploadResult = fallbackUp;
    } else {
      console.error("[SmartDocumentService] Falha de upload em ambos os buckets:", fallbackUp.error.message);
      throw new Error(
        `Falha ao salvar o arquivo para leitura (${uploadResult.error.message || fallbackUp.error.message}). Por favor, tente novamente ou prossiga com o cadastro manual.`
      );
    }
  }

  // Obter URL assinada com duração limitada
  let authorizedSignedUrl = "";
  try {
    const { data: signedData, error: signErr } = await supabase.storage
      .from(bucketUsed)
      .createSignedUrl(storagePath, 3600); // 1 hora de validade

    if (!signErr && signedData?.signedUrl) {
      authorizedSignedUrl = signedData.signedUrl;
    }
  } catch (signEx) {
    console.warn("[SmartDocumentService] Erro ao obter URL assinada:", signEx);
  }

  // Prévia garantida: blob local para render imediato sem falhas, ou URL assinada autorizada
  const filePreviewUrl = localBlobUrl || authorizedSignedUrl;

  // 3. Registrar o arquivo na tabela uploaded_files
  onProgress?.("Registrando arquivo e inicializando pipeline de leitura...");
  const { data: uploadedFileRecord, error: fileInsertErr } = await supabase
    .from("uploaded_files")
    .insert({
      company_id: companyId,
      file_name: file.name,
      file_url: storagePath,
      category: targetEntity === "customer" ? "customer_documents" : "vessel_documents",
      file_type: mimeType,
      file_size: file.size,
      uploaded_by: userId || null,
      status: "uploaded",
      metadata: {
        bucket: bucketUsed,
        path: storagePath,
        folder,
        target_entity: targetEntity,
      }
    })
    .select()
    .single();

  if (fileInsertErr || !uploadedFileRecord) {
    console.error("[SmartDocumentService] Erro ao registrar uploaded_files:", fileInsertErr);
    throw new Error(`Falha técnica ao registrar documento: ${fileInsertErr?.message || "Registro não criado"}`);
  }

  const fileRecordId = uploadedFileRecord.id;

  // 4. Criar registro de job em ocr_jobs com a coluna correta uploaded_file_id
  const { data: ocrJob, error: jobInsertErr } = await supabase
    .from("ocr_jobs")
    .insert({
      company_id: companyId,
      uploaded_file_id: fileRecordId,
      document_type: targetEntity === "customer" ? "customer" : "vessel",
      status: "pending",
    })
    .select()
    .single();

  if (jobInsertErr || !ocrJob) {
    console.error("[SmartDocumentService] Erro ao criar ocr_jobs:", jobInsertErr);
    throw new Error(`Falha técnica ao inicializar o processamento OCR: ${jobInsertErr?.message || "Job não criado"}`);
  }

  const ocrJobId = ocrJob.id;

  // 5. Invocar Edge Function de OCR
  onProgress?.("Identificando tipo de documento e extraindo campos oficiais...");
  let rawText = "";
  let extractedFields: Record<string, any> = {};

  const invokeRes = await supabase.functions.invoke("process-ocr-document", {
    body: { 
      jobId: ocrJobId,
      targetEntity: targetEntity
    },
  });

  if (invokeRes.error) {
    console.error("[SmartDocumentService] Edge function invoke error:", invokeRes.error);
    throw new Error(`Falha técnica na execução da leitura OCR (${invokeRes.error.message || "Erro na Edge Function"}).`);
  }

  if (invokeRes.data?.error) {
    console.error("[SmartDocumentService] Erro retornado pela Edge Function:", invokeRes.data.error);
    throw new Error(invokeRes.data.error.message || invokeRes.data.error || "Falha técnica no motor de leitura.");
  }

  if (invokeRes.data) {
    extractedFields = invokeRes.data.fields || invokeRes.data.result || {};
    rawText = invokeRes.data.raw_text || invokeRes.data.raw_text_preview || "";
    if (invokeRes.data.docType) {
      extractedFields._document_type = invokeRes.data.docType;
    }
  }

  // Consulta de confirmação do job
  const { data: updatedJob } = await supabase
    .from("ocr_jobs")
    .select("*")
    .eq("id", ocrJobId)
    .single();

  if (updatedJob?.status === "failed") {
    const errorMsg = updatedJob.error_message || "O documento não pôde ser interpretado pelo motor de OCR.";
    throw new Error(`Falha no processamento do documento: ${errorMsg}`);
  }

  if (updatedJob?.extracted_data) {
    extractedFields = {
      ...extractedFields,
      ...(updatedJob.extracted_data as Record<string, any>),
    };
    rawText = (updatedJob.extracted_data as any)?._raw_text || rawText;
  }

  // 6. Construir objeto estruturado para conferência lado a lado
  onProgress?.("Preparando tela de conferência obrigatória...");
  let review: ExtractedDocumentReview;

  if (targetEntity === "customer") {
    review = buildCustomerReview(file, filePreviewUrl, rawText, extractedFields, existingData);
  } else {
    review = buildVesselReview(file, filePreviewUrl, rawText, extractedFields, existingData);
  }

  review.jobId = ocrJobId;
  review.fileId = fileRecordId;

  return review;
}
