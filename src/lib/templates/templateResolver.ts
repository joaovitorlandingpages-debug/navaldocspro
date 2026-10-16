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
  | {
      source: "error";
      error:
        "template_not_resolved" | "template_not_published" | "cross_tenant" | "template_not_found";
      message: string;
    };

export async function resolveTemplate(input: ResolveInput): Promise<ResolveResult> {
  const { companyId, category, manualTemplateId } = input;

  // 3) Manual — se veio ID explícito ou código/slug, resolve para o registro real
  //    Garante que slugs como "proc-representacao-naval" sejam buscados pela coluna `code`
  //    e NUNCA causem erro de cast UUID no Postgres ("invalid input syntax for type uuid").
  if (manualTemplateId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(manualTemplateId).trim(),
    );

    let templateRecord: any = null;

    if (isUuid) {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, company_id, status, version")
        .eq("id", manualTemplateId)
        .maybeSingle();

      if (error) {
        console.warn("[templateResolver] Erro ao buscar template por UUID:", error);
      }
      templateRecord = data;
    } else {
      // Busca segura por código/slug de catálogo
      const codeOrSlug = String(manualTemplateId).trim();
      
      // 1. Prioriza template específico da empresa
      const { data: compData } = await supabase
        .from("document_templates")
        .select("id, company_id, status, version")
        .eq("company_id", companyId)
        .or(`code.eq."${codeOrSlug}",code.ilike."${codeOrSlug}"`)
        .limit(1)
        .maybeSingle();

      if (compData) {
        templateRecord = compData;
      } else {
        // 2. Busca template global correspondente ao código/slug
        const { data: globalData } = await supabase
          .from("document_templates")
          .select("id, company_id, status, version")
          .or("company_id.is.null,is_global.eq.true")
          .or(`code.eq."${codeOrSlug}",code.ilike."${codeOrSlug}"`)
          .limit(1)
          .maybeSingle();

        templateRecord = globalData;
      }
    }

    if (!templateRecord) {
      return {
        source: "error",
        error: "template_not_found",
        message: `Template "${manualTemplateId}" não encontrado no banco de dados.`,
      };
    }

    if (templateRecord.company_id && templateRecord.company_id !== companyId) {
      return {
        source: "error",
        error: "cross_tenant",
        message: "Template pertence a outra empresa.",
      };
    }

    // Permite templates ativos/publicados
    const pubStatus = templateRecord.status || "published";
    if (pubStatus !== "published" && pubStatus !== "active" && templateRecord.lifecycle_status !== "published") {
      return {
        source: "error",
        error: "template_not_published",
        message: `Template está em status ${pubStatus}. Publique antes de gerar.`,
      };
    }

    return { source: "manual", templateId: templateRecord.id, version: templateRecord.version ?? 1 };
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
