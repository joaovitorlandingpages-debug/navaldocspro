// Real OCR using Lovable AI Gateway (Gemini 2.5 Flash vision)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXTRACTION_PROMPT = `Você é um OCR especialista em documentos brasileiros (CNH, RG, CPF, comprovantes, TIE/TIEM de embarcações, CSN, DPEM, GRU, recibos, laudos).

Analise a imagem/documento anexado e devolva ESTRITAMENTE um JSON válido (sem markdown, sem comentários) com a seguinte estrutura:

{
  "raw_text": "TODO o texto literal extraído do documento, linha a linha",
  "document_type": "CNH | RG | CPF | COMPROVANTE_RESIDENCIA | VESSEL_TIE | SAFETY_CERTIFICATE | DPEM_INSURANCE | FINANCIAL_GRU | PURCHASE_CONTRACT | TECHNICAL_MEMORIAL | TECHNICAL_REPORT | GENERIC",
  "fields": {
    "name": "nome completo da pessoa (se houver)",
    "cpf": "CPF formatado 000.000.000-00 (se houver)",
    "cnpj": "CNPJ formatado (se houver)",
    "rg": "RG (se houver)",
    "birth_date": "AAAA-MM-DD (se houver)",
    "email": "email (se houver)",
    "phone": "telefone (se houver)",
    "address": "endereço/logradouro (se houver)",
    "city": "cidade (se houver)",
    "state": "UF 2 letras (se houver)",
    "zip_code": "CEP (se houver)",
    "vessel_name": "nome da embarcação (se houver)",
    "registration_number": "número de inscrição/registro (se houver)",
    "expiry_date": "AAAA-MM-DD (se houver)",
    "issue_date": "AAAA-MM-DD (se houver)",
    "engine_brand": "marca do motor (se houver)",
    "engine_model": "modelo do motor (se houver)",
    "engine_serial": "série do motor (se houver)",
    "engine_power": "potência (se houver)"
  }
}

REGRAS CRÍTICAS:
- Use null para campos não encontrados. NÃO invente dados.
- "raw_text" deve conter SEMPRE o texto bruto, mesmo que nenhum campo seja extraído.
- Se não conseguir ler nada, retorne raw_text: "" e fields com todos null.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let jobId: string | undefined
  const startedAt = Date.now()

  try {
    const body = await req.json()
    jobId = body.jobId
    if (!jobId) throw new Error('jobId required')

    console.log('[OCR_UPLOAD_STARTED]', jobId)

    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*, uploaded_files(*)')
      .eq('id', jobId)
      .single()
    if (jobError || !job) throw new Error('Job not found: ' + jobError?.message)

    await supabase.from('ocr_jobs').update({
      status: 'processing',
      provider_used: 'Lovable AI / google/gemini-2.5-flash',
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    const file = job.uploaded_files
    if (!file) throw new Error('Uploaded file record missing')

    // Resolve file bytes — try storage download first, fall back to URL fetch
    const fileUrl: string = file.file_url || ''
    let bytes: Uint8Array | null = null
    let mime = file.file_type || 'image/png'

    const tryDownload = async (bucket: string, path: string) => {
      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error || !data) return null
      return new Uint8Array(await data.arrayBuffer())
    }

    if (fileUrl.startsWith('http')) {
      // Try to parse "/storage/v1/object/(public|sign)/<bucket>/<path>"
      const m = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/)
      if (m) bytes = await tryDownload(m[1], decodeURIComponent(m[2]))
      if (!bytes) {
        const r = await fetch(fileUrl)
        if (r.ok) {
          bytes = new Uint8Array(await r.arrayBuffer())
          mime = r.headers.get('content-type') || mime
        }
      }
    } else {
      // Assume storage path in ocr-documents bucket
      bytes = await tryDownload('ocr-documents', fileUrl)
      if (!bytes) bytes = await tryDownload('customer-documents', fileUrl)
      if (!bytes) bytes = await tryDownload('vessel-documents', fileUrl)
    }

    if (!bytes) throw new Error('OCR_UPLOAD_FAILED: could not read file bytes for ' + fileUrl)
    console.log('[OCR_UPLOAD_SUCCESS]', { bytes: bytes.length, mime })

    // Base64 encode
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const b64 = btoa(binary)

    const isPdf = mime.includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf')
    const contentBlock = isPdf
      ? { type: 'file', file: { filename: file.file_name || 'doc.pdf', file_data: `data:application/pdf;base64,${b64}` } }
      : { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Extraia os dados deste documento conforme o esquema JSON solicitado.' },
            contentBlock,
          ]},
        ],
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      throw new Error(`AI Gateway ${aiRes.status}: ${errText}`)
    }

    const aiJson = await aiRes.json()
    const content: string = aiJson.choices?.[0]?.message?.content ?? ''
    console.log('[OCR_RAW_RESPONSE]', content.slice(0, 500))

    // Parse JSON (strip code fences if present)
    let parsed: any = {}
    try {
      const clean = content.replace(/```json\s*|\s*```/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      parsed = JSON.parse(clean.slice(start, end + 1))
    } catch (e) {
      console.error('[OCR_PARSE_FAILED]', e)
      parsed = { raw_text: content, fields: {} }
    }

    const rawText: string = parsed.raw_text || ''
    const fields: Record<string, any> = parsed.fields || {}
    const docType: string = parsed.document_type || job.document_type || 'GENERIC'

    // Count non-null fields
    const foundEntries = Object.entries(fields).filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    const foundCount = foundEntries.length

    console.log('[OCR_RAW_TEXT]', rawText.slice(0, 300))
    for (const [k, v] of Object.entries(fields)) {
      console.log(v ? '[OCR_FIELD_DETECTED]' : '[OCR_FIELD_NOT_FOUND]', k, v ?? '')
    }

    const extracted_data = {
      ...fields,
      _raw_text: rawText,
      _fields_found: foundCount,
      _has_data: foundCount > 0,
    }

    const confidence_by_field: Record<string, number> = {}
    for (const [k] of foundEntries) confidence_by_field[k] = 0.9
    const avgConf = foundCount > 0 ? 0.9 : 0

    const finalStatus = foundCount > 0 ? 'completed' : (rawText ? 'completed' : 'failed')
    const errMsg = foundCount === 0
      ? (rawText ? 'OCR executado, mas nenhum dado identificado.' : 'Falha na leitura OCR.')
      : null

    await supabase.from('ocr_jobs').update({
      status: finalStatus,
      identified_document_type: docType,
      extracted_data,
      confidence_score: avgConf,
      confidence_by_field,
      suggested_actions: [],
      processing_time: Date.now() - startedAt,
      error_message: errMsg,
    }).eq('id', jobId)

    console.log('[OCR_DONE]', { jobId, foundCount, finalStatus })
    return new Response(JSON.stringify({
      success: true,
      docType,
      fields_found: foundCount,
      has_data: foundCount > 0,
      raw_text_preview: rawText.slice(0, 200),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[OCR_ERROR]', error)
    if (jobId) {
      await supabase.from('ocr_jobs').update({
        status: 'failed',
        error_message: String(error?.message || error),
        processing_time: Date.now() - startedAt,
      }).eq('id', jobId)
    }
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
