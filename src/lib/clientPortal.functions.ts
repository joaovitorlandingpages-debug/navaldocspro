import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function newToken() {
  // 48 hex chars = 192-bit
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function logActivity(params: {
  company_id: string;
  process_id: string;
  access_id?: string | null;
  event_type: string;
  message?: string;
  metadata?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
}) {
  const supa = await adminClient();
  await supa.from("client_portal_activity_logs").insert({
    company_id: params.company_id,
    process_id: params.process_id,
    access_id: params.access_id ?? null,
    event_type: params.event_type,
    message: params.message ?? null,
    metadata: params.metadata ?? {},
    ip_address: params.ip_address ?? null,
    user_agent: params.user_agent ?? null,
  } as any);
  await supa.from("system_logs").insert({
    event_type: params.event_type,
    module: "CLIENT_PORTAL",
    message: params.message ?? params.event_type,
    metadata: { processId: params.process_id, ...(params.metadata ?? {}) },
    company_id: params.company_id,
  } as any);
}

/* ============ INTERNAL (authenticated) ============ */

export const createPortalAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    processId: string;
    customerId?: string | null;
    daysValid?: number;
    allowedActions?: Record<string, boolean>;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proc, error: pErr } = await supabase
      .from("processes")
      .select("id, company_id, customer_id")
      .eq("id", data.processId)
      .maybeSingle();
    if (pErr || !proc) throw new Error("Processo não encontrado");

    const days = Math.max(1, Math.min(365, data.daysValid ?? 30));
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const token = newToken();

    const supa = await adminClient();
    const { data: row, error } = await supa
      .from("client_portal_access")
      .insert({
        company_id: proc.company_id,
        process_id: proc.id,
        customer_id: data.customerId ?? proc.customer_id ?? null,
        access_token: token,
        token_expires_at: expires,
        status: "ativo",
        allowed_actions: data.allowedActions ?? {
          upload: true, message: true, download: true, update_basic: false,
        },
        created_by: userId,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logActivity({
      company_id: proc.company_id,
      process_id: proc.id,
      access_id: row.id,
      event_type: "client_portal_access_created",
      message: "Link do portal do cliente gerado",
      metadata: { days_valid: days },
    });
    return row;
  });

export const revokePortalAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("client_portal_access")
      .update({ status: "revogado" } as any)
      .eq("id", data.accessId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActivity({
      company_id: row.company_id,
      process_id: row.process_id,
      access_id: row.id,
      event_type: "client_portal_access_revoked",
      message: "Acesso revogado",
    });
    return { ok: true };
  });

export const renewPortalAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accessId: string; daysValid?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = Math.max(1, Math.min(365, data.daysValid ?? 30));
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { data: row, error } = await supabase
      .from("client_portal_access")
      .update({ status: "ativo", token_expires_at: expires } as any)
      .eq("id", data.accessId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActivity({
      company_id: row.company_id,
      process_id: row.process_id,
      access_id: row.id,
      event_type: "client_portal_access_renewed",
      message: "Acesso renovado",
      metadata: { days_valid: days, new_expiry: expires },
    });
    return row;
  });

export const sendCompanyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { processId: string; message: string; accessId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const msg = (data.message || "").trim();
    if (!msg) throw new Error("Mensagem vazia");
    const { data: proc } = await supabase
      .from("processes").select("id, company_id").eq("id", data.processId).maybeSingle();
    if (!proc) throw new Error("Processo não encontrado");
    const { data: row, error } = await supabase
      .from("client_portal_messages")
      .insert({
        company_id: proc.company_id,
        process_id: proc.id,
        access_id: data.accessId ?? null,
        sender: "company",
        sender_user_id: userId,
        message: msg.slice(0, 4000),
      } as any)
      .select("*").single();
    if (error) throw new Error(error.message);
    await logActivity({
      company_id: proc.company_id,
      process_id: proc.id,
      access_id: data.accessId ?? null,
      event_type: "client_portal_message_sent",
      message: "Mensagem enviada ao cliente",
      metadata: { from: "company" },
    });
    return row;
  });

