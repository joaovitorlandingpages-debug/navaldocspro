import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredNavalServices,
  saveNavalServices,
  OFFICIAL_NAVAL_SERVICES,
  STANDARD_NAVAL_DOCS_LIBRARY,
  NavalServiceItem,
} from "../../src/routes/admin/services";

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

if (typeof window === "undefined" || !window.dispatchEvent) {
  (globalThis as any).window = {
    dispatchEvent: vi.fn(),
  };
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, params: any) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

describe("Catálogo Administrativo de Serviços Náuticos & Super Editor com Seleção de Documentos", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. Integridade do Catálogo Oficial de Serviços Náuticos", () => {
    it("deve conter todos os 16 serviços oficiais da Marinha do Brasil", () => {
      const services = getStoredNavalServices();
      expect(services.length).toBeGreaterThanOrEqual(16);

      const slugs = services.map((s) => s.slug);
      expect(slugs).toContain("inscricao-inicial-esporte");
      expect(slugs).toContain("transferencia-propriedade-esporte");
      expect(slugs).toContain("transferencia-propriedade-moto-aquatica");
      expect(slugs).toContain("inscricao-inicial-moto-aquatica");
      expect(slugs).toContain("renovacao-validade-tie");
      expect(slugs).toContain("segunda-via-tie-perda-extravio");
      expect(slugs).toContain("alteracao-motor-dados-tecnicos");
      expect(slugs).toContain("vistoria-arqueacao-tecnica");
      expect(slugs).toContain("embarcacao-comercial-passageiros-carga");
      expect(slugs).toContain("habilitacao-nautica-amador-cha");
      expect(slugs).toContain("atestado-treinamento-nautico-ara");
      expect(slugs).toContain("laudo-engenharia-art-profissional");
      expect(slugs).toContain("alteracao-cadastral-proprietario");
      expect(slugs).toContain("despacho-saida-entrada-porto");
      expect(slugs).toContain("cancelamento-baixa-inscricao");
      expect(slugs).toContain("cartao-tripulacao-seguranca-cts");
    });

    it("cada serviço deve possuir lista de documentos necessários (anexos) e modelos emitidos", () => {
      const services = getStoredNavalServices();
      services.forEach((srv) => {
        expect(srv.name).toBeDefined();
        expect(srv.description).toBeDefined();
        expect(srv.requiredClientFiles.length).toBeGreaterThan(0);
        expect(srv.fillableTemplates.length).toBeGreaterThan(0);
        expect(srv.jurisdiction.length).toBeGreaterThan(0);
      });
    });

    it("a biblioteca de documentos comuns da Marinha deve conter os itens essenciais", () => {
      expect(STANDARD_NAVAL_DOCS_LIBRARY.length).toBeGreaterThanOrEqual(12);
      const names = STANDARD_NAVAL_DOCS_LIBRARY.map((d) => d.name);
      expect(names.some((n) => n.includes("Nota Fiscal do Casco"))).toBe(true);
      expect(names.some((n) => n.includes("Nota Fiscal do Motor"))).toBe(true);
      expect(names.some((n) => n.includes("RG/CNH"))).toBe(true);
      expect(names.some((n) => n.includes("Residência"))).toBe(true);
      expect(names.some((n) => n.includes("Fotografias"))).toBe(true);
      expect(names.some((n) => n.includes("ART e Memorial"))).toBe(true);
      expect(names.some((n) => n.includes("GRU"))).toBe(true);
    });
  });

  describe("2. Super Editor: Seleção e Customização de Documentos Necessários", () => {
    it("deve permitir alterar e salvar a lista de documentos necessários de um serviço", () => {
      const services = getStoredNavalServices();
      const targetService = services.find((s) => s.id === "serv_inscr_esporte")!;
      const originalCount = targetService.requiredClientFiles.length;

      // Adiciona uma nova exigência de vistoria prévia
      const updatedRequiredFiles = [
        ...targetService.requiredClientFiles,
        {
          name: "Certificado de Estanqueidade do Casco",
          description: "Exigência especial de estaleiro artesanal",
          mandatory: true,
        },
      ];

      const updatedService: NavalServiceItem = {
        ...targetService,
        requiredClientFiles: updatedRequiredFiles,
        reviewedBy: "Eng. Naval Sócio (CREA/SP 506.123)",
        version: "2.5.0",
      };

      const updatedList = services.map((s) => (s.id === targetService.id ? updatedService : s));
      saveNavalServices(updatedList);

      // Recarrega e valida persistência
      const reloaded = getStoredNavalServices();
      const reloadedTarget = reloaded.find((s) => s.id === "serv_inscr_esporte")!;
      expect(reloadedTarget.requiredClientFiles.length).toBe(originalCount + 1);
      expect(reloadedTarget.requiredClientFiles.some((f) => f.name === "Certificado de Estanqueidade do Casco")).toBe(true);
      expect(reloadedTarget.version).toBe("2.5.0");
      expect(reloadedTarget.reviewedBy).toContain("CREA/SP");
    });

    it("deve permitir alternar o status de obrigatoriedade de um documento (Obrigatório <-> Opcional)", () => {
      const services = getStoredNavalServices();
      const target = services[0];
      const firstDoc = target.requiredClientFiles[0];
      const initialMandatory = firstDoc.mandatory;

      const toggledRequiredFiles = target.requiredClientFiles.map((f, i) =>
        i === 0 ? { ...f, mandatory: !initialMandatory } : f
      );

      const updated = services.map((s) =>
        s.id === target.id ? { ...s, requiredClientFiles: toggledRequiredFiles } : s
      );
      saveNavalServices(updated);

      const reloaded = getStoredNavalServices().find((s) => s.id === target.id)!;
      expect(reloaded.requiredClientFiles[0].mandatory).toBe(!initialMandatory);
    });

    it("deve permitir adicionar e remover modelos de formulários emitidos pelo serviço", () => {
      const services = getStoredNavalServices();
      const target = services.find((s) => s.id === "serv_transf_esporte")!;
      const initialTplCount = target.fillableTemplates.length;

      const updatedTpls = [
        ...target.fillableTemplates,
        {
          name: "Declaração de Residência do Adquirente (Anexo 2-I)",
          templateCode: "DECL_RES_01",
          status: "ready" as const,
        },
      ];

      const updated = services.map((s) =>
        s.id === target.id ? { ...s, fillableTemplates: updatedTpls } : s
      );
      saveNavalServices(updated);

      const reloaded = getStoredNavalServices().find((s) => s.id === "serv_transf_esporte")!;
      expect(reloaded.fillableTemplates.length).toBe(initialTplCount + 1);
      expect(reloaded.fillableTemplates.some((t) => t.templateCode === "DECL_RES_01")).toBe(true);
    });
  });
});
