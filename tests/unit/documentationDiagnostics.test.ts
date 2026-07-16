import { describe, it, expect } from "vitest";
import { buildDiagnostic, classifyHealth, healthLabel } from "@/services/documentation/diagnostics";
import type { CoverageResult } from "@/services/documentation/types";

function base(overrides: Partial<CoverageResult> = {}): CoverageResult {
  return {
    coverage: 100,
    healthScore: 100,
    requiredDocuments: [],
    configuredDocuments: [],
    publishedDocuments: [],
    draftDocuments: [],
    archivedDocuments: [],
    missingDocuments: [],
    duplicatedTemplates: [],
    brokenMappings: [],
    invalidPlaceholders: [],
    missingFields: [],
    unusedTemplates: [],
    outdatedVersions: [],
    warnings: [],
    issues: [],
    processes: [],
    ...overrides,
  };
}

describe("classifyHealth", () => {
  it("classifies tiers by score", () => {
    expect(classifyHealth(95)).toBe("ready");
    expect(classifyHealth(80)).toBe("attention");
    expect(classifyHealth(60)).toBe("incomplete");
    expect(classifyHealth(20)).toBe("critical");
  });
  it("labels are non-empty", () => {
    for (const t of ["ready","attention","incomplete","critical"] as const) {
      expect(healthLabel(t).length).toBeGreaterThan(0);
    }
  });
});

describe("buildDiagnostic", () => {
  it("100% clean → nada a fazer", () => {
    const s = buildDiagnostic(base({ coverage: 100 }));
    expect(s).toContain("100%");
    expect(s).toContain("Nenhuma ação");
  });

  it("relata processos incompletos com o pior primeiro", () => {
    const s = buildDiagnostic(base({
      coverage: 60,
      processes: [
        { process_type_id: "a", process_type_name: "Transferência", required: ["t1","t2"], configured: ["t1"], covered: ["t1"], missing: ["t2"], coverage: 50, status: "partial", issues: [], warnings: [] },
        { process_type_id: "b", process_type_name: "Renovação",     required: ["t3"],      configured: ["t3"], covered: [],     missing: ["t3"], coverage: 0,  status: "missing", issues: [], warnings: [] },
      ],
    }));
    expect(s).toContain("Renovação");
    expect(s).toContain("60%");
  });

  it("lista contadores estruturais quando existem", () => {
    const s = buildDiagnostic(base({
      coverage: 82,
      draftDocuments: ["a","b","c"],
      brokenMappings: [{ template_id: "x", field_key: "f", mapping_path: "y" }],
    }));
    expect(s).toContain("3 modelo(s) em rascunho");
    expect(s).toContain("1 mapeamento(s) quebrado(s)");
  });

  it("é determinístico (mesma entrada → mesma saída)", () => {
    const input = base({ coverage: 75, draftDocuments: ["a"] });
    expect(buildDiagnostic(input)).toBe(buildDiagnostic(input));
  });

  it("um processo incompleto no singular", () => {
    const s = buildDiagnostic(base({
      coverage: 90,
      processes: [
        { process_type_id: "a", process_type_name: "Só um", required: ["t1","t2"], configured: ["t1"], covered: ["t1"], missing: ["t2"], coverage: 50, status: "partial", issues: [], warnings: [] },
      ],
    }));
    expect(s).toContain("1 tipo de processo está incompleto");
    expect(s).toContain("Só um");
  });

  it("relata modelos obrigatórios ausentes", () => {
    const s = buildDiagnostic(base({ coverage: 40, missingDocuments: ["m1","m2"] }));
    expect(s).toContain("2 modelo(s) obrigatório(s) ausente(s)");
  });
});
