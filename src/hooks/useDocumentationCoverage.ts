/**
 * Sprint 4D.5 — Fatia 4 / Hardening
 * Hook React Query com chave escopada por companyId (evita bleed cross-tenant)
 * e telemetria segura (sem PII / sem snapshots / sem JWT).
 */
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getCurrentCompanyId } from "@/lib/currentCompany";
import { loadDocumentationCoverage } from "@/services/documentation/documentationCoverageLoader";
import { computeCoverage } from "@/services/documentation/coverageEngine";
import type { CoverageResult } from "@/services/documentation/types";
import { telemetry } from "@/utils/telemetry";

export const docsCoverageQueryKey = (companyId: string | null) =>
  ["docs-central", "coverage", companyId ?? "anon"] as const;

/** Mantido para compat; prefira `docsCoverageQueryKey(companyId)`. */
export const DOCS_COVERAGE_QUERY_KEY = ["docs-central", "coverage"] as const;

export function useDocumentationCoverage() {
  return useQuery<CoverageResult>({
    queryKey: ["docs-central", "coverage", "self"] as const,
    queryFn: async () => {
      const started = performance.now();
      const companyId = await getCurrentCompanyId();
      try {
        const snapshot = await loadDocumentationCoverage(companyId);
        const result = computeCoverage(snapshot);
        void telemetry.track("docs_coverage_loaded", "docs-central", {
          duration_ms: Math.round(performance.now() - started),
          templates: snapshot.templates.length,
          requirements: snapshot.requirements.length,
          issues: result.issues.length,
          warnings: result.warnings.length,
          score: result.healthScore,
          coverage: result.coverage,
        });
        return result;
      } catch (err: any) {
        void telemetry.track("docs_coverage_failed", "docs-central", {
          duration_ms: Math.round(performance.now() - started),
          error: String(err?.message ?? err).slice(0, 200),
        });
        throw err;
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function invalidateDocsCoverage(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: ["docs-central", "coverage"] });
}
