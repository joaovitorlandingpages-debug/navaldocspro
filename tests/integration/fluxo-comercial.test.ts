import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Embarcação Comercial / Profissional (NORMAM-201/DPC Anexo 2-E)", () => {
  it("deve conter o Requerimento de Embarcação Profissional / Comercial no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-comercial-prof");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Embarcação Profissional / Comercial");
    expect(tpl?.category).toBe("profissional");
    expect(tpl?.officialSource).toContain("NORMAM-201/DPC");
    expect(tpl?.officialSource).toContain("Anexo 2-E");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_comercial");
    expect(tpl?.aliases.codes).toContain("REQ-PROF");
    expect(tpl?.aliases.codes).toContain("REQ_COMERCIAL");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-E-201");
  });

  it("deve validar campos obrigatórios para regularização de embarcação comercial", () => {
    const tpl = getCatalogTemplateBySlug("req-comercial-prof")!;
    const armador = { name: "Marítima Santos Ltda", cpf_cnpj: "12.345.678/0001-90", address: "Av Portuária, 450", city: "Santos" };
    const navioSemNome = { name: "", registration_number: "" };
    const staff = { name: "Despachante Silva" };

    const val1 = checkTemplateMissingRequirements(tpl, armador, navioSemNome, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome da Embarcação");

    const navioCompleto = { name: "Estrela de Santos", registration_number: "" };
    const val2 = checkTemplateMissingRequirements(tpl, armador, navioCompleto, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template comercial no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-prof",
        code: "REQ-PROF",
        name: "Requerimento de Inscrição Comercial",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-comercial",
        code: "REQ-PROF",
        name: "Requerimento Comercial Empresa X",
        is_global: false,
        company_id: "comp-nav-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("req-comercial-prof")!;
    // Resolução global
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-other");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-req-prof");

    // Resolução da empresa
    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-comercial");
  });

  it("deve conter o documento comercial devidamente catalogado em processes.novo-pedido.tsx", () => {
    const docComercial = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_req_comercial");
    expect(docComercial).toBeDefined();
    expect(docComercial?.officialSource).toContain("NORMAM-201/DPC");
    expect(docComercial?.officialSource).toContain("Anexo 2-E");
    expect(docComercial?.documentType).toBe("official_form");
  });
});

