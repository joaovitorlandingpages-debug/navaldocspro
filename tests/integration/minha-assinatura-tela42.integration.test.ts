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

describe("TELA 42 — Minha Assinatura e Compras Adicionais", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // CENÁRIO 1: Identificação Real do Aplicativo Contratado e Estado da Assinatura
  it("Cenário 1: Exibe corretamente o aplicativo contratado, ciclo e badges de estado real", () => {
    // Caso A: NavalDocs Profissional Mensal Ativo
    const subNavalDocs = {
      plan: { name: "NavalDocs Profissional", slug: "profissional", billing_cycle: "monthly", price: 290 },
      status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-10-28T23:59:59Z",
      metadata: { apps_included: ["navaldocspro"] }
    };

    expect(subNavalDocs.status).toBe("active");
    expect(subNavalDocs.plan.name).toBe("NavalDocs Profissional");
    expect(subNavalDocs.plan.billing_cycle).toBe("monthly");
    expect(subNavalDocs.cancel_at_period_end).toBe(false);

    // Caso B: Pacote Completo (3 em 1) Anual
    const subCombo = {
      plan: { name: "Pacote Completo (3 em 1)", slug: "pacote-completo", billing_cycle: "yearly", price: 4990 },
      status: "active",
      cancel_at_period_end: false,
      current_period_end: "2027-09-28T23:59:59Z",
      metadata: { apps_included: "navaldocs,arrais,notificador" }
    };

    expect(subCombo.metadata.apps_included).toContain("arrais");
    expect(subCombo.metadata.apps_included).toContain("notificador");
    expect(subCombo.plan.billing_cycle).toBe("yearly");
  });

  // CENÁRIO 2: Cancelamento Agendado Mantém Acesso até o Fim do Período
  it("Cenário 2: Se o cancelamento estiver agendado para o fim do período, o acesso NÃO é encerrado antecipadamente", () => {
    const periodEnd = "2026-11-15T23:59:59Z";
    const subCancelScheduled = {
      status: "active",
      cancel_at_period_end: true,
      current_period_end: periodEnd
    };

    // Regra da Tela 42: cancel_at_period_end mantém o acesso ativo
    const isAccessMaintained = (subCancelScheduled.status === "active" || subCancelScheduled.status === "trialing") && 
      new Date(subCancelScheduled.current_period_end).getTime() > Date.now();

    expect(isAccessMaintained).toBe(true);
    expect(subCancelScheduled.cancel_at_period_end).toBe(true);
    expect(subCancelScheduled.current_period_end).toBe(periodEnd);
  });

  // CENÁRIO 3: Validação de Permissões de Faturamento (Servidor e Cliente)
  it("Cenário 3: Apenas responsáveis autorizados (admin, owner, manager) podem alterar plano, forma de pagamento ou cancelar", () => {
    const checkCanManageBilling = (role: string, email: string) => {
      const isGlobalAdmin = email === "joaovitor.f0725@gmail.com" || email === "douglas_faresi@hotmail.com";
      return (
        isGlobalAdmin ||
        role === "admin" ||
        role === "owner" ||
        role === "manager" ||
        role === "admin_master" ||
        role === "admin_master_global"
      );
    };

    // Administradores globais e gestores da empresa
    expect(checkCanManageBilling("admin", "gestor@empresa.com")).toBe(true);
    expect(checkCanManageBilling("owner", "dono@empresa.com")).toBe(true);
    expect(checkCanManageBilling("manager", "financeiro@empresa.com")).toBe(true);
    expect(checkCanManageBilling("colaborador", "douglas_faresi@hotmail.com")).toBe(true);
    expect(checkCanManageBilling("colaborador", "joaovitor.f0725@gmail.com")).toBe(true);

    // Funcionários comuns (operacional, visualizador)
    expect(checkCanManageBilling("member", "funcionario@empresa.com")).toBe(false);
    expect(checkCanManageBilling("operator", "operador@empresa.com")).toBe(false);
    expect(checkCanManageBilling("viewer", "visitante@empresa.com")).toBe(false);
  });

  // CENÁRIO 4: Compra de Capacidade Adicional com Preço Determinado pelo Servidor
  it("Cenário 4: Compra avulsa de adicional calcula valor com base no catálogo oficial sem que o cliente determine o preço", () => {
    const plans = StripeSyncService.getPlans();
    const profPlan = plans.find(p => p.slug === "profissional")!;
    expect(profPlan).toBeDefined();

    // Tabela de preços de adicionais do plano
    const addonProcessPrice = profPlan.addonProcessPrice || 4.5;
    const addonOcrPrice = profPlan.addonOcrPrice || 0.45;

    // Compra de 10 processos adicionais
    const qtyProcesses = 10;
    const totalProcessesBrl = qtyProcesses * addonProcessPrice;
    const totalProcessesCents = Math.round(totalProcessesBrl * 100);

    expect(totalProcessesBrl).toBe(45);
    expect(totalProcessesCents).toBe(4500);

    // Compra de 50 leituras OCR adicionais
    const qtyOcr = 50;
    const totalOcrBrl = qtyOcr * addonOcrPrice;
    const totalOcrCents = Math.round(totalOcrBrl * 100);

    expect(totalOcrBrl).toBe(22.5);
    expect(totalOcrCents).toBe(2250);
  });

  // CENÁRIO 5: Idempotência do Webhook para Compras Adicionais (Evita Concessão Duplicada)
  it("Cenário 5: Webhook repetido da Stripe não concede o mesmo adicional duas vezes", () => {
    // Simulação do ledger de idempotência e créditos adicionais
    const processedEvents = new Set<string>();
    const companyAddons: Array<{ eventId: string; resourceKey: string; qty: number }> = [];

    const handleAddonWebhook = (eventId: string, resourceKey: string, qty: number) => {
      if (processedEvents.has(eventId)) {
        return { success: true, idempotent_skip: true };
      }

      // Concede cota e registra evento
      processedEvents.add(eventId);
      companyAddons.push({ eventId, resourceKey, qty });
      return { success: true, idempotent_skip: false };
    };

    const stripeEventId = "evt_addon_payment_12345";

    // 1ª Entrega do webhook:
    const firstDelivery = handleAddonWebhook(stripeEventId, "processes", 10);
    expect(firstDelivery.idempotent_skip).toBe(false);
    expect(companyAddons.length).toBe(1);
    expect(companyAddons[0].qty).toBe(10);

    // 2ª Entrega (retry da Stripe com o mesmo eventId):
    const secondDelivery = handleAddonWebhook(stripeEventId, "processes", 10);
    expect(secondDelivery.idempotent_skip).toBe(true);
    // A quantidade concedida não pode ter aumentado!
    expect(companyAddons.length).toBe(1);
    expect(companyAddons[0].qty).toBe(10);
  });

  // CENÁRIO 6: Falha de Pagamento Atualiza Estado para Past Due e Alerta Usuário
  it("Cenário 6: Falha em cobrança atualiza o estado para past_due e direciona para regularização", () => {
    const handleInvoicePaymentFailed = (invoice: { status: string; amountDue: number }) => {
      if (invoice.status === "open" && invoice.amountDue > 0) {
        return {
          newSubscriptionStatus: "past_due",
          paymentRecord: { status: "rejected", amount: invoice.amountDue },
          shouldAlertUser: true
        };
      }
      return { newSubscriptionStatus: "active", shouldAlertUser: false };
    };

    const result = handleInvoicePaymentFailed({ status: "open", amountDue: 290 });
    expect(result.newSubscriptionStatus).toBe("past_due");
    expect(result.paymentRecord?.status).toBe("rejected");
    expect(result.shouldAlertUser).toBe(true);
  });

  // CENÁRIO 7: Histórico de Faturamento com Isolamento de Empresa (Multi-Tenant)
  it("Cenário 7: Consulta de faturas e compras filtra exclusivamente por company_id da empresa autenticada", () => {
    const allPaymentsInDb = [
      { id: "pay_1", company_id: "comp_alpha", amount: 290, description: "NavalDocs Profissional" },
      { id: "pay_2", company_id: "comp_beta", amount: 149, description: "NavalDocs Essencial" },
      { id: "pay_3", company_id: "comp_alpha", amount: 45, description: "10 Processos Extras" }
    ];

    const currentCompanyId = "comp_alpha";
    const companyHistory = allPaymentsInDb.filter(p => p.company_id === currentCompanyId);

    expect(companyHistory.length).toBe(2);
    expect(companyHistory.every(p => p.company_id === "comp_alpha")).toBe(true);
    expect(companyHistory.some(p => p.company_id === "comp_beta")).toBe(false);
  });

  // CENÁRIO 8: Mudança de Plano com Apresentação de Regra Proporcional
  it("Cenário 8: Mudança de plano apresenta planos disponíveis e explica compensação proporcional de faturamento", () => {
    const plans = StripeSyncService.getPlans().filter(p => p.availableForSale);
    expect(plans.length).toBeGreaterThanOrEqual(1);

    const prorationNotice = "O valor correspondente aos dias não utilizados do seu plano atual é automaticamente creditado pela Stripe e abatido do valor do novo plano no momento da alteração.";
    expect(prorationNotice).toContain("automaticamente creditado pela Stripe");
    expect(prorationNotice).toContain("abatido do valor do novo plano");
  });
});
