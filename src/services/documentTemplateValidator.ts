/**
 * FASE 0 — Validador Documental.
 *
 * Antes de qualquer geração documental, valida:
 *   - placeholders inexistentes no catálogo canônico
 *   - placeholders órfãos (no template, sem valor fornecido)
 *   - valores nulos / undefined / vazios para placeholders obrigatórios
 *
 * Bloqueia a geração lançando `DocumentValidationException` com mensagem explicativa.
 */

import {
  CANONICAL_PLACEHOLDERS,
  CANONICAL_KEYS,
  ALIAS_TO_CANONICAL,
  extractPlaceholders,
  resolveCanonical,
  type PlaceholderSpec,
} from "./documentPlaceholders";

export type ValidationIssueLevel = "error" | "warning";
export type ValidationIssueType =
  | "unknown_placeholder"
  | "orphan_placeholder"
  | "missing_required_value"
  | "null_value"
  | "deprecated_alias";

export interface ValidationIssue {
  level: ValidationIssueLevel;
  type: ValidationIssueType;
  placeholder: string;
  canonical?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  placeholdersFound: string[];
  unknown: string[];
  deprecated: string[];
}

export class DocumentValidationException extends Error {
  constructor(public result: ValidationResult) {
    super(
      `Geração bloqueada: ${result.issues.filter((i) => i.level === "error").length} erro(s) de validação documental.`,
    );
    this.name = "DocumentValidationException";
  }
}

/**
 * Valida um template + valores fornecidos.
 *
 * @param content      Conteúdo do template (com placeholders {{x.y}}).
 * @param values       Mapa achatado { "cliente.nome": "...", ... } ou aninhado.
 * @param options.strict  Se true (default), valores nulos/vazios geram erro.
 */
export function validateTemplate(
  content: string,
  values: Record<string, unknown>,
  options: { strict?: boolean } = {},
): ValidationResult {
  const strict = options.strict ?? false;
  const flatValues = flattenValues(values);
  const placeholdersFound = Array.from(new Set(extractPlaceholders(content)));
  const issues: ValidationIssue[] = [];
  const unknown: string[] = [];
  const deprecated: string[] = [];

  for (const ph of placeholdersFound) {
    const canonical = resolveCanonical(ph);
    if (!canonical) {
      unknown.push(ph);
      issues.push({
        level: "error",
        type: "unknown_placeholder",
        placeholder: ph,
        message: `Placeholder desconhecido: "{{${ph}}}" não existe no catálogo canônico.`,
      });
      continue;
    }
    if (canonical !== ph) {
      deprecated.push(ph);
      issues.push({
        level: "warning",
        type: "deprecated_alias",
        placeholder: ph,
        canonical,
        message: `Placeholder "{{${ph}}}" é um alias legado. Use "{{${canonical}}}".`,
      });
    }

    const value = flatValues[canonical];
    const spec = CANONICAL_PLACEHOLDERS.find((p) => p.key === canonical);
    const isEmpty = value === undefined || value === null || value === "";

    if (isEmpty) {
      if (spec?.required) {
        issues.push({
          level: "error",
          type: "missing_required_value",
          placeholder: ph,
          canonical,
          message: `Campo obrigatório ausente: ${spec.label} ({{${canonical}}}).`,
        });
      } else if (strict) {
        issues.push({
          level: "error",
          type: "null_value",
          placeholder: ph,
          canonical,
          message: `Valor nulo/indefinido para {{${canonical}}}.`,
        });
      } else {
        issues.push({
          level: "warning",
          type: "orphan_placeholder",
          placeholder: ph,
          canonical,
          message: `Placeholder {{${canonical}}} sem valor — será preenchido com marcador de pendência.`,
        });
      }
    }
  }

  return {
    ok: issues.every((i) => i.level !== "error"),
    issues,
    placeholdersFound,
    unknown,
    deprecated,
  };
}

/** Valida e lança exceção se houver qualquer erro. */
export function assertValid(
  content: string,
  values: Record<string, unknown>,
  options?: { strict?: boolean },
): ValidationResult {
  const result = validateTemplate(content, values, options);
  if (!result.ok) throw new DocumentValidationException(result);
  return result;
}

/** Achata { cliente: { nome: "x" } } -> { "cliente.nome": "x" }. */
export function flattenValues(input: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenValues(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Auditoria estática de um template (sem valores). Detecta apenas problemas estruturais. */
export function auditTemplate(content: string | null | undefined): {
  placeholders: string[];
  unknown: string[];
  deprecated: { from: string; to: string }[];
  valid: string[];
} {
  const placeholders = Array.from(new Set(extractPlaceholders(content)));
  const unknown: string[] = [];
  const deprecated: { from: string; to: string }[] = [];
  const valid: string[] = [];
  for (const ph of placeholders) {
    const canonical = resolveCanonical(ph);
    if (!canonical) unknown.push(ph);
    else if (canonical !== ph) deprecated.push({ from: ph, to: canonical });
    else valid.push(ph);
  }
  return { placeholders, unknown, deprecated, valid };
}

export { CANONICAL_PLACEHOLDERS, CANONICAL_KEYS, ALIAS_TO_CANONICAL };
export type { PlaceholderSpec };
