import { supabase } from "@/integrations/supabase/client";

export type SuggestionType = "sugestao" | "problema";

export type SuggestionStatus = "recebida" | "em_analise" | "respondida" | "concluida";

export interface ParsedSuggestion {
  id: string;
  referenceNumber: string;
  companyId: string | null;
  companyName?: string | null;
  userId: string | null;
  userName?: string | null;
  title: string;
  type: SuggestionType;
  status: SuggestionStatus;
  priority: string;
  cleanDescription: string;
  attachmentUrl: string | null;
  adminResponse: {
    text: string;
    respondedAt: string;
    respondedBy: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converte o ID e data em um número de referência amigável para o cliente.
 * Exemplo: REF-2026-A1B2C3D4
 */
export function formatReferenceNumber(id: string, createdAt?: string): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const cleanId = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `REF-${year}-${cleanId}`;
}

/**
 * Normaliza o tipo vindo do banco (suportando legados 'ideia', 'suggestion', 'duvida', etc)
 */
export function normalizeSuggestionType(rawType?: string | null): SuggestionType {
  const lower = (rawType || "").toLowerCase();
  if (lower === "problema" || lower === "bug" || lower === "issue") {
    return "problema";
  }
  return "sugestao";
}

/**
 * Normaliza o status para os 4 oficiais requeridos:
 * 'recebida' | 'em_analise' | 'respondida' | 'concluida'
 */
export function normalizeSuggestionStatus(rawStatus?: string | null): SuggestionStatus {
  const lower = (rawStatus || "").toLowerCase();
  if (lower === "respondida" || lower === "answered") {
    return "respondida";
  }
  if (lower === "concluida" || lower === "implementada" || lower === "encerrada" || lower === "closed" || lower === "resolved") {
    return "concluida";
  }
  if (lower === "em_analise" || lower === "planejada" || lower === "em_desenvolvimento" || lower === "in_progress") {
    return "em_analise";
  }
  return "recebida";
}

/**
 * Serializa a descrição com anexo e resposta em um texto compatível com a coluna `description`.
 */
export function serializeDescription(params: {
  description: string;
  attachmentUrl?: string | null;
  adminResponse?: {
    text: string;
    respondedAt: string;
    respondedBy: string;
  } | null;
}): string {
  const parts: string[] = [params.description.trim()];

  if (params.attachmentUrl) {
    parts.push(`\n\n[ANEXO_IMAGEM: ${params.attachmentUrl.trim()}]`);
  }

  if (params.adminResponse && params.adminResponse.text.trim()) {
    const { text, respondedAt, respondedBy } = params.adminResponse;
    parts.push(
      `\n\n--- RESPOSTA DA EQUIPE NAVALDOCS (${respondedBy} em ${respondedAt}) ---\n${text.trim()}`
    );
  }

  return parts.join("");
}

/**
 * Faz o parse da descrição para extrair a mensagem original, o anexo e a resposta do administrador.
 */
export function parseDescription(rawDescription?: string | null): {
  cleanDescription: string;
  attachmentUrl: string | null;
  adminResponse: {
    text: string;
    respondedAt: string;
    respondedBy: string;
  } | null;
} {
  if (!rawDescription) {
    return { cleanDescription: "", attachmentUrl: null, adminResponse: null };
  }

  let text = rawDescription;
  let attachmentUrl: string | null = null;
  let adminResponse: { text: string; respondedAt: string; respondedBy: string } | null = null;

  // 1. Extrair anexo de imagem
  const attachmentMatch = text.match(/\[(?:ANEXO_IMAGEM|Anexo):\s*([^\]]+)\]/i);
  if (attachmentMatch) {
    const rawVal = attachmentMatch[1].trim();
    // Se tiver nome e url (ex: nome - path), pega a URL/path
    const parts = rawVal.split(" - ");
    attachmentUrl = parts.length > 1 ? parts[1].trim() : parts[0].trim();
    text = text.replace(attachmentMatch[0], "").trim();
  }

  // 2. Extrair resposta da equipe
  const responseSeparatorMatch = text.match(
    /---\s*RESPOSTA DA EQUIPE NAVALDOCS\s*(?:\((.*?)(?:\s*em\s*(.*?))?\))?\s*---\s*([\s\S]*)$/i
  );

