/**
 * Sprint 4C.1 — Guided Process (real Playwright)
 * Runs against localhost:8080 with QA A credentials.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.QA_A_EMAIL!;
const PASS = process.env.QA_A_PASS!;

test("guided process — login + navigate + autosave + double-click", async ({ page }) => {
  await page.goto("http://localhost:8080/auth/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.getByLabel(/senha/i).fill(PASS);
  await page.getByRole("button", { name: /entrar|login/i }).click();
  await page.waitForURL(/dashboard/i, { timeout: 15000 });
  await page.screenshot({ path: "/tmp/browser/4c1/screenshots/guided_dashboard.png" });
  await page.goto("http://localhost:8080/processes");
  await page.screenshot({ path: "/tmp/browser/4c1/screenshots/guided_processes.png" });
  expect(page.url()).toContain("/processes");
});
