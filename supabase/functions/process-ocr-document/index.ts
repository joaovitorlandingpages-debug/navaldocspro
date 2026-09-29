// Real OCR using Lovable AI Gateway (Gemini 2.5 Flash vision) with Brazilian Maritime & Identity Specialization
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { authContext, rateLimit, consume, jsonResponse, corsHeaders, HttpError, assertProcessNotFinalized, claimStatus } from "../_shared/auth.ts"

const EXTRACTION_PROMPT = `Você é um motor de OCR de alta precisão especialista em documentação brasileira e marítima para o NavalDocs Pro.
Tipos principais atendidos:
1. Identificação de Pessoas: CNH, RG, CPF, Cartão CNPJ.
2. Comprovantes: Comprovante de Residência (luz, água, gás, telefone, internet).
3. Documentação Náutica: TIE (Título de Inscrição de Embarcação), TIEM (Embarcação Miúda), Protocolo Provisório / BSADE, Termo de Entrega / Recibo de Compra e Venda de Embarcação, Nota Fiscal de Embarcação ou Motor.

Orientações Críticas:
- O documento pode estar girado em 90°, 180° ou 270°. Analise a orientação correta do texto.
- Se um campo não estiver legível, não existir ou não for identificado com certeza, retorne null.
- É TERMINANTEMENTE PROIBIDO inventar CPF, RG, número de registro, datas, nomes, endereços ou metragens náuticas.
- "raw_text" deve conter o texto bruto extraído com fidelidade.

Retorne ESTRITAMENTE um JSON válido com a seguinte estrutura:
{
  "document_type": "CNH | RG | CPF | CARTAO_CNPJ | COMPROVANTE_RESIDENCIA | VESSEL_TIE | VESSEL_TIEM | VESSEL_PROVISORIO | VESSEL_SALE_DECLARATION | VESSEL_INVOICE | GENERIC",
  "raw_text": "texto literal completo extraído do documento",
  "fields": {
    "name": "nome completo ou razão social",
    "cpf": "000.000.000-00",
    "cnpj": "00.000.000/0000-00",
    "rg": "número do RG",
    "birth_date": "AAAA-MM-DD",
    "email": "email de contato",
    "phone": "telefone de contato",
    "address": "logradouro completo",
    "city": "cidade",
    "state": "UF 2 letras maiúsculas",
    "zip_code": "CEP 00000-000",
    "vessel_name": "nome da embarcação",
    "registration_number": "número de inscrição na Capitania",
    "owner_name": "nome do proprietário indicado",
    "owner_document": "CPF/CNPJ do proprietário",
    "vessel_type": "tipo (Lancha, Veleiro, Bote, Jet Ski, etc.)",
    "hull_material": "material do casco",
    "length": "comprimento total em metros",
    "beam": "boca em metros",
    "depth": "pontal em metros",
    "capacity": "lotação de pessoas",
    "construction_year": "ano de construção (AAAA)",
    "navigation_area": "área de navegação",
    "activity_service": "atividade ou serviço",
    "builder": "construtor / estaleiro",
    "engine_brand": "marca do motor",
    "engine_model": "modelo do motor",
    "engine_serial": "número de série do motor",
    "engine_power": "potência do motor (HP/KW)",
    "gross_tonnage": "arqueação bruta (AB)",
    "issue_date": "AAAA-MM-DD",
    "expiry_date": "AAAA-MM-DD"
  },
  "field_confidence": {
    "name": 0.95,
    "cpf": 0.90
  }
}`

// Validação matemática de CPF
function isValidCpf(val: string): boolean {
  const clean = val.replace(/\D/g, "")
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i)
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean[9], 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i)
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  return rev === parseInt(clean[10], 10)
}

