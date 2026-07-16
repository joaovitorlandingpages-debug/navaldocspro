/**
 * Sprint 4D.5 — Fatia 3
 * DocumentationCoverageEngine — fonte única de verdade da Central de
 * Documentação.
 *
 * Recebe snapshots (loader dedicado carrega os dados agregados; sem N+1) e
 * devolve o resultado normalizado. A UI apenas consome.
 */
import type {
  CoverageIssue,
  CoverageResult,
  CoverageSnapshotInput,
  ProcessTypeCoverage,
  ProcessTypeRequirement,
  TemplateSnapshot,
} from "./types";
import { analyzeTemplates } from "./templateAnalyzer";
import { analyzeMappings } from "./mappingAnalyzer";
import { analyzePlaceholders } from "./placeholderAnalyzer";
import { computeHealthScore } from "./healthEngine";

/**
 * Um template é coberto quando:
 *   - existe
 *   - is_active === true
 *   - status === 'published'
 *   - published_version != null
 *   - has_structure === true
 *   - não possui mapping quebrado
 *   - não possui placeholder inválido
 *   - não possui campo obrigatório sem mapping
 */
function computeCoveredSet(
  input: CoverageSnapshotInput,
  brokenTemplateIds: Set<string>,
  invalidPlaceholderTemplateIds: Set<string>,
  missingFieldTemplateIds: Set<string>,
): Set<string> {
  const covered = new Set<string>();
  for (const t of input.templates) {
    if (!t.is_active) continue;
    if (t.status !== "published") continue;
    if (t.published_version == null) continue;
    if (!t.has_structure) continue;
    if (brokenTemplateIds.has(t.id)) continue;
    if (invalidPlaceholderTemplateIds.has(t.id)) continue;
    if (missingFieldTemplateIds.has(t.id)) continue;
    covered.add(t.id);
  }
  return covered;
}

function groupRequirementsByProcess(
  requirements: ProcessTypeRequirement[],
): Map<string, ProcessTypeRequirement[]> {
  const map = new Map<string, ProcessTypeRequirement[]>();
  for (const r of requirements) {
    const arr = map.get(r.process_type_id) ?? [];
    arr.push(r);
    map.set(r.process_type_id, arr);
  }
  return map;
}

function computeProcessCoverage(
  requirements: ProcessTypeRequirement[],
  templates: TemplateSnapshot[],
  covered: Set<string>,
  issuesByTemplate: Map<string, CoverageIssue[]>,
): ProcessTypeCoverage[] {
  const byProcess = groupRequirementsByProcess(requirements);
  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const results: ProcessTypeCoverage[] = [];

  for (const [ptId, reqs] of byProcess.entries()) {
    const name = reqs[0]?.process_type_name ?? ptId;
    const requiredIds = reqs.filter((r) => r.is_mandatory).map((r) => r.template_id);
    const configuredIds = reqs.map((r) => r.template_id).filter((id) => templatesById.has(id));
    const coveredIds = requiredIds.filter((id) => covered.has(id));
    const missingIds = requiredIds.filter((id) => !covered.has(id));

    const localIssues: CoverageIssue[] = [];
    const localWarnings: CoverageIssue[] = [];
    for (const id of reqs.map((r) => r.template_id)) {
      const bucket = issuesByTemplate.get(id) ?? [];
      for (const iss of bucket) {
        (iss.severity === "error" ? localIssues : localWarnings).push({
          ...iss,
          process_type_id: ptId,
        });
      }
    }
    for (const missingId of missingIds) {
      if (!templatesById.has(missingId)) {
        localIssues.push({
          severity: "error",
          code: "template_missing",
          template_id: missingId,
          process_type_id: ptId,
          message: `Modelo obrigatório ausente para o processo "${name}".`,
        });
      }
    }

    const coverage = requiredIds.length === 0
      ? 100
      : Math.round((coveredIds.length / requiredIds.length) * 100);

    let status: ProcessTypeCoverage["status"];
    if (requiredIds.length === 0) status = "empty";
    else if (coverage === 100) status = "ok";
    else if (coverage === 0) status = "missing";
    else status = "partial";

    results.push({
      process_type_id: ptId,
      process_type_name: name,
      required: requiredIds,
      configured: configuredIds,
      covered: coveredIds,
      missing: missingIds,
      coverage,
      status,
      issues: localIssues,
      warnings: localWarnings,
    });
  }

  return results.sort((a, b) => a.process_type_name.localeCompare(b.process_type_name));
}

function indexIssuesByTemplate(issues: CoverageIssue[]): Map<string, CoverageIssue[]> {
  const map = new Map<string, CoverageIssue[]>();
  for (const i of issues) {
    if (!i.template_id) continue;
    const arr = map.get(i.template_id) ?? [];
    arr.push(i);
    map.set(i.template_id, arr);
  }
  return map;
}

export function computeCoverage(input: CoverageSnapshotInput): CoverageResult {
  const tpl = analyzeTemplates(input.templates, input.requirements);
  const map = analyzeMappings(input.templates, input.fields);
  const ph = analyzePlaceholders(input.templates);

  const brokenTemplateIds = new Set(map.brokenMappings.map((b) => b.template_id));
  const invalidPhTemplateIds = new Set(ph.invalid.map((p) => p.template_id));
  const missingFieldTemplateIds = new Set(map.missingFields.map((m) => m.template_id));

  const covered = computeCoveredSet(
    input,
    brokenTemplateIds,
    invalidPhTemplateIds,
    missingFieldTemplateIds,
  );

  const allIssues: CoverageIssue[] = [...tpl.issues, ...map.issues, ...ph.issues];
  const issuesByTemplate = indexIssuesByTemplate(allIssues);

  const processes = computeProcessCoverage(
    input.requirements,
    input.templates,
    covered,
    issuesByTemplate,
  );

  const overallCoverage = processes.length === 0
    ? 100
    : Math.round(processes.reduce((s, p) => s + p.coverage, 0) / processes.length);

  const requiredIds = Array.from(
    new Set(input.requirements.filter((r) => r.is_mandatory).map((r) => r.template_id)),
  );
  const configuredIds = input.templates.map((t) => t.id);
  const missingIds = requiredIds.filter((id) => !covered.has(id));
  const incompleteProcessTypes = processes.filter((p) => p.coverage < 100).length;

  const health = computeHealthScore({
    coverage: overallCoverage,
    missingCount: missingIds.length,
    draftCount: tpl.drafts.length,
    brokenMappingsCount: map.brokenMappings.length,
    invalidPlaceholdersCount: ph.invalid.length,
    missingFieldsCount: map.missingFields.length,
    outdatedVersionsCount: tpl.outdatedVersions.length,
    incompleteProcessTypes,
  });

  const warnings = allIssues.filter((i) => i.severity !== "error");
  const errors = allIssues.filter((i) => i.severity === "error");

  return {
    coverage: overallCoverage,
    healthScore: health,
    requiredDocuments: requiredIds,
    configuredDocuments: configuredIds,
    publishedDocuments: tpl.published,
    draftDocuments: tpl.drafts,
    archivedDocuments: tpl.archived,
    missingDocuments: missingIds,
    duplicatedTemplates: Array.from(new Set(tpl.duplicated)),
    brokenMappings: map.brokenMappings,
    invalidPlaceholders: ph.invalid,
    missingFields: map.missingFields,
    unusedTemplates: tpl.unused,
    outdatedVersions: tpl.outdatedVersions,
    warnings,
    issues: errors,
    processes,
  };
}

export const DocumentationCoverageEngine = { computeCoverage };
