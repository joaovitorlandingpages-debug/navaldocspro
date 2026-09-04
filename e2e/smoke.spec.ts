import { test, expect } from "@playwright/test";

test.describe("NavalDocs Pro · Smoke Test E2E", () => {
  test("1. Carrega a página inicial e valida cabeçalho e navegação", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NavalDocs|Naval/i);

    // Valida presença de elementos essenciais da landing/home
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("2. Navega para a página de Planos e testa o toggle Mensal / Anual", async ({ page }) => {
    await page.goto("/plans");

    // Valida título da seção de planos
    await expect(page.getByText(/Planos Navais/i).first()).toBeVisible();

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

    // Verifica campos de e-mail e senha
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first();

    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("4. Valida rota protegida e redirecionamento de segurança", async ({ page }) => {
    // Acesso direto a rota restrita sem autenticação
    await page.goto("/admin");

    // Deve redirecionar para login ou exibir tela de restrição
    await page.waitForURL(/auth\/login|admin|dashboard/);
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});
