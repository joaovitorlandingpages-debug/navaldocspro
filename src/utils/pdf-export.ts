import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface PdfBranding {
  mode?: "none" | "company" | "client" | "exclusive" | string | null;
  logoUrl?: string | null;
  companyName?: string | null;
}

export interface GeneratePdfArgs {
  name: string;
  content: string;
  processId: string;
  companyId: string;
  generatedDocumentId: string;
  branding?: PdfBranding;
}

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("PDF_LOGO_FETCH_FAIL", e);
    return null;
  }
}

export function buildPdfBlob(args: {
  name: string;
  content: string;
  branding?: PdfBranding;
  logoDataUrl?: string | null;
}): Blob {
  const { name, content, branding, logoDataUrl } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Branding header
  if (branding?.mode && branding.mode !== "none" && logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y, 80, 40, undefined, "FAST");
    } catch {
      try { doc.addImage(logoDataUrl, "JPEG", margin, y, 80, 40, undefined, "FAST"); } catch {}
    }
    if (branding.companyName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(branding.companyName, margin + 92, y + 24);
    }
    y += 60;
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(name, margin, y);
  y += 20;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content || "", pageW - margin * 2);
  for (const line of lines) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 15;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${branding?.mode ?? "sem-branding"} · página ${i}/${pageCount}`,
      pageW - margin,
      pageH - 20,
      { align: "right" },
    );
  }

  return doc.output("blob");
}

export async function generateAndUploadPdf(args: GeneratePdfArgs): Promise<{
  path: string;
  signedUrl: string;
}> {
  const logoDataUrl = args.branding?.logoUrl
    ? await fetchLogoDataUrl(args.branding.logoUrl)
    : null;

  const blob = buildPdfBlob({
    name: args.name,
    content: args.content,
    branding: args.branding,
    logoDataUrl,
  });

  const safeName = args.name.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60) || "documento";
  const path = `${args.companyId}/${args.processId}/${args.generatedDocumentId}-${safeName}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("generated-documents")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(path, 60 * 60);
  if (signErr) throw signErr;

  return { path, signedUrl: signed.signedUrl };
}

export async function getSignedUrlForGenerated(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
