import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Habilitação Náutica de Amador - CHA (NORMAM-211/DPC Anexo 5-H)", () => {
  it("deve conter o Requerimento de Amador no catálogo oficial com metadados auditados", () => {
    const tpl = getCatalogTemplateBySlug("req-habilitacao-cha");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento para Habilitação Náutica de Amador (CHA)");
    expect(tpl?.code).toBe("REQ-CHA");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 5-H");
    expect(tpl?.aliases.codes).toContain("doc_req_cha");
    expect(tpl?.aliases.codes).toContain("REQ-CHA");
    expect(tpl?.aliases.codes).toContain("ANEXO-5-H");
    expect(tpl?.aliases.names).toContain("Requerimento de Amador (Anexo 5-H)");
  });

  it("deve validar campos obrigatórios do amador requerente", () => {
    const tpl = getCatalogTemplateBySlug("req-habilitacao-cha")!;
    const amadorIncompleto = { name: "", cpf_cnpj: "" };
    const navio = { name: "N/A" };
    const staff = { name: "Despachante Naval" };

    const val1 = checkTemplateMissingRequirements(tpl, amadorIncompleto, navio, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome do Cliente");

    const amadorCompleto = { name: "Carlos Eduardo Silveira", cpf_cnpj: "123.456.789-00" };
    const val2 = checkTemplateMissingRequirements(tpl, amadorCompleto, navio, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de CHA com prioridade de empresa ou global", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-cha-global",
        code: "REQ-CHA",
        name: "Requerimento de Amador Oficial",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-cha",
        code: "REQ-CHA",
        name: "Requerimento de Amador Náutica Santos",
        is_global: false,
        company_id: "comp-nav-99",
      },
    ];

    const tpl = getCatalogTemplateBySlug("req-habilitacao-cha")!;
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-outra");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-req-cha-global");

    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-99");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-cha");
  });

  it("deve conter o documento devidamente catalogado em OUTPUT_DOCS_CATALOG", () => {
    const docCha = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_req_cha");
    expect(docCha).toBeDefined();
    expect(docCha?.officialSource).toContain("NORMAM-211/DPC, Anexo 5-H");
    expect(docCha?.documentType).toBe("official_form");
    expect(docCha?.signerRole).toBe("Candidato / Amador Requerente");
  });
});

