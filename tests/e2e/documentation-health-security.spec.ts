import { test, expect } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:8080";
const SUPA = process.env.VITE_SUPABASE_URL ?? "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

async function loginAndResolveCompany(request: any, email: string, password: string) {
  if (!ANON) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY missing");
  const r = await request.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email, password },
  });
  if (!r.ok()) throw new Error(`login failed for ${email}: ${r.status()}`);
  const { access_token, user } = await r.json();
  // Resolve company_id from authorized profile — no env dependency.
  const p = await request.get(
    `${SUPA}/rest/v1/profiles?select=company_id&id=eq.${user.id}`,
    { headers: { apikey: ANON, Authorization: `Bearer ${access_token}` } },
  );
  if (!p.ok()) throw new Error(`profile fetch failed: ${p.status()}`);
  const rows = await p.json();
  const company_id = rows?.[0]?.company_id ?? null;
  if (!company_id) throw new Error(`no company_id resolved for ${email}`);
  return { access_token, company_id };
}

test("anon cannot read docs-central pages", async ({ page }) => {
  const res = await page.goto(`${BASE}/admin/docs-central/health`);
  const url = page.url();
  expect(url.includes("/auth") || (res && res.status() >= 300)).toBeTruthy();
});

test("cross-tenant: QA A JWT cannot fetch QA B templates via Data API", async ({ request }) => {
  const email_a = process.env.QA_A_EMAIL;
  const pass_a = process.env.QA_A_PASS;
  const email_b = process.env.QA_B_EMAIL;
  const pass_b = process.env.QA_B_PASS;
  // Gate 0.2 — fail the test explicitly instead of silent skip when creds are missing.
  expect(email_a && pass_a && email_b && pass_b, "QA_A/QA_B creds required").toBeTruthy();

  const a = await loginAndResolveCompany(request, email_a!, pass_a!);
  const b = await loginAndResolveCompany(request, email_b!, pass_b!);
  expect(a.company_id).not.toEqual(b.company_id);

  // A pulls all reachable templates and MUST NOT see any private row owned by B.
  const q = await request.get(
    `${SUPA}/rest/v1/document_templates?select=id,company_id,is_global`,
    { headers: { apikey: ANON, Authorization: `Bearer ${a.access_token}` } },
  );
  expect(q.ok()).toBeTruthy();
  const rows = await q.json();
  const foreign = rows.filter(
    (r: any) => !r.is_global && r.company_id && r.company_id === b.company_id,
  );
  expect(foreign.length, "RLS leak: QA A saw QA B private templates").toBe(0);
});
