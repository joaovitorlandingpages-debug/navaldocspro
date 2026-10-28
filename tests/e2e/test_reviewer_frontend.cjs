const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testReviewerFrontend() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[PAGE ERROR]:', msg.text());
  });

  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

  console.log('1. Acessando login com:', EMAIL);
  await page.goto('https://navaldocspro.lovable.app/auth/login', { waitUntil: 'networkidle', timeout: 45000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);
  console.log('URL após login:', page.url());

  // Navegar para faturamento / planos
  console.log('2. Acessando página de faturamento/planos...');
  await page.goto('https://navaldocspro.lovable.app/planos', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log('URL Planos:', page.url());
  await page.screenshot({ path: path.join(__dirname, 'evidence', 'reviewer_planos.png') });

  // Verificar se há botão de assinatura
  const buttons = await page.$$('button');
  console.log('Total botões na página de planos:', buttons.length);
  for (const b of buttons) {
    const t = await b.textContent();
    if (t && (t.toLowerCase().includes('assinar') || t.toLowerCase().includes('contratar') || t.toLowerCase().includes('plano'))) {
      console.log('Botão encontrado:', t.trim());
    }
  }

  await browser.close();
}

testReviewerFrontend().catch(console.error);
