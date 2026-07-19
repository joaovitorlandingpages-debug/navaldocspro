import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Calculates time in progress based on created_at and finalized_at
 */
export function calculateTimeInProgress(createdAt: string, finalizedAt: string | null): string {
  const start = new Date(createdAt);
  const end = finalizedAt ? new Date(finalizedAt) : new Date();

  if (finalizedAt) {
    return `Finalizado em ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
  }

  const distance = formatDistanceToNow(start, { locale: ptBR, addSuffix: true });
  if (distance.includes("menos de um minuto")) return "Criado agora";
  if (distance.includes("segundos")) return "Criado agora";

  return `Aberto ${distance}`;
}

/**
 * Interface for Document Stats
 */
export interface DocumentStats {
  totalRequired: number;
  totalAttached: number;
  totalApproved: number;
  totalPending: number;
  totalBlocking: number;
  percentage: number;
}

/**
 * Fetches real document statistics for a process
 * Avoids double counting by using a unified query
 */
export async function getProcessDocumentStats(processId: string): Promise<DocumentStats> {
  // 1. Get required documents from mappings for this process type
  // First get the process type
  const { data: process } = await supabase
    .from('processes')
    .select('process_type')
    .eq('id', processId)
    .single();

  if (!process) throw new Error("Process not found");

  // Get mappings for this process type
  const { data: mappings } = await supabase
    .from('process_document_template_mappings')
    .select('*, template:template_versions(*)')
    .eq('process_type', process.process_type)
    .eq('is_active', true);

  const requiredDocTypes = (mappings as any[])?.map((m: any) => m.document_type) || [];
  const totalRequired = requiredDocTypes.length;

  // 2. Get actual uploads/generated docs
  const { data: uploads } = await supabase
    .from('process_document_uploads')
    .select('*')
    .eq('process_id', processId);

  const attachedDocTypes = new Set((uploads as any[])?.map((u: any) => u.document_type));
  const totalAttached = attachedDocTypes.size;

  const totalApproved = (uploads as any[])?.filter((u: any) => u.status === 'approved').length || 0;
  const totalPending = (uploads as any[])?.filter((u: any) => u.status === 'pending').length || 0;
  
  // A document is blocking if it's required but missing or rejected
  const totalBlocking = requiredDocTypes.filter((type: string) => !attachedDocTypes.has(type)).length;

  const percentage = totalRequired > 0 ? Math.round((totalAttached / totalRequired) * 100) : 0;


  return {
    totalRequired,
    totalAttached,
    totalApproved,
    totalPending,
    totalBlocking,
    percentage
  };
}
