import { describe, it, expect } from "vitest";
import { docsCoverageQueryKey } from "@/hooks/useDocumentationCoverage";

describe("docsCoverageQueryKey", () => {
  it("isola chave por companyId (sem bleed cross-tenant)", () => {
    expect(docsCoverageQueryKey("a")).not.toEqual(docsCoverageQueryKey("b"));
  });
  it("usa sentinela estável quando companyId é null", () => {
    expect(docsCoverageQueryKey(null)).toEqual(["docs-central", "coverage", "anon"]);
  });
  it("é determinística", () => {
    expect(docsCoverageQueryKey("x")).toEqual(docsCoverageQueryKey("x"));
  });
});
