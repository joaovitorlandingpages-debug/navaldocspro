const { chromium } = require('playwright');
const path = require('path');

async function testSignupAndFlow() {
  console.log('Launching browser via executablePath Chrome...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // Escuta logs do console e erros
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  try {
    console.log('Navigating to http://localhost:8080/auth/signup ...');
    await page.goto('http://localhost:8080/auth/signup', { waitUntil: 'networkidle', timeout: 30000 });

    const evidenceDir = path.join(__dirname, 'evidence');
    await page.screenshot({ path: path.join(evidenceDir, '01_signup_page.png') });
    console.log('01_signup_page screenshot saved.');

    // Gerar dados fictícios identificáveis
    const timestamp = Date.now().toString().slice(-6);
    const testName = `Teste Automatizado Navaldocs ${timestamp}`;
    const testEmail = `teste.auto.${timestamp}@navaldocs-test.local`;
    const testPass = `SenhaForte#Naval${timestamp}!`;

    console.log(`Filling signup form with ${testEmail}...`);
    // Preencher campos
    await page.fill('input[type="text"]', testName);
    await page.fill('input[type="email"]', testEmail);

    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill(testPass);
      await passwordInputs[1].fill(testPass);
    }

    // Checkbox termos
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      await checkbox.check();
    }

    await page.screenshot({ path: path.join(evidenceDir, '02_signup_filled.png') });
    console.log('Submitting signup form...');
    
    // Clica no botão de cadastro
    await page.click('button[type="submit"]');

    // Aguarda navegação ou resposta
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(evidenceDir, '03_signup_result.png') });
    console.log('Current URL after signup:', page.url());

    const content = await page.content();
    if (content.includes('Verifique seu e-mail') || content.includes('confirmação')) {
      console.log('SIGNUP_RESULT: EMAIL_CONFIRMATION_REQUIRED');
    } else if (page.url().includes('/home') || page.url().includes('/dashboard')) {
      console.log('SIGNUP_RESULT: DIRECT_LOGIN_SUCCESS');
    } else {
      console.log('SIGNUP_RESULT: OTHER_STATE');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

testSignupAndFlow();
