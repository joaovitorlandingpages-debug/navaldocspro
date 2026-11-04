import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Alteração de Motor e Comunicação de Transferência (NORMAM-211/DPC)", () => {
  it("deve conter o Requerimento de Alteração de Motor e Termo no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-alteracao-motor");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Alteração de Motor e Termo de Responsabilidade");
    expect(tpl?.officialSource).toContain("item 2.12");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_termo_motor");
    expect(tpl?.aliases.codes).toContain("REQ-MOT");
  });

  it("deve conter a Comunicação de Transferência de Propriedade (Anexo 2-I) no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("comunicacao-transf-anexo-2i");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Comunicação de Transferência de Propriedade (Anexo 2-I)");
    expect(tpl?.officialSource).toContain("Anexo 2-I");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_comunicacao_transf");
    expect(tpl?.aliases.codes).toContain("COM-TRANSF");
  });

  it("deve exigir número de inscrição e potência do motor para alteração de motor", () => {
    const tpl = getCatalogTemplateBySlug("req-alteracao-motor")!;
    const customer = { name: "Carlos Eduardo", cpf_cnpj: "123.456.789-00", address: "Av Beira Mar", city: "Santos" };
    const vesselSemInscricao = { name: "Vento Sul III", registration_number: "", engine_power: "" };
    const staff = { name: "Despachante Silva" };

    const val1 = checkTemplateMissingRequirements(tpl, customer, vesselSemInscricao, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Número de Inscrição da Embarcação");
    expect(val1.missingFields).toContain("Potência do Motor");

    const vesselCompleto = { name: "Vento Sul III", registration_number: "381-987654-2", engine_power: "200 HP" };
    const val2 = checkTemplateMissingRequirements(tpl, customer, vesselCompleto, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver os templates de alteração de motor e comunicação Anexo 2-I no DB", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-mot",
        code: "REQ-MOT",
        name: "Requerimento de Alteração de Motor e Termo de Responsabilidade",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-anexo-2i",
        code: "COM-TRANSF",
        name: "Comunicação de Transferência de Propriedade (Anexo 2-I)",
        is_global: true,
        company_id: null,
      },
    ];

    const tplMot = getCatalogTemplateBySlug("req-alteracao-motor")!;
    const resMot = resolveCatalogTemplate(tplMot, mockDbTemplates as any, "comp-123");
    expect(resMot.dbTemplateId).toBe("uuid-db-req-mot");

    const tpl2I = getCatalogTemplateBySlug("comunicacao-transf-anexo-2i")!;
    const res2I = resolveCatalogTemplate(tpl2I, mockDbTemplates as any, "comp-123");
    expect(res2I.dbTemplateId).toBe("uuid-db-anexo-2i");
  });

  it("deve conter os documentos devidamente catalogados no novo-pedido", () => {
    const docMot = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_termo_motor");
    expect(docMot).toBeDefined();
    expect(docMot?.officialSource).toContain("item 2.12");

    const doc2I = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_comunicacao_transf");
    expect(doc2I).toBeDefined();
    expect(doc2I?.officialSource).toContain("Anexo 2-I");
  });
});

