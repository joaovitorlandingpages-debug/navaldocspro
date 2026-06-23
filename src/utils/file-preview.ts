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
  if (!raw.startsWith("http")) return raw;
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