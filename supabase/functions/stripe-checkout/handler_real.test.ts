// supabase/functions/stripe-checkout/handler_real.test.ts
import { assertEquals, assertMatch } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { handleStripeCheckoutRequest } from "./index.ts";

Deno.test("handler real: rejeita requisição não autenticada com 401", async () => {
  const req = new Request("http://localhost/stripe-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billingCycle: "monthly" }),
  });

  const mockCtx = {
    getUser: async () => null,
    admin: {} as any,
    stripe: {} as any,
    token: null,
  };

  const res = await handleStripeCheckoutRequest(req, mockCtx);
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Não autenticado");
});

Deno.test("handler real: OCC e retry loop executam com banco controlado e abortam antes de criar sessão Stripe em caso de falha de persistência", async () => {
  const companyId = "2bb92b3d-3724-4a21-a384-e21b2b5b7ac3";
  const userId = "test-user-id";

  const req = new Request("http://localhost/stripe-checkout", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer test-jwt-token"
    },
    body: JSON.stringify({ billingCycle: "monthly" }),
  });

  let stripeCustomerCreated = false;
  let checkoutSessionCreated = false;

  const mockStripe = {
    customers: {
      search: async () => ({ data: [] }),
      create: async (params: any, options: any) => {
        stripeCustomerCreated = true;
        assertEquals(options.idempotencyKey, `create_customer_${companyId}`);
        assertEquals(params.metadata.company_id, companyId);
        return { id: "cus_mock_12345" };
      },
    },
    checkout: {
      sessions: {
        create: async () => {
          checkoutSessionCreated = true;
          return { id: "cs_mock_123", url: "https://checkout.stripe.com/pay/cs_mock_123" };
        },
      },
    },
  };

  let retryAttempts = 0;
  const mockAdmin = {
    rpc: async (fn: string, params: any) => {
      if (fn === "can_manage_company_billing") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  company_id: companyId,
                  name: "Tester",
                  email: "test@example.com",
                  role: "admin",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: companyId,
                  name: "Oficina Naval Teste",
                  cnpj: "12.345.678/0001-90",
                  contact_email: "contato@oficina.com.br",
                  contact_phone: "11999999999",
                },
                error: null,
              }),
              maybeSingle: async () => ({
                data: null,
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: async () => ({ data: null, error: { message: "column not found" } }),
            }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                retryAttempts++;
                return {
                  data: {
                    id: "sub-mock-uuid",
                    metadata: {},
                    status: "pending",
                    updated_at: "2026-10-27T12:00:00Z",
                  },
                  error: null,
                };
              },
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  };

  const mockCtx = {
    getUser: async () => ({ id: userId, email: "test@example.com" }),
    admin: mockAdmin as any,
    stripe: mockStripe as any,
    token: "test-jwt-token",
  };

  const res = await handleStripeCheckoutRequest(req, mockCtx);
  assertEquals(res.status, 500);
  const json = await res.json();
  assertEquals(json.error, "Falha ao confirmar vinculação de faturamento da empresa. Operação cancelada.");

  assertEquals(stripeCustomerCreated, true);
  assertEquals(checkoutSessionCreated, false);
  assertEquals(retryAttempts, 5);
});

Deno.test("handler real: caminho bem-sucedido comprova gravação durável do vínculo antes de criar a sessão Stripe", async () => {
  const companyId = "2bb92b3d-3724-4a21-a384-e21b2b5b7ac3";
  const userId = "test-user-id";

  const req = new Request("http://localhost/stripe-checkout", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer test-jwt-token"
    },
    body: JSON.stringify({ 
      planId: "plano-pro",
      billingCycle: "monthly",
      successUrl: "https://navaldocspro.com.br/dashboard?checkout=success",
      cancelUrl: "https://navaldocspro.com.br/dashboard?checkout=cancel"
    }),
  });

  let customerCreatedInStripe = false;
  let sessionCreatedInStripe = false;
  let customerSavedInDbBeforeSession = false;

  const expectedCustomerId = "cus_mock_success_888";
  let activeMetadata: any = {};

  const mockStripe = {
    customers: {
      search: async () => ({ data: [] }),
      create: async (params: any, options: any) => {
        customerCreatedInStripe = true;
        assertEquals(options.idempotencyKey, `create_customer_${companyId}`);
        assertEquals(params.metadata.company_id, companyId);
        return { id: expectedCustomerId };
      },
    },
    checkout: {
      sessions: {
        create: async (sessionParams: any) => {
          // CRÍTICO: Valida que a gravação no banco já foi efetivada e comprovada
          // ANTES da chamada a sessions.create da Stripe
          assertEquals(customerSavedInDbBeforeSession, true);
          assertEquals(sessionParams.customer, expectedCustomerId);
          sessionCreatedInStripe = true;
          return {
            id: "cs_test_success_999",
            url: "https://checkout.stripe.com/pay/cs_test_success_999",
          };
        },
      },
    },
  };

  const mockAdmin = {
    rpc: async (fn: string, params: any) => {
      if (fn === "can_manage_company_billing") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  company_id: companyId,
                  name: "Tester Owner",
                  email: "owner@naval.com.br",
                  role: "owner",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: companyId,
                  name: "Oficina Naval Aprovada",
                  cnpj: "12.345.678/0001-90",
                  contact_email: "contato@oficina.com.br",
                  contact_phone: "11999999999",
                },
                error: null,
              }),
              maybeSingle: async () => ({
                data: null,
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: async () => ({ data: null, error: { message: "column not found" } }),
            }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: (fields?: string) => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "sub-mock-uuid",
                  metadata: activeMetadata,
                  status: "pending",
                  current_period_end: null,
                  updated_at: "2026-10-27T10:00:00Z",
                },
                error: null,
              }),
              in: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: null, // Sem contrato ativo anterior da Stripe
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: (payload: any) => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                select: async () => {
                  activeMetadata = { ...payload.metadata };
                  if (activeMetadata.stripe_customer_id === expectedCustomerId) {
                    customerSavedInDbBeforeSession = true;
                  }
                  return {
                    data: [{ id: "sub-mock-uuid", metadata: activeMetadata }],
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "plan-mock-uuid",
                  slug: "plano-pro",
                  name: "Plano Pro",
                  price: 199.00,
                  price_yearly: 1990.00,
                  stripe_product_id: "prod_mock_pro",
                  stripe_price_monthly_id: "price_mock_pro_monthly",
                  stripe_price_yearly_id: "price_mock_pro_yearly",
                  is_active: true,
                  status: "published",
                  stripe_sync_status: "synced",
                  features: {},
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { 
        select: () => ({ 
          eq: () => ({ 
            maybeSingle: async () => ({ data: null, error: null }),
            select: async () => ({ data: null, error: null }) 
          }) 
        }) 
      };
    },
  };

  const mockCtx = {
    getUser: async () => ({ id: userId, email: "owner@naval.com.br" }),
    admin: mockAdmin as any,
    stripe: mockStripe as any,
    token: "test-jwt-token",
  };

  const res = await handleStripeCheckoutRequest(req, mockCtx);
  const json = await res.json();
  if (res.status !== 200) {
    console.error("DEBUG RESPONSE ERROR:", json);
  }
  assertEquals(res.status, 200);

  assertEquals(customerCreatedInStripe, true);
  assertEquals(customerSavedInDbBeforeSession, true);
  assertEquals(sessionCreatedInStripe, true);
  assertEquals(json.sessionId, "cs_test_success_999");
  assertEquals(json.url, "https://checkout.stripe.com/pay/cs_test_success_999");
});
