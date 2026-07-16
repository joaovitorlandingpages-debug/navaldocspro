/**
 * Sprint 4D.5 — Fatia 4
 * Hook React Query para carregar cobertura documental do tenant atual.
 */
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getCurrentCompanyId } from "@/lib/currentCompany";
import { loadDocumentationCoverage } from "@/services/documentation/documentationCoverageLoader";
import { computeCoverage } from "@/services/documentation/coverageEngine";
import type { CoverageResult } from "@/services/documentation/types";

export const DOCS_COVERAGE_QUERY_KEY = ["docs-central", "coverage"] as const;

export function useDocumentationCoverage() {
  return useQuery<CoverageResult>({
    queryKey: DOCS_COVERAGE_QUERY_KEY,
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      const snapshot = await loadDocumentationCoverage(companyId);
      return computeCoverage(snapshot);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function invalidateDocsCoverage(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: DOCS_COVERAGE_QUERY_KEY });
}
