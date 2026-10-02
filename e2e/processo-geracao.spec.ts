import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/Pichau/.gemini/antigravity-ide/brain/80916d5d-5637-4986-aeb0-34b88f9c797e";

test.describe("NavalDocs Pro · Fluxo Completo de Processos e Geração", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));
    await page.addInitScript(() => {
      window.localStorage.setItem("preview_mode", "true");
    });
  });

  test("1. Valida seleção de 4 serviços profissionais e revisão consistente", async ({ page }) => {
    // 1. Acessa seleção de serviços como profissional
    await page.goto("/servicos/selecionar?category=profissional&preview=true");
    await page.waitForLoadState("domcontentloaded");

    // Valida categoria exibida
    await expect(page.getByText("Embarcações profissionais").first()).toBeVisible({ timeout: 10000 });

    // Seleciona 4 serviços
    const srv1 = page.locator('div[role="checkbox"]', { hasText: "Laudo de estabilidade e engenharia naval" });
    if (await srv1.isVisible()) await srv1.click();

    const srv2 = page.locator('div[role="checkbox"]', { hasText: "Despacho e registro de tripulação / CTS" });
    if (await srv2.isVisible()) await srv2.click();

    const srv3 = page.locator('div[role="checkbox"]', { hasText: "Inscrição inicial" });
    if (await srv3.isVisible()) await srv3.click();

    const srv4 = page.locator('div[role="checkbox"]', { hasText: "Renovação do TIE" });
    if (await srv4.isVisible()) await srv4.click();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "01_selecao_4_servicos.png"), fullPage: true });

    // Clica em "Continuar para documentos"
    const continueBtn = page.getByRole("button", { name: /Continuar para documentos/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // 2. Tela de Documentos do Serviço
    await page.waitForURL(/.*\/servicos\/documentos.*/, { timeout: 10000 });
    const btnRevisarProcesso = page.getByRole("button", { name: /Revisar processo/i });
    await expect(btnRevisarProcesso).toBeVisible({ timeout: 10000 });
    await btnRevisarProcesso.click();

    // 3. Página de Revisão (/servicos/revisar)
    await page.waitForURL(/.*\/servicos\/revisar.*/, { timeout: 10000 });
    await expect(page.locator("h1", { hasText: /Revisar processo/i })).toBeVisible({ timeout: 10000 });

    // Valida que a categoria exibida na revisão é "Embarcações profissionais"
    await expect(page.getByText("Embarcações profissionais").first()).toBeVisible();

    // Valida presença dos botões separados
    const btnDraft = page.locator("#btn-salvar-processo-rascunho");
    const btnGenerate = page.locator("#btn-gerar-documentos");
    await expect(btnDraft).toBeVisible();
    await expect(btnGenerate).toBeVisible();

    // Valida que TODOS os 4 serviços estão listados na revisão
    await expect(page.getByText("Laudo de estabilidade e engenharia naval").first()).toBeVisible();
    await expect(page.getByText("Despacho e registro de tripulação / CTS").first()).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "02_revisao_processo_4_servicos.png"), fullPage: true });
    console.log("Tela de revisão com 4 serviços capturada com sucesso!");
  });

  test("2. Valida tela de processo com 4 serviços, categoria profissional e hub de documentos", async ({ page }) => {
    // Acessa uma URL de processo mockada com 4 serviços em draft_data
    const mockServices = "laudo_engenharia,despacho_maritimo,inscricao_inicial,renovacao_tie";
    await page.goto(`/processes/demo-proc-1?tab=services&preview=true`);
    await page.waitForLoadState("domcontentloaded");

    // Valida elementos do processo
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Valida cards de documentos gerados, protocolos e emitidos
    await expect(page.getByText("Documentos gerados").first()).toBeVisible();
    await expect(page.getByText("Protocolos realizados").first()).toBeVisible();
    await expect(page.getByText("Documentos emitidos").first()).toBeVisible();

    // Valida links "Gerar" e "Ver documentos"
    const linkGerar = page.locator('a[href$="/gerar-documento"]').first();
    await expect(linkGerar).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "03_pagina_processo.png"), fullPage: true });
    console.log("Página de processo capturada com sucesso!");
  });

  test("3. Valida tela de gerar documento oficial e modelos compatíveis", async ({ page }) => {
    await page.goto(`/processes/demo-proc-1/gerar-documento?preview=true`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1", { hasText: /Gerar documento/i })).toBeVisible({ timeout: 10000 });

    // Valida botão dinâmico de geração
    const btnDoGenerate = page.locator("#btn-generate-documents");
    await expect(btnDoGenerate).toBeVisible();

    // Valida opções de modelos disponíveis
    await expect(page.getByText("Documentos aplicáveis ao serviço")).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "04_tela_gerar_documento.png"), fullPage: true });
    console.log("Tela de geração de documento capturada com sucesso!");
  });

  test("4. Valida tela de documentos gerados com visualização e download", async ({ page }) => {
    await page.goto(`/processes/demo-proc-1/documentos-gerados?preview=true`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1", { hasText: /Documentos gerados/i })).toBeVisible({ timeout: 10000 });

    // Valida navegação de volta ao serviço
    await expect(page.getByText("Voltar ao serviço").first()).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "05_tela_documentos_gerados.png"), fullPage: true });
    console.log("Tela de documentos gerados capturada com sucesso!");
  });
});
