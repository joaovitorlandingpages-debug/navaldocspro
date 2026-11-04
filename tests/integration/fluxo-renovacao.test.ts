import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Renovação de TIE/TIEM (NORMAM-211/DPC Item 2.7)", () => {
  it("deve conter a Declaração de Manutenção e Condições Operacionais no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("decl-manutencao-renov");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Declaração de Manutenção e Condições Operacionais");
    expect(tpl?.officialSource).toContain("item 2.7");
    expect(tpl?.officialSource).toContain("Lei Federal nº 7.115/1983");
    expect(tpl?.aliases.codes).toContain("doc_decl_renov");
    expect(tpl?.aliases.codes).toContain("DEC-OPER");
    expect(tpl?.aliases.codes).toContain("DECL_RENOV");
  });

  it("deve conter o Requerimento de Renovação de TIE/TIEM (Anexo 2-C) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-renovacao-tie");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Renovação de TIE/TIEM");
    expect(tpl?.officialSource).toContain("item 2.7");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_renov");
    expect(tpl?.aliases.codes).toContain("REQ-RENOV");
  });

  it("deve exigir número de inscrição da embarcação para renovação", () => {
    const tpl = getCatalogTemplateBySlug("req-renovacao-tie")!;
    const customer = { name: "Carlos Eduardo", cpf_cnpj: "123.456.789-00", address: "Av Beira Mar", city: "Santos" };
    const vesselSemInscricao = { name: "Vento Sul III", registration_number: "" };
    const staff = { name: "Despachante Silva" };

    const val1 = checkTemplateMissingRequirements(tpl, customer, vesselSemInscricao, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Número de Inscrição da Embarcação");

    const vesselComInscricao = { name: "Vento Sul III", registration_number: "381-987654-2" };
    const val2 = checkTemplateMissingRequirements(tpl, customer, vesselComInscricao, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver os templates de renovação na esteira com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-renov",
        code: "REQ-RENOV",
        name: "Requerimento de Renovação de TIE/TIEM",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-decl-renov",
        code: "DEC-OPER",
        name: "Declaração de Manutenção e Condições Operacionais",
        is_global: true,
        company_id: null,
      },
    ];

    const tplReq = getCatalogTemplateBySlug("req-renovacao-tie")!;
    const resReq = resolveCatalogTemplate(tplReq, mockDbTemplates as any, "comp-123");
    expect(resReq.dbTemplateId).toBe("uuid-db-req-renov");

    const tplDecl = getCatalogTemplateBySlug("decl-manutencao-renov")!;
    const resDecl = resolveCatalogTemplate(tplDecl, mockDbTemplates as any, "comp-123");
    expect(resDecl.dbTemplateId).toBe("uuid-db-decl-renov");
  });

  it("deve conter os documentos de renovação devidamente catalogados no novo-pedido", () => {
    const docsRenov = OUTPUT_DOCS_CATALOG.filter((d) => d.serviceId === "renovacao");
    expect(docsRenov.length).toBeGreaterThanOrEqual(2);

    const reqDoc = docsRenov.find((d) => d.id === "doc_req_renov");
    expect(reqDoc).toBeDefined();
    expect(reqDoc?.officialSource).toContain("Anexo 2-C");
    expect(reqDoc?.officialSource).toContain("item 2.7");

    const declDoc = docsRenov.find((d) => d.id === "doc_decl_renov");
    expect(declDoc).toBeDefined();
    expect(declDoc?.officialSource).toContain("item 2.7");
    expect(declDoc?.officialSource).toContain("7.115/1983");
  });
});

