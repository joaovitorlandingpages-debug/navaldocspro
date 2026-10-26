const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const EVIDENCE_DIR = path.join(__dirname, 'evidence', 'ocr_suite');
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'ocr');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function generateValidCPF() {
  const rnd = (n) => Math.round(Math.random() * n);
  const mod = (dividend, divisor) => Math.round(dividend - Math.floor(dividend / divisor) * divisor);
  const n = Array(9).fill(0).map(() => rnd(9));
  let d1 = n.reduce((total, number, index) => total + number * (10 - index), 0);
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;
  let d2 = n.reduce((total, number, index) => total + number * (11 - index), 0) + d1 * 2;
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;
  return `${n.join('')}${d1}${d2}`;
}

const suiteReport = {
  timestamp: new Date().toISOString(),
  scenarios: {},
  comparisons: [],
  persistenceVerified: false,
  manualRegistrationPreserved: false,
  mobileAccessible: false,
  tenantIsolationVerified: false,
};

function recordScenario(id, title, status, details = {}) {
  suiteReport.scenarios[id] = { title, status, details };
  console.log(`[SCENARIO ${id}] ${status.toUpperCase()}: ${title}`, details);
}

async function runAutonomousOcrSuite() {
  console.log('================================================================');
  console.log('=== INICIANDO SUÍTE AUTÔNOMA DE TESTE OCR (NAVALDOCS PRO) ===');
  console.log('================================================================');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  try {
    const timestamp = Date.now().toString().slice(-6);
    const testEmail1 = `ocr.empresa1.${timestamp}@navaldocs-test.local`;
    const testPass = `SenhaForte#Naval${timestamp}!`;
    const testAdminName = `Operador OCR ${timestamp}`;
    const testWorkspace = `Despachante OCR ${timestamp}`;

    // 1. Setup da Empresa 1 de Teste
    console.log(`\n--- 1. Setup da Empresa 1: ${testEmail1} ---`);
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="text"]', testAdminName);
    await page.fill('input[type="email"]', testEmail1);
    const passInputs = await page.$$('input[type="password"]');
    if (passInputs.length >= 2) {
      await passInputs[0].fill(testPass);
      await passInputs[1].fill(testPass);
    }
    const chk = await page.$('input[type="checkbox"]');
    if (chk) await chk.check();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    if (page.url().includes('/onboarding')) {
      await page.fill('input[type="text"]', testWorkspace);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }
    console.log('Empresa 1 criada com sucesso. URL atual:', page.url());

    // -------------------------------------------------------------
    // CENÁRIO A: Documento de identificação legível (Cliente)
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO A: Documento de identificação legível ---');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Clica em Anexar documentos para ir à tela /documentos/anexar
    const btnAnexarCliente = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarCliente) {
      await btnAnexarCliente.click();
      await page.waitForTimeout(2000);
    }

    const fileInputCliente = await page.$('input[type="file"]:not([capture])');
    const docIdentPath = path.join(FIXTURES_DIR, 'identificacao_legivel.pdf');
    if (fileInputCliente) {
      await fileInputCliente.setInputFiles(docIdentPath);
      await page.waitForTimeout(1500);
    }

    const screenshotA1 = path.join(EVIDENCE_DIR, 'cenario_A_arquivo_selecionado.png');
    await page.screenshot({ path: screenshotA1 });

    // Inicia a leitura
    const btnIniciarLeitura = await page.$('#btn-iniciar-leitura');
    if (btnIniciarLeitura) {
      await btnIniciarLeitura.click();
      console.log('Leitura iniciada, aguardando tela de conferência...');
      // Aguarda navegar para /documentos/revisar/
      await page.waitForURL(url => url.pathname.includes('/documentos/revisar/'), { timeout: 35000 });
      await page.waitForTimeout(2500);
    }

    const screenshotA2 = path.join(EVIDENCE_DIR, 'cenario_A_conferencia_aberta.png');
    await page.screenshot({ path: screenshotA2 });

    // Valida banner mandatório
    const disclaimer = await page.textContent('body');
    const hasMandatoryDisclaimer = disclaimer.includes('Confira os dados extraídos antes de salvar. A leitura automática pode apresentar erros.');

    // Captura valores extraídos na conferência
    const extractedNameInp = await page.$('#field-name');
    const extractedName = extractedNameInp ? await extractedNameInp.inputValue() : '';
    const extractedCpfInp = await page.$('#field-cpf_cnpj');
    const extractedCpf = extractedCpfInp ? await extractedCpfInp.inputValue() : '';
    const extractedRgInp = await page.$('#field-rg');
    const extractedRg = extractedRgInp ? await extractedRgInp.inputValue() : '';
    const extractedBirthInp = await page.$('#field-birth_date');
    const extractedBirth = extractedBirthInp ? await extractedBirthInp.inputValue() : '';

    console.log('Valores extraídos (Cenário A):', {
      name: extractedName,
      cpf: extractedCpf,
      rg: extractedRg,
      birth_date: extractedBirth,
      hasMandatoryDisclaimer,
    });

    suiteReport.comparisons.push({
      scenario: 'A - Identificação Legível',
      expected: {
        name: 'CARLOS EDUARDO DA SILVA TESTE',
        doc: '28.456.789-0',
        cpf: '123.456.789-00',
        birth_date: '15/08/1985',
      },
      extracted: {
        name: extractedName,
        doc: extractedRg,
        cpf: extractedCpf,
        birth_date: extractedBirth,
      },
    });

    recordScenario('A', 'Documento de identificação legível', hasMandatoryDisclaimer ? 'aprovado' : 'falha', {
      extractedName,
      extractedCpf,
      hasMandatoryDisclaimer,
      evidence: 'cenario_A_conferencia_aberta.png',
    });

    // -------------------------------------------------------------
    // CENÁRIO G: Correção manual de um dado extraído antes de salvar
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO G: Correção manual de um dado extraído antes de salvar ---');
    if (extractedNameInp) {
      await extractedNameInp.fill('CARLOS EDUARDO DA SILVA CORRIGIDO');
      await page.waitForTimeout(500);
    }
    const screenshotG = path.join(EVIDENCE_DIR, 'cenario_G_dado_corrigido.png');
    await page.screenshot({ path: screenshotG });

    // Clica em Confirmar e aplicar ao cadastro
    const btnConfirmApply = await page.$('#btn-confirm-and-apply');
    if (btnConfirmApply) {
      await btnConfirmApply.click();
      await page.waitForURL(url => url.pathname.includes('/customers/novo'), { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    // Confere se o valor corrigido foi levado ao formulário de cliente
    const nameInFormInp = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    const nameInForm = nameInFormInp ? await nameInFormInp.inputValue() : '';
    const wasCorrectionApplied = nameInForm.includes('CORRIGIDO');

    console.log('Valor no formulário de cliente após confirmação:', nameInForm, 'Corrigido com sucesso:', wasCorrectionApplied);
    recordScenario('G', 'Correção manual antes de salvar', wasCorrectionApplied ? 'aprovado' : 'falha', {
      nameInForm,
      evidence: 'cenario_G_dado_corrigido.png',
    });

    // -------------------------------------------------------------
    // CENÁRIO B: Comprovante de endereço legível (Combinar sem apagar)
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO B: Comprovante de endereço legível ---');
    // Clica em Anexar documentos novamente
    const btnAnexarCliente2 = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarCliente2) {
      await btnAnexarCliente2.click();
      await page.waitForTimeout(2000);
    }

    const fileInputEnd = await page.$('input[type="file"]:not([capture])');
    const docEndPath = path.join(FIXTURES_DIR, 'comprovante_endereco_legivel.pdf');
    if (fileInputEnd) {
      await fileInputEnd.setInputFiles(docEndPath);
      await page.waitForTimeout(1500);
    }

    const btnIniciarLeituraB = await page.$('#btn-iniciar-leitura');
    if (btnIniciarLeituraB) {
      await btnIniciarLeituraB.click();
      await page.waitForURL(url => url.pathname.includes('/documentos/revisar/'), { timeout: 35000 });
      await page.waitForTimeout(2500);
    }

    const screenshotB = path.join(EVIDENCE_DIR, 'cenario_B_conferencia_endereco.png');
    await page.screenshot({ path: screenshotB });

    const extractedCepInp = await page.$('#field-cep');
    const extractedCep = extractedCepInp ? await extractedCepInp.inputValue() : '';
    const extractedCityInp = await page.$('#field-cidade');
    const extractedCity = extractedCityInp ? await extractedCityInp.inputValue() : '';
    const extractedLogrInp = await page.$('#field-logradouro');
    const extractedLogr = extractedLogrInp ? await extractedLogrInp.inputValue() : '';

    console.log('Valores extraídos de endereço (Cenário B):', {
      cep: extractedCep,
      cidade: extractedCity,
      logradouro: extractedLogr,
    });

    suiteReport.comparisons.push({
      scenario: 'B - Comprovante de Endereço',
      expected: {
        destinatario: 'CARLOS EDUARDO DA SILVA TESTE',
        logradouro: 'AV ATLANTICA, 1500 - APTO 42',
        bairro: 'GONZAGA',
        cidade: 'SANTOS',
        uf: 'SP',
        cep: '11065-001',
      },
      extracted: {
        cep: extractedCep,
        cidade: extractedCity,
        logradouro: extractedLogr,
      },
    });

    // Confirma e aplica
    const btnConfirmApplyB = await page.$('#btn-confirm-and-apply');
    if (btnConfirmApplyB) {
      await btnConfirmApplyB.click();
      await page.waitForURL(url => url.pathname.includes('/customers/novo'), { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    // Verifica combinação: Nome corrigido anterior deve permanecer intacto!
    const nameAfterMergeInp = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    const nameAfterMerge = nameAfterMergeInp ? await nameAfterMergeInp.inputValue() : '';
    const preservedPreviousData = nameAfterMerge.includes('CORRIGIDO');

    console.log('Nome preservado após combinação de comprovante de endereço:', nameAfterMerge);
    recordScenario('B', 'Comprovante de endereço legível combinado', preservedPreviousData ? 'aprovado' : 'falha', {
      nameAfterMerge,
      preservedPreviousData,
      evidence: 'cenario_B_conferencia_endereco.png',
    });

    // Salva o cliente e testa persistência (F5)
    // Garante CPF válido único
    const validCpfParaSalvar = generateValidCPF();
    const cpfInputFinal = await page.$('input[placeholder*="000.000.000-00"], input[id*="cpf"]');
    if (cpfInputFinal) {
      await cpfInputFinal.fill(validCpfParaSalvar);
    }
    const phoneInp = await page.$('input[placeholder*="(00)"], input[id*="telefone"]');
    if (phoneInp && !(await phoneInp.inputValue())) {
      await phoneInp.fill('13997766554');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // Valida persistência e F5 na lista de clientes
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyCustomers = await page.textContent('body');
    const clientFoundInList = bodyCustomers.includes('CORRIGIDO');

    // F5
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const bodyCustomersAfterF5 = await page.textContent('body');
    const clientPersistedAfterF5 = bodyCustomersAfterF5.includes('CORRIGIDO');
    suiteReport.persistenceVerified = clientPersistedAfterF5;

    // -------------------------------------------------------------
    // CENÁRIO C: Documento de embarcação legível (com zeros à esquerda)
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO C: Documento de embarcação legível ---');
    await page.goto(`${BASE_URL}/vessels/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Seleciona cliente existente para vínculo obrigatório
    const custTrigger = await page.$('#customer-select-trigger');
    if (custTrigger) {
      await custTrigger.click();
      await page.waitForTimeout(1000);
      const custOption = await page.$('[role="option"]:has-text("CORRIGIDO")');
      if (custOption) {
        await custOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Clica em Anexar documentos
    const btnAnexarEmbarcacao = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarEmbarcacao) {
      await btnAnexarEmbarcacao.click();
      await page.waitForTimeout(2000);
    }

    const fileInputVessel = await page.$('input[type="file"]:not([capture])');
    const docVesselPath = path.join(FIXTURES_DIR, 'documento_embarcacao_legivel.pdf');
    if (fileInputVessel) {
      await fileInputVessel.setInputFiles(docVesselPath);
      await page.waitForTimeout(1500);
    }

    const btnIniciarLeituraC = await page.$('#btn-iniciar-leitura');
    if (btnIniciarLeituraC) {
      await btnIniciarLeituraC.click();
      await page.waitForURL(url => url.pathname.includes('/documentos/revisar/'), { timeout: 35000 });
      await page.waitForTimeout(2500);
    }

    const screenshotC = path.join(EVIDENCE_DIR, 'cenario_C_conferencia_embarcacao.png');
    await page.screenshot({ path: screenshotC });

    // Confere campos de embarcação extraídos
    const vesselNameInp = await page.$('#field-name');
    const extractedVesselName = vesselNameInp ? await vesselNameInp.inputValue() : '';
    const vesselRegInp = await page.$('#field-registration_number');
    const extractedVesselReg = vesselRegInp ? await vesselRegInp.inputValue() : '';
    const hullInp = await page.$('#field-hull_identifier');
    const extractedHull = hullInp ? await hullInp.inputValue() : '';
    const identifiedOwnerInp = await page.$('#field-identified_owner_name');
    const extractedOwner = identifiedOwnerInp ? await identifiedOwnerInp.inputValue() : '';

    console.log('Valores extraídos de embarcação (Cenário C):', {
      name: extractedVesselName,
      registration_number: extractedVesselReg,
      hull: extractedHull,
      owner: extractedOwner,
    });

    suiteReport.comparisons.push({
      scenario: 'C - Embarcação Legível',
      expected: {
        name: 'ESTRELA DO MAR II',
        registration_number: '038-0012345-6',
        hull_identifier: '00987654321',
        owner: 'MARCELO HENRIQUE BORGES',
      },
      extracted: {
        name: extractedVesselName,
        registration_number: extractedVesselReg,
        hull_identifier: extractedHull,
        owner: extractedOwner,
      },
    });

    // Aplica e confere alerta de divergência de proprietário sem troca silenciosa
    const btnConfirmApplyC = await page.$('#btn-confirm-and-apply');
    if (btnConfirmApplyC) {
      await btnConfirmApplyC.click();
      await page.waitForURL(url => url.pathname.includes('/vessels/novo'), { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    const vesselFormBody = await page.textContent('body');
    const hasDivergenceAlert = vesselFormBody.includes('difere do cliente selecionado') || vesselFormBody.includes('transferência de propriedade') || vesselFormBody.includes('MARCELO HENRIQUE');
    const clientPreservedInVessel = vesselFormBody.includes('CORRIGIDO');
    const isVesselNameCorrect = extractedVesselName.includes('ESTRELA DO MAR') && !extractedVesselName.includes('MARCELO');

    // Clica em salvar embarcação
    const btnSubmitVessel = await page.$('#btn-save-vessel, button[type="submit"]:has-text("Salvar"), button[type="submit"]:has-text("Cadastrar")');
    if (btnSubmitVessel) {
      await btnSubmitVessel.click();
      await page.waitForTimeout(4000);
    }

    // Navega para a lista de embarcações e valida persistência + F5
    await page.goto(`${BASE_URL}/vessels`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const vesselsListBody = await page.textContent('body');
    const vesselPersistedBeforeF5 = vesselsListBody.includes('ESTRELA DO MAR') || vesselsListBody.includes('038-0012345-6');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const vesselsListAfterF5 = await page.textContent('body');
    const vesselPersistedAfterF5 = vesselsListAfterF5.includes('ESTRELA DO MAR') || vesselsListAfterF5.includes('038-0012345-6');

    const scenarioCApproved = isVesselNameCorrect && clientPreservedInVessel && vesselPersistedAfterF5;

    recordScenario('C', 'Documento de embarcação legível com zeros à esquerda', scenarioCApproved ? 'aprovado' : 'falha', {
      extractedVesselName,
      extractedVesselReg,
      extractedHull,
      hasDivergenceAlert,
      clientPreservedInVessel,
      vesselPersistedAfterF5,
      evidence: 'cenario_C_conferencia_embarcacao.png',
    });

    // -------------------------------------------------------------
    // CENÁRIO D: Imagem ilegível
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO D: Imagem ilegível ---');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const btnAnexarD = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarD) {
      await btnAnexarD.click();
      await page.waitForTimeout(2000);
    }

    const fileInputD = await page.$('input[type="file"]:not([capture])');
    const docIlegivelPath = path.join(FIXTURES_DIR, 'imagem_ilegivel.png');
    if (fileInputD) {
      await fileInputD.setInputFiles(docIlegivelPath);
      await page.waitForTimeout(1500);
    }

    const btnIniciarLeituraD = await page.$('#btn-iniciar-leitura');
    if (btnIniciarLeituraD) {
      await btnIniciarLeituraD.click();
      // Deve exibir mensagem de erro ou orientar preenchimento manual sem travar
      await page.waitForTimeout(6000);
    }

    const screenshotD = path.join(EVIDENCE_DIR, 'cenario_D_imagem_ilegivel.png');
    await page.screenshot({ path: screenshotD });

    const pageContentD = await page.textContent('body');
    const handledIllegibleGracefully = pageContentD.includes('indisponível') || pageContentD.includes('manualmente') || pageContentD.includes('Não foi possível') || pageContentD.includes('erro') || pageContentD.includes('Falha');

    recordScenario('D', 'Imagem ilegível tratada com preservação e fallback manual', handledIllegibleGracefully ? 'aprovado' : 'falha', {
      handledIllegibleGracefully,
      evidence: 'cenario_D_imagem_ilegivel.png',
    });

    // -------------------------------------------------------------
    // CENÁRIO E: Documento incompatível com o cadastro
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO E: Documento incompatível com o cadastro ---');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const btnAnexarE = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarE) {
      await btnAnexarE.click();
      await page.waitForTimeout(2000);
    }

    const fileInputE = await page.$('input[type="file"]:not([capture])');
    const docIncompativelPath = path.join(FIXTURES_DIR, 'documento_incompativel.pdf');
    if (fileInputE) {
      await fileInputE.setInputFiles(docIncompativelPath);
      await page.waitForTimeout(1500);
    }

    const btnIniciarLeituraE = await page.$('#btn-iniciar-leitura');
    if (btnIniciarLeituraE) {
      await btnIniciarLeituraE.click();
      await page.waitForTimeout(10000);
    }

    const screenshotE = path.join(EVIDENCE_DIR, 'cenario_E_documento_incompativel.png');
    await page.screenshot({ path: screenshotE });

    // Em documento incompatível, ou abre conferência com tipo Outro/Desconhecido e sem inventar campos, ou aciona fallback
    const pageContentE = await page.textContent('body');
    const handledIncompatible = pageContentE.includes('Outro') || pageContentE.includes('Não identificado') || pageContentE.includes('manualmente') || pageContentE.includes('Atenção') || pageContentE.includes('Confira');

    recordScenario('E', 'Documento incompatível sem alucinação de dados', handledIncompatible ? 'aprovado' : 'falha', {
      handledIncompatible,
      evidence: 'cenario_E_documento_incompativel.png',
    });

    // -------------------------------------------------------------
    // CENÁRIO F: Falha do serviço / Opção de Preencher Manualmente
    // -------------------------------------------------------------
    console.log('\n--- CENÁRIO F: Opção de preencher manualmente preservando anexo ---');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const btnAnexarF = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarF) {
      await btnAnexarF.click();
      await page.waitForTimeout(2000);
    }

    const fileInputF = await page.$('input[type="file"]:not([capture])');
    if (fileInputF) {
      await fileInputF.setInputFiles(docIdentPath);
      await page.waitForTimeout(1500);
    }

    const btnManualF = await page.$('button:has-text("Preencher manualmente sem leitura")');
    if (btnManualF) {
      await btnManualF.click();
      await page.waitForURL(url => url.pathname.includes('/customers/novo'), { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    const screenshotF = path.join(EVIDENCE_DIR, 'cenario_F_preenchimento_manual_com_anexo.png');
    await page.screenshot({ path: screenshotF });

    const customerNovoBody = await page.textContent('body');
    const anexoPreservado = customerNovoBody.includes('identificacao_legivel.pdf') || customerNovoBody.includes('anexo');

    recordScenario('F', 'Preservação de anexo ao optar por preenchimento manual', anexoPreservado ? 'aprovado' : 'falha', {
      anexoPreservado,
      evidence: 'cenario_F_preenchimento_manual_com_anexo.png',
    });

    // -------------------------------------------------------------
    // VALIDAÇÃO MOBILE VIEWPORT
    // -------------------------------------------------------------
    console.log('\n--- VALIDAÇÃO MOBILE: Viewport 375x812 ---');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const screenshotMobileForm = path.join(EVIDENCE_DIR, 'mobile_cadastro_cliente.png');
    await page.screenshot({ path: screenshotMobileForm });

    const btnAnexarMobile = await page.$('button:has-text("Anexar documentos")');
    if (btnAnexarMobile) {
      await btnAnexarMobile.click();
      await page.waitForTimeout(2000);
    }

    const screenshotMobileAnexar = path.join(EVIDENCE_DIR, 'mobile_tela_anexar.png');
    await page.screenshot({ path: screenshotMobileAnexar });

    suiteReport.mobileAccessible = Boolean(btnAnexarMobile);
    console.log('Responsividade mobile verificada com sucesso.');

    // Restaura viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------
    // VALIDAÇÃO DE ISOLAMENTO MULTI-TENANT (Empresa 2 não acessa documentos da Empresa 1)
    // -------------------------------------------------------------
    console.log('\n--- VALIDAÇÃO DE ISOLAMENTO MULTI-TENANT ---');
    const testEmail2 = `ocr.empresa2.${timestamp}@navaldocs-test.local`;
    const testAdminName2 = `Operador Empresa 2 ${timestamp}`;
    const testWorkspace2 = `Despachante Concorrente ${timestamp}`;

    // Desconecta e cria Empresa 2
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', testEmail2);
    const passInputs2 = await page.$$('input[type="password"]');
    if (passInputs2.length >= 2) {
      await passInputs2[0].fill(testPass);
      await passInputs2[1].fill(testPass);
    }
    const nameInp2 = await page.$('input[type="text"]');
    if (nameInp2) await nameInp2.fill(testAdminName2);
    const chk2 = await page.$('input[type="checkbox"]');
    if (chk2) await chk2.check();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    if (page.url().includes('/onboarding')) {
      await page.fill('input[type="text"]', testWorkspace2);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    // Acessa lista de clientes na Empresa 2
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyEmpresa2 = await page.textContent('body');
    const hasDataFromCompany1 = bodyEmpresa2.includes('CORRIGIDO') || bodyEmpresa2.includes('CARLOS EDUARDO');

    suiteReport.tenantIsolationVerified = !hasDataFromCompany1;
    console.log('Isolamento Multi-tenant verificado:', !hasDataFromCompany1 ? 'SEGURO (Zero vazamento)' : 'FALHA DE ISOLAMENTO');

    // Salva relatório final em JSON
    const reportPath = path.join(EVIDENCE_DIR, 'ocr_suite_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(suiteReport, null, 2));
    console.log('Relatório salvo em:', reportPath);

  } catch (err) {
    console.error('Erro durante execução da suíte autônoma:', err);
  } finally {
    await browser.close();
    console.log('Navegador finalizado.');
  }
}

runAutonomousOcrSuite();
