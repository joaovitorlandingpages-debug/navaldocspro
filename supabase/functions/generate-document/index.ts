import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb, StandardFonts, degrees } from "https://esm.sh/pdf-lib"
import docxtemplater from "https://esm.sh/docxtemplater"
import PizZip from "https://esm.sh/pizzip"
import { authContext, rateLimit, consume, jsonResponse, corsHeaders, HttpError, clientIp } from "../_shared/auth.ts"


type Branding = {
  company_name: string
  logo_primary_url: string | null
  brand_primary_color: string
  brand_secondary_color: string
  contact_phone: string | null
  contact_whatsapp: string | null
  contact_email: string | null
  contact_website: string | null
  contact_address: string | null
  technical_responsible_name: string | null
  technical_responsible_registry: string | null
  signature_url: string | null
  stamp_url: string | null
  watermark_url: string | null
  pdf_footer_text: string | null
}

const DEFAULT_BRANDING: Omit<Branding, "company_name"> = {
  logo_primary_url: null,
  brand_primary_color: "#2563eb",
  brand_secondary_color: "#0f172a",
  contact_phone: null,
  contact_whatsapp: null,
  contact_email: null,
  contact_website: null,
  contact_address: null,
  technical_responsible_name: null,
  technical_responsible_registry: null,
  signature_url: null,
  stamp_url: null,
  watermark_url: null,
  pdf_footer_text: null,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = (hex || "").replace("#", "")
  if (h.length !== 6) return { r: 0.15, g: 0.39, b: 0.92 }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

async function loadBranding(supabaseAdmin: any, companyId: string): Promise<Branding> {
  if (!companyId) return { company_name: "Empresa", ...DEFAULT_BRANDING }
  const { data } = await supabaseAdmin
    .from('companies')
    .select('name, logo_primary_url, brand_primary_color, brand_secondary_color, contact_phone, contact_whatsapp, contact_email, contact_website, contact_address, technical_responsible_name, technical_responsible_registry, signature_url, stamp_url, watermark_url, pdf_footer_text')
    .eq('id', companyId)
    .maybeSingle()
  if (!data) return { company_name: "Empresa", ...DEFAULT_BRANDING }
  return { ...DEFAULT_BRANDING, ...data, company_name: data.name || "Empresa" }
}

/**
 * Resolve os dados do procurador/despachante padrão a partir da hierarquia:
 * 1) Campos `procurador_*` da empresa (Identidade Corporativa).
 * 2) Responsável técnico configurado na empresa.
 * 3) Perfil do usuário responsável pelo processo (ou criador do processo).
 * 4) Contatos institucionais da empresa como último recurso.
 */
async function resolveProcurador(
  supabaseAdmin: any,
  companyId: string | null,
  processId: string | null,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!companyId) return out
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, cnpj, email, phone, contact_phone, contact_email, contact_address, responsible_name, technical_responsible_name, technical_responsible_registry, procurador_nome, procurador_cpf, procurador_rg, procurador_orgao_expedidor, procurador_nacionalidade, procurador_endereco, procurador_telefone, procurador_email, procurador_crea')
    .eq('id', companyId).maybeSingle()

  let responsibleProfile: any = null
  if (processId) {
    const { data: proc } = await supabaseAdmin
      .from('processes').select('responsible_id, technical_manager_id, created_by')
      .eq('id', processId).maybeSingle()
    const uid = proc?.responsible_id || proc?.technical_manager_id || proc?.created_by
    if (uid) {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('name, email, phone')
        .eq('id', uid).maybeSingle()
      responsibleProfile = prof
    }
  }

  const pick = (...vals: (string | null | undefined)[]) => {
    for (const v of vals) if (v && String(v).trim()) return String(v).trim()
    return ''
  }

  out['procurador.nome'] = pick(
    company?.procurador_nome, company?.technical_responsible_name,
    responsibleProfile?.name, company?.responsible_name,
  )
  out['procurador.cpf'] = pick(company?.procurador_cpf, responsibleProfile?.cpf)
  out['procurador.rg'] = pick(company?.procurador_rg, responsibleProfile?.rg)
  out['procurador.orgao_expedidor'] = pick(company?.procurador_orgao_expedidor)
  out['procurador.nacionalidade'] = pick(company?.procurador_nacionalidade, 'Brasileira')
  out['procurador.endereco'] = pick(company?.procurador_endereco, responsibleProfile?.address, company?.contact_address)
  out['procurador.telefone'] = pick(company?.procurador_telefone, responsibleProfile?.phone, company?.contact_phone, company?.phone)
  out['procurador.email'] = pick(company?.procurador_email, responsibleProfile?.email, company?.contact_email, company?.email)
  out['procurador.crea'] = pick(company?.procurador_crea, responsibleProfile?.crea, company?.technical_responsible_registry)

  return out
}

