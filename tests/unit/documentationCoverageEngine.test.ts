import { describe, it, expect } from "vitest";
import {
  computeCoverage,
  computeHealthScore,
  analyzeMappings,
  analyzePlaceholders,
  analyzeTemplates,
} from "@/services/documentation";
import type {
  CoverageSnapshotInput,
  TemplateSnapshot,
  TemplateFieldSnapshot,
  ProcessTypeRequirement,
} from "@/services/documentation/types";

function tpl(over: Partial<TemplateSnapshot> = {}): TemplateSnapshot {
  return {
    id: "t1",
    name: "Modelo 1",
    category: "art",
    is_active: true,
    status: "published",
    published_version: 1,
    base_content: "Cliente: {{cliente.nome}}",
    has_structure: true,
    ...over,
  };
}
function req(over: Partial<ProcessTypeRequirement> = {}): ProcessTypeRequirement {
  return {
    process_type_id: "p1",
    process_type_name: "Inscrição",
    template_id: "t1",
    is_mandatory: true,
    ...over,
  };
}
function field(over: Partial<TemplateFieldSnapshot> = {}): TemplateFieldSnapshot {
  return {
    id: "f1",
    template_id: "t1",
    field_key: "cliente_nome",
    is_required: true,
    mapping_path: "customer.name",
    ...over,
  };
}
function snap(over: Partial<CoverageSnapshotInput> = {}): CoverageSnapshotInput {
  return {
    templates: [tpl()],
    fields: [field()],
    requirements: [req()],
    ...over,
  };
}

describe("DocumentationCoverageEngine — cobertura", () => {
  it("100% quando o template obrigatório está publicado, ativo e válido", () => {
    const r = computeCoverage(snap());
    expect(r.coverage).toBe(100);
    expect(r.missingDocuments).toEqual([]);
    expect(r.processes[0].status).toBe("ok");
    expect(r.healthScore).toBeGreaterThanOrEqual(90);
  });

  it("0% quando template exigido está em draft (não conta como coberto)", () => {
    const r = computeCoverage(snap({ templates: [tpl({ status: "draft" })] }));
    expect(r.coverage).toBe(0);
    expect(r.draftDocuments).toContain("t1");
    expect(r.processes[0].status).toBe("missing");
  });

  it("0% quando template está arquivado", () => {
    const r = computeCoverage(snap({ templates: [tpl({ status: "archived" })] }));
    expect(r.coverage).toBe(0);
    expect(r.archivedDocuments).toContain("t1");
  });

  it("90% aproximado quando 9/10 obrigatórios cobertos", () => {
    const templates: TemplateSnapshot[] = [];
    const reqs: ProcessTypeRequirement[] = [];
    for (let i = 0; i < 10; i++) {
      templates.push(tpl({ id: `t${i}`, name: `M${i}` }));
      reqs.push(req({ template_id: `t${i}` }));
    }
    templates[9] = tpl({ id: "t9", name: "M9", status: "draft" });
    const r = computeCoverage({ templates, fields: [], requirements: reqs });
    expect(r.coverage).toBe(90);
    expect(r.missingDocuments).toEqual(["t9"]);
    expect(r.processes[0].status).toBe("partial");
  });

  it("mapping quebrado invalida a cobertura do template", () => {
    const r = computeCoverage(
      snap({ fields: [field({ mapping_path: "coisa_estranha" })] }),
    );
    expect(r.brokenMappings.length).toBe(1);
    expect(r.coverage).toBe(0);
    expect(r.issues.some((i) => i.code === "mapping_broken")).toBe(true);
  });

  it("placeholder inválido invalida cobertura e gera erro", () => {
    const r = computeCoverage(
      snap({ templates: [tpl({ base_content: "Olá {{coisa.qualquer}}" })] }),
    );
    expect(r.invalidPlaceholders.length).toBe(1);
    expect(r.issues.some((i) => i.code === "placeholder_unknown")).toBe(true);
    expect(r.coverage).toBe(0);
  });

  it("campo obrigatório sem mapping conta como missingField e invalida cobertura", () => {
    const r = computeCoverage(
      snap({ fields: [field({ mapping_path: null })] }),
    );
    expect(r.missingFields.length).toBe(1);
    expect(r.coverage).toBe(0);
  });

  it("template inativo não conta como coberto", () => {
    const r = computeCoverage(snap({ templates: [tpl({ is_active: false })] }));
    expect(r.coverage).toBe(0);
  });

  it("sem published_version, template não conta e marca outdatedVersion", () => {
    const r = computeCoverage(snap({ templates: [tpl({ published_version: null })] }));
    expect(r.outdatedVersions).toContain("t1");
    expect(r.coverage).toBe(0);
  });

  it("duplicados são detectados por nome+categoria", () => {
    const r = computeCoverage(
      snap({
        templates: [tpl({ id: "a" }), tpl({ id: "b" })],
        requirements: [req({ template_id: "a" })],
      }),
    );
    expect(r.duplicatedTemplates.sort()).toEqual(["a", "b"]);
  });

  it("templates não referenciados por nenhum requirement são 'unused'", () => {
    const r = computeCoverage(
      snap({
        templates: [tpl({ id: "a" }), tpl({ id: "b", name: "Outro" })],
        requirements: [req({ template_id: "a" })],
      }),
    );
    expect(r.unusedTemplates).toContain("b");
  });

  it("sem requirements devolve coverage 100 (nada exigido)", () => {
    const r = computeCoverage({ templates: [], fields: [], requirements: [] });
    expect(r.coverage).toBe(100);
    expect(r.healthScore).toBeGreaterThanOrEqual(90);
  });
});

