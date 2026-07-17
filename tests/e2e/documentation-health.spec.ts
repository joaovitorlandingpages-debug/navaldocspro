import { test, expect } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:8080";
const EMAIL = process.env.QA_A_EMAIL ?? "qa-a-1783354857@navaldocspro.dev";
const PASS = process.env.QA_A_PASS ?? "";

async function login(page: any) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

for (const [label, w, h] of [["desktop", 1440, 900], ["tablet", 768, 1024], ["mobile", 360, 800]] as const) {
  test(`docs-central health renders (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await login(page);
    const res = await page.goto(`${BASE}/admin/docs-central/health`);
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState("networkidle");
    // must not stay on an infinite skeleton
    await expect(page.locator('body')).not.toContainText("Failed to fetch");
  });
}
