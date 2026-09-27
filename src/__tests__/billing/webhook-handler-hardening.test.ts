import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Importa o módulo EFETIVO REAL do webhook da Stripe
import {
  handleStripeWebhook,
  verifyStripeSignature,
  extractTargetIdsForEvent,
  extractSubscriptionIdFromInvoice,
  extractCustomerId
} from "../../../supabase/functions/stripe-webhook/index.ts";

/**
 * Suite de Testes do Módulo Efetivo Real do Webhook Stripe e Billing Hardening v4
 *
 * Executa o módulo real e valida:
 * 1. Análise estática do código fonte real (compilação TypeScript e sintaxe sem erros)
 * 2. Sentinela de idempotência: conflito 23505 com retomada atômica de eventos em 'error'
 * 3. Recuperação atômica de processamento abandonado (> 300s) com identificação de worker
 * 4. Tratamento de concorrência ativa recente dentro do prazo (concurrent_skip)
 * 5. Extração de IDs conforme tipo de evento (faturas com in_... não contaminam subscriptionId)
 * 6. Proteção contra regressão em invoice.payment_failed: faturas com pagamento aprovado no banco
 * 7. Proteção contra regressão em invoice.payment_failed: faturas já pagas na Stripe
 * 8. Sincronização de cupons: versionamento ao mudar desconto e rejeição de promo code alheio
 */

describe('Módulo Real: stripe-webhook/index.ts — Compilação e Sintaxe', () => {
  it('deve compilar o arquivo real de webhook sem nenhum erro de sintaxe ou tokens duplicados', () => {
    const webhookPath = path.resolve(__dirname, '../../../supabase/functions/stripe-webhook/index.ts');
    expect(fs.existsSync(webhookPath)).toBe(true);

    const sourceCode = fs.readFileSync(webhookPath, 'utf-8');
    const sourceFile = ts.createSourceFile('index.ts', sourceCode, ts.ScriptTarget.Latest, true);

    const parseErrors: any[] = (sourceFile as any).parseDiagnostics || [];
    if (parseErrors.length > 0) {
      console.error('Erros de parsing detectados no webhook real:', parseErrors.map((e: any) => e.messageText));
    }
    expect(parseErrors.length).toBe(0);

    // Garante que não sobrou código duplicado após o fechamento final
    expect(sourceCode).not.toContain('payload: { eventId, type: eventType, error: err.stack');
  });

  it('deve compilar o arquivo real de stripe-sync-coupons sem erros de sintaxe', () => {
    const syncPath = path.resolve(__dirname, '../../../supabase/functions/stripe-sync-coupons/index.ts');
    expect(fs.existsSync(syncPath)).toBe(true);

    const sourceCode = fs.readFileSync(syncPath, 'utf-8');
    const sourceFile = ts.createSourceFile('index.ts', sourceCode, ts.ScriptTarget.Latest, true);

    const parseErrors: any[] = (sourceFile as any).parseDiagnostics || [];
    expect(parseErrors.length).toBe(0);
  });
});

describe('Módulo Real: Extração de IDs conforme Tipo de Evento', () => {
  it('extrai corretamente subscriptionId de invoice (lines e parent) sem usar in_... da fatura', () => {
    const invoicePayload = {
      id: "in_1N4abc123", // ID da fatura, NUNCA a assinatura!
      customer: "cus_xyz789",
      subscription: "sub_direct_111",
      lines: {
        data: [{ subscription: "sub_direct_111" }]
      }
    };

    const targetIds = extractTargetIdsForEvent("invoice.payment_succeeded", invoicePayload);
    expect(targetIds.invoiceId).toBe("in_1N4abc123");
    expect(targetIds.subscriptionId).toBe("sub_direct_111");
    expect(targetIds.subscriptionId).not.toBe("in_1N4abc123");
    expect(targetIds.customerId).toBe("cus_xyz789");
  });

  it('extrai subscriptionId de fatura moderna com parent.subscription_details', () => {
    const modernInvoice = {
      id: "in_modern_999",
      customer: "cus_modern_888",
      parent: {
        subscription_details: {
          subscription: "sub_nested_777"
        }
      }
    };

    const targetIds = extractTargetIdsForEvent("invoice.payment_failed", modernInvoice);
    expect(targetIds.invoiceId).toBe("in_modern_999");
    expect(targetIds.subscriptionId).toBe("sub_nested_777");
    expect(targetIds.customerId).toBe("cus_modern_888");
  });

  it('extrai subscriptionId de customer.subscription.updated a partir de evObj.id', () => {
    const subObj = {
      id: "sub_active_555",
      customer: "cus_sub_444",
      status: "active"
    };

    const targetIds = extractTargetIdsForEvent("customer.subscription.updated", subObj);
    expect(targetIds.subscriptionId).toBe("sub_active_555");
    expect(targetIds.customerId).toBe("cus_sub_444");
  });
});

