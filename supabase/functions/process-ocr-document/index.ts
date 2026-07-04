// Real OCR using Lovable AI Gateway (Gemini 2.5 Flash vision)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { authContext, rateLimit, consume, jsonResponse, corsHeaders, HttpError, assertProcessNotFinalized, claimStatus } from "../_shared/auth.ts"


const EXTRACTION_PROMPT = `Você é um OCR especialista em documentos brasileiros (CNH, RG, CPF, comprovantes, TIE/TIEM de embarcações, CSN, DPEM, GRU, recibos, laudos).

Analise a imagem/documento anexado e devolva ESTRITAMENTE um JSON válido (sem markdown, sem comentários) com a seguinte estrutura:

{
  "raw_text": "TODO o texto literal extraído do documento, linha a linha, preservando rótulos e valores",
  "document_type": "CNH | RG | CPF | COMPROVANTE_RESIDENCIA | VESSEL_TIE | SAFETY_CERTIFICATE | DPEM_INSURANCE | FINANCIAL_GRU | PURCHASE_CONTRACT | TECHNICAL_MEMORIAL | TECHNICAL_REPORT | GENERIC",
  "fields": {
    "name": "nome completo da pessoa",
    "cpf": "CPF 000.000.000-00",
    "cnpj": "CNPJ formatado",
    "rg": "RG",
    "birth_date": "AAAA-MM-DD",
    "email": "email",
    "phone": "telefone",
    "address": "endereço/logradouro",
    "city": "cidade",
    "state": "UF 2 letras",
    "zip_code": "CEP",
    "vessel_name": "nome da embarcação",
    "registration_number": "número de inscrição/registro (ex: 381P2023001)",
    "owner_name": "PROPRIETÁRIO da embarcação",
    "owner_document": "CPF/CNPJ do proprietário",
    "vessel_type": "tipo (BALSA, REBOQUE, LANCHA, etc.)",
    "hull_material": "material do casco (AÇO, MADEIRA, FIBRA, ALUMÍNIO)",
    "length": "comprimento total (ex: 19,30m)",
    "beam": "boca (largura)",
    "depth": "pontal",
    "capacity": "capacidade de passageiros/carga",
    "construction_year": "ano (AAAA)",
    "navigation_area": "área de navegação",
    "activity_service": "atividade ou serviço",
    "builder": "construtor/estaleiro",
    "expiry_date": "AAAA-MM-DD",
    "issue_date": "AAAA-MM-DD",
    "engine_brand": "marca do motor",
    "engine_model": "modelo do motor",
    "engine_serial": "número de série do motor",
    "engine_power": "potência do motor"
  }
}

REGRAS CRÍTICAS:
- Use null para campos não encontrados. NÃO invente dados.
- Para TIE/TIEM, procure ATIVAMENTE rótulos: PROPRIETÁRIO, CPF/CNPJ, NOME DA EMBARCAÇÃO, INSCRIÇÃO, TIPO, MAT. CONSTRUÇÃO CASCO, COMPRIMENTO TOTAL, BOCA, PONTAL, CAPACIDADE, ANO DE CONSTRUÇÃO, ÁREA DE NAVEGAÇÃO, ATIVIDADE/SERVIÇO, POTÊNCIA, MOTOR, CONSTRUTOR.
- "raw_text" deve conter SEMPRE o texto bruto completo.
- Se nada legível, retorne raw_text: "" e fields com todos null.`