/** Templates cujo conteúdo depende obrigatoriamente do procurador (bloqueia geração sem nome+CPF). */
const PROCURADOR_REQUIRED_ROLES = new Set([
  'procuracao', 'procuracao_particular', 'proc_part_naval',
  'requerimento', 'req_inscr',
])
function templateRequiresProcurador(template: any): boolean {
  const code = String(template?.code || template?.slug || '').toLowerCase()
  const name = String(template?.name || '').toLowerCase()
  if (PROCURADOR_REQUIRED_ROLES.has(code)) return true
  if (name.includes('procura') || name.includes('requerimento')) return true
  const content = String(template?.base_content || '')
  return /\{\{\s*(procurador|outorgado)\./i.test(content)
}

async function tryFetchImage(pdfDoc: any, url: string | null): Promise<any | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const lower = url.toLowerCase()
    if (lower.includes('.png')) return await pdfDoc.embedPng(buf)
    return await pdfDoc.embedJpg(buf)
  } catch {
    return null
  }
}

function joinContact(b: Branding): string {
  const parts: string[] = []
  if (b.contact_phone) parts.push(`Tel: ${b.contact_phone}`)
  if (b.contact_whatsapp && b.contact_whatsapp !== b.contact_phone) parts.push(`WhatsApp: ${b.contact_whatsapp}`)
  if (b.contact_email) parts.push(b.contact_email)
  if (b.contact_website) parts.push(b.contact_website)
  return parts.join(' • ')
}

