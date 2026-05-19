import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { jobId } = await req.json()
    
    // 1. Get Job Info
    const { data: job, error: jobError } = await supabaseClient
      .from('ocr_jobs')
      .select('*, uploaded_files(*)')
      .eq('id', jobId)
      .single()

    if (jobError || !job) throw new Error("Job not found")

    // Update status to processing
    await supabaseClient
      .from('ocr_jobs')
      .update({ status: 'processing', provider_used: 'NavalDocs AI Engine (Vision v3)' })
      .eq('id', jobId)

    console.log(`Processing OCR for file: ${job.uploaded_files.file_path}`)
    
    // Simulating AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3500))

    // 2. Identify Document Type (Simulated logic based on file name or generic)
    const fileName = job.uploaded_files.file_name.toLowerCase()
    let docType = 'GENERIC'
    let extractedData = {}
    let confidenceByField = {}
    let suggestedActions = []

    if (fileName.includes('cnh') || fileName.includes('rg')) {
      docType = 'PERSONAL_IDENTITY'
      extractedData = {
        name: "RICARDO OLIVEIRA MENEZES",
        doc_number: "123.456.789-01",
        rg: "20.123.456-7",
        birth_date: "1982-11-15",
        address: "AVENIDA ATLÂNTICA, 2500 - COPACABANA",
        city: "RIO DE JANEIRO",
        state: "RJ",
        zip: "22041-001"
      }
      confidenceByField = {
        name: 0.99, doc_number: 0.98, rg: 0.95, birth_date: 0.99, address: 0.88
      }
      suggestedActions = [
        { type: "update_customer", label: "Atualizar Dados do Cliente", description: "O endereço detectado é diferente do cadastro atual." }
      ]
    } else if (fileName.includes('tie') || fileName.includes('tiem')) {
      docType = 'VESSEL_TIE'
      extractedData = {
        vessel_name: "ESTRELA DO MAR IV",
        inscription: "381ABC2024",
        owner_name: "RICARDO OLIVEIRA MENEZES",
        vessel_type: "LANCHA",
        category: "ESPORTE E RECREIO",
        hull_material: "FIBRA DE VIDRO",
        length: "12.5m",
        engines: [
          { brand: "VOLVO PENTA", model: "300HP", serial: "VP-987654", power: "300HP" }
        ]
      }
      confidenceByField = {
        vessel_name: 0.97, inscription: 0.99, owner_name: 0.98, engine_serial: 0.92
      }
      suggestedActions = [
        { type: "link_vessel", label: "Vincular Embarcação", description: "Embarcação detectada: ESTRELA DO MAR IV" },
        { type: "update_engine", label: "Atualizar Motor", description: "Número de série do motor detectado (VP-987654) diverge do cadastro." }
      ]
    } else if (fileName.includes('gru') || fileName.includes('pagamento')) {
      docType = 'FINANCIAL_GRU'
      extractedData = {
        payment_code: "221-1",
        amount: 150.00,
        due_date: "2024-12-20",
        barcode: "846700000015 500000000000 000000000000 000000000000"
      }
      confidenceByField = {
        amount: 0.99, due_date: 0.98, barcode: 0.95
      }
    } else {
      // Default / Generic
      extractedData = {
        detected_text: "Texto genérico extraído do documento...",
        summary: "Documento oficial marítimo não identificado especificamente."
      }
    }

    // 3. Comparison Logic (Simulated)
    // In a real scenario, we would fetch the current customer/vessel data from Supabase
    // and compare it with extractedData.
    const comparisonData = {
      name: { current: "Ricardo Menezes", extracted: extractedData.name || "", diff: extractedData.name !== "Ricardo Menezes" },
      address: { current: "Rua das Flores, 10", extracted: extractedData.address || "", diff: !!extractedData.address && extractedData.address !== "Rua das Flores, 10" }
    }

    // 4. Update Job with Results
    const { error: updateError } = await supabaseClient
      .from('ocr_jobs')
      .update({
        status: 'completed',
        identified_document_type: docType,
        extracted_data: extractedData,
        confidence_score: 0.95,
        confidence_by_field: confidenceByField,
        comparison_data: comparisonData,
        suggested_actions: suggestedActions,
        processing_time: 3500
      })
      .eq('id', jobId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, message: "OCR processed successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("OCR Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})