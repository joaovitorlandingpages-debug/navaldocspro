import type { CompanyBranding, PdfTemplateId } from "./companyBranding";

export type WatermarkCustomOptions = {
  enabled?: boolean;
  opacity?: number; // e.g. 0.05
  scale?: number; // e.g. 0.60
  position?: "center" | "top" | "bottom";
  pages?: "all" | "first_only";
  logoUrl?: string | null;
  rawImageBytes?: Uint8Array | null;
  rawImageType?: "png" | "jpg";
};

export type LogoModeOption = "company" | "navaldocs" | "none";

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
  watermarkOptions?: WatermarkCustomOptions;
  logoMode?: LogoModeOption;
  signerName?: string;
  signerRole?: string;
}): Promise<{ bytes: Uint8Array; verificationCode: string }> {
  const {
    PDFDocument,
    rgb,
    degrees,
    setCharacterSpacing,
    setWordSpacing,
    pushGraphicsState,
    popGraphicsState,
  } = await import("pdf-lib");
  const fontkit = await import("@pdf-lib/fontkit");
  const pdfDoc = await PDFDocument.create();
  // Register fontkit to enable embedding real TTF fonts with full Unicode/Latin-Extended support
  pdfDoc.registerFontkit(fontkit.default ?? fontkit);

  // Load Liberation Sans TTF bytes (Apache 2.0 license, metric-compatible with Arial)
  // These are served as static assets from /fonts/
  const loadFontBytes = async (filename: string): Promise<Uint8Array> => {
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const localPath = path.resolve(process.cwd(), "public/fonts", filename);
        if (fs.existsSync(localPath)) {
          return new Uint8Array(fs.readFileSync(localPath));
        }
      } catch {}
    }
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
    const res = await fetch(`${base}/fonts/${filename}`);
    if (!res.ok) throw new Error(`Font fetch failed: ${filename} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  };

  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    loadFontBytes("LiberationSans-Regular.ttf"),
    loadFontBytes("LiberationSans-Bold.ttf"),
    loadFontBytes("LiberationSans-Italic.ttf"),
  ]);

  // Embed full fonts (no subset) for maximum reliability with all characters
  const font = await pdfDoc.embedFont(regularBytes);
  const bold = await pdfDoc.embedFont(boldBytes);
  const italic = await pdfDoc.embedFont(italicBytes);
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

  const embedRaw = async (bytes: Uint8Array | null | undefined, type: "png" | "jpg" = "png") => {
    if (!bytes) return null;
    try {
      return type === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    } catch {
      try {
        return await pdfDoc.embedPng(bytes);
      } catch {
        return null;
      }
    }
  };

  // Determinar URL ou fonte do Logo do Cabeçalho com base no logoMode selecionado
  const effectiveLogoMode: LogoModeOption = opts.logoMode || (b?.logo_primary_url ? "company" : "navaldocs");

  const resolveLogoUrl = (): string | null => {
    if (effectiveLogoMode === "none") return null;
    if (effectiveLogoMode === "navaldocs") {
      const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
      return `${base}/navaldocs-logo.png`;
    }
    // company
    if (b?.logo_primary_url) return b.logo_primary_url;
    // se empresa não tem logo mas escolheu company, fallback para null (sem bloquear geração)
    return null;
  };

  const headerLogoTargetUrl = resolveLogoUrl();

  // Marca-d'água é 100% independente do cabeçalho
  const wmOpt = opts.watermarkOptions;
  const isWatermarkEnabled = wmOpt ? wmOpt.enabled !== false : true;

  const watermarkTargetUrl = isWatermarkEnabled
    ? opts.watermarkOptions?.logoUrl ||
      b?.watermark_url ||
      (effectiveLogoMode === "company" ? b?.logo_primary_url : null) ||
      (typeof window !== "undefined" ? `${window.location.origin}/navaldocs-logo.png` : null)
    : null;

  const [logoImg, watermarkImg, rawWatermarkImg, signatureImg, stampImg] = await Promise.all([
    embedImage(headerLogoTargetUrl),
    embedImage(watermarkTargetUrl),
    embedRaw(isWatermarkEnabled ? opts.watermarkOptions?.rawImageBytes : null, opts.watermarkOptions?.rawImageType),
    embedImage(b?.signature_url),
    embedImage(b?.stamp_url),
  ]);

  const finalWatermarkImg = isWatermarkEnabled ? (rawWatermarkImg || watermarkImg) : null;

  const verificationCode =
    opts.verificationCode ||
    Array.from(
      { length: 8 },
      () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)],
    ).join("");

  const W = 595.28;
  const H = 841.89;
  const LEFT = 50;
  const RIGHT_X = W - LEFT;
  const CONTENT_W = W - LEFT * 2;

  const sanitize = (text: string) =>
    String(text || "")
      .normalize("NFC")
      .replace(/\r/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\t/g, " ")
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/•/g, "-")
      .replace(/[º°]/g, "o.")
      .replace(/ª/g, "a.")
      .replace(/[^\x0A\x20-\x7E\xA0-\xFF]/g, "");

  const measure = (text: string, size: number, f = font) =>
    f.widthOfTextAtSize(sanitize(text), size);

  const wrap = (text: string, size: number, maxWidth: number, f = font): string[] => {
    const lines: string[] = [];
    const paragraphs = sanitize(text).split("\n");
    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) {
        lines.push("");
        continue;
      }
      const words = cleanPara.split(/\s+/);
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

  // Header dimension calculation: responsive to long company and document names
  const rawCompanyName = sanitize(b?.company_name || "").toUpperCase();
  const rawDocName = sanitize(opts.docName).toUpperCase();
  const maxCompanyHeaderW = 230; // Área Esquerda: de LEFT(50) até 280
  const maxDocHeaderW = 230;     // Área Direita: de 315 até RIGHT_X(545) — Moat central livre de 35pt
  const compFontSize = 10.5;
  const docFontSize = 8;

  const headerCompLines = wrap(rawCompanyName || "EMPRESA NAVAL", compFontSize, maxCompanyHeaderW, bold);
  const headerDocLines = wrap(rawDocName, docFontSize, maxDocHeaderW, bold);

  const maxHeaderLines = Math.max(headerCompLines.length, headerDocLines.length);
  const baseHeaderHeight =
    template === "capa-executiva" ? 110 :
    template === "executivo" || template === "moderno" ? 92 :
    template === "azul-profundo" || template === "luxo" || template === "naval-premium" ? 88 :
    template === "minimalista" || template === "protocolo" ? 56 :
    72;

  const headerHeight = Math.max(baseHeaderHeight, 60 + maxHeaderLines * 11);
  const TOP_MARGIN = headerHeight + 14;
  const BOTTOM_MARGIN = 48;

  // Reset text state operators that can bleed between text blocks.
  // With embedded TTF fonts, Tc/Tw default to 0 per page, so this is a safety guard only.
  const resetPdfTextSpacing = (targetPage: any) => {
    targetPage.pushOperators(
      setCharacterSpacing(0),
      setWordSpacing(0),
    );
  };

  const drawWatermarkAndDecorations = (p: any, idx: number) => {
    p.pushOperators(pushGraphicsState());
    resetPdfTextSpacing(p);

    if (template === "corporate-clean") {
      p.drawRectangle({ x: 0, y: 0, width: 12, height: H, color: primary, opacity: 0.12 });
    } else if (template === "engenharia-naval" || template === "laudo") {
      p.drawRectangle({ x: 0, y: 0, width: 6, height: H, color: secondary, opacity: 0.16 });
    } else if (template === "naval-premium") {
      p.drawRectangle({ x: W - 16, y: 0, width: 16, height: H, color: primary, opacity: 0.1 });
    }

    const wmOpt = opts.watermarkOptions;
    const isWatermarkEnabled = wmOpt ? wmOpt.enabled !== false : true;
    const isPageAllowed = !wmOpt || wmOpt.pages !== "first_only" || idx === 0;

    if (isWatermarkEnabled && isPageAllowed) {
      if (finalWatermarkImg) {
        const scaleFraction = wmOpt?.scale ?? 0.6;
        const targetOpacity = wmOpt?.opacity ?? 0.05;
        const ww = Math.min(CONTENT_W * scaleFraction, W - 40);
        const wh = (finalWatermarkImg.height / finalWatermarkImg.width) * ww;

        let targetY = (H - wh) / 2;
        if (wmOpt?.position === "top") {
          targetY = H - headerHeight - wh - 30;
        } else if (wmOpt?.position === "bottom") {
          targetY = BOTTOM_MARGIN + 30;
        }

        p.drawImage(finalWatermarkImg, {
          x: (W - ww) / 2,
          y: targetY,
          width: ww,
          height: wh,
          opacity: Math.max(0.01, Math.min(0.2, targetOpacity)),
        });
      } else if (b?.company_name) {
        const wmText = sanitize(b.company_name.toUpperCase());
        const wmSize = 46;
        const wmW = bold.widthOfTextAtSize(wmText, wmSize);
        p.drawText(wmText, {
          x: (W - wmW) / 2 + wmSize * 0.6,
          y: H / 2 - wmSize * 0.3,
          size: wmSize,
          font: bold,
          color: secondary,
          opacity: wmOpt?.opacity ?? 0.04,
          rotate: degrees(-30),
        });
      }
    }

    p.pushOperators(popGraphicsState());
    resetPdfTextSpacing(p);
  };


  const pages: any[] = [];
  let page = pdfDoc.addPage([W, H]);
  pages.push(page);
  drawWatermarkAndDecorations(page, 0);
  let y = H - TOP_MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([W, H]);
    pages.push(page);
    y = H - TOP_MARGIN;
    drawWatermarkAndDecorations(page, pages.length - 1);
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_MARGIN) newPage();
  };

  // ---------- TITLE BLOCK ----------
  const renderTitle = () => {
    resetPdfTextSpacing(page);
    const title = sanitize(opts.docName).toUpperCase();

    const drawWrappedTitle = (
      fontSize: number,
      maxW: number,
      color = ink,
      align: "left" | "center" = "left",
      startX: number = LEFT
    ) => {
      const lines = wrap(title, fontSize, maxW, bold);
      for (const line of lines) {
        resetPdfTextSpacing(page);
        const lineW = measure(line, fontSize, bold);
        const xPos = align === "center" ? (W - lineW) / 2 : startX;
        page.drawText(line, { x: xPos, y: y - fontSize, size: fontSize, font: bold, color });
        y -= (fontSize + 4);
      }
    };
    if (template === "executivo") {
      // Caixa do título com filete dourado
      const boxH = 70;
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: lightBg });
      page.drawRectangle({ x: LEFT, y: y - boxH, width: 4, height: boxH, color: primary });
      page.drawText(title, {
        x: LEFT + 18,
        y: y - 28,
        size: 18,
        font: bold,
        color: ink,
        maxWidth: CONTENT_W - 36,
      });
      page.drawText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT + 18,
        y: y - 50,
        size: 9,
        font: italic,
        color: muted,
      });
      y -= boxH + 18;
    } else if (template === "laudo") {
      page.drawText("DOCUMENTO TÉCNICO", {
        x: LEFT,
        y: y - 10,
        size: 8,
        font: bold,
        color: primary,
      });
      y -= 22;
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 28;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 1.4,
        color: primary,
      });
      y -= 6;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + 80, y },
        thickness: 1.4,
        color: gold,
      });
      y -= 20;
    } else if (template === "minimalista") {
      page.drawText(title, { x: LEFT, y: y - 16, size: 16, font: bold, color: ink });
      y -= 26;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + 60, y },
        thickness: 1,
        color: primary,
      });
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
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 1.2,
        color: primary,
      });
      y -= 4;
      page.drawText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT,
        y: y - 10,
        size: 8.5,
        font: italic,
        color: muted,
      });
      y -= 22;
    } else if (template === "institucional") {
      const tw = measure(title, 18, bold);
      page.drawText(title, { x: (W - tw) / 2, y: y - 20, size: 18, font: bold, color: ink });
      y -= 30;
      page.drawLine({
        start: { x: (W - 120) / 2, y },
        end: { x: (W + 120) / 2, y },
        thickness: 1,
        color: secondary,
      });
      y -= 22;
    } else if (template === "moderno") {
      const boxH = 60;
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: lightBg });
      page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: 3, color: primary });
      page.drawText(title, {
        x: LEFT + 18,
        y: y - 32,
        size: 17,
        font: bold,
        color: ink,
        maxWidth: CONTENT_W - 36,
      });
      y -= boxH + 18;
    } else if (template === "luxo") {
      page.drawText(title, { x: LEFT, y: y - 20, size: 18, font: bold, color: ink });
      y -= 28;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 1.4, color: gold });
      y -= 3;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 0.5, color: gold });
      y -= 18;
    } else if (template === "premium-branco") {
      const tw = measure(title, 17, bold);
      page.drawText(title, { x: (W - tw) / 2, y: y - 18, size: 17, font: bold, color: primary });
      y -= 26;
      page.drawLine({
        start: { x: (W - 90) / 2, y },
        end: { x: (W + 90) / 2, y },
        thickness: 1,
        color: gold,
      });
      y -= 20;
    } else if (template === "azul-profundo") {
      page.drawText(title, { x: LEFT, y: y - 20, size: 18, font: bold, color: ink });
      y -= 28;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.8,
        color: secondary,
      });
      y -= 20;
    } else if (template === "oficial") {
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 26;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 1,
        color: secondary,
      });
      y -= 4;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.4,
        color: secondary,
      });
      y -= 18;
    } else if (template === "engenharia-naval") {
      page.drawText("MEMORIAL TÉCNICO", {
        x: LEFT,
        y: y - 10,
        size: 8,
        font: bold,
        color: secondary,
      });
      y -= 22;
      page.drawText(title, { x: LEFT, y: y - 18, size: 16, font: bold, color: ink });
      y -= 28;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 1.4,
        color: secondary,
      });
      y -= 18;
    } else if (template === "protocolo") {
      const protocolo = `PROTOCOLO ${new Date().getFullYear()}/${verificationCode.slice(0, 4)}`;
      const pw = measure(protocolo, 8, bold);
      page.drawRectangle({
        x: RIGHT_X - pw - 12,
        y: y - 14,
        width: pw + 12,
        height: 16,
        color: lightBg,
        borderColor: secondary,
        borderWidth: 0.5,
      });
      page.drawText(protocolo, {
        x: RIGHT_X - pw - 6,
        y: y - 10,
        size: 8,
        font: bold,
        color: secondary,
      });
      page.drawText(title, { x: LEFT, y: y - 16, size: 15, font: bold, color: ink });
      y -= 30;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + 50, y },
        thickness: 1,
        color: secondary,
      });
      y -= 18;
    } else if (template === "capa-executiva") {
      // Title rendered inside header already; here add subtitle identifying document origin
      page.drawText("ELABORADO PELA PLATAFORMA", { x: LEFT, y: y - 8, size: 8, font: bold, color: muted });
      y -= 20;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.6,
        color: lightBorder,
      });
      y -= 18;
    } else if (template === "relatorio-tecnico") {
      page.drawText("RELATÓRIO TÉCNICO", {
        x: LEFT,
        y: y - 10,
        size: 8.5,
        font: bold,
        color: primary,
      });
      y -= 22;
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 26;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 1.2,
        color: primary,
      });
      y -= 4;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: LEFT + 60, y },
        thickness: 1.2,
        color: gold,
      });
      y -= 18;
    } else if (template === "corporate-clean") {
      page.drawRectangle({ x: LEFT, y: y - 22, width: 4, height: 22, color: primary });
      page.drawText(title, { x: LEFT + 14, y: y - 16, size: 16, font: bold, color: ink });
      y -= 32;
      page.drawText(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, {
        x: LEFT + 14,
        y,
        size: 8.5,
        font: italic,
        color: muted,
      });
      y -= 18;
    } else if (template === "timbrado") {
      page.drawText(title, { x: LEFT, y: y - 18, size: 17, font: bold, color: ink });
      y -= 24;
      page.drawText(`Documento emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT,
        y,
        size: 9,
        font: italic,
        color: secondary,
      });
      y -= 16;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.6,
        color: secondary,
      });
      y -= 18;
    } else if (template === "naval-premium") {
      const tw = measure(title, 18, bold);
      page.drawText(title, { x: (W - tw) / 2, y: y - 20, size: 18, font: bold, color: ink });
      y -= 30;
      page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT_X, y }, thickness: 1.4, color: gold });
      y -= 3;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.5,
        color: primary,
      });
      y -= 18;
    } else {
      // classico
      drawWrappedTitle(15, CONTENT_W, ink);
      y -= 2;
      page.drawText(`Documento emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: LEFT,
        y: y - 8,
        size: 8.5,
        font: italic,
        color: muted,
      });
      y -= 14;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.5,
        color: lightBorder,
      });
      y -= 12;
    }
  };
  renderTitle();

  // ---------- CONTENT ----------
  const bodySize = template === "executivo" ? 10.5 : template === "minimalista" ? 9.5 : 9.8;
  const headingSize = template === "executivo" ? 12 : 11;
  const lineGap = 3.8;
  let sectionIndex = 0;
  let twoColSlot: 0 | 1 = 0;

  const flushTwoColumnRow = () => {
    if (twoColSlot === 1) {
      y -= 42;
      twoColSlot = 0;
    }
  };

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
    resetPdfTextSpacing(page);
    page.drawText(sanitize(label), { x: LEFT + 8, y: y - 11, size: 8.5, font: bold, color: muted });
    const labelW = measure(label, 8.5, bold) + 24;
    resetPdfTextSpacing(page);
    page.drawText(sanitize(value), { x: LEFT + labelW, y: y - 11, size: 9.5, font, color: ink });
    y -= lh + 4;
  };

  const drawHeading = (text: string) => {
    flushTwoColumnRow();
    sectionIndex += 1;
    const cleanHeading = sanitize(text);
    const lines = wrap(cleanHeading, headingSize, CONTENT_W, bold);
    const needed = lines.length * (headingSize + 4) + 22;
    ensureSpace(needed);
    y -= 10;
    if (template === "laudo") {
      const boxH = lines.length * (headingSize + 4) + 8;
      page.drawRectangle({
        x: LEFT,
        y: y - boxH,
        width: 22,
        height: boxH,
        color: primary,
      });
      resetPdfTextSpacing(page);
      page.drawText(String(sectionIndex), {
        x: LEFT + 6,
        y: y - headingSize - 4,
        size: headingSize - 1,
        font: bold,
        color: rgb(1, 1, 1),
      });
      for (const line of lines) {
        resetPdfTextSpacing(page);
        page.drawText(line, {
          x: LEFT + 32,
          y: y - headingSize - 2,
          size: headingSize,
          font: bold,
          color: ink,
        });
        y -= (headingSize + 4);
      }
      y -= 12;
    } else if (template === "checklist") {
      for (let i = 0; i < lines.length; i++) {
        const prefix = i === 0 ? "> " : "  ";
        resetPdfTextSpacing(page);
        page.drawText(prefix + lines[i], {
          x: LEFT,
          y: y - headingSize,
          size: headingSize,
          font: bold,
          color: primary,
        });
        y -= (headingSize + 4);
      }
      y -= 10;
    } else {
      for (const line of lines) {
        resetPdfTextSpacing(page);
        page.drawText(line, {
          x: LEFT,
          y: y - headingSize,
          size: headingSize,
          font: bold,
          color: primary,
        });
        y -= (headingSize + 4);
      }
      y -= 3;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT_X, y },
        thickness: 0.6,
        color: lightBorder,
      });
      y -= (bodySize + 4.5);
    }
  };

  const drawParagraph = (text: string) => {
    flushTwoColumnRow();
    const lines = wrap(text, bodySize, CONTENT_W, font);
    for (const ln of lines) {
      ensureSpace(bodySize + lineGap);
      if (ln !== "") {
        resetPdfTextSpacing(page);
        page.drawText(ln, { x: LEFT, y, size: bodySize, font, color: ink });
      }
      y -= (bodySize + lineGap);
    }
  };

  const drawBullet = (text: string) => {
    flushTwoColumnRow();
    const lines = wrap(text.replace(/^[-•*]\s*/, ""), bodySize, CONTENT_W - 16, font);
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
      resetPdfTextSpacing(page);
      page.drawText(ln, { x: LEFT + 16, y, size: bodySize, font, color: ink });
      y -= (bodySize + lineGap);
    });
  };

  const drawTwoColumnKeyValue = (label: string, value: string) => {
    const gap = 12;
    const colW = (CONTENT_W - gap) / 2;
    if (twoColSlot === 0) ensureSpace(42);
    const x = LEFT + twoColSlot * (colW + gap);
    const rowTop = y;
    page.drawRectangle({
      x,
      y: rowTop - 34,
      width: colW,
      height: 34,
      color: lightBg,
      borderColor: lightBorder,
      borderWidth: 0.45,
    });
    page.drawRectangle({ x, y: rowTop - 34, width: 3, height: 34, color: primary, opacity: 0.85 });
    resetPdfTextSpacing(page);
    page.drawText(sanitize(label).toUpperCase(), {
      x: x + 9,
      y: rowTop - 12,
      size: 6.8,
      font: bold,
      color: muted,
    });
    const valueText = wrap(value, 8.6, colW - 18, font).slice(0, 2);
    valueText.forEach((line, idx) => {
      resetPdfTextSpacing(page);
      page.drawText(line, { x: x + 9, y: rowTop - 24 - idx * 9, size: 8.6, font, color: ink });
    });
    if (twoColSlot === 0) {
      twoColSlot = 1;
    } else {
      y -= 42;
      twoColSlot = 0;
    }
  };

  const drawKeyValueLine = (label: string, value: string) => {
    if (template === "laudo" || template === "executivo") {
      drawBoxedKeyValue(label, value);
      return;
    }
    if (template === "escritorio" || template === "corporate-clean") {
      drawTwoColumnKeyValue(label, value);
      return;
    }
    flushTwoColumnRow();
    const cleanLabel = sanitize(label).trim();
    const cleanValue = sanitize(value).trim();
    const labelWithColon = cleanLabel ? cleanLabel + ":" : "";
    const lw = labelWithColon ? measure(labelWithColon, bodySize, bold) + 6 : 0;

    // Se o rótulo for longo (>140pt), o valor for longo (>55 chars) ou ultrapassar a margem direita:
    const exceedsWidth = lw + measure(cleanValue, bodySize, font) > CONTENT_W;
    if (lw > 140 || cleanValue.length > 55 || exceedsWidth) {
      ensureSpace(bodySize * 2 + lineGap * 2 + 4);
      if (labelWithColon) {
        resetPdfTextSpacing(page);
        page.drawText(labelWithColon, { x: LEFT, y, size: bodySize, font: bold, color: ink });
        y -= (bodySize + lineGap);
      }
      const valueLines = wrap(cleanValue, bodySize, CONTENT_W - 14, font);
      for (const valLn of valueLines) {
        ensureSpace(bodySize + lineGap);
        resetPdfTextSpacing(page);
        page.drawText(valLn, { x: LEFT + 14, y, size: bodySize, font, color: ink });
        y -= (bodySize + lineGap);
      }
    } else {
      ensureSpace(bodySize + lineGap);
      resetPdfTextSpacing(page);
      page.drawText(labelWithColon, { x: LEFT, y, size: bodySize, font: bold, color: ink });
      const valueLines = wrap(cleanValue, bodySize, CONTENT_W - lw, font);
      if (valueLines.length > 0) {
        resetPdfTextSpacing(page);
        page.drawText(valueLines[0], { x: LEFT + lw, y, size: bodySize, font, color: ink });
        y -= (bodySize + lineGap);
        for (let i = 1; i < valueLines.length; i++) {
          ensureSpace(bodySize + lineGap);
          resetPdfTextSpacing(page);
          page.drawText(valueLines[i], { x: LEFT + 14, y, size: bodySize, font, color: ink });
          y -= (bodySize + lineGap);
        }
      } else {
        y -= (bodySize + lineGap);
      }
    }
  };

  // ---------- SIGNATURE & CLOSING COUPLING ----------
  const signerText = opts.signerName || b?.technical_responsible_name || "Assinatura do Responsável";
  const signerSub = opts.signerRole || b?.technical_responsible_registry || "";

  const signerLines = signerText.split("\n");
  const estimatedSignerHeight =
    (signatureImg ? 45 : 0) +
    22 + // line and padding
    signerLines.length * 12 +
    (signerSub ? 14 : 0) +
    18;

  // Se o fechamento do documento (últimas linhas descritivas de conclusão) puder ficar
  // isolado da assinatura, mantemos ambos juntos na página seguinte.
  const rawLines = opts.content.split("\n");

  // Localiza os últimos itens de fechamento do documento para garantir espaço conjunto
  let closingStartIndex = -1;
  for (let k = 0; k < rawLines.length; k++) {
    const t = rawLines[k].trim();
    if (
      t.startsWith("5. ELABORADO POR") ||
      t.startsWith("PREPARADO POR") ||
      t.startsWith("Por ser a expressão")
    ) {
      closingStartIndex = k;
      break;
    }
  }

  // Se não encontrou cabeçalho de fechamento explícito, busca os últimos 3 parágrafos
  if (closingStartIndex === -1) {
    for (let k = rawLines.length - 1; k >= 0; k--) {
      const t = rawLines[k].trim();
      if (t.startsWith("Documento elaborado") || t.startsWith("Requerimento elaborado")) {
        closingStartIndex = Math.max(0, k - 2);
        break;
      }
    }
  }

  let closingLinesCount = closingStartIndex !== -1 ? rawLines.length - closingStartIndex : 3;
  const estimatedClosingHeight = closingLinesCount * (bodySize + lineGap + 4) + 30;
  const totalClosingAndSignatureNeeded = estimatedSignerHeight + estimatedClosingHeight;

  // Processamento das linhas de conteúdo
  for (let i = 0; i < rawLines.length; i++) {
    const ln = rawLines[i];
    const trimmed = ln.trim();
    if (!trimmed) {
      y -= 8;
      continue;
    }

    // Se estivermos entrando no bloco final de encerramento do documento,
    // garantimos que há espaço suficiente para TODO o encerramento JUNTO com a assinatura.
    if (closingStartIndex !== -1 && i === closingStartIndex) {
      ensureSpace(totalClosingAndSignatureNeeded);
    }

    const isNumberedHeading = /^[0-9]+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ()/\-.,:]{3,90}$/.test(trimmed);
    const isSectionHeading = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ()/\-.,]{3,70}:$/.test(trimmed);
    const isCapsTitle = !/[a-z]/.test(trimmed) && trimmed.length >= 4 && trimmed.length <= 80 && !trimmed.includes(": ");
    const isBullet = /^[-•*]\s+/.test(trimmed);
    const kv = trimmed.match(/^([^:]{1,40}):\s+(.+)$/);

    if (isNumberedHeading || isSectionHeading || (isCapsTitle && !kv)) {
      drawHeading(trimmed.replace(/:$/, ""));
    } else if (isBullet) {
      drawBullet(trimmed);
    } else if (kv) {
      drawKeyValueLine(kv[1], kv[2]);
    } else {
      drawParagraph(trimmed);
    }
  }
  flushTwoColumnRow();

  // ---------- SIGNATURE BLOCK ----------
  ensureSpace(estimatedSignerHeight);
  y -= 18;
  if (signatureImg) {
    const sw = 130;
    const sh = (signatureImg.height / signatureImg.width) * sw;
    page.drawImage(signatureImg, { x: LEFT, y: y - sh, width: sw, height: sh });
    y -= sh + 4;
  }
  page.drawLine({
    start: { x: LEFT, y },
    end: { x: LEFT + 240, y },
    thickness: 0.6,
    color: secondary,
  });
  y -= 10;
  for (const sLine of signerLines) {
    resetPdfTextSpacing(page);
    page.drawText(sanitize(sLine), {
      x: LEFT,
      y,
      size: 9.5,
      font: bold,
      color: ink,
    });
    y -= 12;
  }
  if (signerSub) {
    resetPdfTextSpacing(page);
    page.drawText(sanitize(signerSub), {
      x: LEFT,
      y,
      size: 8.5,
      font,
      color: muted,
    });
    y -= 10;
  }
  if (stampImg) {
    const sw = 85;
    const sh = (stampImg.height / stampImg.width) * sw;
    page.drawImage(stampImg, {
      x: W - LEFT - sw,
      y: y + 10,
      width: sw,
      height: sh,
      opacity: 0.92,
    });
  }

  // ---------- HEADER / FOOTER PER PAGE ----------
  const total = pages.length;
  pages.forEach((p, idx) => {
    // Header (isolamento de estado gráfico e reset de espaçamento de texto)
    p.pushOperators(pushGraphicsState());
    resetPdfTextSpacing(p);

    if (template === "executivo") {
      // Gradient simulation: 3 stacked bands
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: secondary,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight / 2,
        color: primary,
        opacity: 0.55,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight, width: W, height: 3, color: gold });
    } else if (template === "naval-azul") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.05, 0.12, 0.27),
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 3, width: W, height: 3, color: gold });
    } else if (template === "minimalista") {
      p.drawLine({
        start: { x: LEFT, y: H - headerHeight },
        end: { x: RIGHT_X, y: H - headerHeight },
        thickness: 0.6,
        color: lightBorder,
      });
    } else if (template === "laudo") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: lightBg,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: 6,
        height: headerHeight,
        color: primary,
      });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.4,
        color: lightBorder,
      });
    } else if (template === "checklist") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: lightBg,
      });
      p.drawLine({
        start: { x: 0, y: H - headerHeight - 2 },
        end: { x: W, y: H - headerHeight - 2 },
        thickness: 2,
        color: primary,
      });
    } else if (template === "escritorio") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.98, 0.98, 0.99),
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: primary });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.3,
        color: lightBorder,
      });
    } else if (template === "institucional") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.06, 0.13, 0.28),
      });
    } else if (template === "moderno") {
      // Gradient bands primary -> secondary
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: primary,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: secondary,
        opacity: 0.45,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W / 2,
        height: headerHeight,
        color: primary,
        opacity: 0.3,
      });
    } else if (template === "luxo") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.04, 0.09, 0.2),
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: gold });
      p.drawRectangle({ x: 0, y: H - headerHeight - 6, width: W, height: 1, color: gold });
    } else if (template === "premium-branco") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(1, 1, 1),
      });
      p.drawLine({
        start: { x: LEFT, y: H - headerHeight + 2 },
        end: { x: RIGHT_X, y: H - headerHeight + 2 },
        thickness: 1.4,
        color: gold,
      });
    } else if (template === "azul-profundo") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.024, 0.125, 0.273),
      });
    } else if (template === "oficial") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: secondary,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: primary });
    } else if (template === "engenharia-naval") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: lightBg,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: 8,
        height: headerHeight,
        color: secondary,
      });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.6,
        color: secondary,
      });
    } else if (template === "protocolo") {
      p.drawLine({
        start: { x: LEFT, y: H - headerHeight },
        end: { x: RIGHT_X, y: H - headerHeight },
        thickness: 0.8,
        color: secondary,
      });
    } else if (template === "capa-executiva") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: primary,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: secondary,
        opacity: 0.5,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 3, width: W, height: 3, color: gold });
      if (idx === 0) {
        const title = sanitize(opts.docName).toUpperCase();
        const tw = measure(title, 20, bold);
        p.drawText(title, {
          x: (W - tw) / 2,
          y: H - headerHeight / 2 - 6,
          size: 20,
          font: bold,
          color: rgb(1, 1, 1),
          maxWidth: W - 80,
        });
      }
    } else if (template === "relatorio-tecnico") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: secondary,
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: primary,
        opacity: 0.55,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: gold });
    } else if (template === "corporate-clean") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(1, 1, 1),
      });
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: 80,
        height: headerHeight,
        color: primary,
      });
      p.drawLine({
        start: { x: 0, y: H - headerHeight },
        end: { x: W, y: H - headerHeight },
        thickness: 0.4,
        color: lightBorder,
      });
    } else if (template === "timbrado") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: primary,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 6, width: W, height: 4, color: secondary });
    } else if (template === "naval-premium") {
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: rgb(0.024, 0.094, 0.22),
      });
      p.drawRectangle({
        x: W - 90,
        y: H - headerHeight,
        width: 90,
        height: headerHeight,
        color: primary,
        opacity: 0.7,
      });
      p.drawRectangle({ x: 0, y: H - headerHeight - 2, width: W, height: 2, color: gold });
      p.drawRectangle({ x: 0, y: H - headerHeight - 6, width: W, height: 1, color: gold });
    } else {
      // classico
      p.drawRectangle({
        x: 0,
        y: H - headerHeight,
        width: W,
        height: headerHeight,
        color: primary,
      });
    }

    const onDarkHeader =
      template === "classico" ||
      template === "executivo" ||
      template === "naval-azul" ||
      template === "institucional" ||
      template === "moderno" ||
      template === "luxo" ||
      template === "azul-profundo" ||
      template === "oficial" ||
      template === "capa-executiva" ||
      template === "relatorio-tecnico" ||
      template === "timbrado" ||
      template === "naval-premium";
    const headerTextColor = onDarkHeader ? rgb(1, 1, 1) : ink;

    // Header text rendering: separated into strictly non-overlapping Left and Right areas
    const maxLeftAreaW = 230; // Área da empresa: de LEFT (50) até 280
    const rightAreaMaxW = 230; // Área do documento: alinhado à direita de RIGHT_X (545) até 315 (moat central livre de 35pt)

    // Lado Esquerdo: Logo ou Nome da Empresa
    if (logoImg) {
      const maxLh = headerHeight - 18;
      const lw = Math.min(115, (logoImg.width / logoImg.height) * maxLh);
      const lh = (logoImg.height / logoImg.width) * lw;
      p.drawImage(logoImg, {
        x: LEFT,
        y: H - headerHeight + (headerHeight - lh) / 2,
        width: lw,
        height: lh,
      });
      if (b?.company_name) {
        const cLines = wrap(sanitize(b.company_name).toUpperCase(), 10, maxLeftAreaW - lw - 10, bold);
        const compBlockH = cLines.length * 12;
        let cy = H - (headerHeight - compBlockH) / 2 - 9;
        for (const cln of cLines) {
          p.drawText(cln, { x: LEFT + lw + 10, y: cy, size: 10, font: bold, color: headerTextColor });
          cy -= 12;
        }
      }
    } else if (rawCompanyName) {
      const compBlockH = headerCompLines.length * 13;
      let cy = H - (headerHeight - compBlockH) / 2 - 10;
      for (const cln of headerCompLines) {
        p.drawText(cln, {
          x: LEFT,
          y: cy,
          size: compFontSize,
          font: bold,
          color: headerTextColor,
        });
        cy -= 13;
      }
    }

    // Lado Direito: Identificação do Documento (rigorosamente delimitada e alinhada à direita)
    const docBlockH = headerDocLines.length * 10;
    let dy = H - (headerHeight - docBlockH) / 2 - 8;
    for (const dln of headerDocLines) {
      const dw = measure(dln, docFontSize, bold);
      p.drawText(dln, {
        x: RIGHT_X - dw,
        y: dy,
        size: docFontSize,
        font: bold,
        color: headerTextColor,
      });
      dy -= 10;
    }
    p.pushOperators(popGraphicsState());
    resetPdfTextSpacing(p);

    // Footer (isolamento de estado gráfico e reset de espaçamento de texto)
    p.pushOperators(pushGraphicsState());
    resetPdfTextSpacing(p);

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
      resetPdfTextSpacing(p);
      p.drawText(sanitize(contactBits), {
        x: LEFT,
        y: 48,
        size: 7,
        font,
        color: muted,
        maxWidth: CONTENT_W - 150,
      });
    }
    if (b?.pdf_footer_text) {
      resetPdfTextSpacing(p);
      p.drawText(sanitize(b.pdf_footer_text), {
        x: LEFT,
        y: 36,
        size: 6.5,
        font: italic,
        color: muted,
        maxWidth: CONTENT_W - 150,
      });
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
    resetPdfTextSpacing(p);
    p.drawText(codeText, { x: RIGHT_X - ctw - 7, y: 48, size: 7, font: bold, color: primary });
    resetPdfTextSpacing(p);
    p.drawText(`Página ${idx + 1} / ${total}`, {
      x: RIGHT_X - 70,
      y: 32,
      size: 7,
      font: bold,
      color: muted,
    });

    p.pushOperators(popGraphicsState());
    resetPdfTextSpacing(p);
  });

  const bytes = await pdfDoc.save();
  return { bytes, verificationCode };
}
