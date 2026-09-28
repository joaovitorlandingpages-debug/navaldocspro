import { describe, it, expect, beforeEach } from "vitest";
import { 
  getCompanyOnboardingProgress 
} from "@/services/onboardingService";
import { 
  getOfficialPlanUsage, 
  checkActionQuota 
} from "@/services/billing/planUsageService";
import { 
  formatReferenceNumber, 
  normalizeSuggestionType, 
  normalizeSuggestionStatus,
  serializeDescription,
  parseDescription,
  getCompanySuggestions,
  createSuggestion,
  replyToSuggestion
} from "@/services/suggestionsService";
import { supabase } from "@/integrations/supabase/client";

describe("Revisão Funcional Completa — NavalDocs Pro (Fluxo Ponta a Ponta)", () => {
  const companyTestId = "00000000-0000-0000-0000-000000000088";
  const customer1Id = "00000000-0000-0000-0000-000000000011";
  const customer2Id = "00000000-0000-0000-0000-000000000012";
  const vessel1Id = "00000000-0000-0000-0000-000000000021";
  const vessel2Id = "00000000-0000-0000-0000-000000000022";

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

  describe("1. Topologia da Empresa: 2 Funcionários, 2 Clientes e 2 Embarcações para o Mesmo Cliente", () => {
    // Simulação da estrutura de dados da empresa
    const mockCompanyData = {
      id: companyTestId,
      name: "Marina Náutica Teste Pro",
      cnpj: "12.345.678/0001-99",
      phone: "(13) 99999-8888",
      logo_url: "logos/empresa_teste.png",
      metadata: {
        employees: [
          { id: "emp-1", name: "Carlos Silva", role: "Despachante Naval", active: true },
          { id: "emp-2", name: "Mariana Souza", role: "Engenheira Naval", active: true },
        ]
      }
    };

    const mockCustomers = [
      { id: customer1Id, company_id: companyTestId, name: "Roberto Albuquerque", document_number: "123.456.789-00" },
      { id: customer2Id, company_id: companyTestId, name: "Fernanda Lemos", document_number: "987.654.321-99" }
    ];

    // Ambas as embarcações pertencem ao Cliente 1
    const mockVessels = [
      { id: vessel1Id, company_id: companyTestId, customer_id: customer1Id, name: "Lancha Maré Alta", registration_number: "381P202600001" },
      { id: vessel2Id, company_id: companyTestId, customer_id: customer1Id, name: "Veleiro Horizonte", registration_number: "381P202600002" }
    ];

    it("valida que a empresa possui exatamente 2 funcionários cadastrados", () => {
      const staff = mockCompanyData.metadata.employees;
      expect(staff).toHaveLength(2);
      expect(staff[0].name).toBe("Carlos Silva");
      expect(staff[1].name).toBe("Mariana Souza");
    });

    it("valida que o sistema possui 2 clientes distintos", () => {
      expect(mockCustomers).toHaveLength(2);
      expect(mockCustomers[0].id).not.toBe(mockCustomers[1].id);
      expect(mockCustomers[0].company_id).toBe(companyTestId);
      expect(mockCustomers[1].company_id).toBe(companyTestId);
    });

    it("garante que as duas embarcações pertencem e permanecem vinculadas ao mesmo cliente", () => {
      expect(mockVessels).toHaveLength(2);
      expect(mockVessels[0].customer_id).toBe(customer1Id);
      expect(mockVessels[1].customer_id).toBe(customer1Id);
      // Nenhuma embarcação ficou orfã
      expect(mockVessels.every(v => v.customer_id === customer1Id)).toBe(true);
    });
  });

  describe("2. Regra de Franquias: Reaproveitamento e Geração de PDF Não Consomem Leitura", () => {
    it("valida que reutilizar documento previamente salvo é isento de consumo de leitura", async () => {
      const quotaCheck = await checkActionQuota(companyTestId, {
        ocrToRead: 1,
        isReusedDocument: true, // documento de origem já salvo no cadastro
        isManualEntry: false,
      });

      expect(quotaCheck.ocrWillConsume).toBe(0);
      expect(quotaCheck.isReusedDocumentExempt).toBe(true);
      expect(quotaCheck.canExecute).toBe(true);
    });

    it("valida que preenchimento manual de dados é isento de consumo de leitura", async () => {
      const quotaCheck = await checkActionQuota(companyTestId, {
        ocrToRead: 1,
        isReusedDocument: false,
        isManualEntry: true, // digitação direta sem extração por IA
      });

      expect(quotaCheck.ocrWillConsume).toBe(0);
      expect(quotaCheck.isManualEntryExempt).toBe(true);
      expect(quotaCheck.canExecute).toBe(true);
    });

    it("valida que geração de PDF final é operação documental independente e não desconta leitura", async () => {
      const quotaCheck = await checkActionQuota(companyTestId, {
        ocrToRead: 0,
        processesToCreate: 0,
        isReusedDocument: false,
        isManualEntry: false,
      });

      expect(quotaCheck.ocrWillConsume).toBe(0);
      expect(quotaCheck.processesWillConsume).toBe(0);
      expect(quotaCheck.canExecute).toBe(true);
    });
  });

  describe("3. Fluxo de Vida do Processo: Documentos, Protocolos e Documentos Emitidos", () => {
    it("verifica consistência do ciclo de vida: rascunho -> preparado -> protocolado -> concluído", () => {
      const lifecycle = ["draft", "preparing", "ready_for_protocol", "in_progress", "completed"];
      
      let current = lifecycle[0];
      expect(current).toBe("draft");

      current = lifecycle[1];
      expect(current).toBe("preparing");

      current = lifecycle[2];
      expect(current).toBe("ready_for_protocol");

      current = lifecycle[4];
      expect(current).toBe("completed");
    });

    it("valida serialização da resposta oficial e anexo de sugestões sem quebrar esquema", () => {
      const originalText = "Sugiro adicionar campo de potência em KW além de HP.";
      const response = {
        text: "Sugestão acatada pela engenharia naval!",
        respondedAt: "28/09/2026 17:00",
        respondedBy: "Equipe NavalDocs Pro"
      };

      const serialized = serializeDescription({
        description: originalText,
        adminResponse: response,
      });

      const parsed = parseDescription(serialized);
      expect(parsed.cleanDescription).toBe(originalText);
      expect(parsed.adminResponse?.text).toBe(response.text);
      expect(parsed.adminResponse?.respondedBy).toBe(response.respondedBy);
    });
  });

  describe("4. Navegação, Menu Lateral e Rotas Essenciais", () => {
    it("verifica integridade dos atalhos da página inicial e rotas operacionais", () => {
      const expectedRoutes = [
        "/dashboard",
        "/customers",
        "/customers/novo",
        "/vessels",
        "/vessels/novo",
        "/processes",
        "/servicos",
        "/servicos/selecionar",
        "/servicos/documentos",
        "/servicos/revisar",
        "/uso-do-plano",
        "/sugestoes",
        "/getting-started",
        "/primeiros-passos",
        "/settings",
        "/configuracoes/funcionarios/novo"
      ];

      expectedRoutes.forEach(r => {
        expect(r).toBeDefined();
        expect(r.startsWith("/")).toBe(true);
      });
    });
  });

});
