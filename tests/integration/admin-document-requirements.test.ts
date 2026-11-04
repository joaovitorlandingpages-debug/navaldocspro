import { describe, it, expect, beforeEach } from "vitest";
import {
  getCustomizedOutputDocsCatalog,
  saveCustomizedOutputDocsCatalog,
  resetOutputDocsCatalogToDefaults,
  ADMIN_REQUIREMENTS_STORAGE_KEY,
} from "../../src/services/documents/adminRequirementsStorage";
import { OUTPUT_DOCS_CATALOG, OutputDocumentConfig } from "../../src/routes/processes.novo-pedido";

// Mock do localStorage para ambiente Node/Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Gestão de Documentos Oficiais e Requisitos de Anexos no Admin (NORMAM-211/212/201)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("deve carregar o catálogo padrão da Marinha quando não houver customização salva", () => {
    const catalog = getCustomizedOutputDocsCatalog();
    expect(catalog.length).toBe(OUTPUT_DOCS_CATALOG.length);
    expect(catalog.length).toBeGreaterThanOrEqual(20);

    // Documentos chave devem estar presentes
    const reqInscr = catalog.find((d) => d.id === "doc_req_inscricao");
    expect(reqInscr).toBeDefined();
    expect(reqInscr?.attachments.length).toBeGreaterThanOrEqual(4);

    const bade = catalog.find((d) => d.id === "doc_bade");
    expect(bade).toBeDefined();
    expect(bade?.officialSource).toContain("Anexo 2-A");

    const constr = catalog.find((d) => d.id === "doc_decl_construcao");
    expect(constr).toBeDefined();
    expect(constr?.officialSource).toContain("Anexo 2-J");
  });

  it("deve permitir adicionar um novo documento necessário / anexo a um documento existente", () => {
    const catalog = getCustomizedOutputDocsCatalog();
    const targetDoc = catalog.find((d) => d.id === "doc_req_inscricao")!;
    const initialCount = targetDoc.attachments.length;

    // Adiciona novo anexo
    const newRequirement = {
      id: "req_licenca_ambiental_marina",
      name: "Licença Ambiental da Marina de Guarda",
      why: "Exigência complementar de capitanias fluviais em áreas de preservação ambiental.",
      isProtocolOnly: true,
    };

    const updatedCatalog = catalog.map((doc) => {
      if (doc.id === "doc_req_inscricao") {
        return {
          ...doc,
          attachments: [...doc.attachments, newRequirement],
        };
      }
      return doc;
    });

    saveCustomizedOutputDocsCatalog(updatedCatalog);

    // Verifica persistência
    const reloadedCatalog = getCustomizedOutputDocsCatalog();
    const reloadedDoc = reloadedCatalog.find((d) => d.id === "doc_req_inscricao")!;
    expect(reloadedDoc.attachments.length).toBe(initialCount + 1);

    const foundReq = reloadedDoc.attachments.find((a) => a.id === "req_licenca_ambiental_marina");
    expect(foundReq).toBeDefined();
    expect(foundReq?.name).toBe("Licença Ambiental da Marina de Guarda");
    expect(foundReq?.isProtocolOnly).toBe(true);
  });

  it("deve permitir editar um documento necessário / anexo existente", () => {
    const catalog = getCustomizedOutputDocsCatalog();
    const updatedCatalog = catalog.map((doc) => {
      if (doc.id === "doc_req_inscricao") {
        return {
          ...doc,
          attachments: doc.attachments.map((att) => {
            if (att.id === "doc-comp-residencia") {
              return {
                ...att,
                name: "Comprovante de Residência Atualizado (últimos 90 dias) ou Declaração Anexo 2-G",
                why: "Comprovação estrita de domicílio nos termos da Lei 7.115/1983 c/c item 0213 NORMAM-211",
              };
            }
            return att;
          }),
        };
      }
      return doc;
    });

    saveCustomizedOutputDocsCatalog(updatedCatalog);

    const reloaded = getCustomizedOutputDocsCatalog();
    const doc = reloaded.find((d) => d.id === "doc_req_inscricao")!;
    const att = doc.attachments.find((a) => a.id === "doc-comp-residencia")!;
    expect(att.name).toContain("últimos 90 dias");
    expect(att.why).toContain("Lei 7.115/1983");
  });

  it("deve permitir excluir um documento necessário / anexo existente", () => {
    const catalog = getCustomizedOutputDocsCatalog();
    const targetDoc = catalog.find((d) => d.id === "doc_req_inscricao")!;
    const initialCount = targetDoc.attachments.length;

    const updatedCatalog = catalog.map((doc) => {
      if (doc.id === "doc_req_inscricao") {
        return {
          ...doc,
          attachments: doc.attachments.filter((a) => a.id !== "doc-fotos-embarcacao"),
        };
      }
      return doc;
    });

    saveCustomizedOutputDocsCatalog(updatedCatalog);

    const reloaded = getCustomizedOutputDocsCatalog();
    const doc = reloaded.find((d) => d.id === "doc_req_inscricao")!;
    expect(doc.attachments.length).toBe(initialCount - 1);
    expect(doc.attachments.some((a) => a.id === "doc-fotos-embarcacao")).toBe(false);
  });

  it("deve permitir adicionar um novo documento oficial (caso a Marinha lance nova portaria)", () => {
    const catalog = getCustomizedOutputDocsCatalog();
    const initialLength = catalog.length;

    const newDoc: OutputDocumentConfig = {
      id: "doc_nova_portaria_2027",
      name: "Termo de Inspeção Sanitária Naval (Anexo 6-B)",
      serviceId: "vistoria",
      serviceName: "Vistoria e perícia naval",
      documentType: "official_form",
      officialSource: "NORMAM-211/DPC, Anexo 6-B (Nova Portaria)",
      sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
      editionDate: "Portaria DPC 2027",
      purpose: "Inspeção sanitária de bordo para embarcações de transporte turístico.",
      signerRole: "Inspetor Naval / Armador",
      personalDataFields: [{ name: "Dados do Armador", found: true }],
      vesselDataFields: [{ name: "Dados da Embarcação", found: true }],
      attachments: [
        {
          id: "att_alvara_sanitario",
          name: "Alvará da Vigilância Sanitária Municipal",
          why: "Exigência de operação comercial com alimentos e passageiros.",
          isProtocolOnly: true,
        },
      ],
    };

    saveCustomizedOutputDocsCatalog([newDoc, ...catalog]);

    const reloaded = getCustomizedOutputDocsCatalog();
    expect(reloaded.length).toBe(initialLength + 1);

    const created = reloaded.find((d) => d.id === "doc_nova_portaria_2027");
    expect(created).toBeDefined();
    expect(created?.name).toBe("Termo de Inspeção Sanitária Naval (Anexo 6-B)");
    expect(created?.attachments.length).toBe(1);
  });

  it("deve permitir restaurar para a matriz padrão de fábrica da Marinha", () => {
    // Primeiro salva customização
    const catalog = getCustomizedOutputDocsCatalog();
    saveCustomizedOutputDocsCatalog([]);

    // Agora reseta
    const restored = resetOutputDocsCatalogToDefaults();
    expect(restored.length).toBe(OUTPUT_DOCS_CATALOG.length);

    const check = getCustomizedOutputDocsCatalog();
    expect(check.length).toBe(OUTPUT_DOCS_CATALOG.length);
  });
});

