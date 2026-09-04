import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export const MAX_LOGO_WIDTH_MM = 45;
export const MAX_LOGO_HEIGHT_MM = 25;
// Conversão de milímetros para pontos no jsPDF (72 pt / 25.4 mm)
export const MAX_LOGO_WIDTH_PT = (MAX_LOGO_WIDTH_MM * 72) / 25.4; // ~127.56 pt
export const MAX_LOGO_HEIGHT_PT = (MAX_LOGO_HEIGHT_MM * 72) / 25.4; // ~70.86 pt

export interface PdfBranding {
  mode?: "none" | "company" | "client" | "exclusive" | string | null;
  logoUrl?: string | null;
  companyName?: string | null;
  companyCnpj?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  primaryColor?: string | null;
  footerText?: string | null;
}

export interface OrderOrBudgetItem {
  index?: number;
  description: string;
  type?: "servico" | "peca" | string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface OrderOrBudgetCustomer {
  name: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface OrderOrBudgetVehicleOrVessel {
  name?: string | null;
  plateOrInscription?: string | null; // Placa do veículo ou Inscrição da embarcação
  modelOrType?: string | null;
  chassiOrHull?: string | null;
  engine?: string | null;
}

export interface OrderOrBudgetDocument {
  docType?: "ordem_servico" | "orcamento" | "documento" | string;
  docTitle?: string;
  docNumber?: string;
  createdAt?: string;
  validUntilOrDelivery?: string;
  status?: string;
  customer?: OrderOrBudgetCustomer | null;
  vehicleOrVessel?: OrderOrBudgetVehicleOrVessel | null;
  items?: OrderOrBudgetItem[];
  discount?: number;
  observations?: string | null;
  technicalResponsible?: string | null;
}

export interface GeneratePdfArgs {
  name: string;
  content?: string;
  structuredDoc?: OrderOrBudgetDocument;
  processId: string;
  companyId: string;
  generatedDocumentId: string;
  branding?: PdfBranding;
}

/**
 * Calcula dimensões proporcionais preservando o aspect-ratio original da imagem,
 * garantindo largura máxima de 45mm e altura máxima de 25mm.
 */
export function calculateProportionalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = MAX_LOGO_WIDTH_PT,
  maxHeight: number = MAX_LOGO_HEIGHT_PT
): { width: number; height: number } {
  if (!originalWidth || !originalHeight || originalWidth <= 0 || originalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const ratio = originalWidth / originalHeight;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return { width, height };
}

/**
 * Carrega a imagem do logotipo tratando CORS, Base64 nativo e fallback com canvas offscreen.
 * Não trava a execução do PDF caso a imagem esteja offline ou inacessível.
 */
export async function fetchLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== "string") return null;

  // Se já for data URL base64, retorna diretamente
  if (url.startsWith("data:image/")) {
    return url;
  }

  // 1ª tentativa: fetch com mode CORS
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("[PDF_LOGO_FETCH_CORS_FAIL]", err);
  }

  // 2ª tentativa: Fallback via HTMLImageElement com crossOrigin Anonymous em canvas offscreen
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const dataUrl = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 200;
            canvas.height = img.naturalHeight || img.height || 100;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
              return;
            }
          } catch (canvasErr) {
            console.warn("[PDF_LOGO_CANVAS_RENDER_FAIL]", canvasErr);
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        // Timeout de 4s para não travar a geração
        setTimeout(() => resolve(null), 4000);
        img.src = url;
      });

      if (dataUrl) return dataUrl;
    } catch (e) {
      console.warn("[PDF_LOGO_IMAGE_FALLBACK_FAIL]", e);
    }
  }

  return null;
}

/**
 * Renderiza o cabeçalho do documento com suporte a logo proporcional (máx 45mm)
 * ou fallback elegante com o nome da oficina caso não haja logo enviado.
 */
