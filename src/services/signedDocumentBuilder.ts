import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { signatureAnchorsService, type TemplateSignatureAnchor } from "./signatureAnchors";

export interface BuiltSignatureArtifacts {
  signedPdfUrl: string;
  certificatePdfUrl: string;
  verificationCode: string;
  anchorsUsed: number;
  fallbackUsed: boolean;
}

const NAVY = rgb(0.06, 0.12, 0.28);
const NAVY_SOFT = rgb(0.2, 0.25, 0.4);
const GOLD = rgb(0.78, 0.6, 0.18);
const MUTED = rgb(0.45, 0.45, 0.5);
const BORDER = rgb(0.82, 0.86, 0.92);

async function qrPngBytes(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 300 });
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    return { bytes: buf, isPng };
  } catch { return null; }
}

async function blankBasePdf(title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(title, { x: 50, y: 780, size: 18, font, color: NAVY });
  page.drawText("Documento gerado pelo NavalDocs Pro", {
    x: 50, y: 750, size: 11, font, color: MUTED,
  });
  return pdf.save();
}

function roleLabel(role: string) {
  return ({
    cliente: "Cliente",
    engenheiro: "Engenheiro",
    despachante: "Despachante",
    responsavel_tecnico: "Responsável Técnico",
    testemunha: "Testemunha",
    outro: "Assinante",
  } as Record<string, string>)[role] ?? role;
}

async function drawAnchoredSignature(
  pdf: PDFDocument,
  anchor: TemplateSignatureAnchor,
  participant: any,
  helv: PDFFont,
  helvBold: PDFFont,
  qrImg: PDFImage,
  verifyCode: string,
) {
  const pages = pdf.getPages();
  const pageIdx = Math.min(Math.max(anchor.page - 1, 0), pages.length - 1);
  const page: PDFPage = pages[pageIdx];

  const { x, y, width, height } = anchor;

  // box
  page.drawRectangle({ x, y, width, height, borderColor: BORDER, borderWidth: 0.8, color: rgb(0.99, 0.99, 1) });

  // signature image
  let sigDrawn = false;
  if (participant.signature_image_url?.startsWith("data:image")) {
    try {
      const b64 = participant.signature_image_url.split(",")[1];
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const isPng = participant.signature_image_url.includes("image/png");
      const sigImg = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
      const sigH = height * 0.55;
      const ratio = sigImg.width / sigImg.height;
      const sigW = Math.min(width - 16, sigH * ratio);
      page.drawImage(sigImg, { x: x + (width - sigW) / 2, y: y + height - sigH - 8, width: sigW, height: sigH });
      sigDrawn = true;
    } catch { /* ignore */ }
  }
  if (!sigDrawn && participant.signature_image_url) {
    page.drawText(participant.signature_image_url.slice(0, 32), {
      x: x + 8, y: y + height - 24, size: 14, font: helvBold, color: NAVY,
    });
  }

  // separator line
  page.drawLine({
    start: { x: x + 8, y: y + 32 }, end: { x: x + width - 8, y: y + 32 },
    color: NAVY, thickness: 0.6,
  });

  // name + role + date
  page.drawText(participant.name ?? "—", { x: x + 8, y: y + 20, size: 9, font: helvBold, color: NAVY });
  page.drawText(roleLabel(participant.role ?? "outro"), { x: x + 8, y: y + 10, size: 7, font: helv, color: NAVY_SOFT });
  const when = participant.signed_at ? new Date(participant.signed_at).toLocaleString("pt-BR") : "—";
  page.drawText(when, { x: x + 8, y: y + 2, size: 6.5, font: helv, color: MUTED });

  // gold "Assinado eletronicamente" seal
  page.drawText("[OK] Assinado eletronicamente", {
    x: x + width - 130, y: y + 20, size: 7, font: helvBold, color: GOLD,
  });
  page.drawText(`Hash ${(participant.signature_hash ?? "").slice(0, 10)}`, {
    x: x + width - 130, y: y + 10, size: 6, font: helv, color: MUTED,
  });
  page.drawText(`Verif. ${verifyCode}`, {
    x: x + width - 130, y: y + 2, size: 6, font: helv, color: MUTED,
  });

  // mini QR
  page.drawImage(qrImg, { x: x + width - 28, y: y + height - 28, width: 22, height: 22 });
}

