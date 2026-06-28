import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

export interface BuiltSignatureArtifacts {
  signedPdfUrl: string;
  certificatePdfUrl: string;
  verificationCode: string;
}

async function qrPngBytes(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 300 });
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function blankBasePdf(title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(title, { x: 50, y: 780, size: 18, font, color: rgb(0.1, 0.15, 0.3) });
  page.drawText("Documento gerado pelo NavalDocs Pro", {
    x: 50, y: 750, size: 11, font, color: rgb(0.4, 0.4, 0.4),
  });
  return pdf.save();
}

export async function buildSignedDocumentArtifacts(opts: {
  companyId: string;
  requestId: string;
  title: string;
  verificationCode: string;
  participants: Array<{
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
    signed_at?: string | null;
    signature_type?: string | null;
    signature_hash?: string | null;
    signature_image_url?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  }>;
  events: Array<{ event_type: string; event_message?: string | null; created_at: string }>;
  originalPdfBytes?: Uint8Array | null;
}): Promise<BuiltSignatureArtifacts> {
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verificar-assinatura/${opts.verificationCode}`;
  const qrBytes = await qrPngBytes(verifyUrl);

  // ===== 1) Signed PDF =====
  const baseBytes = opts.originalPdfBytes ?? (await blankBasePdf(opts.title));
  const signedPdf = await PDFDocument.load(baseBytes);
  const helv = await signedPdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await signedPdf.embedFont(StandardFonts.HelveticaBold);
  const qrImg = await signedPdf.embedPng(qrBytes);

  // Signature block page
  const sp = signedPdf.addPage([595, 842]);
  sp.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.06, 0.12, 0.28) });
  sp.drawText("ASSINATURAS ELETRÔNICAS", { x: 40, y: 810, size: 16, font: helvBold, color: rgb(1, 1, 1) });

  let y = 760;
  for (const p of opts.participants) {
    if (y < 160) { y = 780; signedPdf.addPage([595, 842]); }
    sp.drawRectangle({ x: 40, y: y - 80, width: 515, height: 80, borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 1 });
    sp.drawText(p.name, { x: 50, y: y - 18, size: 12, font: helvBold, color: rgb(0.1, 0.15, 0.3) });
    sp.drawText(`Papel: ${p.role}`, { x: 50, y: y - 34, size: 9, font: helv, color: rgb(0.3, 0.3, 0.4) });
    sp.drawText(`Assinado em: ${p.signed_at ? new Date(p.signed_at).toLocaleString("pt-BR") : "—"}`, {
      x: 50, y: y - 48, size: 9, font: helv, color: rgb(0.3, 0.3, 0.4),
    });
    sp.drawText(`Método: ${p.signature_type ?? "—"}`, { x: 50, y: y - 62, size: 9, font: helv, color: rgb(0.3, 0.3, 0.4) });
    sp.drawText(`Hash: ${(p.signature_hash ?? "").slice(0, 48)}`, { x: 50, y: y - 76, size: 7, font: helv, color: rgb(0.5, 0.5, 0.55) });
    y -= 92;
  }

  // Footer with QR + code
  sp.drawImage(qrImg, { x: 40, y: 40, width: 90, height: 90 });
  sp.drawText("Verificação pública:", { x: 140, y: 110, size: 10, font: helvBold, color: rgb(0.1, 0.15, 0.3) });
  sp.drawText(verifyUrl, { x: 140, y: 95, size: 8, font: helv, color: rgb(0.2, 0.4, 0.7) });
  sp.drawText(`Código: ${opts.verificationCode}`, { x: 140, y: 80, size: 10, font: helvBold, color: rgb(0.1, 0.15, 0.3) });
  sp.drawText("NavalDocs Pro — Assinatura Eletrônica Avançada", { x: 140, y: 55, size: 8, font: helv, color: rgb(0.4, 0.4, 0.4) });

  const signedBytes = await signedPdf.save();

  // ===== 2) Certificate PDF =====
  const cert = await PDFDocument.create();
  const cf = await cert.embedFont(StandardFonts.Helvetica);
  const cfb = await cert.embedFont(StandardFonts.HelveticaBold);
  const cqr = await cert.embedPng(qrBytes);
  const cp = cert.addPage([595, 842]);

  cp.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: rgb(0.06, 0.12, 0.28) });
  cp.drawText("CERTIFICADO DE EVIDÊNCIA", { x: 40, y: 810, size: 18, font: cfb, color: rgb(1, 1, 1) });
  cp.drawText("Assinatura Eletrônica — NavalDocs Pro", { x: 40, y: 788, size: 10, font: cf, color: rgb(0.85, 0.9, 1) });

  let cy = 740;
  const line = (label: string, val: string, bold = false) => {
    cp.drawText(label, { x: 40, y: cy, size: 9, font: cfb, color: rgb(0.3, 0.3, 0.4) });
    cp.drawText(val, { x: 160, y: cy, size: 10, font: bold ? cfb : cf, color: rgb(0.1, 0.15, 0.3) });
    cy -= 16;
  };
  line("Documento:", opts.title, true);
  line("Código:", opts.verificationCode, true);
  line("Gerado em:", new Date().toLocaleString("pt-BR"));
  line("Status:", "CONCLUÍDO");
  cy -= 8;

  cp.drawText("PARTICIPANTES", { x: 40, y: cy, size: 11, font: cfb, color: rgb(0.06, 0.12, 0.28) });
  cy -= 18;
  for (const p of opts.participants) {
    if (cy < 240) { cert.addPage([595, 842]); cy = 780; }
    cp.drawText(`• ${p.name} (${p.role})`, { x: 40, y: cy, size: 10, font: cfb, color: rgb(0.1, 0.15, 0.3) }); cy -= 12;
    cp.drawText(`  ${p.email ?? p.phone ?? "—"}`, { x: 40, y: cy, size: 8, font: cf, color: rgb(0.4, 0.4, 0.45) }); cy -= 11;
    cp.drawText(`  Assinado: ${p.signed_at ? new Date(p.signed_at).toLocaleString("pt-BR") : "—"} | Tipo: ${p.signature_type ?? "—"}`, {
      x: 40, y: cy, size: 8, font: cf, color: rgb(0.4, 0.4, 0.45),
    }); cy -= 11;
    cp.drawText(`  IP: ${p.ip_address ?? "—"}`, { x: 40, y: cy, size: 8, font: cf, color: rgb(0.4, 0.4, 0.45) }); cy -= 11;
    cp.drawText(`  Hash: ${(p.signature_hash ?? "").slice(0, 64)}`, { x: 40, y: cy, size: 7, font: cf, color: rgb(0.5, 0.5, 0.55) }); cy -= 14;
  }

  cy -= 6;
  cp.drawText("TIMELINE DE EVENTOS", { x: 40, y: cy, size: 11, font: cfb, color: rgb(0.06, 0.12, 0.28) });
  cy -= 16;
  for (const e of opts.events.slice(-20)) {
    if (cy < 160) { cert.addPage([595, 842]); cy = 780; }
    cp.drawText(`${new Date(e.created_at).toLocaleString("pt-BR")} — ${e.event_type}`, {
      x: 40, y: cy, size: 8, font: cfb, color: rgb(0.2, 0.25, 0.35),
    }); cy -= 10;
    if (e.event_message) {
      cp.drawText(e.event_message.slice(0, 110), { x: 50, y: cy, size: 7, font: cf, color: rgb(0.4, 0.4, 0.45) });
      cy -= 11;
    }
  }

  cp.drawImage(cqr, { x: 40, y: 40, width: 90, height: 90 });
  cp.drawText("Verifique a autenticidade em:", { x: 140, y: 110, size: 10, font: cfb });
  cp.drawText(verifyUrl, { x: 140, y: 95, size: 8, font: cf, color: rgb(0.2, 0.4, 0.7) });
  cp.drawText(`Código: ${opts.verificationCode}`, { x: 140, y: 80, size: 10, font: cfb });

  const certBytes = await cert.save();

  // ===== 3) Upload =====
  const folder = `${opts.companyId}/${opts.requestId}`;
  const signedPath = `${folder}/signed.pdf`;
  const certPath = `${folder}/certificate.pdf`;

  const up1 = await supabase.storage.from("signed-documents").upload(signedPath, new Blob([signedBytes as BlobPart], { type: "application/pdf" }), {
    upsert: true, contentType: "application/pdf",
  });
  if (up1.error) throw up1.error;
  const up2 = await supabase.storage.from("signed-documents").upload(certPath, new Blob([certBytes as BlobPart], { type: "application/pdf" }), {
    upsert: true, contentType: "application/pdf",
  });
  if (up2.error) throw up2.error;

  return {
    signedPdfUrl: signedPath,
    certificatePdfUrl: certPath,
    verificationCode: opts.verificationCode,
  };
}

export async function createSignedDocSignedUrl(path: string, expiresInSec = 300): Promise<string> {
  const { data, error } = await supabase.storage.from("signed-documents").createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
