const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testGeneration() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[CONSOLE ERROR]:', msg.text());
  });

  try {
    console.log('Logging in...');
    await page.goto('https://navaldocspro.lovable.app/auth/login', { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('input[type="email"]', 'empresa.teste.558672@navaldocs-test.local');
    await page.fill('input[type="password"]', 'SenhaForte#Naval558672!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);

    console.log('Navigating to process 2570010e-1140-42d2-8d60-7d88c5a8c0b1...');
    await page.goto('https://navaldocspro.lovable.app/processes/2570010e-1140-42d2-8d60-7d88c5a8c0b1/gerar-documento', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(4000);

    await page.screenshot({ path: path.join(__dirname, 'evidence', 'check_existing_process.png') });
    console.log('Screenshot saved: check_existing_process.png');

    // Check what companyData and outorgado has
    const outorgadoInfo = await page.evaluate(() => {
      const el = document.querySelector('div[data-template-slug="proc-representacao-naval"]');
      return el ? el.innerText : null;
    });
    console.log('Outorgado info from page:', outorgadoInfo);

    // Let's generate ONLY procuracao
    // 1. Deselect other docs (set Requerimento and Declaração to "Não usar agora")
    const declCard = await page.$('div[data-template-slug="decl-residencia-naval"]');
    if (declCard) {
      const omitBtn = await declCard.$('button:has-text("Não usar agora")');
      if (omitBtn) await omitBtn.click();
    }
    const reqCard = await page.$('div[data-template-slug="req-padrao-cpes"]');
    if (reqCard) {
      const omitBtn = await reqCard.$('button:has-text("Não usar agora")');
      if (omitBtn) await omitBtn.click();
    }

    // 2. Procuração: click "Gerar documento"
    const procCard = await page.$('div[data-template-slug="proc-representacao-naval"]');
    if (procCard) {
      const genBtn = await procCard.$('button:has-text("Gerar documento")');
      if (genBtn) await genBtn.click();
    }
    await page.waitForTimeout(2000);

    // Click button to generate
    const batchBtn = await page.$('button#btn-generate-documents');
    if (batchBtn && !(await batchBtn.isDisabled())) {
      console.log('Clicking generate procuracao...');
      await batchBtn.click({ force: true });
      await page.waitForTimeout(15000);
    }

    // Reload page
    console.log('Reloading...');
    await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(__dirname, 'evidence', 'check_after_procuracao_gen.png') });

    // Download procuracao
    console.log('Downloading latest procuracao...');
    const procRow = await page.$('#secao-documentos-gerados div[data-doc-name*="Procura"]');
    if (procRow) {
      const downloadBtn = await procRow.$('button:has-text("Baixar")');
      if (downloadBtn) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 35000 }),
          downloadBtn.click()
        ]);
        const targetPath = path.join(__dirname, 'evidence', 'nova_procuracao_baixada_online.pdf');
        await download.saveAs(targetPath);
        console.log('Saved to:', targetPath, fs.statSync(targetPath).size, 'bytes');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testGeneration();