/* ============ PUBLIC (anon, by token) ============ */

async function loadByToken(token: string) {
  const supa = await adminClient();
  const { data, error } = await supa
    .from("client_portal_access")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();
  if (error || !data) throw new Error("Acesso inválido");
  if (data.status !== "ativo") throw new Error("Acesso " + data.status);
  if (new Date(data.token_expires_at).getTime() < Date.now()) {
    await supa.from("client_portal_access")
      .update({ status: "expirado" } as any).eq("id", data.id);
    throw new Error("Acesso expirado");
  }
  return data;
}

export const getPortalContext = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const access = await loadByToken(data.token);
    const supa = await adminClient();

    const [{ data: company }, { data: process }, { data: customer }, { data: vessel }] =
      await Promise.all([
        supa.from("companies").select("id,name,logo_url,phone,email").eq("id", access.company_id).maybeSingle(),
        supa.from("processes").select("id,process_type,status,priority,created_at,protocol_number,company_id,customer_id,vessel_id").eq("id", access.process_id).maybeSingle(),
        access.customer_id
          ? supa.from("customers").select("id,name,email,phone,cpf_cnpj").eq("id", access.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        Promise.resolve({ data: null as any }),
      ]);

    const vesselId = (process as any)?.vessel_id;
    let vesselRow: any = null;
    if (vesselId) {
      const { data: v } = await supa.from("vessels").select("id,name,registration_number,vessel_type").eq("id", vesselId).maybeSingle();
      vesselRow = v;
    }

    const [{ data: docs }, { data: uploads }, { data: messages }, { data: timeline }, { data: released }] =
      await Promise.all([
        supa.from("process_documents").select("*").eq("process_id", access.process_id),
        supa.from("process_document_uploads").select("*").eq("process_id", access.process_id).order("created_at", { ascending: false }),
        supa.from("client_portal_messages").select("*").eq("process_id", access.process_id).order("created_at", { ascending: true }),
        supa.from("client_portal_activity_logs").select("event_type,message,created_at").eq("process_id", access.process_id).order("created_at", { ascending: false }).limit(30),
        supa.from("generated_documents").select("id,name,generated_file_url,signed_file_url,created_at,status").eq("process_id", access.process_id).in("status", ["aprovado", "assinado", "liberado", "concluido"]),
      ]);

    await supa.from("client_portal_access").update({ last_access_at: new Date().toISOString() } as any).eq("id", access.id);
    await logActivity({
      company_id: access.company_id, process_id: access.process_id, access_id: access.id,
      event_type: "client_portal_opened", message: "Cliente abriu o portal",
    });

    return {
      access: {
        id: access.id,
        status: access.status,
        expires_at: access.token_expires_at,
        allowed_actions: access.allowed_actions,
      },
      company, process, customer, vessel: vesselRow,
      documents: docs ?? [],
      uploads: uploads ?? [],
      messages: messages ?? [],
      timeline: timeline ?? [],
      released: released ?? [],
    };
  });

export const portalSendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; message: string }) => d)
  .handler(async ({ data }) => {
    const access = await loadByToken(data.token);
    if (!(access.allowed_actions as any)?.message) throw new Error("Ação não permitida");
    const msg = (data.message || "").trim();
    if (!msg) throw new Error("Mensagem vazia");
    const supa = await adminClient();
    const { data: row, error } = await supa.from("client_portal_messages").insert({
      company_id: access.company_id,
      process_id: access.process_id,
      access_id: access.id,
      sender: "client",
      message: msg.slice(0, 4000),
    } as any).select("*").single();
    if (error) throw new Error(error.message);
    await logActivity({
      company_id: access.company_id, process_id: access.process_id, access_id: access.id,
      event_type: "client_portal_message_sent", message: "Cliente enviou mensagem",
      metadata: { from: "client" },
    });
    return row;
  });

