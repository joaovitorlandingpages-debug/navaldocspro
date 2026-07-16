/**
 * Sprint 4D.5 — Fatia 3
 * Análise estrutural de templates: status, duplicações, versões, uso.
 */
import type {
  TemplateSnapshot,
  ProcessTypeRequirement,
  CoverageIssue,
} from "./types";

export interface TemplateAnalysis {
  published: string[];
  drafts: string[];
  archived: string[];
  duplicated: string[];           // template_ids duplicados por (name+category)
  unused: string[];               // template_ids não referenciados em nenhum requirement
  outdatedVersions: string[];     // publicados sem versão publicada (published_version == null)
  noStructure: string[];
  issues: CoverageIssue[];
}

export function analyzeTemplates(
  templates: TemplateSnapshot[],
  requirements: ProcessTypeRequirement[],
): TemplateAnalysis {
  const published: string[] = [];
  const drafts: string[] = [];
  const archived: string[] = [];
  const noStructure: string[] = [];
  const outdated: string[] = [];
  const issues: CoverageIssue[] = [];

  const referenced = new Set(requirements.map((r) => r.template_id));
  const bySignature = new Map<string, string[]>();

  for (const t of templates) {
    const sig = `${(t.name ?? "").trim().toLowerCase()}|${(t.category ?? "").trim().toLowerCase()}`;
    const arr = bySignature.get(sig) ?? [];
    arr.push(t.id);
    bySignature.set(sig, arr);

    if (t.status === "archived") {
      archived.push(t.id);
      issues.push({
        severity: "info",
        code: "template_archived",
        template_id: t.id,
        message: `Template "${t.name}" está arquivado.`,
      });
      continue;
    }
    if (!t.is_active) {
      issues.push({
        severity: "warning",
        code: "template_inactive",
        template_id: t.id,
        message: `Template "${t.name}" está inativo.`,
      });
    }
    if (t.status === "draft") {
      drafts.push(t.id);
      issues.push({
        severity: "warning",
        code: "template_draft",
        template_id: t.id,
        message: `Template "${t.name}" está em rascunho.`,
      });
      continue;
    }
    if (t.status === "published") {
      published.push(t.id);
      if (t.published_version == null) {
        outdated.push(t.id);
        issues.push({
          severity: "error",
          code: "template_no_published_version",
          template_id: t.id,
          message: `Template "${t.name}" marcado como publicado mas sem versão publicada.`,
        });
      }
      if (!t.has_structure) {
        noStructure.push(t.id);
        issues.push({
          severity: "warning",
          code: "template_no_structure",
          template_id: t.id,
          message: `Template "${t.name}" não possui estrutura mínima.`,
        });
      }
    }
  }

  const duplicated: string[] = [];
  for (const ids of bySignature.values()) {
    if (ids.length > 1) {
      duplicated.push(...ids);
      for (const id of ids) {
        issues.push({
          severity: "warning",
          code: "template_duplicated",
          template_id: id,
          message: `Template duplicado detectado (mesmo nome + categoria).`,
        });
      }
    }
  }

  const unused: string[] = [];
  for (const t of templates) {
    if (!referenced.has(t.id)) {
      unused.push(t.id);
      issues.push({
        severity: "info",
        code: "template_unused",
        template_id: t.id,
        message: `Template "${t.name}" não é exigido por nenhum tipo de processo.`,
      });
    }
  }

  return {
    published,
    drafts,
    archived,
    duplicated,
    unused,
    outdatedVersions: outdated,
    noStructure,
    issues,
  };
}
