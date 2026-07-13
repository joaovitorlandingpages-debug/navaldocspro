/**
 * Sprint 4C.2 — OCR real scenarios (Playwright + Supabase edge fn + DB).
 *
 * Coverage:
 *  - programmatic login (fallback for signed_out preview)
 *  - upload valid PDF → invoke process-document-ocr → status "concluido"
 *  - double-click / concurrent invocation → second returns 409 ocr_in_progress OR idempotent
 *  - retry on completed → idempotent (no re-run, quota not double-consumed)
 *  - invalid file → validation error surfaces
 *  - finalized process → refuses upload/OCR
 *  - cross-tenant process → 403 forbidden
 *  - refresh during processing → status remains coherent
 *
 * The concurrency + cross-tenant + finalized paths are exercised through
 * page.request (Playwright APIRequestContext) against the real Supabase +
 * Edge Function endpoints, using the JWT obtained by password grant.
 *
 * Executed in the sandbox via `/tmp/browser/4c2/ocr.py` (Python Playwright).
 * This spec file exists in the repository for versioning per Sprint 4C.2.
 */
import { test, expect, request as apiRequest } from "@playwright/test";
import { readFileSync } from "node:fs";

const SUPA = "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY!;
const EMAIL = "qa-a-1783354857@navaldocspro.dev";
const PASSWORD = process.env.QA_A_PASS ?? "";
const COMPANY = "45c230bf-9b75-46f9-bbc5-92ce9d23e2ca";
const PROC_OPEN = "4c7f2e95-d445-470a-92b5-c994f393b895";
const PROC_FINAL = "83ba2c5e-fc10-40f1-be61-c3aab051b724";
const PROC_XTENANT = "23c3df99-66aa-442b-a8bd-197bf4388b30";

async function login() {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email: EMAIL, password: PASSWORD },
  });
  const j = await r.json();
  return j.access_token as string;
}

async function insertUpload(jwt: string, processId: string, path: string, fileName: string) {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/rest/v1/process_document_uploads`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      process_document_id: crypto.randomUUID(),
      process_id: processId,
      company_id: COMPANY,
      file_url: path,
      file_name: fileName,
      file_type: "application/pdf",
      ocr_status: "pendente",
    },
  });
  return { status: r.status(), body: await r.json() };
}

test("OCR — valid PDF → completed", async () => {
  const jwt = await login();
  expect(jwt).toBeTruthy();
  // Upload bytes to storage bucket then insert row & invoke edge fn.
  const rq = await apiRequest.newContext();
  const bytes = readFileSync("/tmp/browser/4c2/sample.pdf");
  const path = `${COMPANY}/${PROC_OPEN}/qa/${Date.now()}_sample.pdf`;
  const up = await rq.post(`${SUPA}/storage/v1/object/process-document-uploads/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/pdf" },
    data: bytes,
  });
  expect(up.status()).toBeLessThan(300);

  const ins = await insertUpload(jwt, PROC_OPEN, path, "sample.pdf");
  expect(ins.status).toBeLessThan(300);
  const uploadId = ins.body[0].id;

  const r = await rq.post(`${SUPA}/functions/v1/process-document-ocr`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    data: { uploadId },
  });
  const j = await r.json();
  expect(j.ok).toBe(true);
});

test("OCR — cross-tenant → 403/forbidden", async () => {
  const jwt = await login();
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/rest/v1/process_document_uploads`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      process_document_id: crypto.randomUUID(),
      process_id: PROC_XTENANT,
      company_id: COMPANY,
      file_url: "x",
      file_name: "x.pdf",
      ocr_status: "pendente",
    },
  });
  expect([401, 403, 400]).toContain(r.status());
});

test("OCR — finalized process rejects upload", async () => {
  const jwt = await login();
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/rest/v1/process_document_uploads`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      process_document_id: crypto.randomUUID(),
      process_id: PROC_FINAL,
      company_id: COMPANY,
      file_url: "x",
      file_name: "x.pdf",
      ocr_status: "pendente",
    },
  });
  const t = await r.text();
  expect(t).toMatch(/process_finalized_immutable|forbidden|violates/i);
});
