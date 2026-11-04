import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de BADE (Anexo 2-A) e Declaração de Construção Miúda (Anexo 2-J) - NORMAM-211/DPC", () => {
  it("deve conter o BADE no catálogo oficial com metadados auditados da Marinha", () => {
    const tpl = getCatalogTemplateBySlug("bade-embarcacao-maior");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Boletim de Atualização de Embarcações - BADE (Anexo 2-A)");
    expect(tpl?.code).toBe("BADE-001");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 2-A");
    expect(tpl?.aliases.codes).toContain("doc_bade");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-A");
    expect(tpl?.aliases.codes).toContain("BADE");
  });

  it("deve conter a Declaração de Construção Miúda no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("decl-construcao-miuda");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Declaração de Construção de Embarcação Miúda (Anexo 2-J)");
    expect(tpl?.code).toBe("DEC-CONST");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.officialSource).toContain("NORMAM-211/DPC");
    expect(tpl?.officialSource).toContain("Anexo 2-J");
    expect(tpl?.aliases.codes).toContain("doc_decl_construcao");
    expect(tpl?.aliases.codes).toContain("ANEXO-2-J");
    expect(tpl?.aliases.codes).toContain("CONSTRUCAO_MIUDA");
  });

  it("deve validar requisitos para BADE e Declaração de Construção Miúda", () => {
    const tplBade = getCatalogTemplateBySlug("bade-embarcacao-maior")!;
    const titularIncompleto = { name: "Carlos Eduardo Silveira", cpf_cnpj: "" };
    const navio = { name: "MAR AZUL IV" };
    const staff = { name: "Despachante Naval" };

    const valBade1 = checkTemplateMissingRequirements(tplBade, titularIncompleto, navio, staff);
    expect(valBade1.isBlocked).toBe(true);

    const titularCompleto = { name: "Carlos Eduardo Silveira", cpf_cnpj: "123.456.789-00" };
    const valBade2 = checkTemplateMissingRequirements(tplBade, titularCompleto, navio, staff);
    expect(valBade2.isBlocked).toBe(false);

    const tplConst = getCatalogTemplateBySlug("decl-construcao-miuda")!;
    const valConst1 = checkTemplateMissingRequirements(tplConst, titularIncompleto, navio, staff);
    expect(valConst1.isBlocked).toBe(true);

    const valConst2 = checkTemplateMissingRequirements(tplConst, titularCompleto, navio, staff);
    expect(valConst2.isBlocked).toBe(false);
  });

  it("deve conter BADE e Declaração de Construção devidamente registrados em OUTPUT_DOCS_CATALOG", () => {
    const docBade = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_bade");
    expect(docBade).toBeDefined();
    expect(docBade?.officialSource).toContain("Anexo 2-A");
    expect(docBade?.serviceId).toBe("inscricao");
    expect(docBade?.documentType).toBe("official_form");
    expect(docBade?.signerRole).toBe("Proprietário / Armador Requerente");

    const docConst = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_decl_construcao");
    expect(docConst).toBeDefined();
    expect(docConst?.officialSource).toContain("Anexo 2-J");
    expect(docConst?.serviceId).toBe("inscricao");
    expect(docConst?.documentType).toBe("official_form");
    expect(docConst?.signerRole).toBe("Construtor / Declarante");
  });
});

