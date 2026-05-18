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

    // 2. Fetch Template File from Storage
    const fileName = template.template_file_url.split('/').pop()
    const filePath = template.company_id ? `${template.company_id}/${fileName}` : `global/${fileName}`
    
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from('document-templates')
      .download(filePath)

    if (fileError || !fileData) throw new Error('Template file could not be downloaded')

    const arrayBuffer = await fileData.arrayBuffer()
    let finalBuffer: ArrayBuffer
    let contentType: string
    let extension: string

    if (template.file_type === 'docx') {
      const zip = new PizZip(arrayBuffer)
      const doc = new docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      })
      
      doc.render(fieldValues)
      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      })
      finalBuffer = buffer
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      extension = 'docx'
    } else {
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const { data: fields } = await supabaseAdmin
        .from('document_fields')
        .select('*')
        .eq('template_id', templateId)

      if (fields) {
        for (const field of fields) {
          const value = fieldValues[field.field_name] || ''
          if (!value && field.required) continue
          if (!value) continue

          const pageNum = (field.page_number || 1) - 1
          const page = pages[pageNum]
          if (!page) continue

          if (field.position_x !== undefined && field.position_y !== undefined) {
             const { height } = page.getSize()
             
             // The values from DB are now in points (1/72 inch)
             const x = field.position_x;
             const y = height - field.position_y; // Editor uses top-left, PDF uses bottom-left
             const fontSize = field.font_size || 10;
             const width = field.width || 150;
             
             let drawX = x;
             const textWidth = font.widthOfTextAtSize(String(value), fontSize);
             
             if (field.alignment === 'center') {
                drawX = x + (width / 2) - (textWidth / 2);
             } else if (field.alignment === 'right') {
                drawX = x + width - textWidth;
             }
             
             page.drawText(String(value), {
               x: drawX,
               y: y - fontSize, // Baseline adjustment
               size: fontSize,
               font: font,
               color: rgb(0, 0, 0),
               maxWidth: width,
             })
          }
        }
      }
      
      const pdfBytes = await pdfDoc.save()
      finalBuffer = pdfBytes.buffer
      contentType = 'application/pdf'
      extension = 'pdf'
    }

    const generatedFileName = `${crypto.randomUUID()}.${extension}`
    const generatedPath = `${companyId}/${generatedFileName}`

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('generated-documents')
      .upload(generatedPath, finalBuffer, {
        contentType,
        upsert: true
      })

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: generatedDoc,
        url: generatedPath 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})