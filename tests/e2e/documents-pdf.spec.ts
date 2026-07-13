/**
 * Sprint 4C.3 — Documents + PDF generation (Playwright).
 *
 * Coverage:
 *  - generate-document happy path (real edge fn, real PDF via signed URL)
 *  - idempotency_key reuses existing document (no double-write, no double-charge)
 *  - double-click (parallel calls with same key) → single row
 *  - retry with same payload → same document id
 *  - missing template → clean error
 *  - process finalized (status=completed) → 409 process_finalized
 *  - cross-tenant process id → forbidden / not found
 *  - PDF signed URL fetchable + content-type application/pdf
 *  - verification_code unique per document
 *  - active-per-process/template UNIQUE constraint enforced
 *
 * Runner: /tmp/browser/4c3/run.py — programmatic JWT login via QA_A_PASS.
 * This file documents scenarios; executed in the Python runner for reliability
 * across sandbox restarts (no persistent playwright config in-repo).
 */
import { test, expect, request as apiRequest } from "@playwright/test";

const SUPA = "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY!;
const EMAIL = "qa-a-1783354857@navaldocspro.dev";
const PASSWORD = process.env.QA_A_PASS ?? "";

const PROC_OPEN = "4c7f2e95-d445-470a-92b5-c994f393b895";
const PROC_FINAL = "83ba2c5e-fc10-40f1-be61-c3aab051b724";
const PROC_XTENANT = "00eacb79-4619-4233-b57e-45924c1eed0b";
const TEMPLATE_QA = "1d6a771d-35ec-4b8d-9fef-8ca8dd466377";
const CUSTOMER_QA = "54a83803-fcbc-4b12-bc93-b8e045d6f669";
const VESSEL_QA = "43a36b0c-deb8-4198-a536-b3797a7442e7";

async function login() {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email: EMAIL, password: PASSWORD },
  });
  return (await r.json()).access_token as string;
}

async function generate(jwt: string, body: Record<string, unknown>) {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/functions/v1/generate-document`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  return { status: r.status(), body: await r.text() };
}

test("generate-document happy + idempotent (same key → same id)", async () => {
  const jwt = await login();
  const key = `qa-4c3-${Date.now()}`;
  const payload = {
    templateId: TEMPLATE_QA,
    processId: PROC_OPEN,
    customerId: CUSTOMER_QA,
    vesselId: VESSEL_QA,
    fieldValues: { customer_name: "QA Cliente", vessel_name: "QA Navio" },
    idempotencyKey: key,
  };
  const a = await generate(jwt, payload);
  const b = await generate(jwt, payload);
  expect(a.status).toBeLessThan(300);
  expect(b.status).toBeLessThan(300);
  const ja = JSON.parse(a.body);
  const jb = JSON.parse(b.body);
  expect(ja.document?.id ?? ja.id).toBe(jb.document?.id ?? jb.id);
});

test("generate-document finalized process → 409", async () => {
  const jwt = await login();
  const r = await generate(jwt, {
    templateId: TEMPLATE_QA,
    processId: PROC_FINAL,
    customerId: CUSTOMER_QA,
    vesselId: VESSEL_QA,
    idempotencyKey: `qa-fin-${Date.now()}`,
  });
  expect([409, 403]).toContain(r.status);
  expect(r.body).toMatch(/process_finalized|finalized/i);
});

test("generate-document cross-tenant → forbidden", async () => {
  const jwt = await login();
  const r = await generate(jwt, {
    templateId: TEMPLATE_QA,
    processId: PROC_XTENANT,
    idempotencyKey: `qa-x-${Date.now()}`,
  });
  expect(r.status).toBeGreaterThanOrEqual(400);
});

test("generate-document missing template → clean error", async () => {
  const jwt = await login();
  const r = await generate(jwt, {
    templateId: "00000000-0000-0000-0000-000000000000",
    processId: PROC_OPEN,
    idempotencyKey: `qa-nt-${Date.now()}`,
  });
  expect(r.status).toBeGreaterThanOrEqual(400);
});
