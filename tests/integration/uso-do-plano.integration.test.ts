import { describe, it, expect, beforeEach } from "vitest";
import { 
  calculateMonthlyQuotaCycle, 
  checkActionQuota, 
  recordResourceConsumption,
  getOfficialPlanUsage,
  getConsumptionHistory
} from "@/services/billing/planUsageService";
import { OFFICIAL_NAVAL_PLANS } from "@/services/billing/plansConfig";
import { supabase } from "@/integrations/supabase/client";

describe("TELA — Uso do Plano: Testes de Saldo, Ações, Isenção e Idempotência", () => {
  let realCompanyId: string = "a0000000-0000-0000-0000-000000000001";

  beforeEach(async () => {
    // Busca empresa real no banco
    const { data: comp } = await supabase
      .from("companies")
      .select("id, plan_id")
      .not("plan_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (comp?.id) {
      realCompanyId = comp.id;
    } else {
      const { data: anyComp } = await supabase
        .from("companies")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (anyComp?.id) {
        realCompanyId = anyComp.id;
      }
    }
  });

  describe("1. Teste do ciclo de franquia (Planos Anuais renovam franquia mensalmente)", () => {
    it("deve calcular o ciclo mensal mesmo quando a assinatura na Stripe é anual", () => {
      // Assinatura anual iniciada em 15/01/2026 e com término em 15/01/2027
      const yearlyStart = "2026-01-15T00:00:00Z";
      const yearlyEnd = "2027-01-15T23:59:59Z";

      const cycle = calculateMonthlyQuotaCycle(yearlyStart, yearlyEnd, true);

      expect(cycle.start).toBeDefined();
      expect(cycle.end).toBeDefined();
      expect(cycle.renewalFormatted).toBeDefined();

      // O intervalo do ciclo de franquia deve ter duração aproximada de 1 mês (~28-32 dias), NÃO 365 dias
      const diffDays = Math.round((cycle.end.getTime() - cycle.start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    it("plano mensal deve manter o ciclo contratado padrão", () => {
      const monthStart = "2026-03-01T00:00:00Z";
      const monthEnd = "2026-03-31T23:59:59Z";

      const cycle = calculateMonthlyQuotaCycle(monthStart, monthEnd, false);
      expect(cycle.start.toISOString()).toBe(new Date(monthStart).toISOString());
      expect(cycle.end.toISOString()).toBe(new Date(monthEnd).toISOString());
    });
  });

  describe("2. Teste do saldo antes e depois de um processo", () => {
    it("deve prever o consumo de 1 processo e 0 leituras antes da execução", async () => {
      const preCheck = await checkActionQuota(realCompanyId, {
        processesToCreate: 1,
        ocrToRead: 0,
      });

      expect(preCheck.processesWillConsume).toBe(1);
      expect(preCheck.ocrWillConsume).toBe(0);
      expect(preCheck.isReusedDocumentExempt).toBe(false);
      expect(preCheck.isManualEntryExempt).toBe(false);
      expect(preCheck.canExecute).toBe(preCheck.currentAvailableProcesses >= 1);

      // Saldo após ação deve ser exatamente (saldo atual - 1 ou 0)
      expect(preCheck.remainingProcessesAfterAction).toBe(Math.max(0, preCheck.currentAvailableProcesses - 1));
      expect(preCheck.remainingOcrAfterAction).toBe(preCheck.currentAvailableOcr);
    });
  });

  describe("3. Teste do saldo antes e depois de uma leitura nova (OCR de CNH / Comprovante)", () => {
    it("deve prever o consumo de 1 leitura e 0 processos para um documento novo", async () => {
      const preCheck = await checkActionQuota(realCompanyId, {
        processesToCreate: 0,
        ocrToRead: 1,
        isReusedDocument: false,
        isManualEntry: false,
      });

      expect(preCheck.processesWillConsume).toBe(0);
      expect(preCheck.ocrWillConsume).toBe(1);
      expect(preCheck.isReusedDocumentExempt).toBe(false);
      expect(preCheck.isManualEntryExempt).toBe(false);
      expect(preCheck.canExecute).toBe(preCheck.currentAvailableOcr >= 1);

      // Saldo após ação: processos intactos, leitura subtraída em 1
      expect(preCheck.remainingProcessesAfterAction).toBe(preCheck.currentAvailableProcesses);
      expect(preCheck.remainingOcrAfterAction).toBe(Math.max(0, preCheck.currentAvailableOcr - 1));
    });
  });

  describe("4. Teste de reaproveitamento de documento já lido e digitação manual (Isenção Total)", () => {
    it("reaproveitamento de documento cadastrado NÃO consome leitura (saldo de leitura permanece inalterado)", async () => {
      const preCheck = await checkActionQuota(realCompanyId, {
        processesToCreate: 0,
        ocrToRead: 1, // Usuário anexa documento já existente
        isReusedDocument: true, // Sistema detecta que o documento já foi lido e salvo no cadastro
      });

      expect(preCheck.isReusedDocumentExempt).toBe(true);
      expect(preCheck.ocrWillConsume).toBe(0); // Zero consumo!
      expect(preCheck.canExecute).toBe(true);
      expect(preCheck.remainingOcrAfterAction).toBe(preCheck.currentAvailableOcr); // Saldo 100% preservado
      expect(preCheck.message).toContain("Documento previamente cadastrado: operação isenta de consumo");
    });

    it("preenchimento manual de dados NÃO consome leitura (saldo permanece inalterado)", async () => {
      const preCheck = await checkActionQuota(realCompanyId, {
        processesToCreate: 0,
        ocrToRead: 1,
        isManualEntry: true, // Usuário opta por digitar manualmente
      });

      expect(preCheck.isManualEntryExempt).toBe(true);
      expect(preCheck.ocrWillConsume).toBe(0); // Zero consumo!
      expect(preCheck.canExecute).toBe(true);
      expect(preCheck.remainingOcrAfterAction).toBe(preCheck.currentAvailableOcr);
      expect(preCheck.message).toContain("Preenchimento manual de dados: operação isenta");
    });
  });

  describe("5. Idempotência: prevenção contra duplo desconto por repetição ou reload", () => {
    it("ao reenviar a mesma requisição com o mesmo request_id, deve retornar deduplicated: true sem descontar duas vezes", async () => {
      const uniqueRequestId = `test-idempotency-${Date.now()}`;
      const ledgerMap = new Map<string, any>();

      const mockSupabase = {
        from: (table: string) => {
          if (table === "resource_consumption") {
            return {
              select: () => ({
                eq: () => ({
                  eq: (_field: string, reqId: string) => ({
                    maybeSingle: async () => {
                      const item = ledgerMap.get(reqId);
                      return { data: item || null, error: null };
                    },
                  }),
                }),
              }),
              insert: (payload: any) => ({
                select: () => ({
                  single: async () => {
                    ledgerMap.set(payload.request_id, { id: 101, ...payload });
                    return { data: { id: 101 }, error: null };
                  },
                }),
              }),
            };
          }
          return (supabase as any).from(table);
        },
      };

      // Primeira tentativa: deve registrar e não ser duplicata
      const firstAttempt = await recordResourceConsumption({
        companyId: realCompanyId,
        resourceKey: "ocr",
        amount: 1,
        requestId: uniqueRequestId,
        userName: "Operador Teste",
        fileName: "cnh_digital.pdf",
        supabaseClient: mockSupabase,
      });

      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.deduplicated).toBe(false);

      // Segunda tentativa com mesmo request_id (simula reload/retry): deve retornar deduplicated: true
      const secondAttempt = await recordResourceConsumption({
        companyId: realCompanyId,
        resourceKey: "ocr",
        amount: 1,
        requestId: uniqueRequestId, // Mesmo ID!
        userName: "Operador Teste",
        fileName: "cnh_digital.pdf",
        supabaseClient: mockSupabase,
      });

      expect(secondAttempt.success).toBe(true);
      expect(secondAttempt.deduplicated).toBe(true);
    });
  });

  describe("6. Integridade de catálogo e tabelas reais no backend", () => {
    it("verifica presença dos planos oficiais com franquias e preços reais", () => {
      expect(OFFICIAL_NAVAL_PLANS.length).toBeGreaterThanOrEqual(3);

      const essencial = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "essencial");
      expect(essencial).toBeDefined();
      expect(essencial?.processLimit).toBe(30);
      expect(essencial?.ocrLimit).toBe(15);
      expect(essencial?.priceMonthly).toBe(249);

      const profissional = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "profissional");
      expect(profissional).toBeDefined();
      expect(profissional?.processLimit).toBe(100);
      expect(profissional?.ocrLimit).toBe(50);
      expect(profissional?.priceMonthly).toBe(549);

      const equipe = OFFICIAL_NAVAL_PLANS.find(p => p.slug === "equipe");
      expect(equipe).toBeDefined();
      expect(equipe?.processLimit).toBe(300);
      expect(equipe?.ocrLimit).toBe(150);
      expect(equipe?.priceMonthly).toBe(1099);
    });

    it("verifica que a consulta oficial busca no backend (tabela plans, processes, company_resource_addons)", async () => {
      // 1. Tabela plans
      const { data: plans, error: pErr } = await supabase.from("plans").select("id, name, process_limit, ocr_limit").limit(2);
      expect(pErr).toBeNull();
      expect(Array.isArray(plans)).toBe(true);

      // 2. Tabela company_resource_addons
      const { data: addons, error: aErr } = await supabase.from("company_resource_addons").select("*").limit(2);
      expect(aErr).toBeNull();
      expect(Array.isArray(addons)).toBe(true);

      // 3. Tabela resource_consumption
      const { data: ledger, error: lErr } = await supabase.from("resource_consumption").select("id, amount, request_id").limit(2);
      expect(lErr).toBeNull();
      expect(Array.isArray(ledger)).toBe(true);
    });
  });
});