async function applyBranding(
  pdfDoc: any,
  branding: Branding,
  opts: { documentName: string; processNumber?: string; verificationCode: string }
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const primary = hexToRgb(branding.brand_primary_color)
  const secondary = hexToRgb(branding.brand_secondary_color)
  const gray = rgb(0.4, 0.4, 0.4)

  const logoImg = await tryFetchImage(pdfDoc, branding.logo_primary_url)
  const watermarkImg = await tryFetchImage(pdfDoc, branding.watermark_url)
  const signatureImg = await tryFetchImage(pdfDoc, branding.signature_url)
  const stampImg = await tryFetchImage(pdfDoc, branding.stamp_url)

  const pages = pdfDoc.getPages()
  const total = pages.length
  const contactLine = joinContact(branding)
  const footerInstitutional = branding.pdf_footer_text || branding.company_name

  pages.forEach((page: any, idx: number) => {
    const { width, height } = page.getSize()

    // Watermark (centered, behind content visually since drawn first matters; pdf-lib draws sequentially — we draw at low opacity at start of overlay would cover text. Use opacity.)
    if (watermarkImg) {
      const wmW = width * 0.55
      const wmH = (watermarkImg.height / watermarkImg.width) * wmW
      page.drawImage(watermarkImg, {
        x: (width - wmW) / 2,
        y: (height - wmH) / 2,
        width: wmW,
        height: wmH,
        opacity: 0.06,
        rotate: degrees(-30),
      })
    }

    // Header band
    const headerH = 60
    page.drawRectangle({
      x: 0,
      y: height - headerH,
      width,
      height: headerH,
      color: rgb(primary.r, primary.g, primary.b),
    })

    let textX = 40
    if (logoImg) {
      const lh = 38
      const lw = (logoImg.width / logoImg.height) * lh
      page.drawImage(logoImg, { x: 40, y: height - headerH + (headerH - lh) / 2, width: lw, height: lh })
      textX = 40 + lw + 14
    }

    // Company name fallback / always show name beside logo
    page.drawText(branding.company_name, {
      x: textX,
      y: height - 28,
      size: 13,
      font: bold,
      color: rgb(1, 1, 1),
    })

    // Doc name + process number, right side
    const docTitle = opts.documentName || 'Documento'
    const titleWidth = bold.widthOfTextAtSize(docTitle, 11)
    page.drawText(docTitle, {
      x: width - 40 - titleWidth,
      y: height - 25,
      size: 11,
      font: bold,
      color: rgb(1, 1, 1),
    })
    if (opts.processNumber) {
      const pn = `Processo: ${opts.processNumber}`
      const pnW = font.widthOfTextAtSize(pn, 9)
      page.drawText(pn, {
        x: width - 40 - pnW,
        y: height - 42,
        size: 9,
        font,
        color: rgb(1, 1, 1),
      })
    }

    // Footer band
    const footerH = 48
    page.drawLine({
      start: { x: 40, y: footerH + 4 },
      end: { x: width - 40, y: footerH + 4 },
      thickness: 0.5,
      color: rgb(secondary.r, secondary.g, secondary.b),
    })

    let fy = footerH - 8
    page.drawText(footerInstitutional, { x: 40, y: fy, size: 9, font: bold, color: rgb(secondary.r, secondary.g, secondary.b) })
    if (contactLine) {
      fy -= 12
      page.drawText(contactLine.slice(0, 130), { x: 40, y: fy, size: 8, font, color: gray })
    }
    if (branding.contact_address) {
      fy -= 11
      page.drawText(branding.contact_address.slice(0, 130), { x: 40, y: fy, size: 8, font, color: gray })
    }

    // Right footer: page X/Y + verification code
    const pageLabel = `Página ${idx + 1}/${total}`
    const pageW = font.widthOfTextAtSize(pageLabel, 9)
    page.drawText(pageLabel, { x: width - 40 - pageW, y: footerH - 8, size: 9, font, color: gray })
    const codeLabel = `Verificação: ${opts.verificationCode}`
    const codeW = font.widthOfTextAtSize(codeLabel, 7)
    page.drawText(codeLabel, { x: width - 40 - codeW, y: footerH - 20, size: 7, font, color: gray })
  })

  // Signature + stamp on last page only
  const last = pages[pages.length - 1]
  if (last && (signatureImg || stampImg || branding.technical_responsible_name)) {
    const { width } = last.getSize()
    const baseY = 100
    if (signatureImg) {
      const sh = 50
      const sw = (signatureImg.width / signatureImg.height) * sh
      last.drawImage(signatureImg, { x: width - 40 - sw, y: baseY, width: sw, height: sh })
    }
    if (stampImg) {
      const sh = 70
      const sw = (stampImg.width / stampImg.height) * sh
      last.drawImage(stampImg, { x: 40, y: baseY - 10, width: sw, height: sh, opacity: 0.85 })
    }
    if (branding.technical_responsible_name) {
      last.drawLine({ start: { x: width - 220, y: baseY - 4 }, end: { x: width - 40, y: baseY - 4 }, thickness: 0.5, color: rgb(0, 0, 0) })
      last.drawText(branding.technical_responsible_name, { x: width - 220, y: baseY - 16, size: 9, font: bold, color: rgb(0, 0, 0) })
      if (branding.technical_responsible_registry) {
        last.drawText(branding.technical_responsible_registry, { x: width - 220, y: baseY - 28, size: 8, font, color: gray })
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1) Auth
    const ctx = await authContext(req)

    // 2) Rate limit (user + company)
    await rateLimit(ctx.admin, `user:${ctx.userId}`, 'generate-document', 30, 60)
    if (ctx.companyId) await rateLimit(ctx.admin, `company:${ctx.companyId}`, 'generate-document', 120, 60)

    const { templateId, customerId, vesselId, processId, fieldValues } = await req.json()
    // companyId NEVER trusted from payload — derived from authenticated profile
    const companyId = ctx.companyId
    if (!companyId && !ctx.isAdminMaster) throw new HttpError(403, { error: 'no_company_bound' })

    const supabaseAdmin = ctx.admin

    const { data: template, error: templateError } = await supabaseAdmin
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) throw new HttpError(404, { error: 'template_not_found' })
    // Template must be global (company_id null) OR belong to user's company
    if (template.company_id) ctx.requireCompany(template.company_id)

    // Optional cross-checks if related entities provided
    if (processId) {
      const { data: proc } = await supabaseAdmin.from('processes').select('company_id').eq('id', processId).maybeSingle()
      if (proc) ctx.requireCompany(proc.company_id)
    }
    if (customerId) {
      const { data: cust } = await supabaseAdmin.from('customers').select('company_id').eq('id', customerId).maybeSingle()
      if (cust) ctx.requireCompany(cust.company_id)
    }
    if (vesselId) {
      const { data: ves } = await supabaseAdmin.from('vessels').select('company_id').eq('id', vesselId).maybeSingle()
      if (ves) ctx.requireCompany(ves.company_id)
    }

    // 3) Enforce limits BEFORE incurring cost (PDF generation)
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
    if (companyId) {
      await consume(supabaseAdmin, companyId, 'pdf_generation', 1, requestId, { templateId, processId })
    }



    const branding = await loadBranding(supabaseAdmin, companyId)
    const verificationCode = crypto.randomUUID().slice(0, 8).toUpperCase()

    let processNumber: string | undefined
    if (processId) {
      const { data: proc } = await supabaseAdmin
        .from('processes').select('process_number, protocol_number').eq('id', processId).maybeSingle()
      processNumber = proc?.process_number || proc?.protocol_number || undefined
    }

    let finalBuffer: ArrayBuffer
    let contentType: string
    let extension: string

    const TOP_MARGIN = 90 // leave room for branded header
    const BOTTOM_MARGIN = 70 // leave room for footer

    if (!template.template_file_url && template.base_content) {
      console.log(`Generating text-to-PDF for template: ${template.name}`)
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      let page = pdfDoc.addPage([595.28, 841.89])
      const { height } = page.getSize()
      let currentY = height - TOP_MARGIN
      const margin = 50
      const fontSize = 11
      const lineHeight = 14

      let processedContent = template.base_content
      const flatValues = flattenValues(fieldValues)

      Object.entries(flatValues).forEach(([key, val]) => {
        const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        const replacement = (val !== undefined && val !== null && val !== "") ? String(val) : "____________________"
        processedContent = processedContent.replace(placeholder, replacement)
      });

      processedContent = processedContent.replace(/\{\{\s*.*?\s*\}\}/g, (match) => {
        const fieldName = match.replace(/\{\{\s*|\s*\}\}/g, "");
        return `[Campo pendente: ${fieldName}]`;
      })

      const lines = processedContent.split('\n')
      for (const rawLine of lines) {
        if (currentY < BOTTOM_MARGIN + lineHeight) {
          page = pdfDoc.addPage([595.28, 841.89])
          currentY = height - TOP_MARGIN
        }
        const isTitle = rawLine === rawLine.toUpperCase() && rawLine.trim().length > 3
        const drawFont = isTitle ? boldFont : font
        const drawSize = isTitle ? fontSize + 1 : fontSize

        page.drawText(rawLine, {
          x: margin, y: currentY, size: drawSize, font: drawFont,
          color: rgb(0, 0, 0), maxWidth: 595.28 - (margin * 2),
        })
        currentY -= lineHeight
      }

      await applyBranding(pdfDoc, branding, {
        documentName: template.name,
        processNumber,
        verificationCode,
      })

      const pdfBytes = await pdfDoc.save()
      finalBuffer = pdfBytes.buffer
      contentType = 'application/pdf'
      extension = 'pdf'

    } else if (template.template_file_url) {
      const fileName = template.template_file_url.split('/').pop()
      const filePath = template.company_id ? `${template.company_id}/${fileName}` : `global/${fileName}`

      const { data: fileData, error: fileError } = await supabaseAdmin
        .storage.from('document-templates').download(filePath)

      if (fileError || !fileData) throw new Error('Template file could not be downloaded')

      const arrayBuffer = await fileData.arrayBuffer()
      if (template.file_type === 'docx') {
        const zip = new PizZip(arrayBuffer)
        const doc = new docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
        doc.render(fieldValues)
        finalBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        extension = 'docx'
      } else {
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const pages = pdfDoc.getPages()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const { data: fields } = await supabaseAdmin.from('document_fields').select('*').eq('template_id', templateId)
        if (fields) {
          for (const field of fields) {
            const value = fieldValues[field.field_name] || ''
            if (!value) continue
            const pageNum = (field.page_number || 1) - 1
            const page = pages[pageNum]
            if (!page) continue
            const { height } = page.getSize()
            const x = field.position_x
            const y = height - field.position_y
            const fSize = field.font_size || 10
            page.drawText(String(value), { x, y: y - fSize, size: fSize, font, color: rgb(0, 0, 0), maxWidth: field.width || 150 })
          }
        }
        await applyBranding(pdfDoc, branding, {
          documentName: template.name,
          processNumber,
          verificationCode,
        })
        finalBuffer = (await pdfDoc.save()).buffer
        contentType = 'application/pdf'
        extension = 'pdf'
      }
    } else {
      throw new Error('Template lacks both file and text content')
    }

    const generatedFileName = `${crypto.randomUUID()}.${extension}`
    const generatedPath = `${companyId}/${generatedFileName}`

    const { error: uploadError } = await supabaseAdmin
      .storage.from('generated-documents')
      .upload(generatedPath, finalBuffer, { contentType, upsert: true })

    if (uploadError) throw uploadError

    const { data: generatedDoc, error: dbError } = await supabaseAdmin
      .from('generated_documents')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        vessel_id: vesselId,
        process_id: processId,
        template_id: templateId,
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        generated_file_url: generatedPath,
        status: 'completed',
        metadata: { fieldValues, verificationCode },
      })
      .select()
      .single()

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true, document: generatedDoc, url: generatedPath, verificationCode }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status)
    console.error("Function error:", error)
    return new Response(JSON.stringify({ success: false, error: (error as any)?.message || String(error) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})

function flattenValues(input: any, prefix = ""): any {
  const out: any = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenValues(v, key));
    } else {
      out[key] = v;
    }
  }
  if (!prefix) {
    if (input.cliente) {
      out["cliente.nome"] = input.cliente.name || input.cliente.razao_social;
      out["cliente.cpf"] = input.cliente.cpf_cnpj || input.cliente.cpf;
    }
    if (input.embarcacao) {
      out["embarcacao.nome"] = input.embarcacao.name;
      out["embarcacao.inscricao"] = input.embarcacao.registration_number || input.embarcacao.tie;
    }
    out["data_atual"] = new Date().toLocaleDateString('pt-BR');
    out["sistema.data_atual"] = new Date().toLocaleDateString('pt-BR');
  }
  return out;
}