// Regex fallback parser para preencher lacunas em documentos náuticos e de pessoas
function parseRegexFallbacks(rawText: string, current: Record<string, any>): Record<string, any> {
  if (!rawText) return current
  const out: Record<string, any> = { ...current }
  const txt = rawText.replace(/\r/g, "")
  
  const grab = (re: RegExp): string | null => {
    const m = txt.match(re)
    return m ? m[1].trim().replace(/\s+/g, " ") : null
  }
  const setIfEmpty = (k: string, v: string | null) => {
    if (v && (out[k] === null || out[k] === undefined || out[k] === "")) out[k] = v
  }

  // Identificação Pessoal (CNH, RG, CPF)
  setIfEmpty("cpf", grab(/(?:CPF|C\.P\.F\.)[:\s/]*([\d.\-]{11,14})/i))
  setIfEmpty("cnpj", grab(/(?:CNPJ|C\.N\.P\.J\.)[:\s/]*([\d.\-\/]{14,18})/i))
  setIfEmpty("rg", grab(/(?:RG|R\.G\.|IDENTIDADE)[:\s/]*([A-Z0-9.\-]{5,15})/i))
  setIfEmpty("name", grab(/(?:NOME|NOME\s+COMPLETO|RAZ[ÃA]O\s+SOCIAL)[:\s]+([A-ZÁ-Úa-zá-ú\s]{5,60})(?:\n|CPF|$)/i))
  setIfEmpty("birth_date", grab(/(?:DATA\s+DE\s+NASC(?:IMENTO)?|NASCIMENTO)[:\s]*([\d]{2}[\/\-][\d]{2}[\/\-][\d]{4})/i))
  
  // Endereço e Contato
  setIfEmpty("zip_code", grab(/(?:CEP)[:\s]*([\d]{5}[\-]?[\d]{3})/i))
  setIfEmpty("phone", grab(/(?:TEL(?:EFONE)?|CEL(?:ULAR)?|WHATSAPP)[:\s]*(\(?[\d]{2}\)?\s*[\d]{4,5}[\-\s]?[\d]{4})/i))
  setIfEmpty("email", grab(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i))

  // Embarcação (TIE/TIEM/BSADE)
  setIfEmpty("owner_name", grab(/PROPRIET[ÁA]RIO[:\s]+([^\n]+?)(?:\n|CPF|CNPJ|$)/i))
  setIfEmpty("owner_document", grab(/(?:CPF|CNPJ)(?:\s+DO\s+PROP)?[:\s/]*([\d.\-/]{11,20})/i))
  setIfEmpty("vessel_name", grab(/(?:NOME\s+DA\s+EMBARCA[ÇC][ÃA]O|EMBARCA[ÇC][ÃA]O)[:\s]+([^\n]+)/i))
  setIfEmpty("registration_number", grab(/(?:INSCRI[ÇC][ÃA]O|N[ºO\.]\s*INSCRI[ÇC][ÃA]O|REGISTRO)[:\s]+([A-Z0-9\-]+)/i))
  setIfEmpty("vessel_type", grab(/TIPO(?:\s+DA\s+EMBARCA[ÇC][ÃA]O)?[:\s]+([A-ZÁ-Úa-zá-ú ]+?)(?:\n|$)/i))
  setIfEmpty("hull_material", grab(/(?:MAT(?:ERIAL)?\.?\s*(?:CONSTRU[ÇC][ÃA]O\s+)?CASCO|MATERIAL\s+DO\s+CASCO)[:\s]+([A-ZÁ-Úa-zá-ú ]+?)(?:\n|$)/i))
  setIfEmpty("length", grab(/COMPRIMENTO(?:\s+TOTAL)?[:\s]+([\d.,]+\s*m?)/i))
  setIfEmpty("beam", grab(/BOCA[:\s]+([\d.,]+\s*m?)/i))
  setIfEmpty("depth", grab(/PONTAL[:\s]+([\d.,]+\s*m?)/i))
  setIfEmpty("capacity", grab(/CAPACIDADE[^\n:]*[:\s]+([\d.,]+)/i))
  setIfEmpty("construction_year", grab(/ANO(?:\s+DE)?\s+CONSTRU[ÇC][ÃA]O[:\s]+(\d{4})/i))
  setIfEmpty("navigation_area", grab(/[ÁA]REA\s+DE\s+NAVEGA[ÇC][ÃA]O[:\s]+([^\n]+)/i))
  setIfEmpty("activity_service", grab(/ATIVIDADE(?:\s*\/\s*SERVI[ÇC]O)?[:\s]+([^\n]+)/i))
  setIfEmpty("builder", grab(/CONSTRUTOR[:\s]+([^\n]+)/i))
  setIfEmpty("engine_brand", grab(/(?:MOTOR|MARCA\s+DO\s+MOTOR)[:\s]+([A-ZÁ-Úa-zá-ú0-9\- ]+?)(?:\n|POT[ÊE]NCIA|$)/i))
  setIfEmpty("engine_power", grab(/POT[ÊE]NCIA[:\s]+([\d.,]+\s*(?:HP|KW|CV)?)/i))
  setIfEmpty("engine_serial", grab(/(?:S[ÉE]RIE|N[ºO\.]\s*S[ÉE]RIE)\s*(?:DO\s+)?MOTOR[:\s]+([A-Z0-9\-]+)/i))
  setIfEmpty("city", grab(/(?:CIDADE|MUNIC[ÍI]PIO)[:\s]+([^\n\/,]+)/i))
  setIfEmpty("state", grab(/\b(?:UF|ESTADO)[:\s]+([A-Z]{2})\b/i))

  return out
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  let jobId: string | undefined
  const startedAt = Date.now()
  let supabase: ReturnType<typeof createClient>

  try {
    const ctx = await authContext(req)
    supabase = ctx.admin
    await rateLimit(ctx.admin, `user:${ctx.userId}`, "process-ocr-document", 20, 60)
    if (ctx.companyId) await rateLimit(ctx.admin, `company:${ctx.companyId}`, "process-ocr-document", 60, 60)

    const body = await req.json()
    jobId = body.jobId
    if (!jobId) throw new HttpError(400, { error: "jobId required" })

    console.log("[OCR_UPLOAD_STARTED]", jobId)

    const { data: job, error: jobError } = await supabase
      .from("ocr_jobs")
      .select("*, uploaded_files(*)")
      .eq("id", jobId)
      .single()

    if (jobError || !job) throw new HttpError(404, { error: "job_not_found", detail: jobError?.message })

    ctx.requireCompany(job.company_id)

    // Idempotência estrita: se já concluído, não reexecuta nem gasta nova cota
    if (job.status === "completed" && job.extracted_data) {
      return jsonResponse({ 
        ok: true, 
        idempotent: true, 
        jobId, 
        result: job.extracted_data 
      })
    }

    await assertProcessNotFinalized(ctx.admin, job.process_id, ctx.isAdminMaster)

    const claim = await claimStatus(
      ctx.admin,
      "ocr_jobs",
      jobId,
      "status",
      ["queued", "pending", "failed", "error", null as unknown as string],
      "processing"
    )

    if (!claim.claimed) {
      if (claim.currentStatus === "processing") {
        throw new HttpError(409, { error: "ocr_in_progress", jobId })
      }
      if (claim.currentStatus === "completed") {
        return jsonResponse({ ok: true, idempotent: true, jobId, result: job.extracted_data })
      }
    }

    // Contabilização de franquia no backend (idempotente pela chave `ocr:${jobId}`)
    if (job.company_id) {
      await consume(ctx.admin, job.company_id, "ocr", 1, `ocr:${jobId}`, { jobId })
    }

    await supabase.from("ocr_jobs").update({
      provider_used: "Lovable AI / google/gemini-2.5-flash",
      updated_at: new Date().toISOString(),
    }).eq("id", jobId)

    const file = job.uploaded_files
    if (!file) throw new Error("Registro de arquivo correspondente não encontrado")

    const fileUrl: string = file.file_url || ""
    let bytes: Uint8Array | null = null
    let mime = file.file_type || "image/png"

    const tryDownload = async (bucket: string, path: string) => {
      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error || !data) return null
      return new Uint8Array(await data.arrayBuffer())
    }

    if (fileUrl.startsWith("http")) {
      const m = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/)
      if (m) bytes = await tryDownload(m[1], decodeURIComponent(m[2]))
      if (!bytes) {
        const r = await fetch(fileUrl)
        if (r.ok) {
          bytes = new Uint8Array(await r.arrayBuffer())
          mime = r.headers.get("content-type") || mime
        }
      }
    } else {
      bytes = await tryDownload("customer-documents", fileUrl)
      if (!bytes) bytes = await tryDownload("vessel-documents", fileUrl)
      if (!bytes) bytes = await tryDownload("ocr-documents", fileUrl)
    }

    if (!bytes) throw new Error("Falha ao recuperar os bytes do arquivo para processamento: " + fileUrl)
    console.log("[OCR_UPLOAD_SUCCESS]", { bytes: bytes.length, mime })

    // Conversão segura em Base64
    let binary = ""
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const b64 = btoa(binary)

    const isPdf = mime.includes("pdf") || fileUrl.toLowerCase().endsWith(".pdf")
    const contentBlock = isPdf
      ? { type: "file", file: { filename: file.file_name || "document.pdf", file_data: `data:application/pdf;base64,${b64}` } }
      : { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")
    let rawContent = ""
    let parsedJson: any = {}

    if (LOVABLE_API_KEY) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: EXTRACTION_PROMPT },
              { role: "user", content: [
                { type: "text", text: "Extraia e identifique os campos oficiais deste documento sem inventar dados." },
                contentBlock,
              ]},
            ],
          }),
        })

        if (aiRes.ok) {
          const aiJson = await aiRes.json()
          rawContent = aiJson.choices?.[0]?.message?.content ?? ""
          const clean = rawContent.replace(/```json\s*|\s*```/g, "").trim()
          const start = clean.indexOf("{")
          const end = clean.lastIndexOf("}")
          if (start >= 0 && end > start) {
            parsedJson = JSON.parse(clean.slice(start, end + 1))
          }
        } else {
          console.warn("[AI Gateway Warning]", aiRes.status, await aiRes.text())
        }
      } catch (aiErr) {
        console.warn("[AI Gateway Fallback]", aiErr)
      }
    }

    const rawText: string = parsedJson.raw_text || rawContent || ""
    let fields: Record<string, any> = parsedJson.fields || {}
    let docType: string = parsedJson.document_type || "GENERIC"

    // Reforço determinístico com analisadores de expressão regular
    fields = parseRegexFallbacks(rawText, fields)

    // Ajuste de documento náutico caso detecte termos da Marinha
    if (docType === "GENERIC") {
      if (/INSCRI[ÇC][ÃA]O|TIE|TIEM|EMBARCA/i.test(rawText)) docType = "VESSEL_TIE"
      else if (/HABILITA[ÇC][ÃA]O|CNH/i.test(rawText)) docType = "CNH"
      else if (/IDENTIDADE|REGISTRO\s+GERAL/i.test(rawText)) docType = "RG"
    }

    // Cálculo e validação por campo
    const confidence_by_field: Record<string, number> = {}
    const entries = Object.entries(fields).filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== "")

    for (const [k, v] of entries) {
      const valStr = String(v).trim()
      let conf = 0.92

      if (k === "cpf" && !isValidCpf(valStr)) conf = 0.5
      if (k === "owner_document" && valStr.replace(/\D/g, "").length === 11 && !isValidCpf(valStr)) conf = 0.5

      confidence_by_field[k] = conf
    }

    const foundCount = entries.length
    const avgConf = foundCount > 0 ? 0.9 : 0
    const finalStatus = foundCount > 0 || rawText ? "completed" : "failed"

    const extracted_data = {
      ...fields,
      _raw_text: rawText,
      _fields_found: foundCount,
      _has_data: foundCount > 0,
      _document_type: docType,
    }

    await supabase.from("ocr_jobs").update({
      status: finalStatus,
      identified_document_type: docType,
      extracted_data,
      confidence_score: avgConf,
      confidence_by_field,
      processing_time: Date.now() - startedAt,
      error_message: foundCount === 0 && !rawText ? "Falha na leitura OCR." : null,
    }).eq("id", jobId)

    console.log("[OCR_DONE]", { jobId, docType, foundCount, finalStatus })

    return new Response(JSON.stringify({
      success: true,
      jobId,
      docType,
      fields_found: foundCount,
      fields,
      confidence_by_field,
      raw_text: rawText,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    if (error instanceof HttpError) return jsonResponse(error.body, error.status)
    console.error("[OCR_ERROR]", error)
    if (jobId && supabase!) {
      await supabase.from("ocr_jobs").update({
        status: "failed",
        error_message: String(error?.message || error),
        processing_time: Date.now() - startedAt,
      }).eq("id", jobId)
    }
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
