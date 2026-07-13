/**
 * Sub-sub-fatia F.2.c — Executor batch canônico.
 *
 * Responsabilidade única: executar N chamadas ao pipeline canônico
 * (`generateDocumentCanonical`) com concorrência limitada e agregar
 * um relatório estruturado por item.
 *
 * Regras:
 *   - Não resolve template, não monta snapshot, não invoca Edge diretamente,
 *     não insere em `generated_documents`, não constrói idempotency key —
 *     tudo isso é delegado ao serviço canônico.
 *   - Falha de um item NUNCA interrompe os demais.
 *   - Idempotência é responsabilidade do canônico (mesma chave determinística
 *     ⇒ reused = true).
 *   - Retry seletivo: chamar novamente com os mesmos inputs reaproveita a
 *     linha existente sem duplicar (reused).
 */
import {
  generateDocumentCanonical,
  type CanonicalGenerateInput,
  type CanonicalGenerateResult,
} from "@/services/documents/canonicalDocumentGeneration";

export interface CanonicalBatchItem {
  /** Identificador estável do item no batch (ex.: checklistId ou "processId:template"). */
  key: string;
  /** Rótulo amigável exibido em progresso/relatório. */
  label: string;
  input: CanonicalGenerateInput;
}

export type CanonicalBatchItemStatus =
  | "generated"
  | "reused"
  | "skipped"
  | "failed";

export interface CanonicalBatchItemResult {
  key: string;
  label: string;
  processId: string;
  checklistItemId?: string | null;
  templateId?: string | null;
  templateVersionId?: string | null;
  generatedDocumentId?: string | null;
  status: CanonicalBatchItemStatus;
  reused: boolean;
  idempotent: boolean;
  /** Mensagem amigável quando failed/skipped. */
  reason?: string;
  errorCode?: CanonicalGenerateResult extends { ok: false; error: infer E } ? E : never;
  durationMs: number;
}

export interface CanonicalBatchReport {
  total: number;
  generated: number;
  reused: number;
  skipped: number;
  failed: number;
  durationMs: number;
  items: CanonicalBatchItemResult[];
}

/**
 * Concorrência padrão = 3.
 *
 * Justificativa:
 *   - Preserva throughput útil (paralelismo real na Edge/Postgres);
 *   - Fica abaixo do limite típico de conexões concorrentes do PostgREST/Edge
 *     por usuário (~6), deixando folga para outras requisições da UI;
 *   - Evita saturar o rate limit da Edge Function em lotes grandes;
 *   - Um item lento não bloqueia o lote — os demais slots continuam avançando.
 */
export const DEFAULT_BATCH_CONCURRENCY = 3;

export interface RunCanonicalBatchOptions {
  concurrency?: number;
  onItemStart?: (item: CanonicalBatchItem, index: number, total: number) => void;
  onItemDone?: (result: CanonicalBatchItemResult, doneCount: number, total: number) => void;
}

const FRIENDLY_ERROR: Record<string, string> = {
  no_company: "Sem empresa vinculada.",
  process_finalized: "Processo finalizado.",
  template_not_resolved: "Sem modelo padrão para esta categoria.",
  template_not_published: "Modelo sem versão publicada.",
  template_not_found: "Modelo não encontrado.",
  cross_tenant: "Sem permissão para este processo.",
  render_failed: "Falha ao montar conteúdo.",
  rpc_failed: "Falha ao registrar documento.",
  edge_failed: "Falha ao gerar PDF.",
};

const SKIP_ERRORS = new Set([
  "process_finalized",
  "template_not_resolved",
  "template_not_published",
  "template_not_found",
  "cross_tenant",
]);

export async function runCanonicalBatch(
  items: CanonicalBatchItem[],
  options: RunCanonicalBatchOptions = {},
): Promise<CanonicalBatchReport> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_BATCH_CONCURRENCY);
  const total = items.length;
  const results: CanonicalBatchItemResult[] = new Array(total);
  const startedAt = performance.now();
  let cursor = 0;
  let doneCount = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= total) return;
      const item = items[idx];
      options.onItemStart?.(item, idx, total);
      const t0 = performance.now();
      let out: CanonicalBatchItemResult;
      try {
        const res = await generateDocumentCanonical(item.input);
        if (res.ok) {
          out = {
            key: item.key,
            label: item.label,
            processId: item.input.processId,
            checklistItemId: item.input.checklistItemId ?? null,
            templateId: res.templateId,
            templateVersionId: res.templateVersionId,
            generatedDocumentId: res.generatedDocumentId,
            status: res.reused ? "reused" : "generated",
            reused: res.reused,
            idempotent: res.idempotent,
            durationMs: Math.round(performance.now() - t0),
          };
        } else {
          const skip = SKIP_ERRORS.has(res.error);
          out = {
            key: item.key,
            label: item.label,
            processId: item.input.processId,
            checklistItemId: item.input.checklistItemId ?? null,
            templateId: item.input.templateId ?? null,
            status: skip ? "skipped" : "failed",
            reused: false,
            idempotent: false,
            reason: FRIENDLY_ERROR[res.error] ?? res.message ?? "Falha desconhecida.",
            durationMs: Math.round(performance.now() - t0),
          };
        }
      } catch (e) {
        out = {
          key: item.key,
          label: item.label,
          processId: item.input.processId,
          checklistItemId: item.input.checklistItemId ?? null,
          templateId: item.input.templateId ?? null,
          status: "failed",
          reused: false,
          idempotent: false,
          reason: (e as Error)?.message ?? "Erro inesperado.",
          durationMs: Math.round(performance.now() - t0),
        };
      }
      results[idx] = out;
      doneCount += 1;
      options.onItemDone?.(out, doneCount, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));

  return {
    total,
    generated: results.filter((r) => r.status === "generated").length,
    reused: results.filter((r) => r.status === "reused").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    durationMs: Math.round(performance.now() - startedAt),
    items: results,
  };
}

/**
 * Filtra apenas itens falhos de um relatório anterior — para retry seletivo.
 * Itens `generated`/`reused` são preservados pelo canônico via idempotência,
 * então repetí-los é seguro; mas normalmente o retry deve focar em `failed`.
 */
export function pickFailedForRetry(
  report: CanonicalBatchReport,
  source: CanonicalBatchItem[],
): CanonicalBatchItem[] {
  const failedKeys = new Set(report.items.filter((r) => r.status === "failed").map((r) => r.key));
  return source.filter((i) => failedKeys.has(i.key));
}