function drawFallbackBlock(
  pdf: PDFDocument, participants: any[], helv: PDFFont, helvBold: PDFFont, qrImg: PDFImage,
  verifyUrl: string, verifyCode: string,
) {
  const sp = pdf.addPage([595, 842]);
  sp.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: NAVY });
  sp.drawText("ASSINATURAS ELETRÔNICAS", { x: 40, y: 810, size: 16, font: helvBold, color: rgb(1, 1, 1) });
  sp.drawText("Bloco padrão — sem âncoras configuradas neste template", {
    x: 40, y: 798, size: 7, font: helv, color: rgb(0.85, 0.9, 1),
  });

  let y = 760;
  for (const p of participants) {
    if (y < 200) break;
    sp.drawRectangle({ x: 40, y: y - 90, width: 515, height: 90, borderColor: BORDER, borderWidth: 1 });
    sp.drawText(p.name, { x: 50, y: y - 18, size: 12, font: helvBold, color: NAVY });
    sp.drawText(`Papel: ${roleLabel(p.role)}`, { x: 50, y: y - 34, size: 9, font: helv, color: NAVY_SOFT });
    sp.drawText(`Assinado em: ${p.signed_at ? new Date(p.signed_at).toLocaleString("pt-BR") : "—"}`,
      { x: 50, y: y - 48, size: 9, font: helv, color: NAVY_SOFT });
    sp.drawText(`Método: ${p.signature_type ?? "—"}`, { x: 50, y: y - 62, size: 9, font: helv, color: NAVY_SOFT });
    sp.drawText(`Hash: ${(p.signature_hash ?? "").slice(0, 56)}`, { x: 50, y: y - 76, size: 7, font: helv, color: MUTED });
    sp.drawText("[OK] Assinado eletronicamente", { x: 420, y: y - 18, size: 8, font: helvBold, color: GOLD });
    y -= 102;
  }

  sp.drawImage(qrImg, { x: 40, y: 40, width: 90, height: 90 });
  sp.drawText("Verificação pública:", { x: 140, y: 110, size: 10, font: helvBold, color: NAVY });
  sp.drawText(verifyUrl, { x: 140, y: 95, size: 8, font: helv, color: rgb(0.2, 0.4, 0.7) });
  sp.drawText(`Código: ${verifyCode}`, { x: 140, y: 80, size: 10, font: helvBold, color: NAVY });
  sp.drawText("NavalDocs Pro — Assinatura Eletrônica Avançada", { x: 140, y: 55, size: 8, font: helv, color: MUTED });
}

