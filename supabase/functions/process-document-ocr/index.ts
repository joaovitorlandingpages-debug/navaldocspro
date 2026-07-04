// OCR for process_document_uploads — calls Lovable AI Gateway (Gemini 2.5 Flash vision)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authContext, rateLimit, consume, jsonResponse, corsHeaders, HttpError, assertProcessNotFinalized, claimStatus } from "../_shared/auth.ts";


const PROMPT = `Você é um OCR especialista em documentos brasileiros (CNH, RG, CPF, CNPJ, Título, CR, Procuração, Contrato Social, Comprovante de endereço, TIE/TIEM de embarcações, CSN, DPEM, GRU).

Analise o documento anexado e retorne ESTRITAMENTE um JSON válido (sem markdown) com:

{
  "raw_text": "texto literal completo",
  "document_type": "CNH | RG | CPF | CNPJ | TITULO | CR | PROCURACAO | CONTRATO_SOCIAL | COMPROVANTE_RESIDENCIA | VESSEL_TIE | OWNER_DOC | OTHER",
  "confidence": 0.0 a 1.0,
  "fields": {
    "name": null, "cpf": null, "cnpj": null, "rg": null, "birth_date": null,
    "address": null, "city": null, "state": null, "zip_code": null,
    "phone": null, "email": null,
    "vessel_name": null, "registration_number": null, "vessel_type": null,
    "length": null, "beam": null, "depth": null, "gross_tonnage": null,
    "engine_power": null, "engine_model": null, "engine_serial": null,
    "issue_date": null, "expiry_date": null, "issuer": null
  }
}

Regras: use null quando ausente; nunca invente; "confidence" reflete a qualidade da leitura.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let uploadId: string | undefined;
  let supabase: ReturnType<typeof createClient>;
  try {
    const ctx = await authContext(req);
    supabase = ctx.admin;
    await rateLimit(ctx.admin, `user:${ctx.userId}`, "process-document-ocr", 20, 60);
    if (ctx.companyId) await rateLimit(ctx.admin, `company:${ctx.companyId}`, "process-document-ocr", 60, 60);

    const body = await req.json();
    uploadId = body.uploadId;
    if (!uploadId) throw new HttpError(400, { error: "uploadId required" });

    console.log("[process_document_ocr_started]", uploadId);

    const { data: upload, error: upErr } = await supabase
      .from("process_document_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();
    if (upErr || !upload) throw new HttpError(404, { error: "upload_not_found", detail: upErr?.message });

    ctx.requireCompany(upload.company_id);

    if (upload.company_id) {
      await consume(ctx.admin, upload.company_id, "ocr", 1, `pdu:${uploadId}`, { uploadId });
    }


    await supabase
      .from("process_document_uploads")
      .update({ ocr_status: "processando", updated_at: new Date().toISOString() })
      .eq("id", uploadId);

    // Download bytes from bucket
    const path = upload.file_url; // stored as relative path within bucket
    const { data: blob, error: dlErr } = await supabase.storage
      .from("process-document-uploads")
      .download(path);
    if (dlErr || !blob) throw new Error("could not download file: " + dlErr?.message);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = upload.file_type || blob.type || "image/png";

    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);

    const isPdf = mime.includes("pdf") || (upload.file_name || "").toLowerCase().endsWith(".pdf");
    const contentBlock = isPdf
      ? { type: "file", file: { filename: upload.file_name || "doc.pdf", file_data: `data:application/pdf;base64,${b64}` } }
      : { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um OCR estruturado. Responda apenas JSON válido." },
          { role: "user", content: [{ type: "text", text: PROMPT }, contentBlock] },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${t.slice(0, 300)}`);
    }
    const aiJson = await aiRes.json();
    const text: string = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { raw_text: cleaned, fields: {}, document_type: "OTHER", confidence: 0 }; }

    const fields = parsed.fields ?? {};
    const docType = parsed.document_type ?? "OTHER";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;

    await supabase
      .from("process_document_uploads")
      .update({
        ocr_status: "concluido",
        ocr_text: parsed.raw_text ?? null,
        extracted_fields: fields,
        detected_document_type: docType,
        confidence_score: confidence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uploadId);

    console.log("[process_document_ocr_completed]", uploadId, docType, confidence);

    return new Response(JSON.stringify({ ok: true, document_type: docType, fields, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e instanceof HttpError) return jsonResponse(e.body, e.status);
    console.error("[process_document_ocr_failed]", uploadId, e?.message);
    if (uploadId && supabase!) {
      await supabase
        .from("process_document_uploads")
        .update({
          ocr_status: "falhou",
          validation_errors: [{ stage: "ocr", message: e?.message ?? String(e) }],
          updated_at: new Date().toISOString(),
        })
        .eq("id", uploadId);
    }
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
