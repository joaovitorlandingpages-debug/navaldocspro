/**
 * Sprint 4D.5 — Fatia 3
 * Analisa mapeamentos de campos de templates.
 *
 * Um mapeamento é considerado válido quando:
 *  - possui mapping_path não vazio;
 *  - o namespace raiz do mapping_path é conhecido
 *    (customer|vessel|process|user|company|engineer|extra_data|sistema);
 *  - segmentos são no formato snake_case.
 *
 * Campo obrigatório sem mapping é considerado "missingField".
 */
import type {
  TemplateFieldSnapshot,
  TemplateSnapshot,
  CoverageIssue,
} from "./types";

const KNOWN_ROOTS = new Set([
  "customer",
  "cliente",
  "vessel",
  "embarcacao",
  "motor",
  "process",
  "processo",
  "user",
  "engineer",
  "engenheiro",
  "company",
  "empresa",
  "procurador",
  "outorgado",
  "extra_data",
  "sistema",
]);

const SEGMENT = /^[a-z][a-z0-9_]*$/;

export interface MappingAnalysis {
  brokenMappings: Array<{ template_id: string; field_key: string; mapping_path: string | null }>;
  missingFields: Array<{ template_id: string; field_key: string }>;
  issues: CoverageIssue[];
}

export function analyzeMappings(
  templates: TemplateSnapshot[],
  fields: TemplateFieldSnapshot[],
): MappingAnalysis {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const broken: MappingAnalysis["brokenMappings"] = [];
  const missing: MappingAnalysis["missingFields"] = [];
  const issues: CoverageIssue[] = [];

  for (const f of fields) {
    const t = templateById.get(f.template_id);
    const name = t?.name ?? f.template_id;
    const path = (f.mapping_path ?? "").trim();

    if (!path) {
      if (f.is_required) {
        missing.push({ template_id: f.template_id, field_key: f.field_key });
        issues.push({
          severity: "error",
          code: "required_field_no_mapping",
          template_id: f.template_id,
          message: `Campo obrigatório "${f.field_key}" sem mapeamento em ${name}.`,
        });
      }
      continue;
    }

    const parts = path.split(".");
    const rootOk = KNOWN_ROOTS.has(parts[0] ?? "");
    const shapeOk = parts.length >= 2 && parts.every((p) => SEGMENT.test(p));
    if (!rootOk || !shapeOk) {
      broken.push({ template_id: f.template_id, field_key: f.field_key, mapping_path: path });
      issues.push({
        severity: "error",
        code: "mapping_broken",
        template_id: f.template_id,
        message: `Mapeamento inválido "${path}" no campo "${f.field_key}" de ${name}.`,
      });
    }
  }

  return { brokenMappings: broken, missingFields: missing, issues };
}
