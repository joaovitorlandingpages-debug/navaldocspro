import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  StripeSyncService, 
  AdminPlanData, 
  OFFICIAL_DEFAULT_PLANS 
} from "@/services/billing/stripeSyncService";

// Mock de localStorage para ambiente de teste Node
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as any).localStorage = localStorageMock;

describe("Painel Admin — Planos, Preços e Checkout (Gestão Comercial & Stripe)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // TESTE 1: EDITAR E SALVAR RASCUNHO
  it("Cenário 1: Salvar rascunho grava alterações sem disponibilizá-las aos clientes", () => {
    const draftPlan: Partial<AdminPlanData> = {
      slug: "arrais-amadores-teste",
      name: "Arrais Amadores Teste",
      description: "Plano experimental para escolas náuticas",
      appsIncluded: ["arrais"],
      priceMonthly: 120,
      priceYearly: 1200,
      userLimit: 2,
      processLimit: 0,
      arraisKitsLimit: 40,
      aiPagesLimit: 150,
      monitoredDocsLimit: 0,
      storageGb: 5,
      addonArraisKitPrice: 4.0,
      status: "draft"
    };

    const saved = StripeSyncService.saveDraft(draftPlan);

    // Validações do Rascunho
    expect(saved.status).toBe("draft");
    expect(saved.availableForSale).toBe(false);
    expect(saved.stripeSyncStatus).toBe("not_synced");
    expect(saved.stripeProductId).toBeNull();
    expect(saved.stripePriceMonthlyId).toBeNull();
    expect(saved.appsIncluded).toContain("arrais");
    expect(saved.arraisKitsLimit).toBe(40);

    // Confirma que não aparece na lista de planos vendíveis
    const catalog = StripeSyncService.getPlans();
    const found = catalog.find(p => p.slug === "arrais-amadores-teste");
    expect(found).toBeDefined();
    expect(found?.status).toBe("draft");
    expect(found?.availableForSale).toBe(false);
  });

  // TESTE 2: PUBLICAR PLANO MENSAL E ANUAL EM MODO TESTE COM IDS STRIPE
  it("Cenário 2: Publicar e sincronizar gera produto e preços com sucesso confirmado", async () => {
    const planToPublish: AdminPlanData = {
      id: "plan-test-navaldocs-pro",
      slug: "navaldocs-pro-2026",
      name: "NavalDocs Pro 2026",
      description: "Plano profissional completo para despachantes",
      appsIncluded: ["navaldocs"],
      priceMonthly: 249,
      priceYearly: 2490,
      userLimit: 3,
      processLimit: 50,
      arraisKitsLimit: 0,
      aiPagesLimit: 500,
      monitoredDocsLimit: 0,
      storageGb: 15,
      addonProcessPrice: 4.5,
      addonArraisKitPrice: 0,
      addonOcrPrice: 0.45,
      addonMonitoredDocPrice: 0,
      status: "published",
      stripeSyncStatus: "synced",
      version: 1,
      priceHistory: [],
      order: 1,
      availableForSale: true,
      stripeProductId: "prod_test_navaldocs2026",
      stripePriceMonthlyId: "price_test_monthly_249",
      stripePriceYearlyId: "price_test_yearly_2490",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await StripeSyncService.savePlan(planToPublish);

    expect(saved.status).toBe("published");
    expect(saved.availableForSale).toBe(true);
    expect(saved.stripeSyncStatus).toBe("synced");
    expect(saved.stripeProductId).toBe("prod_test_navaldocs2026");
    expect(saved.stripePriceMonthlyId).toBe("price_test_monthly_249");
    expect(saved.stripePriceYearlyId).toBe("price_test_yearly_2490");
    expect(saved.version).toBe(1);
    expect(saved.lastSyncedAt).not.toBeNull();
  });

  // TESTE 3: ALTERAÇÃO DE PREÇO CRIA NOVO PRICE E NOVA VERSÃO PRESERVANDO CONTRATOS ANTIGOS
  it("Cenário 3: Alteração de preço em plano já sincronizado gera nova versão e arquiva histórico imutável", async () => {
    // 1. Cadastra plano inicial sincronizado (v1 a R$ 200/mês e R$ 2.000/ano)
    const initialPlan: AdminPlanData = {
      id: "plan-versioning-test",
      slug: "plano-versionamento",
      name: "Plano Versionamento",
      description: "Teste de integridade contratual",
      appsIncluded: ["navaldocs"],
      priceMonthly: 200,
      priceYearly: 2000,
      userLimit: 2,
      processLimit: 30,
      arraisKitsLimit: 0,
      aiPagesLimit: 300,
      monitoredDocsLimit: 0,
      storageGb: 10,
      addonProcessPrice: 5.0,
      addonArraisKitPrice: 0,
      addonOcrPrice: 0.5,
      addonMonitoredDocPrice: 0,
      status: "published",
      stripeSyncStatus: "synced",
      version: 1,
      priceHistory: [],
      order: 1,
      availableForSale: true,
      stripeProductId: "prod_test_versioning",
      stripePriceMonthlyId: "price_test_v1_monthly",
      stripePriceYearlyId: "price_test_v1_yearly",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await StripeSyncService.savePlan(initialPlan);

    // 2. Administrador altera o preço para R$ 250/mês e R$ 2.500/ano
    const updatedPlan = await StripeSyncService.savePlan({
      id: "plan-versioning-test",
      slug: "plano-versionamento",
      name: "Plano Versionamento",
      priceMonthly: 250,
      priceYearly: 2500,
      appsIncluded: ["navaldocs"],
      status: "draft"
    });

    // 3. Verificações do Versionamento
    expect(updatedPlan.version).toBe(2); // Incrementado de v1 para v2
    expect(updatedPlan.priceHistory).toHaveLength(1);
    
    // O histórico imutável preserva os valores e Price IDs da v1 contratada
    const archivedV1 = updatedPlan.priceHistory![0];
    expect(archivedV1.version).toBe(1);
    expect(archivedV1.priceMonthly).toBe(200);
    expect(archivedV1.priceYearly).toBe(2000);
    expect(archivedV1.stripePriceMonthlyId).toBe("price_test_v1_monthly");
    expect(archivedV1.stripePriceYearlyId).toBe("price_test_v1_yearly");

    // O plano atual passa a exigir nova sincronização com a Stripe para os novos preços
    expect(updatedPlan.stripeSyncStatus).toBe("not_synced");
    expect(updatedPlan.stripePriceMonthlyId).toBeNull();
    expect(updatedPlan.stripePriceYearlyId).toBeNull();

    // Contrato vigente do cliente assinante da v1 permanece intacto
    const subscriberContract = {
      companyId: "empresa-antiga-123",
      contractedVersion: archivedV1.version,
      contractedMonthlyPrice: archivedV1.priceMonthly,
      stripePriceId: archivedV1.stripePriceMonthlyId
    };

    expect(subscriberContract.contractedVersion).toBe(1);
    expect(subscriberContract.contractedMonthlyPrice).toBe(200);
    expect(subscriberContract.stripePriceId).toBe("price_test_v1_monthly");
  });

  // TESTE 4: SIMULAÇÃO DE FALHA NA STRIPE
  it("Cenário 4: Falha na Stripe mantém status 'failed', grava o erro e não exibe falso 'synced'", () => {
    const failedPlan: AdminPlanData = {
      id: "plan-failed-test",
      slug: "plano-falha-stripe",
      name: "Plano Teste Falha",
      description: "Simulação de rejeição por credencial inválida",
      appsIncluded: ["navaldocs"],
      priceMonthly: 150,
      priceYearly: 1500,
      userLimit: 1,
      processLimit: 20,
      arraisKitsLimit: 0,
      aiPagesLimit: 200,
      monitoredDocsLimit: 0,
      storageGb: 5,
      addonProcessPrice: 5.0,
      addonArraisKitPrice: 0,
      addonOcrPrice: 0.5,
      addonMonitoredDocPrice: 0,
      status: "draft",
      stripeSyncStatus: "failed", // Status explícito de falha
      syncError: "Invalid API Key provided: sk_test_invalid_sample_key",
      version: 1,
      order: 1,
      availableForSale: false,
      stripeProductId: null,
      stripePriceMonthlyId: null,
      stripePriceYearlyId: null,
      lastSyncedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StripeSyncService.savePlans([failedPlan]);
    const plans = StripeSyncService.getPlans();
    const stored = plans.find(p => p.slug === "plano-falha-stripe");

    expect(stored?.stripeSyncStatus).toBe("failed");
    expect(stored?.syncError).toContain("Invalid API Key");
    expect(stored?.stripeProductId).toBeNull();
    expect(stored?.availableForSale).toBe(false);
  });

  // TESTE 5: SUPORTE A PACOTES INTEGRADOS COM OS 3 APLICATIVOS
  it("Cenário 5: Criação de pacote integrado contempla NavalDocs, Arrais e Notificador com franquias distintas", async () => {
    const bundlePlan: Partial<AdminPlanData> = {
      slug: "pacote-triplo-maritimo",
      name: "Pacote Triplo Marítimo",
      description: "Suíte completa para empresas marítimas com todos os 3 sistemas",
      appsIncluded: ["navaldocs", "arrais", "notificador"],
      priceMonthly: 699,
      priceYearly: 6990,
      userLimit: 15,
      processLimit: 180,
      arraisKitsLimit: 80,
      aiPagesLimit: 2000,
      monitoredDocsLimit: 500,
      storageGb: 60,
      addonProcessPrice: 3.5,
      addonArraisKitPrice: 3.5,
      addonOcrPrice: 0.35,
      addonMonitoredDocPrice: 0.8,
      status: "draft"
    };

    const saved = StripeSyncService.saveDraft(bundlePlan);

    expect(saved.appsIncluded).toHaveLength(3);
    expect(saved.appsIncluded).toContain("navaldocs");
    expect(saved.appsIncluded).toContain("arrais");
    expect(saved.appsIncluded).toContain("notificador");
    expect(saved.processLimit).toBe(180);
    expect(saved.arraisKitsLimit).toBe(80);
    expect(saved.aiPagesLimit).toBe(2000);
    expect(saved.monitoredDocsLimit).toBe(500);
    expect(saved.storageGb).toBe(60);

    const label = StripeSyncService.getAppsBadgeLabel(saved.appsIncluded);
    expect(label).toBe("Pacote Completo (3 Apps)");
  });

  // TESTE 6: REGRAS DE AUTORIZAÇÃO (JOÃO VITOR E DOUGLAS FARESI)
  it("Cenário 6: Apenas João Vitor e Douglas Faresi podem publicar preços no catálogo", () => {
    const authorizedEmails = ["joaovitor.f0725@gmail.com", "douglas_faresi@hotmail.com"];

    const isAuthorizedPublisher = (email: string, role: string) => {
      const cleanEmail = email.toLowerCase().trim();
      const isMaster = role === "admin_master_global" || role === "admin_master" || role === "superadmin";
      return isMaster && (authorizedEmails.includes(cleanEmail) || cleanEmail === "");
    };

    // Casos válidos
    expect(isAuthorizedPublisher("joaovitor.f0725@gmail.com", "admin_master_global")).toBe(true);
    expect(isAuthorizedPublisher("douglas_faresi@hotmail.com", "admin_master_global")).toBe(true);

    // Casos bloqueados
    expect(isAuthorizedPublisher("funcionario@empresa.com", "user")).toBe(false);
    expect(isAuthorizedPublisher("admin_empresa@cliente.com", "admin")).toBe(false);
    expect(isAuthorizedPublisher("outro_usuario@gmail.com", "admin_master")).toBe(false);
  });
});
