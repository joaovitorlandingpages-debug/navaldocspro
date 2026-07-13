/**
 * Sprint 4D.2.e — Sub-fatia F.2.a
 * Serviço canônico oficial de geração de documentos.
 *
 * Este é o ÚNICO caminho aprovado a partir da Sub-fatia F.2:
 *
 *   resolveTemplate (empresa → global → manual)
 *     → renderTemplate + contentHash (snapshot congelado)
 *     → template_generate_document (RPC — cria/reutiliza linha imutável)
 *     → invoke("generate-document") com generatedDocumentId (modo novo)
 *
 * Nenhum caller foi migrado ainda nesta sub-sub-fatia. Callers legados
 * seguem chamando a Edge no modo antigo — inalterado.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveTemplate } from "@/lib/templates/templateResolver";
import { renderTemplate, contentHash } from "@/lib/templates/templateRenderer";
import { getCurrentCompanyId } from "@/lib/currentCompany";

export type CanonicalGenerateInput = {
  processId: string;
  /** Categoria do documento (ex.: "ART_ELETRICA"). Necessária para resolução automática. */
  category?: string | null;
  /** ID manual de template — se presente, tem precedência sobre padrões. */
  templateId?: string | null;
  fieldValues?: Record<string, string | number | null | undefined>;
  customerId?: string | null;
  vesselId?: string | null;
  checklistItemId?: string | null;
  /**
   * Intent semântico da ação, entra na chave de idempotência.
   * Ex.: "manual_generate", "checklist_generate", "batch_generate", "wizard_generate".
   */
  actionIntent?: string;
  /**
   * Quando o usuário pede regeneração explícita (novo PDF ainda que
   * mesma versão), incrementar esta revisão para criar nova linha.
   */
  regenerationRevision?: number;
};

export type CanonicalGenerateResult =
  | {
      ok: true;
      generatedDocumentId: string;
      templateId: string;
      templateVersionId: string;
      reused: boolean;
      idempotent: boolean;
      status: string;
      generatedFileUrl: string | null;
    }
  | {
      ok: false;
      error:
        | "no_company"
        | "process_finalized"
        | "template_not_resolved"
        | "template_not_published"
        | "template_not_found"
        | "cross_tenant"
        | "render_failed"
        | "rpc_failed"
        | "edge_failed";
      message: string;
    };

/**
 * Chave de idempotência determinística.
 *
 * Formato:
 *   canon:v1:{company}:{process}:{template}:{version}:{category}:{checklistItem}:{intent}:{revision}
 *
 * Regras:
 * - mesma ação + mesma versão publicada → mesma chave → retry reutiliza linha;
 * - nova versão publicada do template → chave diferente → nova linha;
 * - checklist item distinto → chave distinta;
 * - regeneração explícita (revision > 0) → chave distinta;
 * - jamais usar UUID aleatório para retry normal.
 */
export function buildIdempotencyKey(args: {
  companyId: string;
  processId: string;
  templateId: string;
  templateVersion: number | string;
  category?: string | null;
  checklistItemId?: string | null;
  actionIntent?: string;
  regenerationRevision?: number;
}): string {
  const parts = [
    "canon:v1",
    args.companyId,
    args.processId,
    args.templateId,
    String(args.templateVersion ?? "1"),
    args.category ?? "-",
    args.checklistItemId ?? "-",
    args.actionIntent ?? "manual_generate",
    String(args.regenerationRevision ?? 0),
  ];
  return parts.join(":");
}

/**
 * Executa o pipeline canônico. Não migra callers — apenas expõe a API.
 */
