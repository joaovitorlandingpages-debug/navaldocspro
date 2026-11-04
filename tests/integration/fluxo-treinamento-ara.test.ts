import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Treinamento Náutico para Arrais-Amador (NORMAM-211/DPC Anexo 5-E)", () => {
  it("deve conter o Atestado de Treinamento para Arrais-Amador no catálogo oficial com metadados auditados", () => {
    const tpl = getCatalogTemplateBySlug("atestado-treinamento-ara");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Atestado de Treinamento para Arrais-Amador (Anexo 5-E)");
    expect(tpl?.code).toBe("ATE-ARA");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 5-E");
    expect(tpl?.aliases.codes).toContain("doc_atestado_ara");
    expect(tpl?.aliases.codes).toContain("ATE-ARA");
    expect(tpl?.aliases.codes).toContain("ANEXO-5-E");
  });

  it("deve validar campos obrigatórios do aluno amador", () => {
    const tpl = getCatalogTemplateBySlug("atestado-treinamento-ara")!;
    const alunoIncompleto = { name: "", cpf_cnpj: "" };
    const navio = { name: "N/A" };
    const staff = { name: "Instrutor Náutico" };

    const val1 = checkTemplateMissingRequirements(tpl, alunoIncompleto, navio, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome do Cliente");

    const alunoCompleto = { name: "Carlos Eduardo Silveira", cpf_cnpj: "123.456.789-00" };
    const val2 = checkTemplateMissingRequirements(tpl, alunoCompleto, navio, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de Treinamento ARA no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-treinamento-ara-global",
        code: "ATE-ARA",
        name: "Atestado Treinamento ARA Global",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-treinamento-ara",
        code: "ATE-ARA",
        name: "Atestado Treinamento Escola Náutica Santos",
        is_global: false,
        company_id: "comp-nav-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("atestado-treinamento-ara")!;
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-outra");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-treinamento-ara-global");

    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-treinamento-ara");
  });

  it("deve conter o documento devidamente catalogado em OUTPUT_DOCS_CATALOG", () => {
    const docAtestado = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_atestado_ara");
    expect(docAtestado).toBeDefined();
    expect(docAtestado?.officialSource).toContain("NORMAM-211/DPC, Anexo 5-E");
    expect(docAtestado?.documentType).toBe("official_form");
    expect(docAtestado?.signerRole).toContain("Responsável pelo Estabelecimento");
  });
});

