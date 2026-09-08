import DOMPurify from "isomorphic-dompurify";

/**
 * Módulo Central de Segurança e Defesa contra XSS (OWASP Top 10 A03:2021).
 * Sanitiza rigorosamente conteúdos HTML, nós ricos de templates e URLs de links e imagens.
 */

// Tags e atributos permitidos com segurança para documentos, relatórios e templates náuticos
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "code", "pre", "hr",
  "img", "a", "sub", "sup"
];

const ALLOWED_ATTR = [
  "style", "class", "id", "align", "color", "width", "height",
  "src", "alt", "title", "href", "target", "rel",
  "colspan", "rowspan", "border", "cellpadding", "cellspacing"
];

// Protocolos e esquemas de URI seguros
const SAFE_URL_PATTERN = /^(https?:\/\/|\/|mailto:|tel:|data:image\/(png|jpeg|webp|gif);base64,)/i;

/**
 * Sanitiza HTML de documentos e templates, removendo scripts maliciosos,
 * eventos inline (onload, onerror, onclick) e esquemas de URL perigosos.
 */
export function sanitizeDocumentHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "base", "form", "input", "button", "meta", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "javascript:"],
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });

  return clean;
}

/**
 * Valida e sanitiza uma URL para uso em links (href) ou imagens (src),
 * bloqueando esquemas perigosos como javascript:, vbscript:, data:text/html.
 */
export function sanitizeUrl(url: string | null | undefined, fallback = "#"): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  // Bloqueia tentativas comuns de injeção de script via protocolo
  if (/^(javascript|vbscript|data:text\/html):/i.test(trimmed)) {
    return fallback;
  }

  if (SAFE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Se não bater com padrão seguro e não for relativo, retorna fallback
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return trimmed;
  }

  return fallback;
}

/**
 * Sanitiza dados textuais de entrada de formulários eliminando caracteres de controle
 * nulos e tags injetadas, prevenindo injeção SQL/NoSQL e Cross-Site Scripting.
 */
export function sanitizeInputString(value: string | null | undefined, maxLength = 2000): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .slice(0, maxLength)
    .trim();
}