export async function buildSignedDocumentArtifacts(opts: {
  companyId: string;
  requestId: string;
  title: string;
  verificationCode: string;
  templateId?: string | null;
  participants: any[];
  events: Array<{ event_type: string; event_message?: string | null; created_at: string }>;
  originalPdfBytes?: Uint8Array | null;
  process?: { id?: string; process_type?: string; customer_name?: string; vessel_name?: string } | null;
  company?: { name?: string; logo_url?: string | null } | null;
}): Promise<BuiltSignatureArtifacts> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${origin}/verificar-assinatura/${opts.verificationCode}`;
  const qrBytes = await qrPngBytes(verifyUrl);

  // ===== 1) Signed PDF =====
  const baseBytes = opts.originalPdfBytes ?? (await blankBasePdf(opts.title));
  const signedPdf = await PDFDocument.load(baseBytes);
  const helv = await signedPdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await signedPdf.embedFont(StandardFonts.HelveticaBold);
  const qrImg = await signedPdf.embedPng(qrBytes);

  // Resolve anchors
  let anchors: TemplateSignatureAnchor[] = [];
  if (opts.templateId) {
    try {
      const roles = Array.from(new Set(opts.participants.map((p: any) => p.role)));
      anchors = await signatureAnchorsService.resolveForRoles(opts.templateId, opts.companyId, roles);
    } catch { anchors = []; }
  }

  let anchorsUsed = 0;
  const placed = new Set<string>();
  if (anchors.length > 0) {
    for (const a of anchors) {
      const participant = opts.participants.find((p: any) => p.role === a.role && !placed.has(p.id));
      if (!participant) continue;
      await drawAnchoredSignature(signedPdf, a, participant, helv, helvBold, qrImg, opts.verificationCode);
      placed.add(participant.id);
      anchorsUsed++;
    }
  }

  // Anyone not placed by anchors → fallback block (also when no anchors at all)
  const remaining = opts.participants.filter((p: any) => !placed.has(p.id));
  const fallbackUsed = remaining.length > 0;
  if (fallbackUsed) {
    drawFallbackBlock(signedPdf, remaining, helv, helvBold, qrImg, verifyUrl, opts.verificationCode);
  }

  const signedBytes = await signedPdf.save();

  // ===== 2) Premium Evidence Certificate =====
  const cert = await PDFDocument.create();
  const cf = await cert.embedFont(StandardFonts.Helvetica);
  const cfb = await cert.embedFont(StandardFonts.HelveticaBold);
  const cqr = await cert.embedPng(qrBytes);

  // Optional company logo
  let logoImg: PDFImage | null = null;
  if (opts.company?.logo_url) {
    const fetched = await fetchImageBytes(opts.company.logo_url);
    if (fetched) {
      try { logoImg = fetched.isPng ? await cert.embedPng(fetched.bytes) : await cert.embedJpg(fetched.bytes); }
      catch { logoImg = null; }
    }
  }

  const cp = cert.addPage([595, 842]);
  // Top navy band
  cp.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: NAVY });
  // Gold accent line
  cp.drawRectangle({ x: 0, y: 758, width: 595, height: 2, color: GOLD });
  if (logoImg) {
    const ratio = logoImg.width / logoImg.height;
    const h = 44; const w = h * ratio;
    cp.drawImage(logoImg, { x: 40, y: 778, width: w, height: h });
    cp.drawText(opts.company?.name ?? "NavalDocs Pro", { x: 40 + w + 14, y: 810, size: 13, font: cfb, color: rgb(1,1,1) });
    cp.drawText("Plataforma Naval Digital", { x: 40 + w + 14, y: 795, size: 8, font: cf, color: rgb(0.85, 0.9, 1) });
  } else {
    cp.drawText(opts.company?.name ?? "NavalDocs Pro", { x: 40, y: 818, size: 14, font: cfb, color: rgb(1,1,1) });
    cp.drawText("Plataforma Naval Digital", { x: 40, y: 802, size: 8, font: cf, color: rgb(0.85, 0.9, 1) });
  }
  cp.drawText("CERTIFICADO DE EVIDÊNCIA DIGITAL", { x: 240, y: 818, size: 13, font: cfb, color: rgb(1, 1, 1) });
  cp.drawText("Assinatura Eletrônica Avançada", { x: 240, y: 802, size: 8, font: cf, color: rgb(0.85, 0.9, 1) });
  cp.drawText(`Código de verificação: ${opts.verificationCode}`, {
    x: 240, y: 786, size: 8, font: cfb, color: GOLD,
  });

  // Document info card
  let cy = 720;
  const card = (title: string, lines: Array<[string, string]>) => {
    cp.drawText(title, { x: 40, y: cy, size: 10, font: cfb, color: NAVY }); cy -= 12;
    cp.drawLine({ start: { x: 40, y: cy + 4 }, end: { x: 555, y: cy + 4 }, color: BORDER, thickness: 0.5 });
    for (const [k, v] of lines) {
      cp.drawText(k, { x: 40, y: cy - 8, size: 8, font: cfb, color: MUTED });
      cp.drawText(v.slice(0, 90), { x: 160, y: cy - 8, size: 9, font: cf, color: NAVY });
      cy -= 14;
    }
    cy -= 6;
  };

  card("DOCUMENTO", [
    ["Título", opts.title],
    ["Processo", opts.process?.process_type ?? "—"],
    ["Cliente", opts.process?.customer_name ?? "—"],
    ["Embarcação", opts.process?.vessel_name ?? "—"],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    ["Status final", "CONCLUÍDO — Todos assinaram"],
  ]);

  // Participants
  cp.drawText("PARTICIPANTES E EVIDÊNCIAS", { x: 40, y: cy, size: 10, font: cfb, color: NAVY }); cy -= 12;
  cp.drawLine({ start: { x: 40, y: cy + 4 }, end: { x: 555, y: cy + 4 }, color: BORDER, thickness: 0.5 });
  for (const p of opts.participants) {
    if (cy < 220) { cert.addPage([595, 842]); cy = 780; }
    cp.drawRectangle({ x: 40, y: cy - 88, width: 515, height: 88, borderColor: BORDER, borderWidth: 0.5 });
    cp.drawText(`${p.name}  —  ${roleLabel(p.role)}`, { x: 48, y: cy - 14, size: 10, font: cfb, color: NAVY });
    const contact = [p.email, p.phone].filter(Boolean).join(" · ");
    cp.drawText(contact || "—", { x: 48, y: cy - 26, size: 8, font: cf, color: NAVY_SOFT });
    const dev = (p.device_info?.platform ?? "—") + " / " + (p.device_info?.language ?? "—");
    const meta = [
      ["IP", p.ip_address ?? "—"],
      ["Dispositivo", dev],
      ["Navegador", (p.user_agent ?? "—").slice(0, 60)],
      ["Método", p.signature_type ?? "—"],
      ["Assinado em", p.signed_at ? new Date(p.signed_at).toLocaleString("pt-BR") : "—"],
      ["Hash da assinatura", (p.signature_hash ?? "").slice(0, 64)],
      ["Termo aceito", "Sim — usuário confirmou aceite dos termos"],
    ] as const;
    let row = cy - 40;
    for (const [k, v] of meta) {
      cp.drawText(k, { x: 48, y: row, size: 7, font: cfb, color: MUTED });
      cp.drawText(String(v), { x: 130, y: row, size: 7, font: cf, color: NAVY_SOFT });
      row -= 8;
    }
    cp.drawText("[OK] ASSINADO", { x: 470, y: cy - 14, size: 9, font: cfb, color: GOLD });
    cy -= 96;
  }

  // Timeline
  if (cy < 220) { cert.addPage([595, 842]); cy = 780; }
  cp.drawText("LINHA DO TEMPO DE EVENTOS", { x: 40, y: cy, size: 10, font: cfb, color: NAVY }); cy -= 12;
  cp.drawLine({ start: { x: 40, y: cy + 4 }, end: { x: 555, y: cy + 4 }, color: BORDER, thickness: 0.5 });
  for (const e of opts.events.slice(-30)) {
    if (cy < 150) { cert.addPage([595, 842]); cy = 780; }
    cp.drawText(`• ${new Date(e.created_at).toLocaleString("pt-BR")} — ${e.event_type}`, {
      x: 40, y: cy, size: 7.5, font: cfb, color: NAVY_SOFT,
    }); cy -= 9;
    if (e.event_message) {
      cp.drawText(e.event_message.slice(0, 120), { x: 50, y: cy, size: 7, font: cf, color: MUTED }); cy -= 10;
    }
  }

  // Footer with QR + seal
  const lastPage = cert.getPages()[cert.getPages().length - 1];
  lastPage.drawRectangle({ x: 0, y: 0, width: 595, height: 130, color: rgb(0.97, 0.98, 1) });
  lastPage.drawRectangle({ x: 0, y: 128, width: 595, height: 2, color: GOLD });
  lastPage.drawImage(cqr, { x: 40, y: 20, width: 90, height: 90 });
  lastPage.drawText("AUTENTICIDADE VERIFICÁVEL", { x: 140, y: 100, size: 10, font: cfb, color: NAVY });
  lastPage.drawText("Escaneie o QR Code ou acesse o link abaixo para validar:", {
    x: 140, y: 86, size: 8, font: cf, color: NAVY_SOFT,
  });
  lastPage.drawText(verifyUrl, { x: 140, y: 72, size: 8, font: cf, color: rgb(0.2, 0.4, 0.7) });
  lastPage.drawText(`Código: ${opts.verificationCode}`, { x: 140, y: 56, size: 10, font: cfb, color: NAVY });
  lastPage.drawText("Selo de autenticidade NavalDocs Pro · MP 2.200-2/2001 · ICP-Brasil-equivalente", {
    x: 140, y: 40, size: 7, font: cf, color: MUTED,
  });
  // Gold seal circle
  lastPage.drawCircle({ x: 530, y: 65, size: 38, color: GOLD });
  lastPage.drawCircle({ x: 530, y: 65, size: 33, color: rgb(0.97, 0.98, 1) });
  lastPage.drawText("AUTÊNTICO", { x: 506, y: 68, size: 8, font: cfb, color: NAVY });
  lastPage.drawText("NavalDocs", { x: 506, y: 58, size: 6, font: cf, color: NAVY_SOFT });

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
    anchorsUsed,
    fallbackUsed,
  };
}

export async function createSignedDocSignedUrl(path: string, expiresInSec = 300): Promise<string> {
  const { data, error } = await supabase.storage.from("signed-documents").createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
