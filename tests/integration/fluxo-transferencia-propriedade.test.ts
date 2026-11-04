import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Transferência de Propriedade (NORMAM-211/DPC)", () => {
  it("deve conter a Autorização de Transferência de Propriedade (Anexo 2-K) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("termo-entrega-transf");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toContain("Autorização de Transferência de Propriedade (Anexo 2-K)");
    expect(tpl?.officialSource).toContain("Anexo 2-K");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_decl_transf");
    expect(tpl?.aliases.codes).toContain("ATPE");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-K");
  });

  it("deve conter o Requerimento de Transferência de Propriedade (Anexo 2-C) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-transferencia");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Transferência de Propriedade");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_transf");
  });

  it("deve validar obrigatoriedade de número de inscrição para a transferência", () => {
    const tpl = getCatalogTemplateBySlug("termo-entrega-transf")!;
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

  it("deve resolver os templates de transferência na esteira de catálogo com prioridade multi-empresa", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-transf",
        code: "REQ-TRANSF",
        name: "Requerimento de Transferência de Propriedade",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-atpe-2k",
        code: "TER-ENTR",
        name: "Autorização de Transferência de Propriedade (Anexo 2-K)",
        is_global: true,
        company_id: null,
      },
    ];

    const tplReq = getCatalogTemplateBySlug("req-transferencia")!;
    const resReq = resolveCatalogTemplate(tplReq, mockDbTemplates as any, "comp-123");
    expect(resReq.dbTemplateId).toBe("uuid-db-req-transf");

    const tplAtpe = getCatalogTemplateBySlug("termo-entrega-transf")!;
    const resAtpe = resolveCatalogTemplate(tplAtpe, mockDbTemplates as any, "comp-123");
    expect(resAtpe.dbTemplateId).toBe("uuid-db-atpe-2k");
  });

  it("deve catalogar os documentos do serviço de transferência em processes.novo-pedido.tsx", () => {
    const docsTransf = OUTPUT_DOCS_CATALOG.filter((d) => d.serviceId === "transferencia");
    expect(docsTransf.length).toBeGreaterThanOrEqual(2);

    const reqDoc = docsTransf.find((d) => d.id === "doc_req_transf");
    expect(reqDoc).toBeDefined();
    expect(reqDoc?.officialSource).toContain("Anexo 2-C");

    const atpeDoc = docsTransf.find((d) => d.id === "doc_decl_transf");
    expect(atpeDoc).toBeDefined();
    expect(atpeDoc?.name).toContain("Anexo 2-K");
    expect(atpeDoc?.officialSource).toContain("Anexo 2-K");
  });
});
