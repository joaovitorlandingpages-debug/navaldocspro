import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateHullHinCode,
  calculateArqueacaoSimplificada,
  calculateSalvatagemRequerida,
} from "../../src/services/admin/navalEngineeringService";
import {
  getCapitanias,
  saveCapitanias,
  addCapitania,
  updateCapitania,
  deleteCapitania,
  resetCapitaniasToDefaults,
  DEFAULT_CAPITANIAS,
} from "../../src/services/admin/capitaniasService";
import {
  getExigencias,
  saveExigencias,
  addExigencia,
  updateExigencia,
  deleteExigencia,
  resetExigenciasToDefaults,
  DEFAULT_EXIGENCIAS,
} from "../../src/services/admin/exigenciasService";
import {
  getDocumentOverrides,
  getDocumentOverrideById,
  saveDocumentOverride,
  regenerateOverriddenPdf,
  DocumentManualOverride,
} from "../../src/services/admin/documentOverrideService";

// Mock de localStorage em memória para ambiente Node
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

// Mock simples para window.dispatchEvent se não estiver em browser
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

describe("Estação do Engenheiro Naval e Central de Documentos Admin", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. Validador Oficial de Casco HIN/MIC (NORMAM-211 c/c ISO 10087)", () => {
    it("deve validar com sucesso um HIN de 12 caracteres no padrão oficial", () => {
      // MIC: SPM, Serial: 12345, Mês: D (Abril), Ano fabricação: 4 (2024), Modelo: 24 (2024)
      const res = validateHullHinCode("SPM12345D424");
      expect(res.isValid).toBe(true);
      expect(res.mic).toBe("SPM");
      expect(res.serial).toBe("12345");
      expect(res.month).toBe("Abril");
      expect(res.modelYear).toBe("2024");
      expect(res.code).toContain("BR-SPM-12345-D424");
    });

    it("deve validar HIN que já vem com prefixo BR- e caracteres especiais", () => {
      const res = validateHullHinCode("BR-FSB98765A323");
      expect(res.isValid).toBe(true);
      expect(res.mic).toBe("FSB");
      expect(res.month).toBe("Janeiro");
      expect(res.modelYear).toBe("2023");
    });

    it("deve rejeitar código HIN incompleto com menos de 12 caracteres", () => {
      const res = validateHullHinCode("ABC123");
      expect(res.isValid).toBe(false);
      expect(res.feedbackMessage).toContain("incompleto");
    });

    it("deve rejeitar código com caractere de mês inválido", () => {
      // 'Z' não é um mês válido de A a L
      const res = validateHullHinCode("SPM12345Z424");
      expect(res.isValid).toBe(false);
      expect(res.feedbackMessage).toContain("inválido");
    });
  });

  describe("2. Calculadora de Arqueação Simplificada NORMAM-211 & Salvatagem", () => {
    it("deve calcular arqueação bruta de lancha miúda (ex: 6.5m x 2.3m x 1.1m)", () => {
      const res = calculateArqueacaoSimplificada(6.5, 2.3, 1.1);
      // Volume = 6.5 * 2.3 * 1.1 * 0.5 = 8.2225 m3
      // AB = 8.2225 / 2.83 ~= 2.91
      expect(res.arqueacaoBruta).toBeCloseTo(2.91, 1);
      expect(res.classificacaoPorte).toBe("miuda");
      expect(res.documentoObrigatorio).toBe("BSADE (Anexo 2-B)");
      expect(res.exigeArtEngenheiro).toBe(false);
    });

    it("deve enquadrar embarcação >= 12 metros em médio porte exigindo BADE e ART de engenheiro", () => {
      const res = calculateArqueacaoSimplificada(14.0, 4.2, 2.1);
      expect(res.classificacaoPorte).toBe("medio_porte");
      expect(res.documentoObrigatorio).toBe("BADE (Anexo 2-A)");
      expect(res.exigeArtEngenheiro).toBe(true);
      expect(res.exigeRegistroTribunalMaritimo).toBe(false);
    });

    it("deve enquadrar embarcação de grande porte (>= 24m) exigindo registro no Tribunal Marítimo", () => {
      const res = calculateArqueacaoSimplificada(26.0, 6.5, 3.2);
      expect(res.classificacaoPorte).toBe("grande_porte");
      expect(res.exigeRegistroTribunalMaritimo).toBe(true);
      expect(res.exigeArtEngenheiro).toBe(true);
    });

    it("deve calcular dotação de salvatagem correta para navegação interior e mar aberto", () => {
      const salvatagemInterior = calculateSalvatagemRequerida(2, 6, "interior", 8.0);
      expect(salvatagemInterior.totalPessoas).toBe(8);
      expect(salvatagemInterior.quantidadeColetesAdulto).toBe(8);
      expect(salvatagemInterior.boiasCircularesObrigatorias).toBeGreaterThanOrEqual(1);

      const salvatagemCosteira = calculateSalvatagemRequerida(2, 10, "costeira", 13.5);
      expect(salvatagemCosteira.totalPessoas).toBe(12);
      expect(salvatagemCosteira.quantidadeColetesAdulto).toBe(12);
      expect(salvatagemCosteira.boiasCircularesObrigatorias).toBeGreaterThanOrEqual(2);
      expect(salvatagemCosteira.pirotecnicosObrigatorios.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Cadastro e Manutenção de Capitanias e Delegacias (OMs)", () => {
    it("deve carregar a lista de Capitanias padrão com CPSP e CPRJ", () => {
      const list = getCapitanias();
      expect(list.length).toBeGreaterThanOrEqual(5);
      const cpsp = list.find((c) => c.sigla === "CPSP");
      expect(cpsp).toBeDefined();
      expect(cpsp?.cidade).toBe("Santos");
      expect(cpsp?.peculiaridadesBalcao).toContain("fotografias");
    });

    it("deve permitir adicionar nova Agência Fluvial ou Delegacia personalizada", () => {
      const nova = addCapitania({
        sigla: "AgUbatuba",
        nome: "Agência da Capitania dos Portos em Ubatuba",
        cidade: "Ubatuba",
        uf: "SP",
        endereco: "Rua do Cais, s/n - Centro",
        cep: "11680-000",
        telefones: "(12) 3832-1200",
        emailProtocolo: "agubatuba@marinha.mil.br",
        emailSetorEmbarcacoes: "agubatuba.embarcacoes@marinha.mil.br",
        titularAtual: "Capitão-Tenente Silva",
        jurisdicaoDescricao: "Litoral Norte Paulista",
        peculiaridadesBalcao: "Recebimento apenas nas terças e quintas-feiras.",
        chavePixGru: "00.394.502/0001-38",
        isAtiva: true,
      });

      expect(nova.id).toBeDefined();
      const list = getCapitanias();
      expect(list.some((c) => c.sigla === "AgUbatuba")).toBe(true);
    });

    it("deve permitir atualizar peculiaridades de balcão de uma Capitania existente", () => {
      const list = getCapitanias();
      const first = list[0];
      updateCapitania(first.id, {
        peculiaridadesBalcao: "Atualizado: Exige 3 fotos e vistoria de casco agendada.",
      });

      const updatedList = getCapitanias();
      const updatedItem = updatedList.find((c) => c.id === first.id);
      expect(updatedItem?.peculiaridadesBalcao).toBe(
        "Atualizado: Exige 3 fotos e vistoria de casco agendada."
      );
    });

    it("deve permitir excluir e resetar Capitanias para os padrões", () => {
      const list = getCapitanias();
      const idToDelete = list[0].id;
      deleteCapitania(idToDelete);

      let currentList = getCapitanias();
      expect(currentList.some((c) => c.id === idToDelete)).toBe(false);

      resetCapitaniasToDefaults();
      currentList = getCapitanias();
      expect(currentList.length).toBe(DEFAULT_CAPITANIAS.length);
    });
  });

  describe("4. Painel de Exigências da Marinha (Cumprimento de Prazos)", () => {
    it("deve carregar exigências padrão com dias limite e status", () => {
      const list = getExigencias();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list[0].status).toBe("em_cumprimento");
      expect(list[0].motivoExigencia).toContain("fotografia");
    });

    it("deve permitir adicionar nova exigência notificada pela Capitania", () => {
      const nova = addExigencia({
        codigoProcesso: "NAV-2026-99999",
        nomeCliente: "Fernando Magalhães",
        telefoneCliente: "5511999999999",
        nomeEmbarcacao: "DOLPHIN II",
        omCapitania: "CPRJ - Rio de Janeiro",
        dataNotificacao: "2026-11-01",
        prazoDias: 30,
        dataLimite: "2026-12-01",
        vistoriadorResponsavel: "1º Ten. Moreira",
        motivoExigencia: "Reapresentar Termo de Entrega com firma reconhecida por autenticidade.",
        documentosSolicitados: ["Termo de Entrega Autenticado"],
        status: "pendente",
        notasInternas: "Notificação recebida hoje. Aguardando envio da via física.",
      });

      expect(nova.id).toBeDefined();
      const list = getExigencias();
      expect(list.some((e) => e.codigoProcesso === "NAV-2026-99999")).toBe(true);
    });

    it("deve atualizar o status de uma exigência para protocolado ou deferido", () => {
      const list = getExigencias();
      const target = list[0];
      updateExigencia(target.id, {
        status: "deferido",
        dataCumprimento: "2026-11-04",
        notasInternas: "Exigência cumprida e TIEM deferido na Capitania dos Portos.",
      });

      const updated = getExigencias().find((e) => e.id === target.id);
      expect(updated?.status).toBe("deferido");
      expect(updated?.dataCumprimento).toBe("2026-11-04");
    });
  });

  describe("5. Reparo Técnico Manual do Engenheiro ('Caneta Vermelha') & Regeneração de PDF", () => {
    const mockOverride: DocumentManualOverride = {
      documentId: "doc_test_123",
      documentName: "BADE - Boletim de Atualização de Embarcação",
      customerName: "Dr. Marcelo Guimarães",
      customerDoc: "123.456.789-00",
      vesselName: "PREDATOR 380",
      vesselInscricao: "381P202300451",
      vesselLength: "11.85",
      vesselBeam: "3.45",
      vesselDepth: "1.65",
      engineDetails: "2x Mercruiser 300HP Gasolina",
      customBodyText: "Declaro para fins de retificação cadastral perante a CPSP que o comprimento correto aferido in loco é 11.85m.",
      engineerName: "Eng. Victor Albuquerque",
      engineerCrea: "CREA/SP 506.123.456",
      rectificationReason: "Retificação de dimensão de boca divergente no memorial anterior",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "engenheiro_socio",
    };

    it("deve salvar e carregar o override técnico de documento", () => {
      saveDocumentOverride(mockOverride);
      const retrieved = getDocumentOverrideById("doc_test_123");
      expect(retrieved).toBeDefined();
      expect(retrieved?.vesselName).toBe("PREDATOR 380");
      expect(retrieved?.engineerName).toBe("Eng. Victor Albuquerque");
      expect(retrieved?.engineerCrea).toBe("CREA/SP 506.123.456");
      expect(retrieved?.rectificationReason).toContain("Retificação");
    });

    it("deve regenerar com sucesso o PDF oficial retificado com metadados do engenheiro", async () => {
      const result = await regenerateOverriddenPdf(mockOverride);
      expect(result).toBeDefined();
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.bytes.length).toBeGreaterThan(500);
      expect(result.fileName).toContain("_retificado_");
      expect(result.fileName).toMatch(/\.pdf$/);
    });
  });
});
