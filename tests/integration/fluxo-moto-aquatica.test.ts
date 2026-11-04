import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Moto Aquática / Jet Ski (NORMAM-212/DPC Anexo 2-A)", () => {
  it("deve conter o Requerimento Específico para Moto Aquática no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-moto-aquatica");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento Específico para Moto Aquática (Jet Ski)");
    expect(tpl?.category).toBe("moto_aquatica");
    expect(tpl?.officialSource).toContain("NORMAM-212/DPC");
    expect(tpl?.officialSource).toContain("Anexo 2-A");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_moto_aquatica");
    expect(tpl?.aliases.codes).toContain("REQ-JET");
    expect(tpl?.aliases.codes).toContain("MOTO_AQUATICA");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-A-212");
  });

  it("deve validar campos obrigatórios para solicitação de moto aquática", () => {
    const tpl = getCatalogTemplateBySlug("req-moto-aquatica")!;
    const customer = { name: "Carlos Eduardo", cpf_cnpj: "123.456.789-00", address: "Av Beira Mar", city: "Santos" };
    const jetSemNome = { name: "", registration_number: "" };
    const staff = { name: "Despachante Silva" };

    const val1 = checkTemplateMissingRequirements(tpl, customer, jetSemNome, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome da Embarcação");

    const jetCompleto = { name: "Trovão Azul", registration_number: "" };
    const val2 = checkTemplateMissingRequirements(tpl, customer, jetCompleto, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de moto aquática no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-jet",
        code: "REQ-JET",
        name: "Requerimento para Moto Aquática",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-jet",
        code: "REQ-JET",
        name: "Requerimento Jet Ski Náutica",
        is_global: false,
        company_id: "comp-jet-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("req-moto-aquatica")!;
    // Resolução global
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-other");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-req-jet");

    // Resolução da empresa
    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-jet-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-jet");
  });

  it("deve conter o documento de moto aquática devidamente catalogado em processes.novo-pedido.tsx", () => {
    const docJet = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_req_moto_aquatica");
    expect(docJet).toBeDefined();
    expect(docJet?.officialSource).toContain("NORMAM-212/DPC");
    expect(docJet?.officialSource).toContain("Anexo 2-A");
    expect(docJet?.documentType).toBe("official_form");
  });
});