describe("computeHealthScore", () => {
  it("100 quando tudo zerado e cobertura 100", () => {
    expect(
      computeHealthScore({
        coverage: 100,
        missingCount: 0,
        draftCount: 0,
        brokenMappingsCount: 0,
        invalidPlaceholdersCount: 0,
        missingFieldsCount: 0,
        outdatedVersionsCount: 0,
        incompleteProcessTypes: 0,
      }),
    ).toBe(100);
  });
  it("penaliza mapping quebrado mais que draft", () => {
    const draft = computeHealthScore({
      coverage: 100, missingCount: 0, draftCount: 1,
      brokenMappingsCount: 0, invalidPlaceholdersCount: 0,
      missingFieldsCount: 0, outdatedVersionsCount: 0, incompleteProcessTypes: 0,
    });
    const broken = computeHealthScore({
      coverage: 100, missingCount: 0, draftCount: 0,
      brokenMappingsCount: 1, invalidPlaceholdersCount: 0,
      missingFieldsCount: 0, outdatedVersionsCount: 0, incompleteProcessTypes: 0,
    });
    expect(broken).toBeLessThan(draft);
  });
  it("nunca abaixo de 0", () => {
    expect(
      computeHealthScore({
        coverage: 0, missingCount: 99, draftCount: 99,
        brokenMappingsCount: 99, invalidPlaceholdersCount: 99,
        missingFieldsCount: 99, outdatedVersionsCount: 99, incompleteProcessTypes: 99,
      }),
    ).toBe(0);
  });
});

describe("analisadores auxiliares", () => {
  it("analyzeTemplates classifica draft/archived/published", () => {
    const a = analyzeTemplates(
      [tpl({ id: "a" }), tpl({ id: "b", status: "draft" }), tpl({ id: "c", status: "archived" })],
      [],
    );
    expect(a.published).toEqual(["a"]);
    expect(a.drafts).toEqual(["b"]);
    expect(a.archived).toEqual(["c"]);
    expect(a.unused.sort()).toEqual(["a", "b", "c"]);
  });
  it("analyzeMappings aceita mapping válido customer.name", () => {
    const a = analyzeMappings([tpl()], [field()]);
    expect(a.brokenMappings).toEqual([]);
    expect(a.missingFields).toEqual([]);
  });
  it("analyzePlaceholders normaliza alias e detecta desconhecido", () => {
    const a = analyzePlaceholders([
      tpl({ id: "x", base_content: "{{customer_name}} {{coisa}}" }),
    ]);
    expect(a.deprecated.map((d) => d.placeholder)).toContain("customer_name");
    expect(a.invalid.map((i) => i.placeholder)).toContain("coisa");
  });
});
