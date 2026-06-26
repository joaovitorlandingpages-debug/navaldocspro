import type { CompanyBranding, PdfTemplateId } from "./companyBranding";

/**
 * Single source of truth para PDFs com identidade visual.
 * Aplica o modelo escolhido em Identidade Corporativa
 * (campo `pdf_template`). Default: "classico".
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
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const b = opts.branding;
  const template: PdfTemplateId = (b?.pdf_template as PdfTemplateId) || "classico";

  const hexToRgb = (hex: string, fallback = "#2563eb") => {
    const h = (hex || fallback).replace("#", "");
    return rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    );
  };
  const primary = hexToRgb(b?.brand_primary_color || "#2563eb");
  const secondary = hexToRgb(b?.brand_secondary_color || "#0f172a");
  const gold = rgb(0.78, 0.62, 0.22);
  const ink = rgb(0.11, 0.13, 0.18);
  const muted = rgb(0.42, 0.46, 0.54);
  const lightBg = rgb(0.96, 0.97, 0.99);
  const lightBorder = rgb(0.86, 0.88, 0.92);

  const embedImage = async (url: string | null | undefined) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      const lower = url.toLowerCase();
      if (lower.includes(".png")) return await pdfDoc.embedPng(buf);
      if (lower.includes(".jpg") || lower.includes(".jpeg")) return await pdfDoc.embedJpg(buf);
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
  const LEFT = 54;
  const RIGHT_X = W - LEFT;
  const CONTENT_W = W - LEFT * 2;

  // Header/footer dimensions vary per template
  const headerHeight =
    template === "minimalista" || template === "protocolo" || template === "corporate-clean"
      ? 52
      : template === "capa-executiva"
      ? 110
      : template === "executivo" || template === "moderno"
      ? 92
      : template === "azul-profundo"
      ? 88
      : template === "luxo" || template === "naval-premium" || template === "relatorio-tecnico"
      ? 86
      : template === "institucional" || template === "oficial"
      ? 80
      : template === "premium-branco"
      ? 74
      : template === "escritorio" || template === "timbrado"
      ? 66
      : 72;
  const TOP_MARGIN = headerHeight + 30;
  const BOTTOM_MARGIN = 80;

  const sanitize = (text: string) =>
    String(text)
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/•/g, "-")
      .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");

  const measure = (text: string, size: number, f = font) => f.widthOfTextAtSize(sanitize(text), size);

  const wrap = (text: string, size: number, maxWidth: number, f = font): string[] => {
    const lines: string[] = [];
    const paragraphs = sanitize(text).split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      const words = para.split(/\s+/);
      let current = "";
      for (const w of words) {
        const test = current ? current + " " + w : w;
        if (f.widthOfTextAtSize(test, size) > maxWidth) {
          if (current) lines.push(current);
          current = w;
        } else current = test;
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  const pages: any[] = [];
  let page = pdfDoc.addPage([W, H]);
  pages.push(page);
  let y = H - TOP_MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([W, H]);
    pages.push(page);
    y = H - TOP_MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_MARGIN) newPage();
  };

  // ---------- TITLE BLOCK ----------
  const renderTitle = () => {
    const title = sanitize(opts.docName).toUpperCase();
    if (template === "executivo") {
      // Caixa do título com filete dourado
      const boxH = 70;
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: lightBg });
      page.drawRectangle({ x: LEFT, y: y - boxH, width: 4, height: boxH, color: primary });
      page.drawText(title, { x: LEFT + 18, y: y - 28, size: 18, font: bold, color: ink, maxWidth: CONTENT_W - 36 });
      page.drawText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT + 18,
        y: y - 50,
        size: 9,
        font: italic,
        color: muted,
      });
      y -= boxH + 18;
    } else if (template === "laudo") {
      page.drawText("DOCUMENTO TÉCNICO", { x: LEFT, y: y - 10, size: 8, font: bold, color: primary });
      y -= 22;
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 28;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 1.4, color: primary });
      y -= 6;
      page.drawLine({ start: { x: LEFT, y }, end: { x: LEFT + 80, y }, thickness: 1.4, color: gold });
      y -= 20;
    } else if (template === "minimalista") {
      page.drawText(title, { x: LEFT, y: y - 16, size: 16, font: bold, color: ink });
      y -= 26;
      page.drawLine({ start: { x: LEFT, y }, end: { x: LEFT + 60, y }, thickness: 1, color: primary });
      y -= 18;
    } else if (template === "checklist") {
      page.drawRectangle({ x: LEFT, y: y - 36, width: CONTENT_W, height: 36, color: primary });
      page.drawText(title, { x: LEFT + 14, y: y - 24, size: 13, font: bold, color: rgb(1, 1, 1) });
      y -= 50;
    } else if (template === "naval-azul") {
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 26;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 0.7, color: gold });
      y -= 18;
    } else if (template === "escritorio") {
      page.drawText(title, { x: LEFT, y: y - 16, size: 15, font: bold, color: ink });
      y -= 22;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 1.2, color: primary });
      y -= 4;
      page.drawText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT, y: y - 10, size: 8.5, font: italic, color: muted,
      });
      y -= 22;
    } else if (template === "institucional") {
      const tw = measure(title, 18, bold);
      page.drawText(title, { x: (W - tw) / 2, y: y - 20, size: 18, font: bold, color: ink });
      y -= 30;
      page.drawLine({ start: { x: (W - 120) / 2, y }, end: { x: (W + 120) / 2, y }, thickness: 1, color: secondary });
      y -= 22;
    } else if (template === "moderno") {
      const boxH = 60;
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: lightBg });
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: 3, color: primary });
      page.drawText(title, { x: LEFT + 18, y: y - 32, size: 17, font: bold, color: ink, maxWidth: CONTENT_W - 36 });
      y -= boxH + 18;
    } else if (template === "luxo") {
      page.drawText(title, { x: LEFT, y: y - 20, size: 18, font: bold, color: ink });
      y -= 28;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 1.4, color: gold });
      y -= 3;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 0.5, color: gold });
      y -= 18;
    } else {
      // classico
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 24;
      page.drawText(`Documento emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT,
        y,
        size: 9,
        font: italic,
        color: muted,
      });
      y -= 18;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 0.5, color: lightBorder });
      y -= 16;
    }
  };
  renderTitle();

  // ---------- CONTENT ----------
  const bodySize = template === "executivo" ? 11 : template === "minimalista" ? 10 : 10.5;
  const headingSize = template === "executivo" ? 13 : 11.5;
  const lineGap = 5;
  let sectionIndex = 0;

  const drawBoxedKeyValue = (label: string, value: string) => {
    const lh = 16;
    ensureSpace(lh + 6);
    page.drawRectangle({
      x: LEFT,
      y: y - lh,
      width: CONTENT_W,
      height: lh,
      color: lightBg,
      borderColor: lightBorder,
      borderWidth: 0.4,
    });
    page.drawText(sanitize(label), { x: LEFT + 8, y: y - 11, size: 8.5, font: bold, color: muted });
    const labelW = measure(label, 8.5, bold) + 24;
    page.drawText(sanitize(value), { x: LEFT + labelW, y: y - 11, size: 9.5, font, color: ink });
    y -= lh + 4;
  };

  const drawHeading = (text: string) => {
    sectionIndex += 1;
    ensureSpace(headingSize + 14);
    if (template === "laudo") {
      page.drawRectangle({ x: LEFT, y: y - headingSize - 8, width: 22, height: headingSize + 8, color: primary });
      page.drawText(String(sectionIndex), {
        x: LEFT + 6,
        y: y - headingSize - 2,
        size: headingSize - 1,
        font: bold,
        color: rgb(1, 1, 1),
      });
      page.drawText(sanitize(text), {
        x: LEFT + 32,
        y: y - headingSize - 2,
        size: headingSize,
        font: bold,
        color: ink,
      });
      y -= headingSize + 14;
    } else if (template === "checklist") {
      page.drawText("> " + sanitize(text), { x: LEFT, y: y - headingSize, size: headingSize, font: bold, color: primary });
      y -= headingSize + 8;
    } else {
      page.drawText(sanitize(text), { x: LEFT, y: y - headingSize, size: headingSize, font: bold, color: primary });
      y -= headingSize + 4;
      page.drawLine({ start: { x: LEFT, y }, end: { x: LEFT + 40, y }, thickness: 0.8, color: gold });
      y -= 10;
    }
  };

  const drawParagraph = (text: string) => {
    const lines = wrap(text, bodySize, CONTENT_W);
    for (const ln of lines) {
      ensureSpace(bodySize + lineGap);
      if (ln !== "") page.drawText(ln, { x: LEFT, y, size: bodySize, font, color: ink });
      y -= bodySize + lineGap;
    }
  };

  const drawBullet = (text: string) => {
    const lines = wrap(text.replace(/^[-•*]\s*/, ""), bodySize, CONTENT_W - 16);
    lines.forEach((ln, i) => {
      ensureSpace(bodySize + lineGap);
      if (i === 0) {
        if (template === "checklist") {
          page.drawRectangle({
            x: LEFT,
            y: y - 1,
            width: 9,
            height: 9,
            borderColor: primary,
            borderWidth: 1,
          });
        } else {
          page.drawCircle({ x: LEFT + 3, y: y + 3, size: 1.6, color: primary });
        }
      }
      page.drawText(ln, { x: LEFT + 16, y, size: bodySize, font, color: ink });
      y -= bodySize + lineGap;
    });
  };

  const drawKeyValueLine = (label: string, value: string) => {
    if (template === "laudo" || template === "executivo") {
      drawBoxedKeyValue(label, value);
      return;
    }
    ensureSpace(bodySize + lineGap);
    page.drawText(sanitize(label) + ":", { x: LEFT, y, size: bodySize, font: bold, color: ink });
    const lw = measure(label + ": ", bodySize, bold);
    const valueLines = wrap(value, bodySize, CONTENT_W - lw);
    page.drawText(valueLines[0] || "", { x: LEFT + lw, y, size: bodySize, font, color: ink });
    y -= bodySize + lineGap;
    for (let i = 1; i < valueLines.length; i++) {
      ensureSpace(bodySize + lineGap);
      page.drawText(valueLines[i], { x: LEFT + lw, y, size: bodySize, font, color: ink });
      y -= bodySize + lineGap;
    }
  };

  // Parse contents into structural blocks
  const rawLines = opts.content.split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const ln = rawLines[i];
    const trimmed = ln.trim();
    if (!trimmed) {
      y -= 6;
      continue;
    }
    const isAllCapsHeading = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ()\/\-]+$/.test(trimmed) && trimmed.length <= 60 && trimmed.length >= 3;
    const isBullet = /^[-•*]\s+/.test(trimmed);
    const kv = trimmed.match(/^([^:]{1,40}):\s+(.+)$/);
    if (isAllCapsHeading && !kv) {
      drawHeading(trimmed);
    } else if (isBullet) {
      drawBullet(trimmed);
    } else if (kv) {
      drawKeyValueLine(kv[1], kv[2]);
    } else {
      drawParagraph(trimmed);
    }
  }

  // ---------- SIGNATURE BLOCK ----------
  if (signatureImg || b?.technical_responsible_name || stampImg) {
    ensureSpace(140);
    y -= 30;
    if (signatureImg) {
      const sw = 150;
      const sh = (signatureImg.height / signatureImg.width) * sw;
      page.drawImage(signatureImg, { x: LEFT, y: y - sh, width: sw, height: sh });
      y -= sh + 4;
    }
    page.drawLine({ start: { x: LEFT, y }, end: { x: LEFT + 230, y }, thickness: 0.6, color: secondary });
    y -= 12;
    if (b?.technical_responsible_name)
      page.drawText(sanitize(b.technical_responsible_name), { x: LEFT, y, size: 9.5, font: bold, color: ink });
    if (b?.technical_responsible_registry) {
      y -= 11;
      page.drawText(sanitize(b.technical_responsible_registry), { x: LEFT, y, size: 8.5, font, color: muted });
    }
    if (stampImg) {
      const sw = 95;
      const sh = (stampImg.height / stampImg.width) * sw;
      page.drawImage(stampImg, {
        x: W - LEFT - sw,
        y: y - 10,
        width: sw,
        height: sh,
        opacity: 0.92,
      });
    }
  }

  // ---------- HEADER / FOOTER / WATERMARK PER PAGE ----------
  const total = pages.length;
  pages.forEach((p, idx) => {
    // Header
    if (template === "executivo") {
      // Gradient simulation: 3 stacked bands
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: secondary });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight / 2, color: primary, opacity: 0.55 });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: 3, color: gold });
    } else if (template === "naval-azul") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: rgb(0.05, 0.12, 0.27) });
      p.drawRectangle({ x: 0, y: H - headerHeight - 3, width: W, height: 3, color: gold });
    } else if (template === "minimalista") {
      p.drawLine({
        start: { x: LEFT, y: H - headerHeight },
        end: { x: RIGHT_X, y: H - headerHeight },
        thickness: 0.6,
        color: lightBorder,
      });
    } else if (template === "laudo") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: lightBg });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: 6, height: headerHeight, color: primary });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.4,
        color: lightBorder,
      });
    } else if (template === "checklist") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: lightBg });
      p.drawLine({
        start: { x: 0, y: H - headerHeight - 2 },
        end: { x: W, y: H - headerHeight - 2 },
        thickness: 2,
        color: primary,
      });
    } else if (template === "escritorio") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: rgb(0.98, 0.98, 0.99) });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: primary });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.3,
        color: lightBorder,
      });
    } else if (template === "institucional") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: rgb(0.06, 0.13, 0.28) });
    } else if (template === "moderno") {
      // Gradient bands primary -> secondary
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: primary });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: secondary, opacity: 0.45 });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W / 2, height: headerHeight, color: primary, opacity: 0.3 });
    } else if (template === "luxo") {
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: rgb(0.04, 0.09, 0.2) });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: gold });
      p.drawRectangle({ x: 0, y: H - headerHeight - 6, width: W, height: 1, color: gold });
    } else {
      // classico
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: headerHeight, color: primary });
    }

    const onDarkHeader =
      template === "classico" ||
      template === "executivo" ||
      template === "naval-azul" ||
      template === "institucional" ||
      template === "moderno" ||
      template === "luxo";
    const headerTextColor = onDarkHeader ? rgb(1, 1, 1) : ink;

    // Logo or company name
    if (logoImg) {
      const maxLh = headerHeight - 20;
      const lw = Math.min(110, (logoImg.width / logoImg.height) * maxLh);
      const lh = (logoImg.height / logoImg.width) * lw;
      p.drawImage(logoImg, {
        x: LEFT,
        y: H - headerHeight + (headerHeight - lh) / 2,
        width: lw,
        height: lh,
      });
      if (b?.company_name) {
        p.drawText(sanitize(b.company_name), {
          x: LEFT + lw + 12,
          y: H - headerHeight / 2 - 4,
          size: 11,
          font: bold,
          color: headerTextColor,
        });
      }
    } else if (b?.company_name) {
      p.drawText(sanitize(b.company_name.toUpperCase()), {
        x: LEFT,
        y: H - headerHeight / 2 - 4,
        size: 14,
        font: bold,
        color: headerTextColor,
      });
    }

    // Doc name in header (right)
    const docLabel = sanitize(opts.docName);
    const dlw = measure(docLabel, 9, bold);
    p.drawText(docLabel, {
      x: Math.max(W - LEFT - dlw, LEFT + 200),
      y: H - headerHeight / 2 - 4,
      size: 9,
      font: bold,
      color: headerTextColor,
      maxWidth: 240,
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
        opacity: 0.05,
        rotate: degrees(-30),
      });
    }

    // Footer
    p.drawLine({
      start: { x: LEFT, y: 62 },
      end: { x: RIGHT_X, y: 62 },
      thickness: 0.4,
      color: lightBorder,
    });
    const contactBits = [b?.contact_phone, b?.contact_email, b?.contact_website, b?.contact_address]
      .filter(Boolean)
      .join("  •  ");
    if (contactBits) {
      p.drawText(sanitize(contactBits), { x: LEFT, y: 48, size: 7, font, color: muted, maxWidth: CONTENT_W - 150 });
    }
    if (b?.pdf_footer_text) {
      p.drawText(sanitize(b.pdf_footer_text), { x: LEFT, y: 36, size: 6.5, font: italic, color: muted, maxWidth: CONTENT_W - 150 });
    }
    // Verification code pill (right)
    const codeText = `Cód. verificação: ${verificationCode}`;
    const ctw = measure(codeText, 7, bold);
    p.drawRectangle({
      x: RIGHT_X - ctw - 14,
      y: 44,
      width: ctw + 14,
      height: 14,
      color: lightBg,
      borderColor: primary,
      borderWidth: 0.5,
    });
    p.drawText(codeText, { x: RIGHT_X - ctw - 7, y: 48, size: 7, font: bold, color: primary });
    p.drawText(`Página ${idx + 1} / ${total}`, {
      x: RIGHT_X - 70,
      y: 32,
      size: 7,
      font: bold,
      color: muted,
    });
  });

  const bytes = await pdfDoc.save();
  return { bytes, verificationCode };
}