// Regex fallback parser for TIE/TIEM — fills gaps the model missed.
function parseTieFields(rawText: string, current: Record<string, any>): Record<string, any> {
  if (!rawText) return current
  const out: Record<string, any> = { ...current }
  const txt = rawText.replace(/\r/g, '')
  const grab = (re: RegExp): string | null => {
    const m = txt.match(re)
    return m ? m[1].trim().replace(/\s+/g, ' ') : null
  }
  const setIf = (k: string, v: string | null) => {
    if (v && (out[k] === null || out[k] === undefined || out[k] === '')) out[k] = v
  }
  setIf('owner_name', grab(/PROPRIET[ÁA]RIO[:\s]+([^\n]+?)(?:\n|CPF|CNPJ|$)/i))
  setIf('owner_document', grab(/(?:CPF|CNPJ)[:\s/]*([\d.\-/]{11,20})/i))
  setIf('vessel_name', grab(/(?:NOME\s+DA\s+EMBARCA[ÇC][ÃA]O|EMBARCA[ÇC][ÃA]O)[:\s]+([^\n]+)/i))
  setIf('registration_number', grab(/(?:INSCRI[ÇC][ÃA]O|N[ºO\.]\s*INSCRI[ÇC][ÃA]O)[:\s]+([A-Z0-9\-]+)/i))
  setIf('vessel_type', grab(/TIPO(?:\s+DA\s+EMBARCA[ÇC][ÃA]O)?[:\s]+([A-ZÁ-Úa-zá-ú ]+?)(?:\n|$)/i))
  setIf('hull_material', grab(/(?:MAT(?:ERIAL)?\.?\s*(?:CONSTRU[ÇC][ÃA]O\s+)?CASCO|MATERIAL\s+DO\s+CASCO)[:\s]+([A-ZÁ-Úa-zá-ú ]+?)(?:\n|$)/i))
  setIf('length', grab(/COMPRIMENTO(?:\s+TOTAL)?[:\s]+([\d.,]+\s*m?)/i))
  setIf('beam', grab(/BOCA[:\s]+([\d.,]+\s*m?)/i))
  setIf('depth', grab(/PONTAL[:\s]+([\d.,]+\s*m?)/i))
  setIf('capacity', grab(/CAPACIDADE[^\n:]*[:\s]+([\d.,]+)/i))
  setIf('construction_year', grab(/ANO(?:\s+DE)?\s+CONSTRU[ÇC][ÃA]O[:\s]+(\d{4})/i))
  setIf('navigation_area', grab(/[ÁA]REA\s+DE\s+NAVEGA[ÇC][ÃA]O[:\s]+([^\n]+)/i))
  setIf('activity_service', grab(/ATIVIDADE(?:\s*\/\s*SERVI[ÇC]O)?[:\s]+([^\n]+)/i))
  setIf('builder', grab(/CONSTRUTOR[:\s]+([^\n]+)/i))
  setIf('engine_power', grab(/POT[ÊE]NCIA[:\s]+([\d.,]+\s*(?:HP|KW|CV)?)/i))
  setIf('engine_serial', grab(/(?:S[ÉE]RIE|N[ºO\.]\s*S[ÉE]RIE)\s*(?:DO\s+)?MOTOR[:\s]+([A-Z0-9\-]+)/i))
  setIf('city', grab(/(?:CIDADE|MUNIC[ÍI]PIO)[:\s]+([^\n\/,]+)/i))
  setIf('state', grab(/\b(?:UF|ESTADO)[:\s]+([A-Z]{2})\b/i))
  return out
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let jobId: string | undefined
  const startedAt = Date.now()
  let supabase: ReturnType<typeof createClient>

  try {
    // 1) Auth + rate limit
    const ctx = await authContext(req)
    supabase = ctx.admin
    await rateLimit(ctx.admin, `user:${ctx.userId}`, 'process-ocr-document', 20, 60)
    if (ctx.companyId) await rateLimit(ctx.admin, `company:${ctx.companyId}`, 'process-ocr-document', 60, 60)

    const body = await req.json()
    jobId = body.jobId
    if (!jobId) throw new HttpError(400, { error: 'jobId required' })

    console.log('[OCR_UPLOAD_STARTED]', jobId)

    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*, uploaded_files(*)')
      .eq('id', jobId)
      .single()
    if (jobError || !job) throw new HttpError(404, { error: 'job_not_found', detail: jobError?.message })

    // 2) Cross-check tenant — never trust payload
    ctx.requireCompany(job.company_id)

    // Idempotency: if job already completed, return without re-running.
    if (job.status === 'completed') {
      return jsonResponse({ ok: true, idempotent: true, jobId, result: job.extracted_data ?? null })
    }

    // Guard against processing for finalized processes.
    await assertProcessNotFinalized(ctx.admin, job.process_id, ctx.isAdminMaster)

    // Atomic claim to prevent double-execution.
    const claim = await claimStatus(
      ctx.admin,
      'ocr_jobs',
      jobId,
      'status',
      ['queued', 'pending', 'failed', 'error', null as unknown as string],
      'processing',
    )
    if (!claim.claimed) {
      if (claim.currentStatus === 'processing') {
        throw new HttpError(409, { error: 'ocr_in_progress', jobId })
      }
      if (claim.currentStatus === 'completed') {
        return jsonResponse({ ok: true, idempotent: true, jobId })
      }
    }

    // 3) Enforce OCR limit (idempotent per jobId — same key never double-charges)
    if (job.company_id) {
      await consume(ctx.admin, job.company_id, 'ocr', 1, `ocr:${jobId}`, { jobId })
    }

    await supabase.from('ocr_jobs').update({
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
    let fields: Record<string, any> = parsed.fields || {}
    const docType: string = parsed.document_type || job.document_type || 'GENERIC'

    // TIE/TIEM specialized parser — fill gaps the LLM missed using regex over raw_text
    const isTie = /VESSEL_TIE|TIE|TIEM/i.test(docType) ||
                  /TÍTULO\s+DE\s+INSCRI[ÇC][ÃA]O/i.test(rawText) ||
                  /CAPITANIA\s+DOS\s+PORTOS/i.test(rawText)
    if (isTie) {
      const before = { ...fields }
      fields = parseTieFields(rawText, fields)
      for (const k of Object.keys(fields)) {
        if (fields[k] && !before[k]) console.log('[TIE_FIELD_DETECTED]', k, fields[k])
      }
      const tieKeys = ['owner_name','owner_document','vessel_name','registration_number','vessel_type','hull_material','length','beam','depth','capacity','construction_year','navigation_area','activity_service','builder','engine_power','engine_serial']
      for (const k of tieKeys) if (!fields[k]) console.log('[TIE_FIELD_NOT_FOUND]', k)
      console.log('[VESSEL_OCR_MAPPING_COMPLETED]', { filled: tieKeys.filter(k => fields[k]).length, total: tieKeys.length })
    }

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
      _is_tie: isTie,
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
  } catch (error: any) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status)
    console.error('[OCR_ERROR]', error)
    if (jobId && supabase!) {
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
