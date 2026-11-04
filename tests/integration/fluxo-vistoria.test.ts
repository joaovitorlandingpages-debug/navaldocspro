import { describe, it, expect } from "vitest";
import {
  CATALOG_TEMPLATES,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  getCatalogTemplateBySlug,
} from "../../src/services/documents/templateCatalogResolver";
import { OUTPUT_DOCS_CATALOG } from "../../src/routes/processes.novo-pedido";

describe("Fluxo de Vistoria e Perícia Naval (NORMAM-211/DPC Capítulo 3 c/c Anexo 2-C)", () => {
  it("deve conter o Requerimento de Vistoria / Perícia Naval no catálogo oficial", () => {
    const tpl = getCatalogTemplateBySlug("req-vistoria-naval");
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe("Requerimento de Vistoria / Perícia Naval");
    expect(tpl?.officialSource).toContain("Capítulo 3");
    expect(tpl?.officialSource).toContain("Anexo 2-C");
    expect(tpl?.nature).toBe("official_form");
    expect(tpl?.aliases.codes).toContain("doc_req_vistoria");
    expect(tpl?.aliases.codes).toContain("REQ-VIST");
    expect(tpl?.aliases.codes).toContain("VISTORIA_NAVAL");
  });

  it("deve validar campos obrigatórios para solicitação de vistoria", () => {
    const tpl = getCatalogTemplateBySlug("req-vistoria-naval")!;
    const customer = { name: "Carlos Eduardo", cpf_cnpj: "123.456.789-00", address: "Av Beira Mar", city: "Santos" };
    const vesselSemNome = { name: "", registration_number: "381-987654-2" };
    const staff = { name: "Despachante Silva" };

    const val1 = checkTemplateMissingRequirements(tpl, customer, vesselSemNome, staff);
    expect(val1.isBlocked).toBe(true);
    expect(val1.missingFields).toContain("Nome da Embarcação");

    const vesselCompleto = { name: "Vento Sul III", registration_number: "381-987654-2" };
    const val2 = checkTemplateMissingRequirements(tpl, customer, vesselCompleto, staff);
    expect(val2.isBlocked).toBe(false);
  });

  it("deve resolver o template de vistoria no banco com prioridade correta", () => {
    const mockDbTemplates = [
      {
        id: "uuid-db-req-vistoria",
        code: "REQ-VIST",
        name: "Requerimento de Vistoria / Perícia Naval",
        is_global: true,
        company_id: null,
      },
      {
        id: "uuid-db-company-vistoria",
        code: "REQ-VIST",
        name: "Requerimento de Vistoria Personalizado",
        is_global: false,
        company_id: "comp-456",
      },
    ];

    const tpl = getCatalogTemplateBySlug("req-vistoria-naval")!;
    // Resolução global
    const resGlobal = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-999");
    expect(resGlobal.dbTemplateId).toBe("uuid-db-req-vistoria");

    // Resolução específica da empresa
    const resCompany = resolveCatalogTemplate(tpl, mockDbTemplates as any, "comp-456");
    expect(resCompany.dbTemplateId).toBe("uuid-db-company-vistoria");
  });

  it("deve conter o documento de vistoria devidamente catalogado em processes.novo-pedido.tsx", () => {
    const docVistoria = OUTPUT_DOCS_CATALOG.find((d) => d.id === "doc_req_vistoria");
    expect(docVistoria).toBeDefined();
    expect(docVistoria?.serviceId).toBe("vistoria");
    expect(docVistoria?.officialSource).toContain("Capítulo 3");
    expect(docVistoria?.officialSource).toContain("Anexo 2-C");
    expect(docVistoria?.documentType).toBe("official_form");
  });
});