function renderDocumentHeader(
  doc: jsPDF,
  branding: PdfBranding | undefined,
  logoDataUrl: string | null | undefined,
  margin: number,
  yStart: number,
  pageW: number
): number {
  let y = yStart;
  const companyName = branding?.companyName || "OFICINA ESPECIALIZADA";
  const cnpj = branding?.companyCnpj ? `CNPJ: ${branding.companyCnpj}` : "";
  const contact = [branding?.contactPhone, branding?.contactEmail].filter(Boolean).join(" • ");

  if (logoDataUrl) {
    try {
      const imgProps = doc.getImageProperties(logoDataUrl);
      const { width, height } = calculateProportionalDimensions(
        imgProps.width,
        imgProps.height,
        MAX_LOGO_WIDTH_PT,
        MAX_LOGO_HEIGHT_PT
      );

      const imgFormat = (imgProps.fileType || "PNG").toUpperCase() === "JPEG" ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, imgFormat, margin, y, width, height, undefined, "FAST");

      // Detalhes da empresa alinhados ao lado do logotipo
      const textX = margin + width + 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Navy
      doc.text(companyName, textX, y + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500
      let textY = y + 30;
      if (cnpj) {
        doc.text(cnpj, textX, textY);
        textY += 12;
      }
      if (contact) {
        doc.text(contact, textX, textY);
      }

      y += Math.max(height, 46) + 16;
      return y;
    } catch (err) {
      console.warn("[PDF_HEADER_LOGO_DRAW_ERROR]", err);
      // Cai no fallback textual caso a imagem seja inválida
    }
  }

  // Fallback elegante sem logo: caixa estilizada com inicial e tipografia institucional
  const badgeWidth = 42;
  const badgeHeight = 42;

  // Caixa de fundo suave para a inicial
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, badgeWidth, badgeHeight, 6, 6, "F");

  // Moldura sutil
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, badgeWidth, badgeHeight, 6, 6, "S");

  // Inicial em destaque
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // Primary blue
  const initial = companyName.charAt(0).toUpperCase();
  doc.text(initial, margin + 14, y + 27);

  // Nome e dados da empresa
  const textX = margin + badgeWidth + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, textX, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let textY = y + 30;
  if (cnpj) {
    doc.text(cnpj, textX, textY);
    textY += 12;
  }
  if (contact) {
    doc.text(contact, textX, textY);
  }

  y += badgeHeight + 16;
  return y;
}

/**
 * Constrói o PDF como Blob suportando tanto textos simples quanto Ordens de Serviço
 * e Orçamentos com quebra de página de tabela, metadados sem sobreposição e totais.
 */
