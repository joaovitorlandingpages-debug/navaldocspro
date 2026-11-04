import { describe, it, expect, beforeEach } from "vitest";
import {
  getSystemSettings,
  saveSystemSettings,
  resetSystemSettingsToDefaults,
  getDynamicServicesCatalog,
  getActiveServicesCatalog,
  saveDynamicServicesCatalog,
  addDynamicService,
  updateDynamicService,
  toggleDynamicServiceActive,
  deleteDynamicService,
  resetDynamicServicesToDefaults,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_SERVICES_CATALOG,
} from "../../src/services/admin/systemSettingsService";
import { getEffectiveServicesCatalog } from "../../src/routes/processes.novo-pedido";

// Mock de localStorage para ambiente de teste Node
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

describe("Painel Master No-Code Admin - Central de Controle Total do Sistema", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. Configurações Globais (Branding, Taxas da Marinha, Broadcast e Regras)", () => {
    it("deve carregar as configurações padrão de fábrica quando não houver customização salva", () => {
      const settings = getSystemSettings();
      expect(settings).toBeDefined();
      expect(settings.branding.systemName).toBe("NavalDocs Pro");
      expect(settings.marinhaFees.inscricaoEmbarcacaoLancha).toBe(85.0);
      expect(settings.broadcast.isEnabled).toBe(false);
      expect(settings.operationalRules.maxUploadSizeMb).toBe(25);
    });

    it("deve permitir alterar e persistir dados de branding e suporte", async () => {
      const current = getSystemSettings();
      const modified = {
        ...current,
        branding: {
          ...current.branding,
          systemName: "NavalDocs Pro Enterprise",
          supportWhatsapp: "5511999998888",
          primaryColor: "#003366",
        },
      };

      await saveSystemSettings(modified);

      const reloaded = getSystemSettings();
      expect(reloaded.branding.systemName).toBe("NavalDocs Pro Enterprise");
      expect(reloaded.branding.supportWhatsapp).toBe("5511999998888");
      expect(reloaded.branding.primaryColor).toBe("#003366");
    });

    it("deve permitir reajustar valores oficiais das taxas da Marinha (GRU) sem mexer em código", async () => {
      const current = getSystemSettings();
      const updatedFees = {
        ...current,
        marinhaFees: {
          ...current.marinhaFees,
          inscricaoEmbarcacaoLancha: 98.5,
          inscricaoMotoAquatica: 78.0,
          transferenciaPropriedade: 89.0,
        },
      };

      await saveSystemSettings(updatedFees);

      const reloaded = getSystemSettings();
      expect(reloaded.marinhaFees.inscricaoEmbarcacaoLancha).toBe(98.5);
      expect(reloaded.marinhaFees.inscricaoMotoAquatica).toBe(78.0);
      expect(reloaded.marinhaFees.transferenciaPropriedade).toBe(89.0);
    });

    it("deve permitir ativar comunicado global e modo de manutenção", async () => {
      const current = getSystemSettings();
      const withBroadcast = {
        ...current,
        broadcast: {
          ...current.broadcast,
          isEnabled: true,
          type: "warning" as const,
          title: "Aviso de Feriado Náutico",
          message: "Capitanias fechadas no feriado de Tiradentes.",
          isMaintenanceMode: false,
        },
      };

      await saveSystemSettings(withBroadcast);

      const reloaded = getSystemSettings();
      expect(reloaded.broadcast.isEnabled).toBe(true);
      expect(reloaded.broadcast.title).toBe("Aviso de Feriado Náutico");
      expect(reloaded.broadcast.type).toBe("warning");
    });

    it("deve restaurar configurações para o padrão de fábrica", () => {
      resetSystemSettingsToDefaults();
      const defaults = getSystemSettings();
      expect(defaults.branding.systemName).toBe(DEFAULT_PLATFORM_SETTINGS.branding.systemName);
      expect(defaults.marinhaFees.inscricaoEmbarcacaoLancha).toBe(DEFAULT_PLATFORM_SETTINGS.marinhaFees.inscricaoEmbarcacaoLancha);
    });
  });

  describe("2. Catálogo Dinâmico de Serviços Náuticos (CRUD No-Code)", () => {
    it("deve listar os serviços náuticos padrão da Marinha", () => {
      const services = getDynamicServicesCatalog();
      expect(services.length).toBeGreaterThanOrEqual(9);

      const inscr = services.find((s) => s.id === "inscricao");
      expect(inscr).toBeDefined();
      expect(inscr?.isActive).toBe(true);
      expect(inscr?.officialNormam).toContain("NORMAM-211/DPC");
    });

    it("deve permitir adicionar um novo serviço náutico customizado", async () => {
      const initialCount = getDynamicServicesCatalog().length;

      const created = await addDynamicService({
        name: "Registro de Embarcação no Tribunal Marítimo",
        shortName: "Tribunal Marítimo",
        description: "Registro de propriedade de embarcações maiores no TM conforme Lei 2.180/54.",
        iconName: "Building",
        requiresVessel: true,
        category: "maritimo",
        isActive: true,
        suggestedFee: 1500.0,
        estimatedDays: "30 a 60 dias",
        officialNormam: "Lei Federal nº 2.180/1954 c/c NORMAM-211",
        order: initialCount + 1,
        associatedDocIds: ["doc_bade"],
      });

      expect(created.id).toBeDefined();
      expect(created.isCustom).toBe(true);

      const reloaded = getDynamicServicesCatalog();
      expect(reloaded.length).toBe(initialCount + 1);

      const found = reloaded.find((s) => s.name === "Registro de Embarcação no Tribunal Marítimo");
      expect(found).toBeDefined();
      expect(found?.suggestedFee).toBe(1500.0);
    });

    it("deve permitir editar dados de um serviço existente", async () => {
      await updateDynamicService("inscricao", {
        suggestedFee: 790.0,
        estimatedDays: "7 a 12 dias úteis",
      });

      const reloaded = getDynamicServicesCatalog();
      const inscr = reloaded.find((s) => s.id === "inscricao")!;
      expect(inscr.suggestedFee).toBe(790.0);
      expect(inscr.estimatedDays).toBe("7 a 12 dias úteis");
    });

    it("deve permitir desativar e reativar um serviço com toggle instantâneo", async () => {
      // Desativa inscrição
      const isNowActive = await toggleDynamicServiceActive("inscricao");
      expect(isNowActive).toBe(false);

      const all = getDynamicServicesCatalog();
      const inscr = all.find((s) => s.id === "inscricao")!;
      expect(inscr.isActive).toBe(false);

      // No catálogo de serviços ativos para Novo Pedido, a inscrição não deve aparecer
      const activeOnly = getActiveServicesCatalog();
      expect(activeOnly.some((s) => s.id === "inscricao")).toBe(false);

      // Reativa inscrição
      const reactivated = await toggleDynamicServiceActive("inscricao");
      expect(reactivated).toBe(true);

      const activeAgain = getActiveServicesCatalog();
      expect(activeAgain.some((s) => s.id === "inscricao")).toBe(true);
    });

    it("deve refletir as customizações em getEffectiveServicesCatalog para o fluxo de Novo Pedido", () => {
      const effective = getEffectiveServicesCatalog();
      expect(effective.length).toBeGreaterThanOrEqual(9);
      expect(effective.some((s) => s.id === "inscricao")).toBe(true);
    });

    it("deve permitir excluir um serviço customizado", async () => {
      const custom = await addDynamicService({
        name: "Serviço Temporário para Exclusão",
        shortName: "Temp",
        description: "Teste de exclusão",
        iconName: "Ship",
        requiresVessel: true,
        category: "maritimo",
        isActive: true,
        suggestedFee: 100,
        estimatedDays: "1 dia",
        officialNormam: "NORMAM",
        order: 99,
        associatedDocIds: [],
      });

      const countBefore = getDynamicServicesCatalog().length;
      await deleteDynamicService(custom.id);

      const countAfter = getDynamicServicesCatalog().length;
      expect(countAfter).toBe(countBefore - 1);
      expect(getDynamicServicesCatalog().some((s) => s.id === custom.id)).toBe(false);
    });

    it("deve restaurar catálogo de serviços aos padrões da Marinha", () => {
      const restored = resetDynamicServicesToDefaults();
      expect(restored.length).toBe(DEFAULT_SERVICES_CATALOG.length);
    });
  });
});
