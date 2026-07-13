/**
 * Sprint 4D.2.d — Fatia D
 * Validador do conteúdo de template.
 */
import { isKnownVariable, TEMPLATE_VARIABLES } from "./variableCatalog";

export type ValidationLevel = "error" | "warning" | "info";
export type ValidationIssue = {
  level: ValidationLevel;
  code: string;
  message: string;
  context?: string;
};

// Captura {{ ... }} incluindo malformadas para diagnosticar.
const TAG_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;
const OPEN_RE = /\{\{/g;
const CLOSE_RE = /\}\}/g;
// Padrões perigosos.
const DANGEROUS = [
  { re: /<script[\s>]/i, code: "script_tag", msg: "Tag <script> não é permitida." },
  { re: /\son[a-z]+\s*=/i, code: "inline_event", msg: "Eventos inline (onclick, onerror, ...) não são permitidos." },
  { re: /javascript:\s*/i, code: "js_url", msg: "URL javascript: não é permitida." },
  { re: /<iframe[\s>]/i, code: "iframe_tag", msg: "Tag <iframe> não é permitida." },
  { re: /expression\s*\(/i, code: "css_expression", msg: "CSS expression() não é permitido." },
];

export type ValidationInput = {
  name?: string | null;
  code?: string | null;
  category?: string | null;
  process_type?: string | null;
  base_content?: string | null;
  document_structure?: unknown;
};

export function validateTemplate(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = (input.base_content ?? "").toString();

  // Estrutura vazia.
  if (!content.trim()) {
    issues.push({ level: "error", code: "empty_content", message: "Conteúdo base está vazio." });
  }

  // Metadados obrigatórios para publicação.
  if (!input.name?.trim()) issues.push({ level: "error", code: "missing_name", message: "Nome é obrigatório." });
  if (!input.code?.trim()) issues.push({ level: "warning", code: "missing_code", message: "Código do modelo não definido." });
  if (!input.category?.trim()) issues.push({ level: "warning", code: "missing_category", message: "Categoria não definida." });
  if (!input.process_type?.trim()) issues.push({ level: "info", code: "missing_process_type", message: "Tipo de processo não vinculado." });

  // Balanço de chaves.
  const opens = (content.match(OPEN_RE) || []).length;
  const closes = (content.match(CLOSE_RE) || []).length;
  if (opens !== closes) {
    issues.push({
      level: "error",
      code: "unbalanced_braces",
      message: `Chaves desbalanceadas: ${opens} aberturas e ${closes} fechamentos.`,
    });
  }

  // Segurança.
  for (const rule of DANGEROUS) {
    if (rule.re.test(content)) {
      issues.push({ level: "error", code: rule.code, message: rule.msg });
    }
  }

  // Variáveis usadas.
  const seen = new Set<string>();
  for (const m of content.matchAll(TAG_RE)) {
    const raw = m[1].trim();
    if (!raw) {
      issues.push({ level: "error", code: "empty_tag", message: "Placeholder vazio '{{ }}' encontrado." });
      continue;
    }
    // Chave incompleta (espaços, caracteres suspeitos).
    if (/[<>"'`]/.test(raw)) {
      issues.push({ level: "error", code: "malformed_tag", message: `Placeholder malformado: {{${raw}}}` });
      continue;
    }
    if (!isKnownVariable(raw)) {
      issues.push({
        level: "error",
        code: "unknown_variable",
        message: `Variável desconhecida: {{${raw}}}`,
        context: raw,
      });
    }
    seen.add(raw);
  }

  // Info: variáveis conhecidas ainda não usadas.
  if (seen.size === 0 && content.trim()) {
    issues.push({
      level: "info",
      code: "no_variables",
      message: "Nenhuma variável dinâmica utilizada — o documento será estático.",
    });
  }

  // Tamanho.
  if (content.length > 200_000) {
    issues.push({ level: "warning", code: "content_large", message: "Conteúdo muito grande (>200KB) pode afetar performance." });
  }

  return issues;
}

export function canPublish(issues: ValidationIssue[]): boolean {
  return !issues.some((i) => i.level === "error");
}

// Reexport para conveniência.
export const KNOWN_VARIABLES = TEMPLATE_VARIABLES;
