/**
 * Sprint 4D.2.d — Fatia D
 * Renderer canônico usado no preview E na geração real.
 * Sanitiza HTML e substitui placeholders {{chave}}.
 */
// Onda 4D.2.e — isomorphic-dompurify quebra na runtime Cloudflare Workers
// (tenta bind de globais Node ausentes). Carregamos DOMPurify apenas no
// browser; no server (SSR/Worker) usamos um passthrough seguro — sanitização
// já foi feita quando o conteúdo saiu do editor.
type Sanitizer = { sanitize: (input: string, cfg?: unknown) => string };
let _purifier: Sanitizer | null = null;
function getSanitizer(): Sanitizer {
  if (_purifier) return _purifier;
  if (typeof window !== "undefined") {
    try {
      // require síncrono para manter renderTemplate síncrono no cliente.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("dompurify");
      const DOMPurify = mod?.default ?? mod;
      _purifier = { sanitize: (s, c) => DOMPurify.sanitize(s, c as never) as string };
      return _purifier;
    } catch {
      // fallthrough
    }
  }
  _purifier = { sanitize: (s) => s };
  return _purifier;
}
import { SAMPLE_CONTEXT, VARIABLE_INDEX } from "./variableCatalog";

const TAG_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const UNKNOWN_MARK = '<mark class="tpl-unknown" style="background:#fee2e2;color:#991b1b;padding:0 4px;border-radius:2px;">{{$1}}</mark>';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "b", "i", "em", "strong", "u", "small", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "img", "a", "span", "div", "section", "article", "header", "footer",
    "mark",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "style", "colspan", "rowspan", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "textarea", "style", "link", "meta"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
};

export type RenderMode = "sample" | "strict";

export type RenderResult = {
  html: string;
  unknownKeys: string[];
};

/**
 * Substitui variáveis com valores do contexto e sanitiza o HTML.
 * mode=sample: variáveis sem valor no contexto usam SAMPLE_CONTEXT (preview).
 * mode=strict: variáveis sem valor ficam marcadas como "faltando".
 */
export function renderTemplate(
  rawContent: string,
  context: Record<string, string | number | null | undefined> = {},
  mode: RenderMode = "sample",
): RenderResult {
  const unknown = new Set<string>();

  const substituted = (rawContent || "").replace(TAG_RE, (_full, key: string) => {
    const known = Boolean(VARIABLE_INDEX[key]);
    if (!known) {
      unknown.add(key);
      // marca visualmente no preview.
      return `__TPL_UNKNOWN__${key}__END__`;
    }
    const ctxVal = context[key];
    if (ctxVal !== undefined && ctxVal !== null && String(ctxVal).length > 0) {
      return escapeHtml(String(ctxVal));
    }
    if (mode === "sample") {
      const sample = SAMPLE_CONTEXT[key];
      if (sample) return escapeHtml(sample);
    }
    return `__TPL_MISSING__${key}__END__`;
  });

  // Sanitiza antes de reinserir marcações — evita bypass.
  const clean = DOMPurify.sanitize(substituted, SANITIZE_CONFIG);

  const withMarks = clean
    .replace(/__TPL_UNKNOWN__([a-zA-Z0-9_.]+)__END__/g, (_m, k) =>
      `<mark style="background:#fee2e2;color:#991b1b;padding:0 4px;border-radius:2px;">{{${escapeHtml(k)}}}</mark>`)
    .replace(/__TPL_MISSING__([a-zA-Z0-9_.]+)__END__/g, (_m, k) =>
      `<mark style="background:#fef3c7;color:#92400e;padding:0 4px;border-radius:2px;">[${escapeHtml(k)}]</mark>`);

  return { html: withMarks, unknownKeys: Array.from(unknown) };
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Hash simples (djb2) para uso em snapshot — não criptográfico. */
export function contentHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export { UNKNOWN_MARK };
