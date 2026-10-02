import { supabase } from "@/integrations/supabase/client";
import { 
  ExtractedDocumentReview, 
  ExtractedFieldDetail,
  SupportedDocumentType,
  DOCUMENT_TYPE_LABELS 
} from "./documentOcrTypes";
import { buildCustomerReview, buildVesselReview } from "./documentOcrEngine";

export interface ReviewSessionData {
  review: ExtractedDocumentReview;
  originUrl?: string;
  targetEntity: "customer" | "vessel";
  createdAt: number;
  draftData?: any;
}

// Cache em memória para acesso síncrono imediato na mesma sessão
const memorySessionMap = new Map<string, ReviewSessionData>();

/**
 * Salva a sessão de conferência em memória e no sessionStorage
 */
export function saveReviewSession(
  id: string,
  session: {
    review: ExtractedDocumentReview;
    originUrl?: string;
    targetEntity?: "customer" | "vessel";
    draftData?: any;
  }
) {
  const sessionData: ReviewSessionData = {
    review: session.review,
    originUrl: session.originUrl || (session.review.targetEntity === "customer" ? "/customers/novo" : "/vessels/novo"),
    targetEntity: session.targetEntity || session.review.targetEntity || "vessel",
    createdAt: Date.now(),
    draftData: session.draftData,
  };

  memorySessionMap.set(id, sessionData);

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(`ndp_review_session_${id}`, JSON.stringify(sessionData));
      // Salva também chave genérica mais recente
      window.sessionStorage.setItem(`ndp_latest_review_session`, JSON.stringify({ id, ...sessionData }));
    } catch (e) {
      console.warn("[reviewSessionStorage] Erro ao gravar sessionStorage:", e);
    }
  }
}

/**
 * Recupera sessão síncrona
 */
export function getReviewSession(id: string): ReviewSessionData | null {
  if (memorySessionMap.has(id)) {
    return memorySessionMap.get(id)!;
  }

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`ndp_review_session_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ReviewSessionData;
        memorySessionMap.set(id, parsed);
        return parsed;
      }

      // Tenta fallback para latest se for a mesma
      const latest = window.sessionStorage.getItem(`ndp_latest_review_session`);
      if (latest) {
        const parsedLatest = JSON.parse(latest);
        if (parsedLatest.id === id || !id) {
          memorySessionMap.set(id, parsedLatest);
          return parsedLatest;
        }
      }
    } catch (e) {
      console.warn("[reviewSessionStorage] Erro ao ler sessionStorage:", e);
    }
  }

  return null;
}

/**
 * Carrega a sessão de conferência de forma resiliente.
 * Se o usuário recarregar a tela (F5) ou acessar diretamente a URL com o ID do arquivo ou job,
 * busca os dados no Supabase e reconstrói o objeto de conferência sem apresentar tela de erro.
 */
export async function loadReviewSessionWithFallback(id: string): Promise<ReviewSessionData | null> {
  // 1. Tenta recuperar do cache local imediato
  const cached = getReviewSession(id);
  if (cached) return cached;

  // 2. Se não estiver no cache (ex: F5 / recarregamento em aba nova), recupera do banco de dados
  try {
    // Busca em uploaded_files
    let fileRecord: any = null;
    let ocrJobRecord: any = null;

    const { data: fileById } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fileById) {
      fileRecord = fileById;
      const { data: jobByFile } = await supabase
        .from("ocr_jobs")
        .select("*")
        .eq("uploaded_file_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ocrJobRecord = jobByFile;
    } else {
      // Se não encontrou por fileId, pode ser que o id seja o ocr_jobs.id
      const { data: jobById } = await supabase
        .from("ocr_jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (jobById) {
        ocrJobRecord = jobById;
        if (jobById.uploaded_file_id) {
          const { data: fileByJob } = await supabase
            .from("uploaded_files")
            .select("*")
            .eq("id", jobById.uploaded_file_id)
            .maybeSingle();
          fileRecord = fileByJob;
        }
      }
    }

    if (!fileRecord && !ocrJobRecord) {
      console.warn("[reviewSessionStorage] Nenhum registro encontrado no Supabase para id:", id);
      return null;
    }

    // Determina se é cliente ou embarcação
    const isCustomer = 
      ocrJobRecord?.document_type === "customer" || 
      fileRecord?.category?.includes("customer");

    const targetEntity: "customer" | "vessel" = isCustomer ? "customer" : "vessel";

    // Obtém URL assinada do arquivo no bucket
    let filePreviewUrl = "";
    if (fileRecord?.file_url) {
      const bucket = fileRecord.metadata?.bucket || (isCustomer ? "customer-documents" : "vessel-documents");
      try {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileRecord.file_url, 3600);
        if (signed?.signedUrl) {
          filePreviewUrl = signed.signedUrl;
        }
      } catch (signErr) {
        console.warn("[reviewSessionStorage] Erro ao assinar URL do documento:", signErr);
      }
    }

    const rawFields = (ocrJobRecord?.extracted_data as Record<string, any>) || {};
    const rawText = rawFields._raw_text || "";

    // Reconstrói a conferência estruturada conforme o tipo de entidade
    let review: ExtractedDocumentReview;
    if (targetEntity === "customer") {
      review = buildCustomerReview(null, filePreviewUrl, rawText, rawFields, null);
    } else {
      review = buildVesselReview(null, filePreviewUrl, rawText, rawFields, null);
    }

    review.fileId = fileRecord?.id || id;
    review.jobId = ocrJobRecord?.id;
    review.fileName = fileRecord?.file_name || "Documento Anexado";
    review.fileSize = fileRecord?.file_size || 0;
    review.fileType = fileRecord?.file_type || "application/pdf";
    review.fileUrl = filePreviewUrl;
    review.targetEntity = targetEntity;

    const fallbackSession: ReviewSessionData = {
      review,
      originUrl: targetEntity === "customer" ? "/customers/novo" : "/vessels/novo",
      targetEntity,
      createdAt: Date.now(),
    };

    saveReviewSession(id, fallbackSession);
    return fallbackSession;
  } catch (err) {
    console.error("[reviewSessionStorage] Falha no fallback Supabase:", err);
    return null;
  }
}
