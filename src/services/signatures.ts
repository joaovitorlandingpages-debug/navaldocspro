import { supabase } from "@/integrations/supabase/client";

export type SignatureRequestStatus =
  | "draft" | "sent" | "viewed" | "in_progress" | "completed" | "cancelled" | "expired";

export type ParticipantRole =
  | "cliente" | "engenheiro" | "despachante" | "responsavel_tecnico" | "testemunha" | "outro";

export interface SignatureParticipantInput {
  name: string;
  email?: string;
  phone?: string;
  role: ParticipantRole;
  signing_order?: number;
}

function randomToken(len = 40) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(36).padStart(2, "0")).join("").slice(0, len);
}

async function sha256Hex(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const signaturesService = {
  async list(companyId: string) {
    const { data, error } = await supabase
      .from("signature_requests")
      .select("*, signature_participants(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: {
    company_id: string;
    title: string;
    process_id?: string;
    document_id?: string;
    customer_id?: string;
    signing_order: "free" | "sequential";
    expires_at?: string;
    participants: (SignatureParticipantInput & { customer_id?: string })[];
    created_by?: string;
  }) {
    const { data: req, error } = await supabase
      .from("signature_requests")
      .insert({
        company_id: payload.company_id,
        title: payload.title,
        process_id: payload.process_id,
        document_id: payload.document_id,
        customer_id: payload.customer_id,
        signing_order: payload.signing_order,
        expires_at: payload.expires_at,
        created_by: payload.created_by,
        status: "sent",
      })
      .select()
      .single();
    if (error) throw error;

    const rows = await Promise.all(payload.participants.map(async (p, idx) => ({
      signature_request_id: req.id,
      company_id: payload.company_id,
      customer_id: p.customer_id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      signing_order: p.signing_order ?? idx,
      status: "pending",
      access_token: await sha256Hex(randomToken() + req.id + idx),
      token_expires_at: payload.expires_at,
    })));

    const { data: parts, error: pErr } = await supabase
      .from("signature_participants")
      .insert(rows)
      .select();
    if (pErr) throw pErr;

    await supabase.from("signature_events").insert({
      signature_request_id: req.id,
      company_id: payload.company_id,
      event_type: "request_created",
      event_message: `Solicitação "${payload.title}" criada com ${parts.length} participante(s).`,
    });

    return { request: req, participants: parts };
  },

  async cancel(requestId: string, companyId: string) {
    const { error } = await supabase
      .from("signature_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);
    if (error) throw error;
    await supabase.from("signature_events").insert({
      signature_request_id: requestId,
      company_id: companyId,
      event_type: "request_cancelled",
      event_message: "Solicitação cancelada",
    });
  },

  async getByToken(token: string) {
    const { data: participant, error } = await supabase
      .from("signature_participants")
      .select("*")
      .eq("access_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!participant) return null;
    const { data: request } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("id", participant.signature_request_id)
      .maybeSingle();
    return { participant, request };
  },

  async signByToken(token: string, payload: {
    signature_type: "drawn" | "typed" | "upload";
    signature_data: string;
    accepted_terms: boolean;
  }) {
    const found = await this.getByToken(token);
    if (!found) throw new Error("Token inválido");
    const { participant, request } = found;
    if (!request) throw new Error("Solicitação não encontrada");
    if (participant.status === "signed") throw new Error("Já assinado");
    if (request.status === "cancelled" || request.status === "expired") {
      throw new Error("Solicitação não está mais ativa");
    }

    // Sequential ordering enforcement
    if (request.signing_order === "sequential") {
      const { data: prev } = await supabase
        .from("signature_participants")
        .select("id,name,status,signing_order")
        .eq("signature_request_id", request.id)
        .lt("signing_order", participant.signing_order ?? 0)
        .order("signing_order", { ascending: true });
      const blocker = (prev ?? []).find((p: any) => p.status !== "signed");
      if (blocker) {
        throw new Error(`Aguardando assinatura anterior: ${blocker.name}`);
      }
    }

    const hash = await sha256Hex(payload.signature_data + participant.id + Date.now());
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const { error: uErr } = await supabase
      .from("signature_participants")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signature_image_url: payload.signature_data,
        signature_type: payload.signature_type,
        signature_hash: hash,
        user_agent: ua,
        device_info: { platform: typeof navigator !== "undefined" ? navigator.platform : "", language: typeof navigator !== "undefined" ? navigator.language : "" },
      })
      .eq("access_token", token);
    if (uErr) throw uErr;

    await supabase.from("signature_events").insert({
      signature_request_id: request.id,
      company_id: participant.company_id,
      participant_id: participant.id,
      event_type: "participant_signed",
      event_message: `${participant.name} assinou o documento`,
      user_agent: ua,
      metadata: { signature_type: payload.signature_type, hash },
    });

    // Check completion
    const { data: allParts } = await supabase
      .from("signature_participants")
      .select("*")
      .eq("signature_request_id", request.id);
    const allSigned = (allParts ?? []).every((p: any) => p.status === "signed");
    if (allSigned) {
      await supabase.from("signature_requests").update({ status: "completed" }).eq("id", request.id);
      const code = (await sha256Hex(request.id + Date.now())).slice(0, 12).toUpperCase();

      const { data: evs } = await supabase
        .from("signature_events")
        .select("event_type,event_message,created_at,participant_id")
        .eq("signature_request_id", request.id)
        .order("created_at", { ascending: true });

      await supabase.from("signature_evidence_certificates").insert({
        signature_request_id: request.id,
        company_id: participant.company_id,
        verification_code: code,
        document_hash: hash,
        participants_snapshot: allParts,
        events_snapshot: evs,
      });
      await supabase.from("signature_events").insert({
        signature_request_id: request.id,
        company_id: participant.company_id,
        event_type: "request_completed",
        event_message: "Todos os participantes assinaram",
      });

      try {
        await supabase.from("signature_events").insert({
          signature_request_id: request.id,
          company_id: participant.company_id,
          event_type: "signed_pdf_generation_started",
          event_message: "Iniciando geração do PDF assinado",
        });

        // Enrich with template, process, company info
        let templateId: string | null = null;
        let processInfo: any = null;
        if (request.document_id) {
          const { data: doc } = await supabase
            .from("generated_documents")
            .select("template_id, metadata")
            .eq("id", request.document_id).maybeSingle();
          templateId = (doc as any)?.template_id ?? (doc as any)?.metadata?.template_id ?? null;
        }
        if (request.process_id) {
          const { data: proc } = await supabase
            .from("processes")
            .select("id, process_type, customer:customers(name), vessel:vessels(name)")
            .eq("id", request.process_id).maybeSingle();
          if (proc) {
            processInfo = {
              id: (proc as any).id,
              process_type: (proc as any).process_type,
              customer_name: (proc as any).customer?.name,
              vessel_name: (proc as any).vessel?.name,
            };
          }
        }
        const { data: company } = await supabase
          .from("companies").select("name, logo_url").eq("id", participant.company_id).maybeSingle();

        const mod = await import("./signedDocumentBuilder");
        const built = await mod.buildSignedDocumentArtifacts({
          companyId: participant.company_id,
          requestId: request.id,
          title: request.title,
          verificationCode: code,
          templateId,
          participants: allParts ?? [],
          events: evs ?? [],
          process: processInfo,
          company: company as any,
        });
        await supabase.from("signature_requests").update({
          final_signed_pdf_url: built.signedPdfUrl,
          evidence_certificate_url: built.certificatePdfUrl,
        }).eq("id", request.id);
        await supabase.from("signature_evidence_certificates").update({
          pdf_url: built.certificatePdfUrl,
          certificate_url: built.certificatePdfUrl,
        }).eq("verification_code", code);
        await supabase.from("signature_events").insert([
          { signature_request_id: request.id, company_id: participant.company_id,
            event_type: "signed_pdf_generated",
            event_message: `PDF assinado gerado (${built.anchorsUsed} âncora(s)${built.fallbackUsed ? " + fallback" : ""})` },
          { signature_request_id: request.id, company_id: participant.company_id,
            event_type: "evidence_certificate_generated", event_message: "Certificado premium de evidência gerado" },
        ]);
      } catch (genErr: any) {
        await supabase.from("signature_events").insert({
          signature_request_id: request.id,
          company_id: participant.company_id,
          event_type: "signed_pdf_generation_failed",
          event_message: `Falha ao gerar PDF: ${genErr?.message ?? genErr}`,
        });
      }
    } else {
      await supabase.from("signature_requests").update({ status: "in_progress" }).eq("id", request.id);
    }

    return { ok: true };
  },

  async logView(token: string) {
    const found = await this.getByToken(token);
    if (!found) return;
    await supabase.from("signature_events").insert({
      signature_request_id: found.request!.id,
      company_id: found.participant.company_id,
      participant_id: found.participant.id,
      event_type: "participant_opened",
      event_message: `${found.participant.name} abriu o documento`,
    });
    if (found.participant.status === "pending") {
      await supabase.from("signature_participants")
        .update({ status: "viewed" })
        .eq("access_token", token);
    }
  },

  async events(requestId: string) {
    const { data, error } = await supabase
      .from("signature_events")
      .select("*")
      .eq("signature_request_id", requestId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

export function buildPublicSignUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/assinar/${token}`;
}
