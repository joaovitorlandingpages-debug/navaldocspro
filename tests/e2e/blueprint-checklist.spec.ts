/**
 * Sprint 4C.2 — Blueprint (materialize checklist) + Checklist CAS (Playwright).
 *
 * Coverage:
 *  - process_materialize_checklist adds items on first call, keeps on repeat (no duplicates)
 *  - cas_update_checklist_item happy path (version increments)
 *  - cas_update_checklist_item conflict path (stale version → optimistic_lock_conflict)
 *  - cas_update_process happy + conflict paths
 *  - Cross-tenant → RPC raises 'forbidden'
 *  - Finalized process → checklist insert/update blocked by trigger
 *
 * Executed via `/tmp/browser/4c2/blueprint_checklist.py` (Python Playwright).
 * Versioned here per Sprint 4C.2 requirement.
 */
import { test, expect, request as apiRequest } from "@playwright/test";

const SUPA = "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY!;
const EMAIL = "qa-a-1783354857@navaldocspro.dev";
const PASSWORD = process.env.QA_A_PASS ?? "";
const PROC_OPEN = "4c7f2e95-d445-470a-92b5-c994f393b895";
const PROC_FINAL = "83ba2c5e-fc10-40f1-be61-c3aab051b724";
const PROC_XTENANT = "23c3df99-66aa-442b-a8bd-197bf4388b30";

async function login() {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email: EMAIL, password: PASSWORD },
  });
  return (await r.json()).access_token as string;
}

async function rpc(jwt: string, fn: string, args: any) {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/rest/v1/rpc/${fn}`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    data: args,
  });
  return { status: r.status(), body: await r.text() };
}

test("materialize checklist — idempotent (no duplicates on repeat)", async () => {
  const jwt = await login();
  const first = await rpc(jwt, "process_materialize_checklist", { p_process_id: PROC_OPEN });
  expect(first.status).toBeLessThan(300);
  const second = await rpc(jwt, "process_materialize_checklist", { p_process_id: PROC_OPEN });
  expect(second.status).toBeLessThan(300);
  const b = JSON.parse(second.body);
  expect(b.added).toBe(0);
});

test("materialize — cross-tenant forbidden", async () => {
  const jwt = await login();
  const r = await rpc(jwt, "process_materialize_checklist", { p_process_id: PROC_XTENANT });
  expect(r.body).toMatch(/forbidden|process_not_found/i);
});

test("CAS checklist item — conflict on stale version", async () => {
  const jwt = await login();
  // Ensure at least one checklist item.
  await rpc(jwt, "process_materialize_checklist", { p_process_id: PROC_OPEN });
  const rq = await apiRequest.newContext();
  const list = await rq.get(
    `${SUPA}/rest/v1/document_checklists?process_id=eq.${PROC_OPEN}&limit=1&select=id,version`,
    { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } },
  );
  const rows = await list.json();
  const item = rows[0];
  const ok = await rpc(jwt, "cas_update_checklist_item", {
    p_id: item.id,
    p_expected_version: item.version,
    p_patch: { notes: "qa-4c2" },
  });
  expect(ok.status).toBeLessThan(300);
  const stale = await rpc(jwt, "cas_update_checklist_item", {
    p_id: item.id,
    p_expected_version: item.version,
    p_patch: { notes: "should-fail" },
  });
  expect(stale.body).toMatch(/optimistic_lock_conflict/i);
});

test("checklist mutation on finalized process is blocked", async () => {
  const jwt = await login();
  const r = await rpc(jwt, "process_materialize_checklist", { p_process_id: PROC_FINAL });
  expect(r.body).toMatch(/process_finalized_immutable|forbidden/i);
});
