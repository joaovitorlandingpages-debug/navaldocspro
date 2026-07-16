/**
 * Sprint 4D.5 — Fatia 3
 * Analisador de placeholders. Reutiliza o catálogo canônico existente.
 */
import {
  extractPlaceholders,
  resolveCanonical,
} from "@/services/documentPlaceholders";
import type { TemplateSnapshot, CoverageIssue } from "./types";

export interface PlaceholderAnalysis {
  invalid: Array<{ template_id: string; placeholder: string }>;
  deprecated: Array<{ template_id: string; placeholder: string; canonical: string }>;
  issues: CoverageIssue[];
}

export function analyzePlaceholders(templates: TemplateSnapshot[]): PlaceholderAnalysis {
  const invalid: PlaceholderAnalysis["invalid"] = [];
  const deprecated: PlaceholderAnalysis["deprecated"] = [];
  const issues: CoverageIssue[] = [];

  for (const t of templates) {
    if (!t.base_content) continue;
    const found = Array.from(new Set(extractPlaceholders(t.base_content)));
    for (const ph of found) {
      const canonical = resolveCanonical(ph);
      if (!canonical) {
        invalid.push({ template_id: t.id, placeholder: ph });
        issues.push({
          severity: "error",
          code: "placeholder_unknown",
          template_id: t.id,
          placeholder: ph,
          message: `Placeholder desconhecido "{{${ph}}}" em ${t.name}.`,
        });
      } else if (canonical !== ph) {
        deprecated.push({ template_id: t.id, placeholder: ph, canonical });
        issues.push({
          severity: "warning",
          code: "placeholder_deprecated",
          template_id: t.id,
          placeholder: ph,
          message: `Placeholder legado "{{${ph}}}" em ${t.name}; usar "{{${canonical}}}".`,
        });
      }
    }
  }

  return { invalid, deprecated, issues };
}