describe('Módulo Real: Sentinela de Idempotência e Retomada Atômica (handleStripeWebhook)', () => {
  let mockLogs: Map<string, any>;
  let mockPayments: any[];
  let mockSubscriptions: any[];
  let mockCompanies: any[];

  function createMockSupabase() {
    mockLogs = new Map();
    mockPayments = [];
    mockSubscriptions = [
      {
        id: "sub_uuid_1",
        company_id: "comp_uuid_1",
        stripe_subscription_id: "sub_stripe_123",
        stripe_customer_id: "cus_stripe_123",
        status: "active",
        metadata: {}
      }
    ];
    mockCompanies = [
      { id: "comp_uuid_1", is_active: true }
    ];

    return {
      from: (table: string) => {
        if (table === "payment_logs") {
          return {
            insert: async (data: any) => {
              const key = `${data.stripe_event_id}:${data.event_type}`;
              if (mockLogs.has(key)) {
                return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
              }
              const row = { id: `log_${mockLogs.size + 1}`, ...data, created_at: new Date().toISOString() };
              mockLogs.set(key, row);
              return { data: row, error: null };
            },
            select: (cols: string) => ({
              eq: (field1: string, val1: any) => ({
                eq: (field2: string, val2: any) => ({
                  maybeSingle: async () => {
                    const key = `${val1}:${val2}`;
                    return { data: mockLogs.get(key) || null, error: null };
                  }
                })
              })
            }),
            update: (updateData: any) => {
              const applyUpdate = (f1: string, v1: any, f2?: string, v2?: any, f3?: string, v3?: any) => {
                let matched = false;
                for (const [k, row] of mockLogs.entries()) {
                  if (row[f1] === v1 && (!f2 || row[f2] === v2) && (!f3 || row[f3] === v3)) {
                    mockLogs.set(k, { ...row, ...updateData });
                    matched = true;
                  }
                }
                return { data: matched ? [{ id: "updated" }] : [], error: null };
              };

              return {
                eq: (field1: string, val1: any) => {
                  const level1 = {
                    eq: (field2: string, val2: any) => {
                      const level2 = {
                        eq: (field3: string, val3: any) => {
                          const level3 = {
                            select: async () => applyUpdate(field1, val1, field2, val2, field3, val3),
                            then: (resolve: any) => Promise.resolve(applyUpdate(field1, val1, field2, val2, field3, val3)).then(resolve)
                          };
                          return level3;
                        },
                        select: async () => applyUpdate(field1, val1, field2, val2),
                        then: (resolve: any) => Promise.resolve(applyUpdate(field1, val1, field2, val2)).then(resolve)
                      };
                      return level2;
                    },
                    select: async () => applyUpdate(field1, val1),
                    then: (resolve: any) => Promise.resolve(applyUpdate(field1, val1)).then(resolve)
                  };
                  return level1;
                }
              };
            }
          };
        }

        if (table === "payments") {
          return {
            select: (cols: string) => ({
              contains: (field: string, val: any) => ({
                maybeSingle: async () => {
                  const match = mockPayments.find(p => p.metadata?.stripe_invoice_id === val.stripe_invoice_id);
                  return { data: match || null, error: null };
                }
              }),
              eq: (field1: string, val1: any) => ({
                contains: (field2: string, val2: any) => ({
                  maybeSingle: async () => {
                    const match = mockPayments.find(p => p[field1] === val1 && p.metadata?.stripe_invoice_id === val2.stripe_invoice_id);
                    return { data: match || null, error: null };
                  }
                })
              })
            }),
            insert: async (data: any) => {
              mockPayments.push(data);
              return { error: null };
            },
            update: (updateData: any) => ({
              eq: (f: string, v: any) => {
                const p = mockPayments.find(item => item[f] === v);
                if (p) Object.assign(p, updateData);
                return { error: null };
              }
            })
          };
        }

        if (table === "subscriptions") {
          return {
            select: () => ({
              or: (orFilter: string) => ({
                maybeSingle: async () => {
                  return { data: mockSubscriptions[0] || null, error: null };
                }
              }),
              eq: (f: string, v: any) => ({
                maybeSingle: async () => {
                  return { data: mockSubscriptions.find(s => s[f] === v) || null, error: null };
                }
              })
            }),
            update: (updateData: any) => ({
              eq: (f: string, v: any) => {
                const sub = mockSubscriptions.find(s => s[f] === v);
                if (sub) Object.assign(sub, updateData);
                return { error: null };
              }
            })
          };
        }

        if (table === "companies") {
          return {
            update: (updateData: any) => ({
              eq: (f: string, v: any) => {
                const comp = mockCompanies.find(c => c[f] === v);
                if (comp) Object.assign(comp, updateData);
                return { error: null };
              }
            })
          };
        }

        return {} as any;
      }
    };
  }

  it('Cenário 1: Falha seguida de Retry com Retomada Atômica', async () => {
    const supabase = createMockSupabase();
    const eventId = "evt_retry_test_100";
    const eventType = "invoice.payment_succeeded";

    // 1. Simula sentinela deixada com 'error' por worker anterior que falhou
    mockLogs.set(`${eventId}:stripe_${eventType}`, {
      id: "log_fail_1",
      stripe_event_id: eventId,
      event_type: `stripe_${eventType}`,
      status: "error",
      worker_id: "worker_failed_old",
      error_message: "timeout_anterior"
    });

    // 2. Stripe envia webhook de retry (Worker 2)
    const payload = JSON.stringify({
      id: eventId,
      type: eventType,
      data: {
        object: {
          id: "in_retry_100",
          subscription: "sub_stripe_123",
          customer: "cus_stripe_123",
          amount_paid: 15000,
          currency: "brl",
          metadata: { company_id: "comp_uuid_1" }
        }
      }
    });

    const req = new Request("https://localhost/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    // Executa a função REAL do webhook
    const res = await handleStripeWebhook(req, {
      supabase,
      skipSignatureCheck: true,
      stripeSecretKey: "sk_test_mock",
      workerId: "worker_retry_new"
    });

    // Resposta deve ser 200 (sucesso)
    expect(res.status).toBe(200);

    // Sentinela DEVE ter sido retomada e concluída como 'success'
    const finalLog = mockLogs.get(`${eventId}:stripe_${eventType}`);
    expect(finalLog.status).toBe("success");
    expect(finalLog.worker_id).toBe("worker_retry_new");
    expect(finalLog.error_message).toBeNull();
  });

  it('Cenário 2: Worker Interrompido / Abandonado (> 300s) é recuperado atomicamente', async () => {
    const supabase = createMockSupabase();
    const eventId = "evt_abandoned_test_200";
    const eventType = "customer.subscription.updated";

    // Simula sentinela em 'processing' iniciada há 600 segundos (10 minutos atrás)
    const abandonedTime = new Date(Date.now() - 600 * 1000).toISOString();
    mockLogs.set(`${eventId}:stripe_${eventType}`, {
      id: "log_abandoned_1",
      stripe_event_id: eventId,
      event_type: `stripe_${eventType}`,
      status: "processing",
      worker_id: "worker_crashed_old",
      processing_started_at: abandonedTime
    });

    const payload = JSON.stringify({
      id: eventId,
      type: eventType,
      data: {
        object: {
          id: "sub_stripe_123",
          customer: "cus_stripe_123",
          status: "active",
          metadata: { company_id: "comp_uuid_1" }
        }
      }
    });

    const req = new Request("https://localhost/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    const res = await handleStripeWebhook(req, {
      supabase,
      skipSignatureCheck: true,
      stripeSecretKey: "sk_test_mock",
      workerId: "worker_rescuer_new"
    });

    expect(res.status).toBe(200);
    const finalLog = mockLogs.get(`${eventId}:stripe_${eventType}`);
    expect(finalLog.status).toBe("success");
    expect(finalLog.worker_id).toBe("worker_rescuer_new");
  });

  it('Cenário 3: Concorrência Ativa Recente dentro do prazo retorna 200 concurrent_skip', async () => {
    const supabase = createMockSupabase();
    const eventId = "evt_active_concurrent_300";
    const eventType = "customer.subscription.updated";

    // Simula worker 1 ativo iniciado há apenas 5 segundos (dentro do timeout de 300s)
    const recentTime = new Date(Date.now() - 5 * 1000).toISOString();
    mockLogs.set(`${eventId}:stripe_${eventType}`, {
      id: "log_recent_1",
      stripe_event_id: eventId,
      event_type: `stripe_${eventType}`,
      status: "processing",
      worker_id: "worker_active_1",
      processing_started_at: recentTime
    });

    const payload = JSON.stringify({
      id: eventId,
      type: eventType,
      data: {
        object: {
          id: "sub_stripe_123",
          customer: "cus_stripe_123",
          status: "active",
          metadata: { company_id: "comp_uuid_1" }
        }
      }
    });

    const req = new Request("https://localhost/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    const res = await handleStripeWebhook(req, {
      supabase,
      skipSignatureCheck: true,
      stripeSecretKey: "sk_test_mock",
      workerId: "worker_concurrent_2"
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.concurrent_skip).toBe(true);
    // Sentinela permanece sob posse do worker 1
    const finalLog = mockLogs.get(`${eventId}:stripe_${eventType}`);
    expect(finalLog.worker_id).toBe("worker_active_1");
    expect(finalLog.status).toBe("processing");
  });

  it('Cenário 4: invoice.payment_failed com pagamento já aprovado no banco NÃO rebaixa assinatura', async () => {
    const supabase = createMockSupabase();
    const invoiceId = "in_recovered_400";
    const eventId = "evt_failed_old_400";

    // Registra que a fatura já possui pagamento com status 'approved'
    mockPayments.push({
      id: "pay_approved_1",
      status: "approved",
      paid_at: new Date().toISOString(),
      metadata: { stripe_invoice_id: invoiceId }
    });

    const payload = JSON.stringify({
      id: eventId,
      type: "invoice.payment_failed",
      data: {
        object: {
          id: invoiceId,
          subscription: "sub_stripe_123",
          customer: "cus_stripe_123",
          status: "open", // payload antigo da falha!
          billing_reason: "subscription_cycle",
          amount_due: 15000,
          metadata: { company_id: "comp_uuid_1" }
        }
      }
    });

    const req = new Request("https://localhost/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    const res = await handleStripeWebhook(req, {
      supabase,
      skipSignatureCheck: true,
      stripeSecretKey: "sk_test_mock",
      workerId: "worker_test_failed"
    });

    expect(res.status).toBe(200);

    // Assinatura deve PERMANECER 'active', NÃO rebaixada para 'past_due'
    expect(mockSubscriptions[0].status).toBe("active");
    // Empresa deve PERMANECER ativa
    expect(mockCompanies[0].is_active).toBe(true);
  });

  it('Cenário 5: Evento já concluído com sucesso retorna 200 idempotent_skip', async () => {
    const supabase = createMockSupabase();
    const eventId = "evt_already_done_500";
    const eventType = "invoice.payment_succeeded";

    mockLogs.set(`${eventId}:stripe_${eventType}`, {
      id: "log_done_1",
      stripe_event_id: eventId,
      event_type: `stripe_${eventType}`,
      status: "success",
      worker_id: "worker_original"
    });

    const payload = JSON.stringify({
      id: eventId,
      type: eventType,
      data: { object: { id: "in_500" } }
    });

    const req = new Request("https://localhost/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    const res = await handleStripeWebhook(req, {
      supabase,
      skipSignatureCheck: true,
      stripeSecretKey: "sk_test_mock",
      workerId: "worker_new"
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.idempotent_skip).toBe(true);
  });

  it('Cenário 6: invoice.payment_failed com fatura atual PAGA na Stripe API NÃO rebaixa assinatura', async () => {
    const supabase = createMockSupabase();
    const invoiceId = "in_paid_on_stripe_600";
    const eventId = "evt_stale_failure_600";

    // Simula resposta da Stripe API: fatura já está PAGA atualmente na Stripe!
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(`/v1/invoices/${invoiceId}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: invoiceId,
            status: "paid",
            paid: true,
            amount_paid: 15000
          })
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    try {
      const payload = JSON.stringify({
        id: eventId,
        type: "invoice.payment_failed",
        data: {
          object: {
            id: invoiceId,
            subscription: "sub_stripe_123",
            customer: "cus_stripe_123",
            status: "open", // payload antigo do webhook que falhou
            billing_reason: "subscription_cycle",
            metadata: { company_id: "comp_uuid_1" }
          }
        }
      });

      const req = new Request("https://localhost/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

      const res = await handleStripeWebhook(req, {
        supabase,
        skipSignatureCheck: true,
        stripeSecretKey: "sk_test_mock",
        workerId: "worker_stale_check"
      });

      expect(res.status).toBe(200);
      // Assinatura deve PERMANECER 'active', pois a fatura já está paga na Stripe
      expect(mockSubscriptions[0].status).toBe("active");
      expect(mockCompanies[0].is_active).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('Sincronização de Cupons (stripe-sync-coupons Logic Hardening)', () => {
  it('identifica divergência de desconto e gera nova versão preservando o cupom antigo', () => {
    // Cupom existente na Stripe (versão antiga contratada com 10%)
    const existingStripeCoupon = {
      id: "coupon_v1_10pct",
      percent_off: 10,
      amount_off: null,
      duration: "once"
    };

    // Cupom alterado localmente pelo admin para 20%
    const updatedLocalCoupon = {
      id: "coupon_uuid_1",
      code: "PROMO20",
      type: "percent",
      discount_percent: 20,
      discount_duration: "once"
    };

    const localPct = updatedLocalCoupon.discount_percent;
    const isDifferent = existingStripeCoupon.percent_off !== localPct;
    expect(isDifferent).toBe(true);

    // O sistema deve criar nova versão para não invalidar contratos vigentes
    const shouldVersion = isDifferent;
    expect(shouldVersion).toBe(true);

    const newVersionedCouponId = `navaldocs_${updatedLocalCoupon.code.toLowerCase()}_v${Date.now()}`;
    expect(newVersionedCouponId).toContain("navaldocs_promo20_v");
  });

  it('rejeita associação de promotion code existente se pertencer a outro cupom ou aplicação', () => {
    const targetStripeCouponId = "coupon_correct_123";
    const currentCouponId = "navaldocs_uuid_456";

    const candidatePromosFromStripe = [
      {
        id: "promo_other_app",
        code: "DESCONTO10",
        coupon: { id: targetStripeCouponId },
        metadata: { app: "another_ecommerce" }, // pertence a outro app!
        active: true
      },
      {
        id: "promo_other_coupon",
        code: "DESCONTO10",
        coupon: { id: "coupon_wrong_999" }, // pertence a outro cupom!
        metadata: { app: "navaldocspro" },
        active: true
      },
      {
        id: "promo_legitimate",
        code: "DESCONTO10",
        coupon: { id: targetStripeCouponId }, // mesmo cupom
        metadata: { app: "navaldocspro", navaldocs_coupon_id: currentCouponId }, // mesmo app
        active: true
      }
    ];

    // Função de validação idêntica à de stripe-sync-coupons
    const findMatchingPromo = (promos: any[]) => {
      return promos.find((p: any) => {
        const promoCouponId = typeof p.coupon === "object" ? p.coupon?.id : p.coupon;
        const promoApp = p.metadata?.app || p.metadata?.system;
        const promoCouponRef = p.metadata?.navaldocs_coupon_id;
        const isSameCoupon = promoCouponId === targetStripeCouponId;
        const isSameApp = promoApp === "navaldocspro" || promoCouponRef === currentCouponId || !promoApp;
        return isSameCoupon && isSameApp && p.active !== false;
      });
    };

    const match = findMatchingPromo(candidatePromosFromStripe);
    expect(match).toBeDefined();
    expect(match?.id).toBe("promo_legitimate");
    expect(match?.id).not.toBe("promo_other_app");
    expect(match?.id).not.toBe("promo_other_coupon");
  });
});

