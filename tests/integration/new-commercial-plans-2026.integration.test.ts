import { describe, it, expect, beforeEach } from "vitest";
import { 
  StripeSyncService, 
  AdminPlanData, 
  OFFICIAL_DEFAULT_PLANS 
} from "@/services/billing/stripeSyncService";
import { OFFICIAL_NAVAL_PLANS } from "@/services/billing/plansConfig";

// Mock de localStorage
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as any).localStorage = localStorageMock;

describe("Nova Proposta Comercial NavalDocs Pro (3 Planos e Checkout)", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // TESTE 1: Exatamente os 3 planos comerciais novos configurados
  it("Cenário 1: O catálogo NavalDocs contém exatamente os 3 novos planos comerciais", () => {
    expect(OFFICIAL_NAVAL_PLANS).toHaveLength(3);
    const slugs = OFFICIAL_NAVAL_PLANS.map(p => p.slug);
    expect(slugs).toEqual(["essencial", "profissional", "equipe"]);
  });

  // TESTE 2: Preços e Franquias do Plano Essencial
  it("Cenário 2: Plano Essencial possui R$ 249/mês, R$ 2.490/ano, 30 processos, 15 leituras OCR, 1 usuário e 2 GB", () => {
    const essencial = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "essencial")!;
    expect(essencial).toBeDefined();
    expect(essencial.priceMonthly).toBe(249);
    expect(essencial.priceYearly).toBe(2490);
    expect(essencial.processLimit).toBe(30);
    expect(essencial.ocrLimit).toBe(15);
    expect(essencial.userLimit).toBe(1);
    expect(essencial.storageGb).toBe(2);
    expect(essencial.availableForSale).toBe(true);

    // No anual, o total cobrado antecipadamente equivale a R$ 207,50/mês
    const monthlyEquivalent = essencial.priceYearly / 12;
    expect(monthlyEquivalent).toBeCloseTo(207.5, 1);
  });

  // TESTE 3: Preços e Franquias do Plano Profissional
  it("Cenário 3: Plano Profissional possui R$ 549/mês, R$ 5.490/ano, 100 processos, 50 leituras OCR, 3 usuários e 8 GB", () => {
    const profissional = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "profissional")!;
    expect(profissional).toBeDefined();
    expect(profissional.priceMonthly).toBe(549);
    expect(profissional.priceYearly).toBe(5490);
    expect(profissional.processLimit).toBe(100);
    expect(profissional.ocrLimit).toBe(50);
    expect(profissional.userLimit).toBe(3);
    expect(profissional.storageGb).toBe(8);
    expect(profissional.isPopular).toBe(true);
    expect(profissional.availableForSale).toBe(true);

    const monthlyEquivalent = profissional.priceYearly / 12;
    expect(monthlyEquivalent).toBeCloseTo(457.5, 1);
  });

  // TESTE 4: Preços e Franquias do Plano Equipe
  it("Cenário 4: Plano Equipe possui R$ 1.099/mês, R$ 10.990/ano, 300 processos, 150 leituras OCR, 10 usuários e 20 GB", () => {
    const equipe = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "equipe")!;
    expect(equipe).toBeDefined();
    expect(equipe.priceMonthly).toBe(1099);
    expect(equipe.priceYearly).toBe(10990);
    expect(equipe.processLimit).toBe(300);
    expect(equipe.ocrLimit).toBe(150);
    expect(equipe.userLimit).toBe(10);
    expect(equipe.storageGb).toBe(20);
    expect(equipe.availableForSale).toBe(true);

    const monthlyEquivalent = equipe.priceYearly / 12;
    expect(monthlyEquivalent).toBeCloseTo(915.83, 1);
  });

  // TESTE 5: Regras contratuais obrigatórias
  it("Cenário 5: Regras de geração de documento vs documento lido e renovação mensal não cumulativa", () => {
    const plans = StripeSyncService.getPlans();
    const navalPlans = plans.filter(p => ["essencial", "profissional", "equipe"].includes(p.slug));

    navalPlans.forEach(plan => {
      // Geração de documentos ilimitada indicada nos features
      const featuresStr = plan.features?.join(" ") || "";
      expect(featuresStr).toContain("ilimitada de documentos finais");
      expect(featuresStr).toContain("sem consumir leituras");

      // Preço anual com desconto
      expect(plan.priceYearly).toBeLessThan(plan.priceMonthly * 12);
    });
  });

  // TESTE 6: Preservação de versões e histórico de preços
  it("Cenário 6: Alteração comercial em planos existentes incrementa versão e preserva histórico", async () => {
    const initialPlan: AdminPlanData = {
      id: "plan-test-v1",
      slug: "plano-teste-versionamento",
      name: "Plano Teste Versionamento",
      description: "Plano inicial v1",
      appsIncluded: ["navaldocs"],
      priceMonthly: 149,
      priceYearly: 1490,
      userLimit: 1,
      processLimit: 20,
      arraisKitsLimit: 0,
      aiPagesLimit: 200,
      monitoredDocsLimit: 0,
      storageGb: 5,
      addonProcessPrice: 0,
      addonArraisKitPrice: 0,
      addonOcrPrice: 0,
      addonMonitoredDocPrice: 0,
      status: "published",
      stripeSyncStatus: "synced",
      version: 1,
      priceHistory: [],
      order: 1,
      availableForSale: true,
      stripeProductId: "prod_teste_v1",
      stripePriceMonthlyId: "price_teste_149_mo",
      stripePriceYearlyId: "price_teste_1490_yr",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva versão 1
    await StripeSyncService.savePlan(initialPlan);

    // Atualiza para a nova proposta comercial (R$ 249 / R$ 2.490)
    const updatedPlan: AdminPlanData = {
      ...initialPlan,
      priceMonthly: 249,
      priceYearly: 2490,
      processLimit: 30,
      aiPagesLimit: 15,
      storageGb: 2,
      stripePriceMonthlyId: "price_essencial_249_mo",
      stripePriceYearlyId: "price_essencial_2490_yr"
    };

    const savedV2 = await StripeSyncService.savePlan(updatedPlan);

    // Versão incrementada para proteger contratos anteriores
    expect(savedV2.version).toBe(2);
    expect(savedV2.priceHistory).toHaveLength(1);
    expect(savedV2.priceHistory![0].priceMonthly).toBe(149);
    expect(savedV2.priceHistory![0].stripePriceMonthlyId).toBe("price_teste_149_mo");
    expect(savedV2.priceHistory![0].stripePriceYearlyId).toBe("price_teste_1490_yr");

    // Novo preço ativo fica com sincronização pendente até integração com Stripe
    expect(savedV2.priceMonthly).toBe(249);
    expect(savedV2.priceYearly).toBe(2490);
    expect(savedV2.stripeSyncStatus).toBe("not_synced");
    expect(savedV2.stripePriceMonthlyId).toBeNull();
    // Checkout bloqueado pois não há Price ID na Stripe
    const canCheckout = savedV2.stripeSyncStatus === "synced" && !!savedV2.stripePriceMonthlyId;
    expect(canCheckout).toBe(false);
  });
});
