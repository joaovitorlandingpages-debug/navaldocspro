/**
 * Sub-fatia F.2.b — Compatibilidade transitória do CustomEvent("generate-document").
 *
 * Motivo de manter (não remover agora):
 *   O listener em /processes/$id abre o DocumentPreviewEditor, permitindo
 *   edição manual do conteúdo antes de gravar. Substituí-lo por callback
 *   tipado exigiria refatorar a árvore de ProcessChecklist + ProcessItemFocusDialog
 *   + a rota do processo, o que está fora do escopo da F.2.b.
 *
 * Regras:
 *   - Payload tipado (não mais `any`).
 *   - Somente o listener oficial em /processes/$id deve consumir este evento.
 *   - Marcado para remoção em sub-fatia futura (F.2.b.remove-event) quando o
 *     preview editor for migrado ao pipeline canônico.
 */

export interface GenerateDocumentEventDetail {
  /** Template resolvido (linha de `document_templates`). Compat com fluxo legado. */
  id: string;
  name?: string | null;
  base_content?: string | null;
  category?: string | null;
  [key: string]: unknown;
}

export const GENERATE_DOCUMENT_EVENT = "generate-document" as const;

export function dispatchGenerateDocument(detail: GenerateDocumentEventDetail): void {
  window.dispatchEvent(
    new CustomEvent<GenerateDocumentEventDetail>(GENERATE_DOCUMENT_EVENT, { detail }),
  );
}

export type GenerateDocumentEvent = CustomEvent<GenerateDocumentEventDetail>;
