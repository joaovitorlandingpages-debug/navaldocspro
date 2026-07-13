/**
 * Resolvedor oficial de templates — Sub-fatia F.1.
 *
 * Precedência (obrigatória em TODOS os callers a partir da F.2):
 *   1. Template padrão da empresa (company_id = X, is_default = true, status = 'published')
 *   2. Template global padrão      (company_id IS NULL, is_default = true, status = 'published')
 *   3. Template selecionado manualmente (templateId fornecido — validado como published + escopo)
 *   4. Erro claro: "template_not_resolved"
 *
 * Regras:
 * - Nunca escolher template aleatoriamente (sem ORDER BY created_at DESC LIMIT 1 sem filtro).
 * - Nunca aceitar template com status != 'published' para geração real.
 * - Cross-tenant é bloqueado: template com company_id != companyId (e não-nulo) → erro.
 *
 * NÃO usar diretamente ainda: este módulo será plugado nos callers na Sub-fatia F.2.
 */
import { supabase } from "@/integrations/supabase/client";

export type ResolveInput = {
  companyId: string;
  /** Categoria/tipo do documento (ex.: "ART_ELETRICA"). Obrigatório para busca por padrão. */
  category?: string | null;
  /** Se o usuário escolheu manualmente, passe aqui. Ainda assim validamos escopo e status. */
  manualTemplateId?: string | null;
};

export type ResolveResult =
  | { source: "company_default" | "global_default" | "manual"; templateId: string; version: number }
  | { source: "error"; error: "template_not_resolved" | "template_not_published" | "cross_tenant" | "template_not_found"; message: string };

export async function resolveTemplate(input: ResolveInput): Promise<ResolveResult> {
  const { companyId, category, manualTemplateId } = input;

  // 3) Manual — se veio ID explícito, ele TEM precedência sobre padrões (a UI já escolheu por baixo).
  //    Mas ainda validamos escopo + status.
  if (manualTemplateId) {
    const { data, error } = await supabase
      .from("document_templates")
      .select("id, company_id, status, version")
      .eq("id", manualTemplateId)
      .maybeSingle();
    if (error || !data) return { source: "error", error: "template_not_found", message: `Template ${manualTemplateId} não encontrado.` };
    if (data.company_id && data.company_id !== companyId) {
      return { source: "error", error: "cross_tenant", message: "Template pertence a outra empresa." };
    }
    if (data.status !== "published") {
      return { source: "error", error: "template_not_published", message: `Template está em status ${data.status}. Publique antes de gerar.` };
    }
    return { source: "manual", templateId: data.id, version: data.version ?? 1 };
  }

  // 1) Padrão da empresa
  if (category) {
    const { data } = await supabase
      .from("document_templates")
      .select("id, version")
      .eq("company_id", companyId)
      .eq("category", category)
      .eq("is_default", true)
      .eq("status", "published")
      .maybeSingle();
    if (data) return { source: "company_default", templateId: data.id, version: data.version ?? 1 };
  }

  // 2) Padrão global
  if (category) {
    const { data } = await supabase
      .from("document_templates")
      .select("id, version")
      .is("company_id", null)
      .eq("category", category)
      .eq("is_default", true)
      .eq("status", "published")
      .maybeSingle();
    if (data) return { source: "global_default", templateId: data.id, version: data.version ?? 1 };
  }

  // 4) Nada resolvido
  return {
    source: "error",
    error: "template_not_resolved",
    message: category
      ? `Nenhum template padrão publicado encontrado para "${category}". Defina um padrão em Admin → Templates.`
      : "Nenhum template selecionado e nenhuma categoria fornecida para busca automática.",
  };
}
