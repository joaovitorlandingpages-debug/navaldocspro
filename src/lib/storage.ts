// Central storage helper — all uploads/previews MUST go through here.
// Buckets are private by default; UI uses short-lived signed URLs.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PrivateBucket =
  | "customer-documents"
  | "vessel-documents"
  | "process-attachments"
  | "ocr-documents"
  | "generated-documents"
  | "process-document-uploads"
  | "process-dossiers"
  | "signed-documents"
  | "company-branding"
  | "document-templates";

export type PublicBucket = "company-logos";
export type AnyBucket = PrivateBucket | PublicBucket;

export const PUBLIC_BUCKETS: ReadonlySet<string> = new Set<string>(["company-logos"]);

/** Limites de tamanho por finalidade */
export const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB para logos e imagens de marca
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB para anexos e documentos
export const MAX_UPLOAD_BYTES = MAX_ATTACHMENT_BYTES;

/** Formatos restritos e seguros */
export const ALLOWED_IMAGE_MIMES: ReadonlySet<string> = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
]);

export const ALLOWED_DOC_MIMES: ReadonlySet<string> = new Set<string>([
  "application/pdf"
]);

export const ALLOWED_STRICT_MIMES: ReadonlySet<string> = new Set<string>([
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_DOC_MIMES
]);export const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];
export const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
export const LOGO_ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS;

export interface UploadOptions {
  maxBytes?: number;
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMime?: Set<string>;
  contentType?: string;
  upsert?: boolean;
  purpose?: 'logo' | 'attachment';
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Traduz erros do Supabase Storage / Rede / RLS em mensagens claras para o usuário
 */
export function parseStorageError(error: any): string {
  if (!error) return "Erro desconhecido ao processar arquivo.";
  const msg = String(error?.message || error?.error_description || error || "");

  if (
    msg.toLowerCase().includes("row-level security") ||
    msg.toLowerCase().includes("rls") ||
    error?.statusCode === "403" ||
    error?.status === 403
  ) {
    return "Permissão negada no Supabase Storage. Verifique se sua sessão e empresa estão ativas.";
  }

  if (
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("connection")
  ) {
    return "Falha de rede ao conectar com o armazenamento do Supabase. Verifique sua conexão com a internet.";
  }

  if (
    msg.toLowerCase().includes("entity too large") ||
    msg.toLowerCase().includes("payload too large") ||
    error?.statusCode === "413" ||
    error?.status === 413
  ) {
    return "O arquivo enviado excede o limite máximo permitido pelo servidor.";
  }

  if (msg.toLowerCase().includes("invalid file") || msg.toLowerCase().includes("corrupt")) {
    return "Arquivo inválido ou corrompido. Selecione um arquivo válido.";
  }

  return msg;
}

/**
 * Validação segura de arquivo no client-side que retorna { isValid, error }
 */
export function validateUploadSafe(file: File, opts: UploadOptions = {}): ValidationResult {
  if (!file) {
    return { isValid: false, error: "Nenhum arquivo selecionado." };
  }

  if (file.size === 0) {
    return { isValid: false, error: `O arquivo "${file.name}" está vazio ou corrompido (0 bytes).` };
  }

  const defaultMaxBytes = opts.purpose === 'logo' ? MAX_LOGO_BYTES : MAX_ATTACHMENT_BYTES;
  const maxBytes = opts.maxBytes ?? opts.maxSize ?? defaultMaxBytes;

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    const currentMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `O arquivo "${file.name}" excede o tamanho máximo de ${maxMb}MB (tamanho atual: ${currentMb}MB).`
    };
  }

  const defaultMimes = opts.purpose === 'logo' ? ALLOWED_IMAGE_MIMES : ALLOWED_STRICT_MIMES;
  const mimes = opts.allowedMime ?? defaultMimes;

  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = "." + rawExt;
  const defaultValidExts = opts.purpose === 'logo' ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_EXTENSIONS;
  const validExts = opts.allowedExtensions
    ? opts.allowedExtensions.map((e) => (e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`))
    : defaultValidExts;

  const isMimeValid = file.type ? mimes.has(file.type.toLowerCase()) : false;
  const isExtValid = validExts.includes(ext);

  if (!isMimeValid && !isExtValid) {
    const formatsLabel = opts.purpose === 'logo' ? "PNG, JPG, JPEG ou WEBP" : "PDF, PNG, JPG, JPEG ou WEBP";
    return {
      isValid: false,
      error: `Formato não suportado para "${file.name}". Formatos permitidos: ${formatsLabel}.`
    };
  }

  return { isValid: true };
}

/**
 * Validação rigorosa de arquivo no client-side antes de iniciar o envio (lança exceção se inválido)
 */
export function validateUpload(file: File, opts: UploadOptions = {}): ValidationResult {
  const result = validateUploadSafe(file, opts);
  if (!result.isValid) {
    throw new Error(result.error);
  }
  return result;
}

export async function uploadToBucket(
  bucket: AnyBucket,
  path: string,
  file: File | Blob,
  opts: UploadOptions = {},
): Promise<{ path: string }> {
  if (file instanceof File) validateUpload(file, opts);
  
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: opts.contentType ?? (file as File).type ?? undefined,
    upsert: opts.upsert ?? false,
  });

  if (error) {
    const friendlyMsg = parseStorageError(error);
    console.error("[STORAGE_UPLOAD_ERROR]", { bucket, path, error, friendlyMsg });
    throw new Error(friendlyMsg);
  }

  return { path };
}

// Extract a storage-relative path from either a raw path or a legacy public/sign URL.
export function extractStoragePath(rawOrPath: string, bucket: AnyBucket): string {
  if (!rawOrPath) return "";
  if (!rawOrPath.startsWith("http")) return rawOrPath;
  const marker = `/${bucket}/`;
  const idx = rawOrPath.indexOf(marker);
  if (idx >= 0) {
    const pathWithParams = rawOrPath.slice(idx + marker.length);
    // Remove query params if any
    return pathWithParams.split("?")[0];
  }
  return "";
}

export async function signedUrl(bucket: AnyBucket, path: string, ttlSeconds = 60): Promise<string> {
  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const realPath = extractStoragePath(path, bucket);
  if (!realPath) throw new Error("Caminho de arquivo inválido");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(realPath, ttlSeconds);
  if (error) {
    throw new Error(parseStorageError(error));
  }
  return data.signedUrl;
}

export function getPublicStorageUrl(bucket: PublicBucket, path: string): string {
  const realPath = extractStoragePath(path, bucket);
  const { data } = supabase.storage.from(bucket).getPublicUrl(realPath || path);
  return data.publicUrl;
}

export async function openSignedFile(bucket: AnyBucket, path: string, ttlSeconds = 60) {
  try {
    const url = await signedUrl(bucket, path, ttlSeconds);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    console.error("[STORAGE_OPEN_FAILED]", e);
    toast.error(parseStorageError(e));
  }
}

/**
 * Remove com segurança arquivo anterior do Storage, prevenindo acúmulo de arquivos órfãos
 */
export async function removeFromBucket(bucket: AnyBucket, path: string | null | undefined): Promise<void> {
  if (!path) return;
  const realPath = extractStoragePath(path, bucket);
  if (!realPath) return;

  try {
    const { error } = await supabase.storage.from(bucket).remove([realPath]);
    if (error) {
      console.warn("[STORAGE_REMOVE_WARN]", { bucket, realPath, error: error.message });
    }
  } catch (e) {
    console.warn("[STORAGE_REMOVE_EXCEPTION]", e);
  }
}
