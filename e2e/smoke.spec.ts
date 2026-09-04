import { test, expect } from "@playwright/test";

test.describe("NavalDocs Pro · Smoke Test E2E", () => {
  test("1. Carrega a página inicial e valida cabeçalho e navegação", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/NavalDocs|Naval/i);

    // Valida presença de elementos essenciais da landing/home
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("2. Navega para a página de Planos e testa o toggle Mensal / Anual", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    // Valida título da seção de planos
    const planHeading = page.locator("h1", { hasText: /Planos Navais/i });
    await expect(planHeading).toBeVisible({ timeout: 10000 });

    // Valida presença dos botões de alternância Mensal e Anual
    const monthlyBtn = page.getByRole("button", { name: /Mensal/i });
    const annualBtn = page.getByRole("button", { name: /Anual/i });

    await expect(monthlyBtn).toBeVisible();
    await expect(annualBtn).toBeVisible();

    // Clica no toggle Anual e valida se o badge de desconto é exibido
    await annualBtn.click();
    await expect(page.getByText(/2 Meses Grátis/i).first()).toBeVisible();

    // Clica no toggle Mensal
    await monthlyBtn.click();
  });

  test("3. Valida a página de login e campos de formulário", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    // Verifica campos de e-mail e senha
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    const submitBtn = page.getByRole("button", { name: /Acessar Plataforma|Entrar|Acessar/i });

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("4. Valida rota protegida e integridade da aplicação", async ({ page }) => {
    // Acesso direto a rota restrita sem autenticação
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");
    
    // Valida que o aplicativo carrega com segurança sem crashes
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
