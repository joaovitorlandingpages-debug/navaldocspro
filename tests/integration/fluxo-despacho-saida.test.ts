import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Despacho e Saída de Embarcação (NORMAM-211/DPC Anexo 4-A / NAVSEG)", () => {
  it("deve conter a Comunicação de Saída no catálogo oficial com metadados auditados", () => {
    const tpl = getCatalogTemplateBySlug("comunicacao-despacho");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Comunicação de Saída / Despacho na Capitania");
    expect(tpl?.code).toBe("COM-DESP");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 4-A");
    expect(tpl?.officialSource).toContain("NAVSEG");
    expect(tpl?.aliases.codes).toContain("doc_comunicacao_despacho");
    expect(tpl?.aliases.codes).toContain("COM-DESP");
    expect(tpl?.aliases.codes).toContain("DESPACHO_SAIDA");
  });

  it("deve exigir identificação do comandante e da embarcação para aviso de saída", () => {
    const tpl = getCatalogTemplateBySlug("comunicacao-despacho")!;
    const comandante = { name: "Carlos Eduardo Silveira", cpf_cnpj: "123.456.789-00" };
    const navioSemNome = { name: "", registration_number: "" };
    const staff = { name: "Despachante Naval" };

    const val1 = checkTemplateMissingRequirements(tpl, comandante, navioSemNome, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome da Embarcação");

    const navioCompleto = { name: "MAR AZUL IV", registration_number: "381-987654-2" };
    const val2 = checkTemplateMissingRequirements(tpl, comandante, navioCompleto, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de Despacho no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-despacho-global",
        code: "COM-DESP",
        name: "Comunicação de Despacho Global",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-despacho",
        code: "COM-DESP",
        name: "Comunicação de Despacho Náutica Santos",
        is_global: false,
        company_id: "comp-nav-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("comunicacao-despacho")!;
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-outra");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-despacho-global");

    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-despacho");
  });

  it("deve conter o documento devidamente catalogado em OUTPUT_DOCS_CATALOG", () => {
    const docDesp = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_comunicacao_despacho");
    expect(docDesp).toBeDefined();
    expect(docDesp?.officialSource).toContain("NORMAM-211/DPC, Anexo 4-A");
    expect(docDesp?.officialSource).toContain("NAVSEG");
    expect(docDesp?.documentType).toBe("official_form");
    expect(docDesp?.signerRole).toBe("Comandante / Mestre da Embarcação");
  });
});