  if (responseSeparatorMatch) {
    const respondedBy = responseSeparatorMatch[1]?.trim() || "Equipe NavalDocs Pro";
    const respondedAt = responseSeparatorMatch[2]?.trim() || new Date().toISOString();
    const replyText = responseSeparatorMatch[3]?.trim() || "";

    adminResponse = {
      text: replyText,
      respondedAt,
      respondedBy,
    };

    text = text.slice(0, responseSeparatorMatch.index).trim();
  }

  // Limpa prefixos de área legados se houver (ex: [Área: geral])
  text = text.replace(/^\[Área:\s*[^\]]+\]\s*/i, "").trim();

  return {
    cleanDescription: text,
    attachmentUrl,
    adminResponse,
  };
}

/**
 * Consulta de sugestões para o cliente (isolado estritamente por company_id)
 */
export async function getCompanySuggestions(companyId: string): Promise<ParsedSuggestion[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao consultar sugestões da empresa:", error);
    throw error;
  }

  return (data || []).map((row: any) => {
    const parsed = parseDescription(row.description);
    return {
      id: row.id,
      referenceNumber: formatReferenceNumber(row.id, row.created_at),
      companyId: row.company_id,
      userId: row.user_id,
      title: row.title,
      type: normalizeSuggestionType(row.type),
      status: normalizeSuggestionStatus(row.status),
      priority: row.priority || "media",
      cleanDescription: parsed.cleanDescription,
      attachmentUrl: parsed.attachmentUrl,
      adminResponse: parsed.adminResponse,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };
  });
}

/**
 * Consulta de sugestões para Administrador Global (com join seguro em companies)
 */
export async function getAllAdminSuggestions(filterCompanyId?: string | null): Promise<ParsedSuggestion[]> {
  let query = supabase
    .from("tickets")
    .select(`
      *,
      company:companies!tickets_company_id_fkey (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (filterCompanyId && filterCompanyId !== "all") {
    query = query.eq("company_id", filterCompanyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao consultar sugestões administrativas:", error);
    throw error;
  }

  return (data || []).map((row: any) => {
    const parsed = parseDescription(row.description);
    const compName = row.company?.name || "Empresa não informada";

    return {
      id: row.id,
      referenceNumber: formatReferenceNumber(row.id, row.created_at),
      companyId: row.company_id,
      companyName: compName,
      userId: row.user_id,
      title: row.title,
      type: normalizeSuggestionType(row.type),
      status: normalizeSuggestionStatus(row.status),
      priority: row.priority || "media",
      cleanDescription: parsed.cleanDescription,
      attachmentUrl: parsed.attachmentUrl,
      adminResponse: parsed.adminResponse,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };
  });
}

/**
 * Criação de nova sugestão ou relato de problema
 */
export async function createSuggestion(params: {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  type: SuggestionType;
  title: string;
  description: string;
  attachmentUrl?: string | null;
}): Promise<{ id: string; referenceNumber: string }> {
  const fullDescription = serializeDescription({
    description: params.description,
    attachmentUrl: params.attachmentUrl,
  });

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      company_id: params.companyId,
      user_id: params.userId || null,
      title: params.title.trim(),
      description: fullDescription,
      type: params.type,
      priority: params.type === "problema" ? "alta" : "media",
      status: "recebida",
    } as any)
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Erro ao criar sugestão:", error);
    throw error;
  }

  return {
    id: data.id,
    referenceNumber: formatReferenceNumber(data.id, data.created_at),
  };
}

/**
 * Resposta oficial do Administrador Global
 */
export async function replyToSuggestion(params: {
  suggestionId: string;
  currentDescription: string;
  currentAttachmentUrl?: string | null;
  adminResponseText: string;
  adminName: string;
  newStatus: SuggestionStatus;
}): Promise<void> {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(now);

  const updatedDescription = serializeDescription({
    description: params.currentDescription,
    attachmentUrl: params.currentAttachmentUrl,
    adminResponse: {
      text: params.adminResponseText,
      respondedAt: formattedDate,
      respondedBy: params.adminName,
    },
  });

  const { error } = await supabase
    .from("tickets")
    .update({
      description: updatedDescription,
      status: params.newStatus,
      updated_at: now.toISOString(),
    } as any)
    .eq("id", params.suggestionId);

  if (error) {
    console.error("Erro ao atualizar resposta do ticket:", error);
    throw error;
  }
}
