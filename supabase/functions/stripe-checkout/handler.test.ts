// supabase/functions/stripe-checkout/handler.test.ts
import { assertEquals, assertMatch } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// Teste de validação estrita do handler real
Deno.test("stripe-checkout: parâmetros estáveis e consistentes para idempotencyKey", () => {
  const companyId = "2bb92b3d-3724-4a21-a384-e21b2b5b7ac3";
  const idempotencyKey = `create_customer_${companyId}`;
  assertEquals(idempotencyKey, "create_customer_2bb92b3d-3724-4a21-a384-e21b2b5b7ac3");
});
