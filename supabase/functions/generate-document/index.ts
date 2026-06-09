import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib"
import docxtemplater from "https://esm.sh/docxtemplater"
import PizZip from "https://esm.sh/pizzip"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { templateId, companyId, customerId, vesselId, processId, fieldValues } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) throw new Error('Template not found')

    let finalBuffer: ArrayBuffer
    let contentType: string
    let extension: string

    // 2. Decide strategy: base_content (Text-to-PDF) or template_file_url (File-to-Document)
    if (!template.template_file_url && template.base_content) {
      console.log(`Generating text-to-PDF for template: ${template.name}`)
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      
      let page = pdfDoc.addPage([595.28, 841.89]) // A4
      const { height } = page.getSize()
      let currentY = height - 50
      const margin = 50
      const fontSize = 11
      const lineHeight = 14

      // Process placeholders in base_content
      let processedContent = template.base_content
      const flatValues = flattenValues(fieldValues)
      
      // Simple regex replacement for {{key}}
      Object.entries(flatValues).forEach(([key, val]) => {
        processedContent = processedContent.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(val || ''))
      });

      // Split by lines and draw
      const lines = processedContent.split('\n')
      for (const rawLine of lines) {
        if (currentY < margin + lineHeight) {
          page = pdfDoc.addPage([595.28, 841.89])
          currentY = height - 50
        }

        const isTitle = rawLine === rawLine.toUpperCase() && rawLine.trim().length > 3
        const drawFont = isTitle ? boldFont : font
        const drawSize = isTitle ? fontSize + 1 : fontSize

        page.drawText(rawLine, {
          x: margin,
          y: currentY,
          size: drawSize,
          font: drawFont,
          color: rgb(0, 0, 0),
          maxWidth: 595.28 - (margin * 2)
        })
        currentY -= lineHeight
      }

      const pdfBytes = await pdfDoc.save()
      finalBuffer = pdfBytes.buffer
      contentType = 'application/pdf'
      extension = 'pdf'

    } else if (template.template_file_url) {
      // Original logic for files
      const fileName = template.template_file_url.split('/').pop()
      const filePath = template.company_id ? `${template.company_id}/${fileName}` : `global/${fileName}`
      
      const { data: fileData, error: fileError } = await supabaseAdmin
        .storage
        .from('document-templates')
        .download(filePath)

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
      .storage
      .from('generated-documents')
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
        metadata: { fieldValues }
      })
      .select()
      .single()

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true, document: generatedDoc, url: generatedPath }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
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
  return out;
}
