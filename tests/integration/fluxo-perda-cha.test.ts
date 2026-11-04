import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de 2ª Via de CHA / Extravio (NORMAM-211/DPC Anexo 5-D)", () => {
  it("deve conter a Declaração de Perda de CHA no catálogo oficial com metadados auditados", () => {
    const tpl = getCatalogTemplateBySlug("decl-perda-cha");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Declaração de Perda / Extravio de CHA (Anexo 5-D)");
    expect(tpl?.code).toBe("DEC-CHA");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 5-D");
    expect(tpl?.aliases.codes).toContain("doc_decl_perda_cha");
    expect(tpl?.aliases.codes).toContain("DEC-CHA");
    expect(tpl?.aliases.codes).toContain("ANEXO-5-D");
  });

  it("deve validar campos obrigatórios do amador declarante", () => {
    const tpl = getCatalogTemplateBySlug("decl-perda-cha")!;
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

  it("deve resolver o template de Extravio de CHA no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-perda-cha-global",
        code: "DEC-CHA",
        name: "Declaração de Extravio CHA Global",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-perda-cha",
        code: "DEC-CHA",
        name: "Declaração de Extravio CHA Empresa",
        is_global: false,
        company_id: "comp-nav-01",
      },
    ];

    const tpl = getCatalogTemplateBySlug("decl-perda-cha")!;
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-outra");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-perda-cha-global");

    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-nav-01");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-perda-cha");
  });

  it("deve conter o documento devidamente catalogado em OUTPUT_DOCS_CATALOG", () => {
    const docPerdaCha = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_decl_perda_cha");
    expect(docPerdaCha).toBeDefined();
    expect(docPerdaCha?.officialSource).toContain("NORMAM-211/DPC, Anexo 5-D");
    expect(docPerdaCha?.documentType).toBe("official_form");
    expect(docPerdaCha?.signerRole).toBe("Amador Declarante");
  });
});