export async function generateDocumentCanonical(
  input: CanonicalGenerateInput,
): Promise<CanonicalGenerateResult> {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return { ok: false, error: "no_company", message: "Usuário sem empresa vinculada." };

    // 1) Bloqueia processos finalizados no cliente (defesa em profundidade; DB também bloqueia).
    const { data: proc } = await supabase
      .from("processes")
      .select("id, status, finalized_at, company_id")
      .eq("id", input.processId)
      .maybeSingle();
    if (!proc) {
      return { ok: false, error: "process_finalized", message: "Processo não encontrado." };
    }
    if (proc.company_id !== companyId) {
      return { ok: false, error: "cross_tenant", message: "Processo pertence a outra empresa." };
    }
    const finalized =
      !!proc.finalized_at || ["completed", "finalized", "archived"].includes(String(proc.status ?? ""));
    if (finalized) {
      return { ok: false, error: "process_finalized", message: "Processo finalizado — geração bloqueada." };
    }

    // 2) Resolve template — precedência oficial: empresa → global → manual.
    const resolved = await resolveTemplate({
      companyId,
      category: input.category ?? null,
      manualTemplateId: input.templateId ?? null,
    });
    if (resolved.source === "error") {
      return { ok: false, error: resolved.error, message: resolved.message };
    }

    // 3) Busca versão publicada + conteúdo base para render/hash.
    const { data: version } = await supabase
      .from("template_versions")
      .select("id, version_number, base_content")
      .eq("template_id", resolved.templateId)
      .eq("status", "published")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!version) {
      return {
        ok: false,
        error: "template_not_published",
        message: "Nenhuma versão publicada disponível para este modelo.",
      };
    }

    // 4) Render + hash — snapshot congelado.
    const rendered = renderTemplate(
      String(version.base_content ?? ""),
      (input.fieldValues ?? {}) as Record<string, string | number | null | undefined>,
      "strict",
    );
    if (!rendered.html) {
      return { ok: false, error: "render_failed", message: "Falha ao renderizar template." };
    }
    const hash = contentHash(rendered.html);

    // 5) Idempotency key determinística.
    const idempotencyKey = buildIdempotencyKey({
      companyId,
      processId: input.processId,
      templateId: resolved.templateId,
      templateVersion: version.version_number ?? resolved.version,
      category: input.category,
      checklistItemId: input.checklistItemId,
      actionIntent: input.actionIntent,
      regenerationRevision: input.regenerationRevision,
    });

    // 6) Cria/reutiliza linha canônica via RPC (SECURITY DEFINER, valida tenant/publicado).
    const { data: rpcData, error: rpcError } = await supabase.rpc("template_generate_document", {
      p_template_id: resolved.templateId,
      p_process_id: input.processId,
      p_idempotency_key: idempotencyKey,
      p_rendered_content: rendered.html,
      p_rendered_hash: hash,
      p_placeholders_used: rendered.unknownKeys as unknown as never,
      p_variables_used: (input.fieldValues ?? {}) as unknown as never,
      p_customer_id: input.customerId ?? undefined,
      p_vessel_id: input.vesselId ?? undefined,
      p_name: undefined,
    });
    if (rpcError || !rpcData) {
      return { ok: false, error: "rpc_failed", message: rpcError?.message ?? "Falha na criação do documento." };
    }
    const payload = rpcData as { document_id: string; template_version_id: string; reused: boolean };

    // 7) Invoca a Edge em MODO NOVO — só renderiza PDF a partir do snapshot congelado.
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke("generate-document", {
      body: { generatedDocumentId: payload.document_id },
    });
    if (edgeError) {
      return {
        ok: false,
        error: "edge_failed",
        message: edgeError.message ?? "Falha na geração do PDF.",
      };
    }

    return {
      ok: true,
      generatedDocumentId: payload.document_id,
      templateId: resolved.templateId,
      templateVersionId: payload.template_version_id,
      reused: !!payload.reused,
      idempotent: !!(edgeData as { idempotent?: boolean } | null)?.idempotent,
      status: (edgeData as { document?: { status?: string } } | null)?.document?.status ?? "generated",
      generatedFileUrl:
        (edgeData as { url?: string } | null)?.url ??
        (edgeData as { document?: { generated_file_url?: string } } | null)?.document?.generated_file_url ??
        null,
    };
  } catch (e) {
    return { ok: false, error: "edge_failed", message: (e as Error)?.message ?? "Erro inesperado." };
  }
}