export const portalUploadDocument = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    fileName: string;
    contentType: string;
    base64: string; // base64-encoded payload
    documentId?: string | null;
    label?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const access = await loadByToken(data.token);
    if (!(access.allowed_actions as any)?.upload) throw new Error("Upload não permitido");
    const supa = await adminClient();

    // decode base64
    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("Arquivo acima de 25MB");

    const safeName = (data.fileName || "arquivo").replace(/[^\w.\-]+/g, "_");
    const path = `${access.company_id}/${access.process_id}/portal/${Date.now()}_${safeName}`;
    const { error: upErr } = await supa.storage
      .from("process-document-uploads")
      .upload(path, bytes, { contentType: data.contentType || "application/octet-stream", upsert: false });
    if (upErr) throw new Error(upErr.message);

    // Ensure we have a process_document_id (required FK)
    let docId = data.documentId ?? null;
    if (!docId) {
      const { data: pd } = await supa.from("process_documents").insert({
        company_id: access.company_id,
        process_id: access.process_id,
        is_required: false,
        source: "client_portal",
        status: "pending",
        metadata: { label: data.label ?? "Documento enviado pelo cliente" },
      } as any).select("id").single();
      docId = pd?.id ?? null;
    }
    if (!docId) throw new Error("Não foi possível vincular o documento");

    const { data: row, error } = await supa.from("process_document_uploads").insert({
      company_id: access.company_id,
      process_id: access.process_id,
      process_document_id: docId,
      file_url: path,
      file_name: safeName,
      file_type: data.contentType,
      file_size: bytes.byteLength,
      validation_status: "pending",
      ocr_status: "pending",
      extracted_fields: {},
      validation_errors: [],
    } as any).select("*").single();
    if (error) {
      // best-effort insert with reduced columns if some are missing
      await supa.storage.from("process-document-uploads").remove([path]);
      throw new Error(error.message);
    }

    await logActivity({
      company_id: access.company_id, process_id: access.process_id, access_id: access.id,
      event_type: "client_portal_document_uploaded",
      message: `Cliente enviou documento: ${safeName}`,
      metadata: { upload_id: row.id, path },
    });
    return row;
  });

export const portalDownloadFile = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; bucket: string; path: string }) => d)
  .handler(async ({ data }) => {
    const access = await loadByToken(data.token);
    if (!(access.allowed_actions as any)?.download) throw new Error("Download não permitido");
    const allowedBuckets = ["generated-documents", "process-attachments", "process-dossiers"];
    if (!allowedBuckets.includes(data.bucket)) throw new Error("Bucket inválido");

    // confirm path belongs to this process/company
    if (!data.path.includes(access.process_id) && !data.path.includes(access.company_id)) {
      // still verify by lookup in generated_documents
      const supaCheck = await adminClient();
      const { data: g } = await supaCheck.from("generated_documents")
        .select("id,generated_file_url,signed_file_url").eq("process_id", access.process_id).maybeSingle();
      if (!g || (g.generated_file_url !== data.path && g.signed_file_url !== data.path)) throw new Error("Arquivo não autorizado");
    }

    const supa = await adminClient();
    const { data: signed, error } = await supa.storage.from(data.bucket).createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw new Error(error?.message || "Falha ao assinar URL");

    await logActivity({
      company_id: access.company_id, process_id: access.process_id, access_id: access.id,
      event_type: "client_portal_file_downloaded",
      message: `Cliente baixou arquivo: ${data.path}`,
      metadata: { bucket: data.bucket, path: data.path },
    });
    return { url: signed.signedUrl };
  });

export const portalConfirmReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const access = await loadByToken(data.token);
    await logActivity({
      company_id: access.company_id, process_id: access.process_id, access_id: access.id,
      event_type: "client_portal_receipt_confirmed",
      message: "Cliente confirmou recebimento",
      metadata: { note: data.note ?? null },
    });
    return { ok: true };
  });
