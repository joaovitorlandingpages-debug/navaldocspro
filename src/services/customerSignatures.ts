import { supabase } from "@/integrations/supabase/client";

export interface CustomerSignature {
  id: string;
  company_id: string;
  customer_id: string;
  signature_image_url: string;
  signature_type: string;
  signature_hash: string | null;
  source_participant_id: string | null;
  authorized_at: string;
  revoked_at: string | null;
}

export const customerSignaturesService = {
  async listForCustomer(companyId: string, customerId: string) {
    const { data, error } = await supabase
      .from("customer_signatures")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .is("revoked_at", null)
      .order("authorized_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CustomerSignature[];
  },

  async authorizeFromParticipant(companyId: string, customerId: string, participant: any) {
    const { error } = await supabase.from("customer_signatures").insert({
      company_id: companyId,
      customer_id: customerId,
      signature_image_url: participant.signature_image_url,
      signature_type: participant.signature_type ?? "drawn",
      signature_hash: participant.signature_hash,
      source_participant_id: participant.id,
      user_agent: participant.user_agent,
      device_info: participant.device_info,
      ip_address: participant.ip_address,
    });
    if (error) throw error;
    await supabase.from("signature_participants")
      .update({ reuse_authorized: true }).eq("id", participant.id);
  },

  async revoke(id: string) {
    await supabase.from("customer_signatures")
      .update({ revoked_at: new Date().toISOString() }).eq("id", id);
  },

  async listRequestsForCustomer(companyId: string, customerId: string) {
    // Requests where customer is participant or request.customer_id matches
    const { data: byReq } = await supabase
      .from("signature_requests")
      .select("*, signature_participants(*)")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    const { data: byPart } = await supabase
      .from("signature_participants")
      .select("signature_request_id")
      .eq("company_id", companyId)
      .eq("customer_id", customerId);
    const ids = new Set<string>((byReq ?? []).map((r: any) => r.id));
    const extraIds = (byPart ?? []).map((p: any) => p.signature_request_id).filter((id: string) => !ids.has(id));
    let extra: any[] = [];
    if (extraIds.length) {
      const { data } = await supabase
        .from("signature_requests")
        .select("*, signature_participants(*)")
        .in("id", extraIds);
      extra = data ?? [];
    }
    return [...(byReq ?? []), ...extra].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  },
};
