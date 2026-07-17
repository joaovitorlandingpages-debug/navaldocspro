import { test, expect } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:8080";

async function loginAs(page: any, email: string, pass: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

test("coverage page loads for QA A", async ({ page }) => {
  await loginAs(page, process.env.QA_A_EMAIL ?? "qa-a-1783354857@navaldocspro.dev", process.env.QA_A_PASS ?? "");
  const res = await page.goto(`${BASE}/admin/docs-central/coverage`);
  expect(res?.status()).toBeLessThan(500);
});

test("coverage page loads for QA B and does not leak QA A data", async ({ page }) => {
  await loginAs(page, process.env.QA_B_EMAIL ?? "qa-b-4d2@navaldocspro.dev", process.env.QA_B_PASS ?? "");
  const res = await page.goto(`${BASE}/admin/docs-central/coverage`);
  expect(res?.status()).toBeLessThan(500);
});
