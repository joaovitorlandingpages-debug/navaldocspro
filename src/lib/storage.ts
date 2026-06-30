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

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
export const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
]);

export interface UploadOptions {
  maxBytes?: number;
  allowedMime?: Set<string>;
  contentType?: string;
  upsert?: boolean;
}

export function validateUpload(file: File, opts: UploadOptions = {}) {
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES;
  const mimes = opts.allowedMime ?? ALLOWED_MIME;
  if (file.size > maxBytes) {
    throw new Error(`Arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
  if (file.type && !mimes.has(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type || "desconhecido"}.`);
  }
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
  if (error) throw error;
  return { path };
}

// Extract a storage-relative path from either a raw path or a legacy public/sign URL.
export function extractStoragePath(rawOrPath: string, bucket: AnyBucket): string {
  if (!rawOrPath) return "";
  if (!rawOrPath.startsWith("http")) return rawOrPath;
  const marker = `/${bucket}/`;
  const idx = rawOrPath.indexOf(marker);
  return idx >= 0 ? rawOrPath.slice(idx + marker.length) : "";
}

export async function signedUrl(bucket: AnyBucket, path: string, ttlSeconds = 60): Promise<string> {
  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const realPath = extractStoragePath(path, bucket);
  if (!realPath) throw new Error("Caminho de arquivo inválido");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(realPath, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function openSignedFile(bucket: AnyBucket, path: string, ttlSeconds = 60) {
  try {
    const url = await signedUrl(bucket, path, ttlSeconds);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    console.error("[STORAGE_OPEN_FAILED]", e);
    toast.error(e?.message ?? "Erro ao abrir arquivo.");
  }
}

export async function removeFromBucket(bucket: AnyBucket, path: string) {
  const realPath = extractStoragePath(path, bucket);
  if (!realPath) return;
  await supabase.storage.from(bucket).remove([realPath]);
}
