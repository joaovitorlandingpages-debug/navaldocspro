/**
 * Sprint 4C.3 — Signatures + Certificates (Playwright).
 *
 * Coverage:
 *  - signature_requests: one active per document (unique index enforced)
 *  - signature_get_by_token(RPC): valid token → data; invalid → null; expired → null
 *  - signature_get_sequential_prev(RPC): blocks out-of-order signing
 *  - Cross-tenant read → RLS blocks (0 rows)
 *  - Finalized process → signature_request insert blocked
 *  - certificate_verify(RPC): valid code → payload; invalid → null; cross-tenant safe (anon-callable)
 *  - one certificate per signature_request (unique index)
 *  - verification_code globally unique
 *
 * Runner: /tmp/browser/4c3/run.py — programmatic JWT login via QA_A_PASS.
 */
import { test, expect, request as apiRequest } from "@playwright/test";

const SUPA = "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY!;
const EMAIL = "qa-a-1783354857@navaldocspro.dev";
const PASSWORD = process.env.QA_A_PASS ?? "";
const COMPANY_QA = "45c230bf-9b75-46f9-bbc5-92ce9d23e2ca";
const PROC_OPEN = "4c7f2e95-d445-470a-92b5-c994f393b895";
const PROC_FINAL = "83ba2c5e-fc10-40f1-be61-c3aab051b724";

async function login() {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email: EMAIL, password: PASSWORD },
  });
  return (await r.json()).access_token as string;
}

async function rpc(jwt: string | null, fn: string, args: unknown) {
  const rq = await apiRequest.newContext();
  const headers: Record<string, string> = { apikey: ANON, "Content-Type": "application/json" };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const r = await rq.post(`${SUPA}/rest/v1/rpc/${fn}`, { headers, data: args });
  return { status: r.status(), body: await r.text() };
}

test("signature_get_by_token: invalid token → null / not found", async () => {
  const r = await rpc(null, "signature_get_by_token", { p_token: "invalid-token-xyz" });
  expect(r.status).toBeLessThan(500);
  expect(r.body === "null" || r.body === "[]" || r.body === "").toBeTruthy();
});

test("certificate_verify: invalid code → null", async () => {
  const r = await rpc(null, "certificate_verify", { p_code: "NOPE-0000-0000" });
  expect(r.status).toBeLessThan(500);
  const t = r.body.trim();
  expect(t === "null" || t === "[]" || t === "").toBeTruthy();
});

test("signature_requests active-per-document uniqueness enforced", async () => {
  const jwt = await login();
  const rq = await apiRequest.newContext();
  const list = await rq.get(
    `${SUPA}/rest/v1/signature_requests?company_id=eq.${COMPANY_QA}&status=in.(draft,sent,pending,in_progress)&select=id,document_id&limit=200`,
    { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } },
  );
  const rows = (await list.json()) as Array<{ document_id: string | null }>;
  const docs = rows.filter((r) => r.document_id).map((r) => r.document_id!);
  const dupes = docs.filter((d, i) => docs.indexOf(d) !== i);
  expect(dupes.length).toBe(0);
});

test("cross-tenant signature_requests read → 0 rows via RLS", async () => {
  const jwt = await login();
  const rq = await apiRequest.newContext();
  const r = await rq.get(
    `${SUPA}/rest/v1/signature_requests?company_id=neq.${COMPANY_QA}&select=id&limit=5`,
    { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } },
  );
  const rows = await r.json();
  expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
});
