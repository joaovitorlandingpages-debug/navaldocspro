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
  const randomId = crypto.randomUUID();
  const folder = targetEntity === "customer" ? "customer-docs" : "vessel-docs";
  let storagePath = `${companyId}/${folder}/${randomId}.${fileExt}`;
  let bucketUsed = targetEntity === "customer" ? "customer-documents" : "vessel-documents";

  // Cria URL de blob local imediata (100% segura, rápida e imune a erros de bucket no iframe)
  const localBlobUrl = URL.createObjectURL(file);

  // Tenta upload no bucket principal do recurso
  let uploadResult = await supabase.storage
    .from(bucketUsed)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadResult.error) {
    console.warn(`[SmartDocumentService] Falha no bucket principal '${bucketUsed}':`, uploadResult.error.message);
    // Tentativa resiliente no bucket de fallback 'ocr-documents'
    const fallbackBucket = "ocr-documents";
    const fallbackPath = `${companyId}/${folder}/${randomId}.${fileExt}`;
    const fallbackUp = await supabase.storage
      .from(fallbackBucket)
      .upload(fallbackPath, file, { contentType: file.type, upsert: false });

    if (!fallbackUp.error) {
      bucketUsed = fallbackBucket;
      storagePath = fallbackPath;
      uploadResult = fallbackUp;
    } else {
      console.error("[SmartDocumentService] Falha de upload em ambos os buckets:", fallbackUp.error.message);
      throw new Error(
        `Não foi possível salvar o arquivo para leitura automática (${uploadResult.error.message || fallbackUp.error.message}). Por favor, tente novamente ou prossiga com o cadastro manual.`
      );
    }
  }

  // Obter URL assinada com duração limitada (nunca URL pública de bucket privado)
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
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId || null,
      status: "pending",
    })
    .select()
    .single();

  if (fileInsertErr) {
    console.warn("[SmartDocumentService] Erro ao registrar uploaded_files:", fileInsertErr);
  }

  const fileRecordId = uploadedFileRecord?.id || randomId;

  // 4. Criar registro de job em ocr_jobs
  const { data: ocrJob, error: jobInsertErr } = await supabase
    .from("ocr_jobs")
    .insert({
      company_id: companyId,
      file_id: uploadedFileRecord?.id || null,
      status: "pending",
    })
    .select()
    .single();

  if (jobInsertErr) {
    console.warn("[SmartDocumentService] Erro ao criar ocr_jobs:", jobInsertErr);
  }

  const ocrJobId = ocrJob?.id;

  // 5. Invocar Edge Function de OCR
  onProgress?.("Identificando tipo de documento e extraindo campos oficiais...");
  let rawText = "";
  let extractedFields: Record<string, any> = {};

  try {
    if (ocrJobId) {
      const invokeRes = await supabase.functions.invoke("process-ocr-document", {
        body: { jobId: ocrJobId },
      });

      if (invokeRes.error) {
        console.warn("[SmartDocumentService] Edge function warning:", invokeRes.error);
      } else if (invokeRes.data) {
        extractedFields = invokeRes.data.result || invokeRes.data.fields || {};
        rawText = invokeRes.data.raw_text || invokeRes.data.raw_text_preview || "";
      }

      // Consulta de confirmação do job
      const { data: updatedJob } = await supabase
        .from("ocr_jobs")
        .select("*")
        .eq("id", ocrJobId)
        .single();

      if (updatedJob?.extracted_data) {
        extractedFields = {
          ...extractedFields,
          ...(updatedJob.extracted_data as Record<string, any>),
        };
        rawText = (updatedJob.extracted_data as any)?._raw_text || rawText;
      }
    }
  } catch (err: any) {
    console.warn("[SmartDocumentService] Execução do OCR com fallback seguro:", err);
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