export function buildPdfBlob(args: {
  name: string;
  content?: string;
  structuredDoc?: OrderOrBudgetDocument;
  branding?: PdfBranding;
  logoDataUrl?: string | null;
}): Blob {
  const { name, content, structuredDoc, branding, logoDataUrl } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  const bottomSafeMargin = 55;

  let y = margin;

  // 1. Cabeçalho com Logotipo ou Fallback
  y = renderDocumentHeader(doc, branding, logoDataUrl, margin, y, pageW);

  // 2. Barra divisória e Título do Documento
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  const docTitle = structuredDoc?.docTitle || (
    structuredDoc?.docType === "ordem_servico" ? "ORDEM DE SERVIÇO" :
    structuredDoc?.docType === "orcamento" ? "ORÇAMENTO" : name
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, margin, y);

  // Número / Protocolo à direita se disponível
  if (structuredDoc?.docNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text(`Nº ${structuredDoc.docNumber}`, pageW - margin, y, { align: "right" });
  }
  y += 20;

  // 3. Metadados Estruturados (Cliente, Veículo/Embarcação, Datas) sem sobreposição
  if (structuredDoc?.customer || structuredDoc?.vehicleOrVessel || structuredDoc?.createdAt) {
    const boxStartY = y;
    const halfW = (contentW - 16) / 2;

    // Caixa Esquerda: Dados do Cliente
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, boxStartY, halfW, 76, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("DADOS DO CLIENTE", margin + 10, boxStartY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const custName = structuredDoc.customer?.name || "Cliente não especificado";
    doc.text(doc.splitTextToSize(custName, halfW - 20)[0] || custName, margin + 10, boxStartY + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let custY = boxStartY + 42;
    if (structuredDoc.customer?.cpfCnpj) {
      doc.text(`CPF/CNPJ: ${structuredDoc.customer.cpfCnpj}`, margin + 10, custY);
      custY += 12;
    }
    if (structuredDoc.customer?.phone) {
      doc.text(`Telefone: ${structuredDoc.customer.phone}`, margin + 10, custY);
      custY += 12;
    }

    // Caixa Direita: Embarcação / Veículo e Datas
    const rightX = margin + halfW + 16;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightX, boxStartY, halfW, 76, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("DADOS DO VEÍCULO / EMBARCAÇÃO", rightX + 10, boxStartY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const vName = structuredDoc.vehicleOrVessel?.name || "Item não identificado";
    doc.text(doc.splitTextToSize(vName, halfW - 20)[0] || vName, rightX + 10, boxStartY + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let vY = boxStartY + 42;
    const plate = structuredDoc.vehicleOrVessel?.plateOrInscription;
    if (plate) {
      doc.text(`Placa / Inscrição: ${plate}`, rightX + 10, vY);
      vY += 12;
    }
    const emitDate = structuredDoc.createdAt || new Date().toLocaleDateString("pt-BR");
    doc.text(`Emissão: ${emitDate}`, rightX + 10, vY);

    y = boxStartY + 76 + 18;
  }

  // 4. Tabela de Peças e Serviços com Quebra de Página Limpa
  const items = structuredDoc?.items || [];
  if (items.length > 0) {
    const colX = {
      num: margin + 8,
      desc: margin + 34,
      type: margin + 260,
      qty: margin + 330,
      unit: margin + 390,
      total: pageW - margin - 8,
    };

    const drawTableHeader = (curY: number) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, curY, contentW, 20, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, curY, contentW, 20, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("#", colX.num, curY + 13);
      doc.text("ITEM / DESCRIÇÃO", colX.desc, curY + 13);
      doc.text("TIPO", colX.type, curY + 13);
      doc.text("QTD", colX.qty, curY + 13, { align: "right" });
      doc.text("VALOR UNIT.", colX.unit, curY + 13, { align: "right" });
      doc.text("TOTAL", colX.total, curY + 13, { align: "right" });

      return curY + 20;
    };

    y = drawTableHeader(y);

    let subtotalPecas = 0;
    let subtotalServicos = 0;

    items.forEach((it, idx) => {
      const itemTotal = it.total ?? it.quantity * it.unitPrice;
      const itType = it.type?.toLowerCase() || "servico";
      if (itType.includes("peca") || itType.includes("peça")) {
        subtotalPecas += itemTotal;
      } else {
        subtotalServicos += itemTotal;
      }

      // Quebra de página segura se a linha for estourar o rodapé
      if (y + 24 > pageH - bottomSafeMargin) {
        doc.addPage();
        y = margin;
        // Cabeçalho de continuação
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${docTitle} (Continuação)`, margin, y + 10);
        y += 18;
        y = drawTableHeader(y);
      }

      // Linha zebrada
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentW, 20, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 20, pageW - margin, y + 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      const itemNum = String(it.index ?? idx + 1).padStart(2, "0");
      doc.text(itemNum, colX.num, y + 14);

      // Truncar descrição se muito longa
      const descLines = doc.splitTextToSize(it.description || "Item", colX.type - colX.desc - 10);
      doc.text(descLines[0] || it.description, colX.desc, y + 14);

      const typeLabel = itType.includes("peca") || itType.includes("peça") ? "Peça" : "Serviço";
      doc.text(typeLabel, colX.type, y + 14);

      doc.text(String(it.quantity), colX.qty, y + 14, { align: "right" });
      doc.text(`R$ ${it.unitPrice.toFixed(2)}`, colX.unit, y + 14, { align: "right" });
      doc.text(`R$ ${itemTotal.toFixed(2)}`, colX.total, y + 14, { align: "right" });

      y += 20;
    });

    // 5. Bloco de Totais
    const discount = structuredDoc?.discount || 0;
    const totalGeral = subtotalPecas + subtotalServicos - discount;

    if (y + 80 > pageH - bottomSafeMargin) {
      doc.addPage();
      y = margin;
    }

    y += 10;
    const totalsBoxW = 200;
    const totalsX = pageW - margin - totalsBoxW;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsX, y, totalsBoxW, 68, 6, 6, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Serviços:", totalsX + 12, y + 16);
    doc.text(`R$ ${subtotalServicos.toFixed(2)}`, pageW - margin - 12, y + 16, { align: "right" });

    doc.text("Peças:", totalsX + 12, y + 30);
    doc.text(`R$ ${subtotalPecas.toFixed(2)}`, pageW - margin - 12, y + 30, { align: "right" });

    if (discount > 0) {
      doc.text("Desconto:", totalsX + 12, y + 44);
      doc.text(`- R$ ${discount.toFixed(2)}`, pageW - margin - 12, y + 44, { align: "right" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL GERAL:", totalsX + 12, y + 58);
    doc.setTextColor(37, 99, 235);
    doc.text(`R$ ${totalGeral.toFixed(2)}`, pageW - margin - 12, y + 58, { align: "right" });

    y += 84;
  } else if (content) {
    // 6. Fluxo de Conteúdo em Texto Livre (quando não há tabela estruturada)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);

    const lines = doc.splitTextToSize(content || "", contentW);
    for (const line of lines) {
      if (y > pageH - bottomSafeMargin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
  }

  // 7. Observações / Termos se houver
  if (structuredDoc?.observations) {
    if (y + 40 > pageH - bottomSafeMargin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("OBSERVAÇÕES & TERMOS", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(structuredDoc.observations, contentW);
    obsLines.forEach((l: string) => {
      if (y > pageH - bottomSafeMargin) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin, y);
      y += 11;
    });
  }

  // 8. Rodapé em Todas as Páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, pageH - 28, pageW - margin, pageH - 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    const footerNotice = branding?.footerText || "Documento emitido eletronicamente via NavalDocs Pro";
    doc.text(footerNotice, margin, pageH - 16);

    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW - margin,
      pageH - 16,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

/**
 * Gatilho de download ou abertura nativa compatível com iOS Safari e Chrome Android/Desktop.
 * No Safari móvel, a abertura direta do blob em aba/janela nativa contorna o bloqueio de popups
 * e a inoperância do atributo download em links programáticos.
 */
export function downloadOrOpenPdf(
  pdfInput: jsPDF | Blob,
  filename: string
): { success: boolean; mode: "download" | "viewer" } {
  const blob = pdfInput instanceof Blob ? pdfInput : pdfInput.output("blob");
  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  if (typeof window === "undefined") {
    return { success: false, mode: "download" };
  }

  const userAgent = window.navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  const blobUrl = URL.createObjectURL(blob);

  // Em dispositivos iOS Safari, o download direto de blob em <a> frequentemente falha.
  // Abertura na visualização nativa com suporte ao menu de compartilhamento/salvar é o padrão da Apple.
  if (isIOS) {
    const newTab = window.open(blobUrl, "_blank");
    if (!newTab) {
      window.location.href = blobUrl;
    }
    return { success: true, mode: "viewer" };
  }

  // Desktop e Android: download direto via âncora oculta
  try {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = cleanFilename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 3000);
    return { success: true, mode: "download" };
  } catch (err) {
    console.warn("[PDF_DIRECT_DOWNLOAD_FAIL]", err);
    window.open(blobUrl, "_blank");
    return { success: true, mode: "viewer" };
  }
}

/**
 * Gera e envia o PDF para o bucket 'generated-documents' do Supabase Storage
 */
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
    structuredDoc: args.structuredDoc,
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
