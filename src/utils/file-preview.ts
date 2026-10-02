import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function inferBucket(file: any) {
  const category = String(file?.category || "").toLowerCase();
  const url = String(file?.file_url || file?.generated_file_url || "");
  if (category.includes("generated") || url.includes("generated-documents/")) return "generated-documents";
  if (category.includes("personal_doc") || category.includes("address_doc") || category.includes("vessel_doc") || category.includes("ocr")) return "ocr-documents";
  if (category.includes("client") || category.includes("cliente")) return "customer-documents";
  if (category.includes("embarca") || category.includes("vessel")) return "vessel-documents";
  return "process-attachments";
}

function extractStoragePath(raw: string, bucket: string) {
  if (!raw) return "";
  if (!raw.startsWith("http")) {
    const prefix = `${bucket}/`;
    return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  }
  const marker = `/${bucket}/`;
  const idx = raw.indexOf(marker);
  return idx >= 0 ? raw.slice(idx + marker.length) : "";
}

export async function openStoredFile(file: any) {
  const raw = String(file?.file_url || file?.generated_file_url || "");
  if (!raw) {
    toast.error("PDF não gerado. Clique em regenerar.");
    return;
  }

  if (raw.startsWith("http") && !raw.includes("/storage/v1/object/")) {
    window.open(raw, "_blank");
    return;
  }

  try {
    const bucket = inferBucket(file);
    const path = extractStoragePath(raw, bucket);
    if (!path) throw new Error("Caminho do arquivo inválido");
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
    console.log("[GENERATED_DOCUMENT_PREVIEW_FIXED]", { bucket, path });
  } catch (error) {
    console.error("[GENERATED_DOCUMENT_PREVIEW_FAILED]", error);
    toast.error("Erro ao abrir documento.");
  }
}

export async function getStoredFileSignedUrl(file: any) {
  const raw = String(file?.file_url || file?.generated_file_url || "");
  if (!raw) throw new Error("PDF não gerado. Clique em regenerar.");
  if (raw.startsWith("http") && !raw.includes("/storage/v1/object/")) return raw;
  const bucket = inferBucket(file);
  const path = extractStoragePath(raw, bucket);
  if (!path) throw new Error("Caminho do arquivo inválido");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadStoredFile(file: any, defaultName?: string) {
  try {
    const url = await getStoredFileSignedUrl(file);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao baixar arquivo do servidor");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    let fileName = defaultName || file?.name || file?.file_name || "documento.pdf";
    if (!fileName.toLowerCase().endsWith(".pdf") && !fileName.includes(".")) {
      fileName += ".pdf";
    }
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    toast.success("Download iniciado com sucesso.");
  } catch (err: any) {
    console.error("[DOWNLOAD_FAILED]", err);
    toast.error(err?.message || "Não foi possível baixar o documento.");
  }
}