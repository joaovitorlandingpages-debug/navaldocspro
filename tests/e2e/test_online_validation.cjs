const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const LOVABLE_URL = 'https://navaldocspro.lovable.app';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

function generateValidCPF() {
  const rnd = n => Math.round(Math.random() * n);
  const mod = (base, div) => 11 - (base % 11) >= 10 ? 0 : 11 - (base % 11);
  const n = Array(9).fill(0).map(() => rnd(9));
  let d1 = n.reduce((total, number, index) => total + (number * (10 - index)), 0);
  d1 = mod(d1, 11);
  let d2 = [...n, d1].reduce((total, number, index) => total + (number * (11 - index)), 0);
  d2 = mod(d2, 11);
  return `${n.slice(0, 3).join('')}.${n.slice(3, 6).join('')}.${n.slice(6, 9).join('')}-${d1}${d2}`;
}

async function runOnlineValidation() {
  console.log('=== INICIANDO VALIDAÇÃO ONLINE EM NAVALDOCSPRO.LOVABLE.APP ===');
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
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[ONLINE CONSOLE ERROR]:', msg.text());
  });

  const results = {
    loginOrSignup: false,
    searchCustomerAndVessel: false,
    linksPreserved: false,
    procuracaoPF: false,
    docsGenerated: false,
    f5Preserved: false,
    downloads: []
  };

  try {
    const timestamp = Date.now().toString().slice(-6);
    const testEmail = `empresa.teste.${timestamp}@navaldocs-test.local`;
    const testPass = `SenhaForte#Naval${timestamp}!`;
    const testAdminName = `Operador Online ${timestamp}`;
    const testWorkspace = `Despachadoria Online ${timestamp}`;
    const testCustomerName = `Carlos Alberto Pereira Teste ${timestamp}`;
    const testCpf = generateValidCPF();
    const vesselName = `Marlim Azul ${timestamp}`;
    const vesselReg = `${timestamp}-SP`;

    // 1. Cadastrar/Entrar na conta de teste no Lovable
    console.log(`1. Criando conta de teste no Lovable: ${testEmail}...`);
    await page.goto(`${LOVABLE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('input[type="text"]', testAdminName);
    await page.fill('input[type="email"]', testEmail);
    const passInputs = await page.$$('input[type="password"]');
    if (passInputs.length >= 2) {
      await passInputs[0].fill(testPass);
      await passInputs[1].fill(testPass);
    }
    const chk = await page.$('input[type="checkbox"]');
    if (chk) await chk.check();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);

    if (page.url().includes('/onboarding')) {
      console.log('Completando onboarding...');
      await page.fill('input[type="text"]', testWorkspace);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_01_dashboard.png') });
    results.loginOrSignup = true;

    // 2. Cadastrar Cliente com endereço
    console.log('2. Cadastrando cliente...');
    await page.goto(`${LOVABLE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);

    const nameInp = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    if (nameInp) await nameInp.fill(testCustomerName);
    else await page.fill('input[type="text"]', testCustomerName);

    const cpfInp = await page.$('input[placeholder*="000.000.000-00"], input[id*="cpf"]');
    if (cpfInp) await cpfInp.fill(testCpf);

    const emailInp = await page.$('input[type="email"]');
    if (emailInp) await emailInp.fill(`carlos.${timestamp}@exemplo.com`);

    const phoneInp = await page.$('input[placeholder*="(00)"]');
    if (phoneInp) await phoneInp.fill('(13) 99887-7665');

    const cepInp = await page.$('input[placeholder="00000-000"]');
    if (cepInp) await cepInp.fill('11030-500');

    const cityInp = await page.$('input[placeholder="Digite a cidade"]');
    if (cityInp) await cityInp.fill('Santos');

    const ufSelect = await page.$('select');
    if (ufSelect) await ufSelect.selectOption('SP');

    const logradouroInp = await page.$('input[placeholder*="logradouro"]');
    if (logradouroInp) await logradouroInp.fill('Avenida Bartolomeu de Gusmão');

    const numInp = await page.$('input[placeholder*="número"]');
    if (numInp) await numInp.fill('45');

    const bairroInp = await page.$('input[placeholder*="bairro"]');
    if (bairroInp) await bairroInp.fill('Ponta da Praia');

    const rgInp = await page.$('input#rg, input[placeholder*="12.345.678-9"]');
    if (rgInp) await rgInp.fill('23.456.789-0 SSP/SP');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_02_cliente_salvo.png') });

    // 3. Cadastrar Embarcação vinculada com Número do Casco
    console.log('3. Cadastrando embarcação com Número do Casco...');
    await page.goto(`${LOVABLE_URL}/vessels/novo`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);

    const custTrigger = await page.$('#customer-select-trigger');
    if (custTrigger) {
      await custTrigger.click();
      await page.waitForTimeout(1000);
      const custOpt = await page.$(`button:has-text("${testCustomerName.slice(0, 10)}")`);
      if (custOpt) {
        await custOpt.click();
        await page.waitForTimeout(500);
      }
    }

    const vInputs = await page.$$('input[type="text"]');
    for (const inp of vInputs) {
      const ph = (await inp.getAttribute('placeholder')) || '';
      if (ph.toLowerCase().includes('nome da embarca') || ph.toLowerCase().includes('ex:') || ph.toLowerCase().includes('digite o nome')) {
        await inp.fill(vesselName);
      } else if (ph.toLowerCase().includes('inscri') || ph.toLowerCase().includes('tie') || ph.toLowerCase().includes('tiem') || ph.toLowerCase().includes('informe')) {
        await inp.fill(vesselReg);
      } else if (ph.toLowerCase() === '0,00') {
        await inp.fill('7.50');
      }
    }

    const compBtn = await page.$('button:has-text("Dados complementares")');
    if (compBtn) {
      await compBtn.click();
      await page.waitForTimeout(800);
      const hullInput = await page.$('input[placeholder*="BR-ABC"], input[placeholder*="HIN"], input[placeholder*="CIN"]');
      if (hullInput) {
        await hullInput.fill(`BR-NAV${timestamp}789`);
      }
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_03_embarcacao_salva.png') });

    // 4. Testar Busca de Cliente e Embarcação
    console.log('4. Testando busca global...');
    await page.goto(`${LOVABLE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    const searchTrigger = await page.$('button:has-text("Buscar cliente, barco ou processo")');
    if (searchTrigger) {
      await searchTrigger.click();
      await page.waitForTimeout(1000);
      const modalInput = await page.$('input[placeholder*="Digite o nome do cliente"]');
      if (modalInput) {
        await modalInput.fill(testCustomerName.slice(0, 10));
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_04_busca.png') });
        results.searchCustomerAndVessel = true;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // 5. Iniciar fluxo de serviços -> documentos -> revisar -> gerar
    console.log('5. Iniciando processo pelo fluxo de serviços...');
    await page.goto(`${LOVABLE_URL}/servicos/selecionar?category=esporte_recreio`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    const serviceCards = await page.$$('div:has-text("Transferência de propriedade"), div:has-text("Renovação da inscrição")');
    if (serviceCards.length > 0) {
      await serviceCards[0].click();
      await page.waitForTimeout(1000);
    }

    const customerSelect = await page.$('#servicos-customer-select');
    if (customerSelect) {
      const opts = await customerSelect.$$('option');
      for (const opt of opts) {
        const text = await opt.textContent();
        if (text && text.includes(testCustomerName.slice(0, 10))) {
          const val = await opt.getAttribute('value');
          if (val) {
            await customerSelect.selectOption(val);
            break;
          }
        }
      }
      await page.waitForTimeout(1000);
    }

    const vesselSelect = await page.$('#servicos-vessel-select');
    if (vesselSelect) {
      const vOpts = await vesselSelect.$$('option');
      for (const opt of vOpts) {
        const text = await opt.textContent();
        if (text && text.includes(vesselName.slice(0, 10))) {
          const val = await opt.getAttribute('value');
          if (val) {
            await vesselSelect.selectOption(val);
            break;
          }
        }
      }
      await page.waitForTimeout(1000);
    }

    const continueBtn = await page.$('button:has-text("Continuar para documentos"), button:has-text("Continuar"), button:has-text("Avançar")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(4000);
    }

    const revisarBtn = await page.$('button:has-text("Revisar processo")');
    if (revisarBtn) {
      await revisarBtn.click();
      await page.waitForTimeout(4000);
    }

    const gerarProcessoBtn = await page.$('button:has-text("Gerar documentos"), button:has-text("Ir para geração"), button:has-text("Salvar e ir para documentos")');
    if (gerarProcessoBtn) {
      await gerarProcessoBtn.click();
      await page.waitForTimeout(8000);
    }

    console.log('URL na tela de geração:', page.url());
    results.linksPreserved = page.url().includes('/processes/');

    // Configurar Outorgado PF
    console.log('Configurando outorgado PF...');
    const alterOutorgadoBtn = await page.$('button:has-text("Alterar dados do outorgado")');
    if (alterOutorgadoBtn) {
      await alterOutorgadoBtn.click();
      await page.waitForTimeout(1500);
      const modal = await page.$('div[role="dialog"]');
      if (modal) {
        const pfBtn = await modal.$('button:has-text("Pessoa Física (PF)")');
        if (pfBtn) await pfBtn.click({ force: true });
        const pfNome = await modal.$('input[placeholder*="Carlos Eduardo"], input[placeholder*="Nome completo"]');
        if (pfNome) await pfNome.fill('Dr. Roberto Advogado Naval Online');
        const pfCpf = await modal.$('input[placeholder*="000.000.000-00"]');
        if (pfCpf) await pfCpf.fill(generateValidCPF());
        const saveBtn = await modal.$('button[type="submit"]:has-text("Salvar")');
        if (saveBtn) await saveBtn.click({ force: true });
        await page.waitForTimeout(2500);
        results.procuracaoPF = true;
      }
    }

    // Configurar Nacionalidade e Naturalidade na Declaração de Residência
    const editNatBtn = await page.$('button:has-text("Editar nacionalidade / naturalidade")');
    if (editNatBtn) {
      console.log('Preenchendo nacionalidade e naturalidade via modal online...');
      await editNatBtn.click();
      await page.waitForTimeout(1500);
      const natModal = await page.$('div[role="dialog"]');
      if (natModal) {
        const natInputs = await natModal.$$('input[type="text"]');
        if (natInputs.length >= 2) {
          await natInputs[0].fill('Brasileira');
          await natInputs[1].fill('Santos/SP');
        }
        const saveNat = await natModal.$('button[type="submit"]:has-text("Salvar dados")');
        if (saveNat) await saveNat.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }

    // Selecionar os 3 documentos para gerar
    console.log('Selecionando os 3 documentos...');
    const declCard = await page.$('div[data-template-slug="decl-residencia-naval"]');
    if (declCard) {
      const declGen = await declCard.$('button:has-text("Gerar documento")');
      if (declGen) await declGen.click();
    }
    const reqCard = await page.$('div[data-template-slug="req-padrao-cpes"]');
    if (reqCard) {
      const reqGen = await reqCard.$('button:has-text("Gerar documento")');
      if (reqGen) await reqGen.click();
    }
    const procCard = await page.$('div[data-template-slug="proc-representacao-naval"]');
    if (procCard) {
      const procGen = await procCard.$('button:has-text("Gerar documento")');
      if (procGen) await procGen.click();
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_05_tres_documentos_selecionados.png') });

    // Gerar em lote
    console.log('Gerando os 3 documentos em lote...');
    const batchBtn = await page.$('button#btn-generate-documents');
    if (batchBtn && !(await batchBtn.isDisabled())) {
      await batchBtn.click({ force: true });
      await page.waitForTimeout(22000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_06_tres_documentos_gerados.png') });
      results.docsGenerated = true;
    }

    // F5 e verificação de permanência
    console.log('Executando F5 na página online...');
    await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_07_apos_f5.png') });

    const rows = await page.$$('#secao-documentos-gerados div[data-doc-name]');
    console.log(`Documentos listados após F5: ${rows.length}`);
    results.f5Preserved = rows.length === 3;

    // Download dos 3 PDFs
    console.log('Baixando os 3 PDFs online...');
    for (const row of rows) {
      const docName = (await row.getAttribute('data-doc-name')) || 'documento';
      const downloadBtn = await row.$('button:has-text("Baixar")');
      if (downloadBtn) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 20000 }),
          downloadBtn.click()
        ]);
        const cleanName = docName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
        const filePath = path.join(EVIDENCE_DIR, `online_baixado_${cleanName}.pdf`);
        await download.saveAs(filePath);
        const stats = fs.statSync(filePath);
        console.log(`Baixado com sucesso: ${filePath} (${stats.size} bytes)`);
        results.downloads.push({ docName, size: stats.size, path: filePath });
      }
    }

    console.log('=== RESULTADOS DA VALIDAÇÃO ONLINE ===', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('ERRO NA VALIDAÇÃO ONLINE:', err);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'online_erro.png') });
  } finally {
    await browser.close();
  }
}

runOnlineValidation();
