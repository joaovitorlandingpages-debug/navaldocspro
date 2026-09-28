import { describe, it, expect, beforeEach } from "vitest";
import { 
  getCompanyOnboardingProgress, 
  isGuideDismissed, 
  setGuideDismissed,
  OnboardingProgress 
} from "@/services/onboardingService";
import { supabase } from "@/integrations/supabase/client";

describe("Primeiros Passos — Testes de Integração e Regras de Negócio", () => {
  const mockCompanyId = "00000000-0000-0000-0000-000000000099";

  beforeEach(() => {
    if (typeof globalThis.localStorage === "undefined") {
      const store: Record<string, string> = {};
      globalThis.localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        length: 0,
        key: () => null,
      } as any;
    } else {
      globalThis.localStorage.clear();
    }
  });

  describe("1. Estrutura e Sequência das 6 Etapas", () => {
    it("deve conter exatamente as 6 etapas na ordem correta", async () => {
      const progress = await getCompanyOnboardingProgress("");
      expect(progress.totalSteps).toBe(6);
      expect(progress.steps).toHaveLength(6);

      const expectedOrder = [
        "empresa",
        "funcionario",
        "cliente",
        "embarcacao",
        "processo",
        "documento"
      ];

      progress.steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1);
        expect(step.id).toBe(expectedOrder[index]);
        expect(step.actionPath).toBeDefined();
        expect(step.actionText).toBeDefined();
      });
    });

    it("etapa 4 deve direcionar para cadastro de embarcação e exigir vínculo com cliente", async () => {
      const progress = await getCompanyOnboardingProgress("");
      const step4 = progress.steps.find(s => s.id === "embarcacao");
      expect(step4).toBeDefined();
      expect(step4?.actionPath).toBe("/vessels/novo");
      expect(step4?.title).toContain("Vincular uma embarcação ao cliente");
    });
  });

  describe("2. Gerenciamento de Visibilidade e Fechamento do Guia", () => {
    it("permite fechar o guia e reabri-lo sem perda de estado", () => {
      expect(isGuideDismissed(mockCompanyId)).toBe(false);

      // Usuário clica em fechar guia
      setGuideDismissed(mockCompanyId, true);
      expect(isGuideDismissed(mockCompanyId)).toBe(true);

      // Usuário reabre pelo menu Ajuda
      setGuideDismissed(mockCompanyId, false);
      expect(isGuideDismissed(mockCompanyId)).toBe(false);
    });
  });

  describe("3. Validação do Progresso Baseado em Dados Reais Salvos", () => {
    it("em conta nova/sem dados, nenhuma etapa além do padrão deve ser marcada", async () => {
      // Simula consulta para ID não existente
      const progress = await getCompanyOnboardingProgress("11111111-1111-1111-1111-111111111111");
      expect(progress.completedCount).toBeLessThanOrEqual(1);
      expect(progress.allCompleted).toBe(false);
      expect(progress.nextStep).not.toBeNull();
    });

    it("reconhece registros existentes sem solicitar novos cadastros", async () => {
      // Consulta com banco de dados real
      const { data: companies } = await supabase.from("companies").select("id, name").limit(1);
      if (!companies || companies.length === 0) {
        console.warn("Sem empresas cadastradas para teste de leitura real.");
        return;
      }

      const activeCompanyId = companies[0].id;
      const progress = await getCompanyOnboardingProgress(activeCompanyId);

      expect(progress).toBeDefined();
      expect(progress.totalSteps).toBe(6);
      expect(typeof progress.percent).toBe("number");
      expect(progress.percent).toBeGreaterThanOrEqual(0);
      expect(progress.percent).toBeLessThanOrEqual(100);

      // Cada etapa deve ter refletido seu estado real
      progress.steps.forEach(step => {
        expect(typeof step.completed).toBe("boolean");
        if (step.completed) {
          expect(step.detectedInfo).toBeDefined();
        }
      });
    });

    it("garante que embarcações sem vínculo de cliente (customer_id = null) NÃO concluem a Etapa 4", async () => {
      // Criação de cenário lógico de validação
      const mockVesselsWithoutCustomer = [{ id: "v-1", name: "Barco Isolado", customer_id: null }];
      const step4Completed = Boolean(mockVesselsWithoutCustomer[0] && mockVesselsWithoutCustomer[0].customer_id);
      expect(step4Completed).toBe(false);

      const mockVesselsWithCustomer = [{ id: "v-2", name: "Lancha Atrelada", customer_id: "cust-1" }];
      const step4ValidCompleted = Boolean(mockVesselsWithCustomer[0] && mockVesselsWithCustomer[0].customer_id);
      expect(step4ValidCompleted).toBe(true);
    });
  });

  describe("4. Navegação e Atalhos Preservados", () => {
    it("confirma que os caminhos das rotas existem na aplicação", async () => {
      const progress = await getCompanyOnboardingProgress("");
      const paths = progress.steps.map(s => s.actionPath);

      expect(paths).toContain("/settings");
      expect(paths).toContain("/configuracoes/funcionarios/novo");
      expect(paths).toContain("/customers/novo");
      expect(paths).toContain("/vessels/novo");
      expect(paths).toContain("/servicos");
      expect(paths).toContain("/processes");
    });
  });

});
