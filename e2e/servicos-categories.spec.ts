import { test, expect } from "@playwright/test";

test.describe("NavalDocs Pro · Fluxo de Categorias em Serviços", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.addInitScript(() => {
      window.localStorage.setItem("preview_mode", "true");
    });
  });

  test("1. Categoria Embarcações profissionais: clique no cartão, ver serviços técnicos e voltar", async ({ page }) => {
    // Acessa a tela de serviços com preview habilitado
    await page.goto("/servicos?preview=true");
    await page.waitForLoadState("domcontentloaded");

    // Valida título da tela de serviços
    await expect(page.locator("h1", { hasText: /Serviços/i })).toBeVisible({ timeout: 10000 });

    // Localiza o cartão de Embarcações profissionais
    const cardProfissional = page.locator('div[role="button"][aria-label="Selecionar categoria Embarcações profissionais"]');
    await expect(cardProfissional).toBeVisible();

    // Clica DIRETAMENTE NO CARTÃO
    await cardProfissional.click();

    // Valida transição para /servicos/selecionar com category=profissional
    await page.waitForURL(/.*\/servicos\/selecionar.*category=profissional.*/);
    expect(page.url()).toContain("category=profissional");

    // Valida que o badge da categoria profissional é exibido
    await expect(page.getByText("Embarcações profissionais").first()).toBeVisible({ timeout: 10000 });

    // Valida presença de serviços específicos da categoria profissional
    await expect(page.getByText("Laudo de estabilidade e engenharia naval")).toBeVisible();
    await expect(page.getByText("Despacho e registro de tripulação / CTS")).toBeVisible();

    // Valida seleção/toggle de um serviço
    const laudoItem = page.locator('div[role="checkbox"]', { hasText: "Laudo de estabilidade e engenharia naval" });
    await expect(laudoItem).toBeVisible();
    await laudoItem.click();

    // Clica no link "Voltar às categorias"
    const backBtn = page.getByRole("link", { name: /Voltar às categorias/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Valida retorno para a tela de /servicos
    await page.waitForURL(/.*\/servicos.*/);
    await expect(page.locator("h1", { hasText: /Serviços/i })).toBeVisible();
  });

  test("2. Categoria Embarcações de esporte e recreio: clique no botão, filtrar serviços recreativos e voltar", async ({ page }) => {
    // Acessa a tela de serviços
    await page.goto("/servicos?preview=true");
    await page.waitForLoadState("domcontentloaded");

    // Localiza o cartão de Esporte e Recreio
    const cardLazer = page.locator('div[role="button"][aria-label="Selecionar categoria Embarcações de esporte e recreio"]');
    await expect(cardLazer).toBeVisible({ timeout: 10000 });

    // Localiza e clica especificamente no BOTÃO "Selecionar categoria" dentro do cartão
    const btnLazer = cardLazer.getByRole("button", { name: /Selecionar categoria/i });
    await expect(btnLazer).toBeVisible();
    await btnLazer.click();

    // Valida transição para /servicos/selecionar com category=esporte_recreio
    await page.waitForURL(/.*\/servicos\/selecionar.*category=esporte_recreio.*/);
    expect(page.url()).toContain("category=esporte_recreio");

    // Valida badge da categoria Esporte e Recreio
    await expect(page.getByText("Esporte e recreio").first()).toBeVisible({ timeout: 10000 });

    // Valida presença de serviços gerais/recreativos
    await expect(page.getByText("Transferência de propriedade")).toBeVisible();
    await expect(page.getByText("Renovação de inscrição")).toBeVisible();

    // Garante que serviços exclusivos da categoria profissional NÃO aparecem
    await expect(page.getByText("Laudo de estabilidade e engenharia naval")).not.toBeVisible();
    await expect(page.getByText("Despacho e registro de tripulação / CTS")).not.toBeVisible();

    // Clica no link "Voltar às categorias"
    const backBtn = page.getByRole("link", { name: /Voltar às categorias/i });
    await backBtn.click();

    // Valida que voltou com sucesso
    await page.waitForURL(/.*\/servicos.*/);
    await expect(page.locator("h1", { hasText: /Serviços/i })).toBeVisible();
  });

  test("3. Teste Mobile (375x667): valida clique responsivo e navegação no celular", async ({ page }) => {
    // Configura viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/servicos?preview=true");
    await page.waitForLoadState("domcontentloaded");

    // Valida cartão no mobile
    const cardProfissional = page.locator('div[role="button"][aria-label="Selecionar categoria Embarcações profissionais"]');
    await expect(cardProfissional).toBeVisible({ timeout: 10000 });

    // Toque/clique no cartão
    await cardProfissional.tap ? await cardProfissional.tap() : await cardProfissional.click();

    // Valida transição no mobile
    await page.waitForURL(/.*\/servicos\/selecionar.*category=profissional.*/);
    expect(page.url()).toContain("category=profissional");
    await expect(page.getByText("Embarcações profissionais").first()).toBeVisible({ timeout: 10000 });
  });
});
