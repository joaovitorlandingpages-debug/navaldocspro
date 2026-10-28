const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function testScenarioCReal() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const BASE_URL = envContent.match(/VITE_SITE_URL\s*=\s*"?([^"\r\n]+)"?/)?.[1]?.trim() || 'https://navaldocspro.lovable.app';
  const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

  const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'ocr');
  const EVIDENCE_DIR = path.join(__dirname, 'evidence', 'ocr_suite');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[PAGE_ERROR]: ${err.message}`));

  console.log('1. Realizando login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]:has-text("Entrar")');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 25000 });
  console.log('Login concluído.');

  console.log('2. Acessando /vessels/novo...');
  await page.goto(`${BASE_URL}/vessels/novo`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Seleciona cliente no dropdown
  console.log('3. Selecionando cliente...');
  const custTrigger = await page.$('#customer-select-trigger');
  if (custTrigger) {
    await custTrigger.click();
    await page.waitForTimeout(1000);
    const firstOption = await page.$('[role="option"]');
    if (firstOption) {
      const optText = await firstOption.textContent();
      console.log('Opção de cliente encontrada:', optText?.trim());
      await firstOption.click();
      await page.waitForTimeout(1000);
    }
  }

  // Anexa documento
  console.log('4. Clicando em anexar...');
  const btnAnexar = await page.$('button:has-text("Anexar documentos")');
  if (btnAnexar) {
    await btnAnexar.click();
    await page.waitForTimeout(2000);
  }

  const fileInputVessel = await page.$('input[type="file"]:not([capture])');
  const docVesselPath = path.join(FIXTURES_DIR, 'documento_embarcacao_legivel.pdf');
  console.log('Upload de:', docVesselPath);
  await fileInputVessel.setInputFiles(docVesselPath);
  await page.waitForTimeout(2000);

  const btnIniciarLeitura = await page.$('#btn-iniciar-leitura');
  console.log('Iniciando leitura OCR...');
  await btnIniciarLeitura.click();
  await page.waitForURL(url => url.pathname.includes('/documentos/revisar/'), { timeout: 35000 });
  await page.waitForTimeout(3000);

  console.log('5. Na tela de revisão:');
  const hullInp = await page.$('#field-hull_identifier');
  const extractedHull = hullInp ? await hullInp.inputValue() : '';
  const nameInp = await page.$('#field-name');
  const extractedName = nameInp ? await nameInp.inputValue() : '';
  const regInp = await page.$('#field-registration_number');
  const extractedReg = regInp ? await regInp.inputValue() : '';

  console.log('Valores na revisão:', {
    name: extractedName,
    registration_number: extractedReg,
    hull_identifier: extractedHull
  });

  const btnConfirmApply = await page.$('#btn-confirm-and-apply');
  console.log('Confirmando e aplicando...');
  await btnConfirmApply.click();
  await page.waitForURL(url => url.pathname.includes('/vessels/novo'), { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('6. No formulário de cadastro, verificando botão salvar...');
  const btnSave = await page.$('#btn-save-vessel');
  console.log('btnSave existe?', Boolean(btnSave));
  
  if (btnSave) {
    console.log('Clicando em #btn-save-vessel...');
    await btnSave.click();
    await page.waitForTimeout(5000);
    console.log('URL atual após salvar:', page.url());
  }

  console.log('7. Navegando para /vessels e conferindo...');
  await page.goto(`${BASE_URL}/vessels`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  let content = await page.textContent('body');
  console.log('Encontrou ESTRELA DO MAR na lista?', content.includes('ESTRELA DO MAR'));

  console.log('8. Executando F5...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  content = await page.textContent('body');
  console.log('Encontrou ESTRELA DO MAR após F5?', content.includes('ESTRELA DO MAR'));

  await browser.close();
}

testScenarioCReal().catch(console.error);
