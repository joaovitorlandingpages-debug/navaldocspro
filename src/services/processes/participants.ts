import { supabase } from "@/integrations/supabase/client";

export type ParticipantRole =
  | "owner" | "buyer" | "seller" | "representative" | "attorney"
  | "engineer" | "technician" | "witness" | "applicant" | "grantor";

export interface ProcessParticipant {
  id: string;
  role: ParticipantRole;
  customer_id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  metadata: Record<string, any>;
}

export const ROLE_LABEL: Record<ParticipantRole, string> = {
  owner: "Proprietário",
  buyer: "Comprador",
  seller: "Vendedor",
  representative: "Representante",
  attorney: "Procurador",
  engineer: "Engenheiro Naval",
  technician: "Técnico",
  witness: "Testemunha",
  applicant: "Requerente",
  grantor: "Outorgante",
};

/** Lista todos os participantes de um processo, ordenados por role. */
export async function listParticipants(processId: string): Promise<ProcessParticipant[]> {
  const { data, error } = await supabase.rpc("process_get_participants" as any, {
    p_process_id: processId,
  });
  if (error) throw error;
  return (data ?? []) as ProcessParticipant[];
}

/** Retorna o(s) participante(s) de um role específico. */
export async function getParticipantsByRole(
  processId: string,
  role: ParticipantRole,
): Promise<ProcessParticipant[]> {
  const all = await listParticipants(processId);
  return all.filter((p) => p.role === role);
}

/** Adiciona um participante ao processo. */
export async function addParticipant(
  processId: string,
  customerId: string,
  role: ParticipantRole,
  metadata: Record<string, any> = {},
): Promise<void> {
  const { error } = await supabase.from("process_participants" as any).insert({
    process_id: processId,
    customer_id: customerId,
    role,
    metadata,
  } as any);
  if (error && !String(error.message).includes("duplicate")) throw error;
}

/** Remove um participante do processo. */
export async function removeParticipant(participantId: string): Promise<void> {
  const { error } = await supabase.from("process_participants" as any)
    .delete().eq("id", participantId);
  if (error) throw error;
}
