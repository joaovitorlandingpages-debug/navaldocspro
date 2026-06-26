import type { CompanyBranding } from "./companyBranding";

/**
 * Single source of truth for branded document PDFs.
 * Both the preview modal and the final upload use this function,
 * guaranteeing Preview === PDF (WYSIWYG).
 */
export async function buildBrandedDocumentPdf(opts: {
  docName: string;
  content: string;
  branding: CompanyBranding | null;
  verificationCode?: string;
}): Promise<{ bytes: Uint8Array; verificationCode: string }> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const b = opts.branding;

  const hexToRgb = (hex: string) => {
    const h = (hex || "#2563eb").replace("#", "");
    return rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    );
  };
  const primary = hexToRgb(b?.brand_primary_color || "#2563eb");
  const secondary = hexToRgb(b?.brand_secondary_color || "#0f172a");

  const embedImage = async (url: string | null | undefined) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      const lower = url.toLowerCase();
      if (lower.includes(".png")) return await pdfDoc.embedPng(buf);
      if (lower.includes(".jpg") || lower.includes(".jpeg")) return await pdfDoc.embedJpg(buf);
      // try png first, fallback jpg
      try {
        return await pdfDoc.embedPng(buf);
      } catch {
        return await pdfDoc.embedJpg(buf);
      }
    } catch {
      return null;
    }
  };

  const [logoImg, watermarkImg, signatureImg, stampImg] = await Promise.all([
    embedImage(b?.logo_primary_url),
    embedImage(b?.watermark_url),
    embedImage(b?.signature_url),
    embedImage(b?.stamp_url),
  ]);

  const verificationCode =
    opts.verificationCode ||
    Array.from({ length: 8 }, () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)],
    ).join("");

  const W = 595.28;
  const H = 841.89;
  const TOP_MARGIN = 95;
  const BOTTOM_MARGIN = 70;
  const LEFT = 48;

  const sanitize = (text: string) =>
    String(text)
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/•/g, "-")
      .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");

  const pages: any[] = [];
  let page = pdfDoc.addPage([W, H]);
  pages.push(page);
  let y = H - TOP_MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([W, H]);
    pages.push(page);
    y = H - TOP_MARGIN;
  };

  const draw = (text: string, size = 10, isBold = false) => {
    const safe = sanitize(text);
    const chunks = safe.length ? safe.match(/.{1,92}(\s|$)/g) || [safe] : [""];
    for (const chunk of chunks) {
      if (y < BOTTOM_MARGIN) newPage();
      page.drawText(chunk.trimEnd(), {
        x: LEFT,
        y,
        size,
        font: isBold ? bold : font,
        color: rgb(0, 0, 0),
        maxWidth: W - LEFT * 2,
      });
      y -= size + 5;
    }
  };

  draw(opts.docName.toUpperCase(), 15, true);
  draw(`Documento revisado e aprovado em ${new Date().toLocaleString("pt-BR")}`, 9);
  y -= 8;
  for (const ln of opts.content.split("\n")) {
    if (ln.trim() === "") {
      y -= 6;
      continue;
    }
    const isHeading = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+$/.test(ln) && ln.length < 40;
    draw(ln, isHeading ? 11 : 10, isHeading);
  }

  // Signature block on the last page
  if (signatureImg || b?.technical_responsible_name) {
    if (y < 180) newPage();
    y -= 30;
    if (signatureImg) {
      const sw = 140;
      const sh = (signatureImg.height / signatureImg.width) * sw;
      page.drawImage(signatureImg, { x: LEFT, y: y - sh, width: sw, height: sh });
      y -= sh + 4;
    }
    page.drawLine({
      start: { x: LEFT, y },
      end: { x: LEFT + 220, y },
      thickness: 0.5,
      color: secondary,
    });
    y -= 12;
    if (b?.technical_responsible_name) draw(b.technical_responsible_name, 9, true);
    if (b?.technical_responsible_registry) draw(b.technical_responsible_registry, 8);
    if (stampImg) {
      const sw = 90;
      const sh = (stampImg.height / stampImg.width) * sw;
      page.drawImage(stampImg, {
        x: W - LEFT - sw,
        y: y,
        width: sw,
        height: sh,
        opacity: 0.9,
      });
    }
  }

  // Apply header / footer / watermark to every page
  const total = pages.length;
  pages.forEach((p, idx) => {
    // Header bar
    p.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: primary });
    if (logoImg) {
      const lw = 70;
      const lh = (logoImg.height / logoImg.width) * lw;
      p.drawImage(logoImg, {
        x: LEFT,
        y: H - 60 + (60 - lh) / 2,
        width: lw,
        height: lh,
      });
    } else if (b?.company_name) {
      p.drawText(sanitize(b.company_name.toUpperCase()), {
        x: LEFT,
        y: H - 38,
        size: 14,
        font: bold,
        color: rgb(1, 1, 1),
      });
    }
    p.drawText(sanitize(opts.docName), {
      x: W - LEFT - 220,
      y: H - 38,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
      maxWidth: 220,
    });

    // Watermark
    if (watermarkImg) {
      const ww = 380;
      const wh = (watermarkImg.height / watermarkImg.width) * ww;
      p.drawImage(watermarkImg, {
        x: (W - ww) / 2,
        y: (H - wh) / 2,
        width: ww,
        height: wh,
        opacity: 0.06,
      });
    } else if (b?.company_name) {
      p.drawText(sanitize(b.company_name.toUpperCase()), {
        x: 80,
        y: H / 2,
        size: 60,
        font: bold,
        color: secondary,
        opacity: 0.06,
        rotate: degrees(-30),
      });
    }

    // Footer
    p.drawLine({
      start: { x: LEFT, y: 55 },
      end: { x: W - LEFT, y: 55 },
      thickness: 0.5,
      color: primary,
    });
    const contactBits = [b?.contact_phone, b?.contact_email, b?.contact_website]
      .filter(Boolean)
      .join(" | ");
    if (contactBits) {
      p.drawText(sanitize(contactBits), {
        x: LEFT,
        y: 42,
        size: 7,
        font,
        color: secondary,
      });
    }
    if (b?.pdf_footer_text) {
      p.drawText(sanitize(b.pdf_footer_text), {
        x: LEFT,
        y: 32,
        size: 7,
        font,
        color: secondary,
      });
    }
    p.drawText(`Página ${idx + 1}/${total}`, {
      x: W - LEFT - 60,
      y: 42,
      size: 7,
      font: bold,
      color: secondary,
    });
    p.drawText(`Verificação: ${verificationCode}`, {
      x: W - LEFT - 140,
      y: 32,
      size: 7,
      font,
      color: secondary,
    });
  });

  const bytes = await pdfDoc.save();
  return { bytes, verificationCode };
}
