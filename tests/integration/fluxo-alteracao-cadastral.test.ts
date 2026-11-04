import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Alteração Cadastral do Proprietário (NORMAM-211/DPC Anexo 2-C / Item 0213)", () => {
  it("deve conter o Requerimento de Alteração Cadastral no catálogo oficial com metadados auditados", () => {
    const tpl = getCatalogTemplateBySlug("req-alteracao-cadastral");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Alteração Cadastral do Proprietário");
    expect(tpl?.code).toBe("REQ-CAD");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("item 0213");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.aliases.codes).toContain("doc_req_alteracao_cadastral");
    expect(tpl?.aliases.codes).toContain("REQ-CAD");
    expect(tpl?.aliases.codes).toContain("ALT_CADASTRO");
  });

  it("deve exigir endereço completo além de identificação do titular", () => {
    const tpl = getCatalogTemplateBySlug("req-alteracao-cadastral")!;
    const titularSemEndereco = { name: "Carlos Eduardo Silveira", cpf_cnpj: "123.456.789-00", address: "" };
    const navio = { name: "MAR AZUL IV", registration_number: "381-987654-2" };
    const staff = { name: "Despachante Naval" };

    const val1 = checkTemplateMissingRequirements(tpl, titularSemEndereco, navio, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Endereço Completo");

    const titularCompleto = {
      name: "Carlos Eduardo Silveira",
      cpf_cnpj: "123.456.789-00",
      address: "Avenida Beira Mar, 1500",
      city: "Santos",
    };
    const val2 = checkTemplateMissingRequirements(tpl, titularCompleto, navio, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de Alteração Cadastral no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-cad-global",
        code: "REQ-CAD",
        name: "Requerimento Alteração Cadastral Global",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-cad",
        code: "REQ-CAD",
        name: "Requerimento Alteração Cadastral Empresa",
        is_global: false,
        company_id: "comp-nav-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("req-alteracao-cadastral")!;
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-outra");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-req-cad-global");

    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-cad");
  });

  it("deve conter o documento devidamente catalogado em OUTPUT_DOCS_CATALOG", () => {
    const docCad = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_req_alteracao_cadastral");
    expect(docCad).toBeDefined();
    expect(docCad?.officialSource).toContain("NORMAM-211/DPC, Anexo 2-C");
    expect(docCad?.officialSource).toContain("item 0213");
    expect(docCad?.documentType).toBe("official_form");
    expect(docCad?.signerRole).toBe("Proprietário Requerente");
  });
});
