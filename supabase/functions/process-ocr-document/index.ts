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
      .update({ status: 'processing', provider_used: 'OpenAI Vision (Simulated)' })
      .eq('id', jobId)

    // 2. Simulate AI/OCR processing logic
    // In a real scenario, we would use Deno.env.get('OPENAI_API_KEY') here
    // to call OpenAI or other providers.
    
    console.log(`Processing OCR for file: ${job.uploaded_files.file_path}`)
    
    // Simulating delay for AI processing
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 3. Mock Extracted Data (Structured as requested)
    const extractedData = {
      person: {
        nome: "RICARDO OLIVEIRA MENEZES",
        cpf: "123.456.789-01",
        rg: "20.123.456-7",
        cnh: "01234567890",
        data_nascimento: "1982-11-15",
        endereco: "AVENIDA ATLÂNTICA, 2500 - COPACABANA",
        cidade: "RIO DE JANEIRO",
        estado: "RJ",
        cep: "22041-001"
      },
      vessel: {
        nome: "ESTRELA DO MAR IV",
        inscricao: "381ABC2024",
        tipo: "LANCHA",
        categoria: "ESPORTE E RECREIO",
        motor: "VOLVO PENTA 300HP",
        proprietario: "RICARDO OLIVEIRA MENEZES"
      }
    }

    const confidenceByField = {
      person: { nome: 0.99, cpf: 0.98, rg: 0.95, data_nascimento: 0.99 },
      vessel: { nome: 0.97, inscricao: 0.99, motor: 0.85 }
    }

    // 4. Update Job with Results
    const { error: updateError } = await supabaseClient
      .from('ocr_jobs')
      .update({
        status: 'completed',
        extracted_data: extractedData,
        confidence_score: 0.96,
        confidence_by_field: confidenceByField,
        processing_time: 3200
      })
      .eq('id', jobId)

    if (updateError) throw updateError

    // 5. Update Usage
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: usage, error: usageError } = await supabaseClient
      .from('ocr_usage')
      .select('*')
      .eq('company_id', job.company_id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (usage) {
      await supabaseClient
        .from('ocr_usage')
        .update({
          total_jobs: usage.total_jobs + 1,
          successful_jobs: usage.successful_jobs + 1,
          estimated_cost: Number(usage.estimated_cost) + 0.05
        })
        .eq('id', usage.id)
    } else {
      await supabaseClient
        .from('ocr_usage')
        .insert({
          company_id: job.company_id,
          month,
          year,
          total_jobs: 1,
          successful_jobs: 1,
          estimated_cost: 0.05
        })
    }

    return new Response(
      JSON.stringify({ success: true, message: "OCR processed successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
