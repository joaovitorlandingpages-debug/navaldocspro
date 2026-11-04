import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Segunda Via de Documento Náutico (NORMAM-211/DPC)", () => {
  it("deve conter a Declaração de Perda / Extravio (Anexo 2-H) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("decl-perda-extravio");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Declaração de Perda / Extravio de Documento Náutico");
    expect(tpl?.officialSource).toContain("Anexo 2-H");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_decl_perda");
    expect(tpl?.aliases.codes).toContain("DEC-PERD");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-H");
  });

  it("deve conter o Requerimento de Segunda Via de Documento Náutico (Anexo 2-C) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-segunda-via-tie");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Segunda Via de Documento Náutico");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_segunda_via");
  });

  it("deve validar obrigatoriedade de número de inscrição da embarcação para a segunda via", () => {
    const tpl = getCatalogTemplateBySlug("decl-perda-extravio")!;
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

  it("deve resolver os templates de segunda via na esteira de catálogo com prioridade multi-empresa", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-2via",
        code: "REQ-2VIA",
        name: "Requerimento de Segunda Via de Documento Náutico",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-decl-perda",
        code: "DEC-PERD",
        name: "Declaração de Perda / Extravio de Documento Náutico",
        is_global: true,
        company_id: null,
      },
    ];

    const tplReq = getCatalogTemplateBySlug("req-segunda-via-tie")!;
    const resReq = resolveCatalogTemplate(tplReq, mockDbTemplates as any, "comp-123");
    expect(resReq.dbTemplateId).toBe("uuid-db-req-2via");

    const tplDecl = getCatalogTemplateBySlug("decl-perda-extravio")!;
    const resDecl = resolveCatalogTemplate(tplDecl, mockDbTemplates as any, "comp-123");
    expect(resDecl.dbTemplateId).toBe("uuid-db-decl-perda");
  });

  it("deve catalogar os documentos do serviço de segunda via em processes.novo-pedido.tsx", () => {
    const docsSegVia = OUTPUT_DOCS_CATALOG.filter((d) => d.serviceId === "segunda_via");
    expect(docsSegVia.length).toBeGreaterThanOrEqual(2);

    const reqDoc = docsSegVia.find((d) => d.id === "doc_req_segunda_via");
    expect(reqDoc).toBeDefined();
    expect(reqDoc?.officialSource).toContain("Anexo 2-C");

    const declDoc = docsSegVia.find((d) => d.id === "doc_decl_perda");
    expect(declDoc).toBeDefined();
    expect(declDoc?.name).toContain("Anexo 2-H");
    expect(declDoc?.officialSource).toContain("Anexo 2-H");
  });
});
