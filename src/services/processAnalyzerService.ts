import { trackOperation } from '@/lib/observability/operations';
import { supabase } from "@/integrations/supabase/client";

export interface ProcessAnalysis {
  id: string;
  company_id: string;
  process_id: string;
  wizard_session_id: string | null;
  score: number;
  approval_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  summary: string | null;
  recommendations: any[];
  detected_issues: any[];
  consistency_check: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Smart Process Analyzer Service
 * Orchestrates real analysis of process data.
 */
export async function runProcessAnalysis(args: {
  processId: string;
  companyId: string;
  wizardSessionId?: string;
}) {
  return trackOperation('process_analyzer', 'runProcessAnalysis', () => runProcessAnalysisInternal(args), {
    processId: args.processId,
    companyId: args.companyId,
  });
}

async function runProcessAnalysisInternal(args: {
  processId: string;
  companyId: string;
  wizardSessionId?: string;
}) {
  console.log("Starting Smart Process Analysis for process:", args.processId);

  // 1. Fetch complete process context
  const { data: process, error: pErr } = await supabase
    .from("processes")
    .select(`
      *,
      customers:customers(*),
      vessels:vessels(*),
      process_document_uploads(*)
    `)
    .eq("id", args.processId)
    .single();

  if (pErr) throw pErr;

  // 2. Perform Real Analysis Logic (Engine Digital)
  const analysis = performTechnicalAnalysis(process);

  // 3. Persist Analysis
  const { data, error } = await supabase
    .from("process_analyses")
    .upsert({
      process_id: args.processId,
      company_id: args.companyId,
      wizard_session_id: args.wizardSessionId || null,
      ...analysis
    }, { onConflict: 'process_id' })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as ProcessAnalysis;
}

function performTechnicalAnalysis(process: any) {
  const issues: any[] = [];
  const recommendations: any[] = [];
  const consistency: Record<string, any> = {};
  
  let score = 100;

  // Consistency Check: Customer vs Vessel Owner
  if (process.customers && process.vessels) {
    const customerName = process.customers.name?.toUpperCase();
    const vesselOwner = process.vessels.owner_name?.toUpperCase();
    
    if (vesselOwner && customerName !== vesselOwner) {
      issues.push({
        type: 'consistency',
        level: 'medium',
        message: 'Proprietário da embarcação diverge do cliente do processo.',
        impact: 'Pode exigir transferência de propriedade.',
        suggestion: 'Solicitar documento de transferência ou atualizar cadastro.'
      });
      score -= 10;
      recommendations.push('Transferência de Propriedade');
    }
  }

  // Check Document Validity (Example)
  if (process.process_document_uploads) {
    process.process_document_uploads.forEach((doc: any) => {
      if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
        issues.push({
          type: 'validity',
          level: 'high',
          message: `Documento vencido: ${doc.file_name}`,
          impact: 'Bloqueio na Marinha.',
          suggestion: 'Solicitar novo documento atualizado.'
        });
        score -= 15;
      }
    });
  }

  // Calculate Probability (Simple heuristic for now)
  const approval_probability = Math.max(0, score - (issues.length * 5));
  
  let risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score < 50) risk_level = 'critical';
  else if (score < 70) risk_level = 'high';
  else if (score < 90) risk_level = 'medium';

  return {
    score,
    approval_probability,
    risk_level,
    summary: `Análise técnica concluída. Encontrados ${issues.length} pontos de atenção.`,
    detected_issues: issues,
    recommendations: recommendations.length > 0 ? recommendations : ['Seguir com o processo padrão'],
    consistency_check: consistency,
  };
}

export async function getProcessAnalysis(processId: string) {
  const { data, error } = await supabase
    .from("process_analyses")
    .select("*")
    .eq("process_id", processId)
    .maybeSingle();
  
  if (error) throw error;
  return data as unknown as ProcessAnalysis | null;
}
