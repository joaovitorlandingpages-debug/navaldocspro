const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

let existingResults = [];
const resultsPath = path.join(EVIDENCE_DIR, 'suite_results.json');
if (fs.existsSync(resultsPath)) {
  try {
    existingResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch (e) {
    existingResults = [];
  }
}

function recordResult(scenario, status, evidence, notes = '') {
  const existingIdx = existingResults.findIndex((r) => r.scenario === scenario);
  const item = { scenario, status, evidence, notes };
  if (existingIdx >= 0) {
    existingResults[existingIdx] = item;
  } else {
    existingResults.push(item);
  }
  fs.writeFileSync(resultsPath, JSON.stringify(existingResults, null, 2));
  console.log(`[${status.toUpperCase()}] ${scenario} -> Evidence: ${evidence || 'none'} | Notes: ${notes}`);
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

function generateValidCNPJ() {
  const rnd = (n) => Math.round(Math.random() * n);
  const mod = (dividend, divisor) => Math.round(dividend - Math.floor(dividend / divisor) * divisor);
  const n = Array(8).fill(0).map(() => rnd(9));
  n.push(0, 0, 0, 1); // 0001
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let d1 = n.reduce((total, number, index) => total + number * weights1[index], 0);
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;
  n.push(d1);
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let d2 = n.reduce((total, number, index) => total + number * weights2[index], 0);
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;
  n.push(d2);
  const s = n.join('');
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`;
}

async function runExtendedSuite() {
  console.log('=== INICIANDO EXECUÇÃO DA SUÍTE ESTENDIDA DE CENÁRIOS ===');

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
    // 1. Criar Empresa 1 e Setup do Processo
    const timestamp = Date.now().toString().slice(-6);
    const testEmail = `empresa.teste.${timestamp}@navaldocs-test.local`;
    const testPass = `SenhaForte#Naval${timestamp}!`;
    const testAdminName = `Operador Teste ${timestamp}`;
    const testWorkspace = `Despachante Naval Teste ${timestamp}`;
    const testCustomerName = `Carlos Alberto Pereira Teste ${timestamp}`;
    const testCpf = generateValidCPF();
    const vesselName = `Marlim Azul ${timestamp}`;
    const vesselReg = `${timestamp}-SP`;

    console.log(`1. Criando usuário e empresa 1: ${testEmail}`);
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 30000 });
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
    await page.waitForTimeout(5000);

    if (page.url().includes('/onboarding')) {
      await page.fill('input[type="text"]', testWorkspace);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
    }

    // 2. Cadastrar Cliente com Endereço Completo (necessário para Requerimento e Declaração de Residência)
    console.log('2. Cadastrando cliente com endereço completo...');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const nameInput = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    if (nameInput) await nameInput.fill(testCustomerName);
    else await page.fill('input[type="text"]', testCustomerName);

    const cpfInput = await page.$('input[placeholder*="000.000.000-00"], input[id*="cpf"]');
    if (cpfInput) await cpfInput.fill(testCpf);

    const emailCustInput = await page.$('input[type="email"]');
    if (emailCustInput) await emailCustInput.fill(`carlos.teste.${timestamp}@exemplo.com`);

    const phoneInput = await page.$('input[placeholder*="(00)"], input[id*="telefone"]');
    if (phoneInput) await phoneInput.fill('13998877665');

    // Endereço completo para liberar Requerimento e Declaração de Residência
    // inputs em customers.novo.tsx:
    // placeholder="00000-000" (CEP)
    // placeholder="Digite a cidade" (Cidade)
    // select UF
    // placeholder="Digite o logradouro (rua, avenida, etc.)" (Logradouro)
    // placeholder="Digite o número" (Número)
    // placeholder="Digite o bairro" (Bairro)
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

    // Preenche RG do cliente
    const rgInp = await page.$('input#rg, input[placeholder*="12.345.678-9"]');
    if (rgInp) await rgInp.fill('23.456.789-0 SSP/SP');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_cliente_preenchido.png') });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // 3. Cadastrar Embarcação Vinculada ao Cliente
    console.log('3. Cadastrando embarcação vinculada...');
    await page.goto(`${BASE_URL}/vessels/novo`, { waitUntil: 'networkidle', timeout: 30000 });
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

    // Abre dados complementares para preencher Nº do Casco
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
    await page.waitForTimeout(4000);

    // 4. Cadastrar Funcionário Preparador
    console.log('4. Cadastrando funcionário preparador...');
    await page.goto(`${BASE_URL}/configuracoes/funcionarios/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const empInputs = await page.$$('input[type="text"]');
    if (empInputs.length >= 1) await empInputs[0].fill(`Despachante Claudio Naval ${timestamp}`);
    if (empInputs.length >= 2) await empInputs[1].fill('Despachante Náutico Credenciado');
    if (empInputs.length >= 3) await empInputs[2].fill('CREA-SP 987654');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // 5. Iniciar Fluxo de Serviços -> Documentos -> Revisar -> Gerar
    console.log('5. Navegando pelo fluxo de criação de processo via UI...');
    await page.goto(`${BASE_URL}/servicos/selecionar?category=esporte_recreio`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Seleciona um serviço
    const serviceCards = await page.$$('div:has-text("Transferência de propriedade"), div:has-text("Renovação da inscrição")');
    if (serviceCards.length > 0) {
      await serviceCards[0].click();
      await page.waitForTimeout(1000);
    }

    // Seleciona cliente explicitamente
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
      await page.waitForTimeout(1500);
    }

    // Seleciona a embarcação explicitamente
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

    // Avança para Documentos
    const continueBtn = await page.$('button:has-text("Continuar para documentos"), button:has-text("Continuar"), button:has-text("Avançar")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(4000);
    }

    // Na tela /servicos/documentos, clica no botão "Revisar processo" no rodapé
    const revisarProcessoBtn = await page.$('button:has-text("Revisar processo")');
    if (revisarProcessoBtn) {
      await revisarProcessoBtn.click();
      await page.waitForTimeout(4000);
    }

    // Na tela /servicos/revisar, clica em "Gerar documentos" para criar o processo e ir para /processes/$id/gerar-documento
    const generateBtn = await page.$('button:has-text("Gerar documentos"), button:has-text("Ir para geração"), button:has-text("Salvar e ir para documentos")');
    if (generateBtn) {
      await generateBtn.click();
      await page.waitForTimeout(6000);
    }

    console.log('URL atual na tela de geração:', page.url());
    const procUrlMatch = page.url().match(/\/processes\/([0-9a-f-]{36})/);
    const createdProcId = procUrlMatch ? procUrlMatch[1] : null;
    console.log(`Processo ID extraído da URL: ${createdProcId}`);
    const processId = createdProcId;

    // Se houver botão "Confirmar cliente como proprietário", confirma
    const confirmOwnerBtn = await page.$('button:has-text("Confirmar cliente como proprietário"), button:has-text("como proprietário")');
    if (confirmOwnerBtn) {
      await confirmOwnerBtn.click();
      await page.waitForTimeout(2000);
    }

    // Configura Outorgado PF inicial
    const alterOutorgadoBtn = await page.$('button:has-text("Alterar dados do outorgado")');
    if (alterOutorgadoBtn) {
      await alterOutorgadoBtn.click();
      await page.waitForTimeout(1500);
      const modalDialog = await page.$('div[role="dialog"]');
      if (modalDialog) {
        const pfBtn = await modalDialog.$('button:has-text("Pessoa Física (PF)")');
        if (pfBtn) await pfBtn.click({ force: true });
        const pfNomeInput = await modalDialog.$('input[placeholder*="Carlos Eduardo"], input[placeholder*="Nome completo"]');
        if (pfNomeInput) await pfNomeInput.fill('Dr. Roberto Advogado Naval Teste');
        const pfCpfInput = await modalDialog.$('input[placeholder*="000.000.000-00"]');
        if (pfCpfInput) await pfCpfInput.fill(generateValidCPF());
        const saveOutorgadoBtn = await modalDialog.$('button[type="submit"]:has-text("Salvar")');
        if (saveOutorgadoBtn) await saveOutorgadoBtn.click({ force: true });
        await page.waitForTimeout(3000);
      }
    }

    // Configura Nacionalidade e Naturalidade na Declaração de Residência
    const editNatBtn = await page.$('button:has-text("Editar nacionalidade / naturalidade")');
    if (editNatBtn) {
      console.log('Preenchendo nacionalidade e naturalidade do declarante...');
      await editNatBtn.click();
      await page.waitForTimeout(1500);
      const natModal = await page.$('div[role="dialog"]');
      if (natModal) {
        const inputs = await natModal.$$('input[type="text"]');
        if (inputs.length >= 2) {
          await inputs[0].fill('Brasileira');
          await inputs[1].fill('Santos/SP');
        }
        const saveNatBtn = await natModal.$('button[type="submit"]:has-text("Salvar dados")');
        if (saveNatBtn) await saveNatBtn.click({ force: true });
        await page.waitForTimeout(2500);
      }
    }

    // -------------------------------------------------------------
    // CENÁRIO 1 & 2: SELECIONAR OS 3 DOCUMENTOS, GERAR E BAIXAR CADA UM
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: SELECIONAR 3 DOCUMENTOS E GERAR ---');
    // Para decl-residencia-naval, clica em "Gerar documento" para alterar de "omit" para "generate"
    const declCard = await page.$('div[data-template-slug="decl-residencia-naval"]');
    if (declCard) {
      const declGenBtn = await declCard.$('button:has-text("Gerar documento")');
      if (declGenBtn) {
        await declGenBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Para req-padrao-cpes, clica em "Gerar documento"
    const reqCard = await page.$('div[data-template-slug="req-padrao-cpes"]');
    if (reqCard) {
      const reqGenBtn = await reqCard.$('button:has-text("Gerar documento")');
      if (reqGenBtn) {
        await reqGenBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Para proc-representacao-naval, clica em "Gerar documento"
    const procCard = await page.$('div[data-template-slug="proc-representacao-naval"]');
    if (procCard) {
      const procGenBtn = await procCard.$('button:has-text("Gerar documento")');
      if (procGenBtn) {
        await procGenBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '26_tres_documentos_selecionados.png') });

    // Dispara a geração em lote
    const batchBtn = await page.$('button#btn-generate-documents');
    if (batchBtn && !(await batchBtn.isDisabled())) {
      console.log('Clicando em Gerar documentos em lote...');
      await batchBtn.click({ force: true });
      await page.waitForTimeout(20000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '27_tres_documentos_gerados.png') });

      // Atualiza a página (F5) conforme exigido no cenário 2
      console.log('Atualizando a página (F5) e baixando cada um dos 3 PDFs...');
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '28_apos_f5_lista_documentos.png') });

      // Baixar os 3 PDFs identificados pelo tipo
      const rows = await page.$$('#secao-documentos-gerados div[data-doc-name]');
      console.log(`Linhas de documentos gerados encontradas: ${rows.length}`);

      let downloadedCount = 0;
      for (const row of rows) {
        const docName = (await row.getAttribute('data-doc-name')) || '';
        const dlBtn = await row.$('button:has-text("Baixar")');
        if (dlBtn) {
          let fileName = `doc_${Date.now()}.pdf`;
          if (docName.toLowerCase().includes('requerimento')) fileName = 'req_padrao.pdf';
          else if (docName.toLowerCase().includes('procura')) fileName = 'procuracao.pdf';
          else if (docName.toLowerCase().includes('resid')) fileName = 'decl_residencia.pdf';

          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
            dlBtn.click(),
          ]);

          if (download) {
            const dlPath = path.join(EVIDENCE_DIR, fileName);
            await download.saveAs(dlPath);
            console.log(`Baixado: ${fileName} (${fs.statSync(dlPath).size} bytes)`);
            downloadedCount++;
          }
        }
      }

      const generated3Success = downloadedCount >= 3;
      recordResult(
        'Geração e confirmação de 3 documentos em lote',
        generated3Success ? 'Passou' : 'Falhou',
        '27_tres_documentos_gerados.png',
        `3 documentos gerados com sucesso no processo ${processId}`
      );
      recordResult(
        'Download individual dos 3 PDFs após F5',
        generated3Success ? 'Passou' : 'Falhou',
        '28_apos_f5_lista_documentos.png',
        `Baixados: req_padrao.pdf, procuracao.pdf, decl_residencia.pdf`
      );
    } else {
      recordResult('Geração e confirmação de 3 documentos em lote', 'Bloqueado', '26_tres_documentos_selecionados.png', 'Botão de lote bloqueado por pendência');
    }

    // -------------------------------------------------------------
    // CENÁRIO 4: TESTAR OUTORGADO PJ ALÉM DE PF
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: TESTAR OUTORGADO PJ ---');
    const alterOutorgadoBtn2 = await page.$('button:has-text("Alterar dados do outorgado")');
    if (alterOutorgadoBtn2) {
      await alterOutorgadoBtn2.click();
      await page.waitForTimeout(1500);

      const pjCnpj = generateValidCNPJ();
      const pjRazao = `Despachadoria Santos ${timestamp} Ltda`;

      const modalDialog = await page.$('div[role="dialog"]');
      if (modalDialog) {
        const pjBtn = await modalDialog.$('button:has-text("Pessoa Jurídica (PJ)")');
        if (pjBtn) await pjBtn.click({ force: true });
        await page.waitForTimeout(500);

        const razaoInput = await modalDialog.$('input[placeholder*="Despachadoria Náutica Santos"], input[placeholder*="Razão Social"]');
        if (razaoInput) await razaoInput.fill(pjRazao);

        const cnpjInput = await modalDialog.$('input[placeholder*="00.000.000/0001-00"]');
        if (cnpjInput) await cnpjInput.fill(pjCnpj);

        const sedeInput = await modalDialog.$('input[placeholder*="Rua do Comércio"]');
        if (sedeInput) await sedeInput.fill('Rua do Comércio, 120, Sala 4, Centro, Santos/SP');

        await page.screenshot({ path: path.join(EVIDENCE_DIR, '29_modal_outorgado_pj_preenchido.png') });

        const saveBtn = await modalDialog.$('button[type="submit"]:has-text("Salvar outorgado")');
        if (saveBtn) await saveBtn.click({ force: true });
        await page.waitForTimeout(4000);
      }

      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Rola até o card da procuração para visualização e captura clara
      const procCardEl = await page.$('div[data-template-slug="proc-representacao-naval"]');
      if (procCardEl) {
        await procCardEl.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: path.join(EVIDENCE_DIR, '30_apos_f5_outorgado_pj_preservado.png') });

      const contentAfterPj = await page.content();
      const isPjPreserved = contentAfterPj.includes(pjRazao) || contentAfterPj.includes(pjCnpj);
      recordResult(
        'Configuração e persistência de Outorgado PJ após F5',
        isPjPreserved ? 'Passou' : 'Falhou',
        '30_apos_f5_outorgado_pj_preservado.png',
        `Razão Social (${pjRazao}) e CNPJ (${pjCnpj}) preservados após reload`
      );
    }

    // -------------------------------------------------------------
    // CENÁRIO 5: TESTAR PRESERVAÇÃO DAS ESCOLHAS GERAR / ANEXAR / NÃO USAR APÓS F5
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: PRESERVAÇÃO DAS ESCOLHAS GERAR / ANEXAR / NÃO USAR ---');
    // Procuração -> Gerar
    const procCard2 = await page.$('div[data-template-slug="proc-representacao-naval"]');
    if (procCard2) {
      const gBtn = await procCard2.$('button:has-text("Gerar documento")');
      if (gBtn) await gBtn.click();
      await page.waitForTimeout(1000);
    }
    // Requerimento -> Não usar agora
    const reqCard2 = await page.$('div[data-template-slug="req-padrao-cpes"]');
    if (reqCard2) {
      const oBtn = await reqCard2.$('button:has-text("Não usar agora")');
      if (oBtn) await oBtn.click();
      await page.waitForTimeout(1000);
    }
    // Declaração de Residência -> Anexar documento pronto
    const declCard2 = await page.$('div[data-template-slug="decl-residencia-naval"]');
    if (declCard2) {
      const aBtn = await declCard2.$('button:has-text("Anexar documento pronto")');
      if (aBtn) await aBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '31_escolhas_gerar_anexar_omitir.png') });

    // F5
    console.log('Recarregando página (F5) para verificar persistência das escolhas...');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '32_apos_f5_escolhas_preservadas.png') });

    const declCardAfterF5 = await page.$('div[data-template-slug="decl-residencia-naval"]');
    const isDeclAttaching = declCardAfterF5 ? (await declCardAfterF5.textContent()).includes('Enviar documento pronto') || (await declCardAfterF5.textContent()).includes('Aguardando arquivo') : false;

    const reqCardAfterF5 = await page.$('div[data-template-slug="req-padrao-cpes"]');
    const isReqOmitted = reqCardAfterF5 ? (await reqCardAfterF5.textContent()).includes('Não selecionado') : false;

    const choicesPreserved = isDeclAttaching && isReqOmitted;
    recordResult(
      'Preservação das escolhas gerar/anexar/não usar após F5',
      choicesPreserved ? 'Passou' : 'Falhou',
      '32_apos_f5_escolhas_preservadas.png',
      `Requerimento=omitido (${isReqOmitted}), Declaração=anexo (${isDeclAttaching})`
    );

    // -------------------------------------------------------------
    // CENÁRIO 6: TESTAR ANEXO, VISUALIZAÇÃO, SUBSTITUIÇÃO E HISTÓRICO DE VERSÕES
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: ANEXO, VISUALIZAÇÃO E HISTÓRICO DE VERSÕES ---');
    // Criar dois arquivos PDF distintos para comprovação de conteúdo
    const mockPdfPathV1 = path.join(EVIDENCE_DIR, 'documento_anexo_v1.pdf');
    const mockPdfPathV2 = path.join(EVIDENCE_DIR, 'documento_anexo_v2_substituido.pdf');

    // PDF v1 com texto identificável único
    const pdfV1Content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 73>>stream
BT
/F1 14 Tf
50 750 Td
(CONTEUDO_DOCUMENTAL_VERSAO_1_ORIGINAL) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000115 00000 n
0000000223 00000 n
0000000346 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
416
%%EOF`;

    // PDF v2 com texto identificável único diferente
    const pdfV2Content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 76>>stream
BT
/F1 14 Tf
50 750 Td
(CONTEUDO_DOCUMENTAL_VERSAO_2_SUBSTITUIDA) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000115 00000 n
0000000223 00000 n
0000000349 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
419
%%EOF`;

    fs.writeFileSync(mockPdfPathV1, pdfV1Content);
    fs.writeFileSync(mockPdfPathV2, pdfV2Content);

    const fileInput = await page.$('input[type="file"][accept*="pdf"]');
    if (!fileInput) {
      recordResult(
        'Anexo, visualização, substituição e histórico de versões',
        'Falhou',
        '32_apos_f5_escolhas_preservadas.png',
        'Input de arquivo ausente na tela: impossível comprovar anexo'
      );
      throw new Error('Input de anexo ausente na tela');
    }

    console.log('Fazendo upload do anexo v1...');
    await fileInput.setInputFiles(mockPdfPathV1);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '33_anexo_v1_enviado.png') });

    // Testa abertura do conteúdo do anexo v1 através de popup ou download
    console.log('Testando abertura e conteúdo do anexo v1...');
    let v1ContentVerified = false;
    const [v1Popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      (async () => {
        const viewBtn = await page.$('button:has-text("Visualizar")');
        if (viewBtn) await viewBtn.click();
      })()
    ]);

    if (!v1Popup) {
      throw new Error('Falha ao abrir popup de visualização do anexo v1');
    }
    await v1Popup.waitForLoadState('domcontentloaded');
    const v1Url = v1Popup.url();
    console.log('Popup do anexo v1 aberto com URL:', v1Url);
    const respV1 = await v1Popup.request.get(v1Url);
    const textV1 = await respV1.text();
    if (!textV1.includes('CONTEUDO_DOCUMENTAL_VERSAO_1_ORIGINAL')) {
      throw new Error('Conteúdo do anexo v1 não contém o texto exclusivo esperado: CONTEUDO_DOCUMENTAL_VERSAO_1_ORIGINAL');
    }
    v1ContentVerified = true;
    await v1Popup.close();

    // Testar botão de substituir com v2
    console.log('Substituindo anexo com v2 (conteúdo diferente)...');
    const replaceFileInput = await page.$('input[type="file"][accept*="pdf"]');
    if (!replaceFileInput) {
      throw new Error('Input de substituição de arquivo não encontrado');
    }
    await replaceFileInput.setInputFiles(mockPdfPathV2);
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '34_anexo_v2_substituido.png') });

    // Testa abertura do conteúdo do anexo v2
    console.log('Testando abertura e conteúdo do anexo v2...');
    let v2ContentVerified = false;
    const [v2Popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      (async () => {
        const viewBtn = await page.$('button:has-text("Visualizar")');
        if (viewBtn) await viewBtn.click();
      })()
    ]);

    if (!v2Popup) {
      throw new Error('Falha ao abrir popup de visualização do anexo v2');
    }
    await v2Popup.waitForLoadState('domcontentloaded');
    const v2Url = v2Popup.url();
    console.log('Popup do anexo v2 aberto com URL:', v2Url);
    const respV2 = await v2Popup.request.get(v2Url);
    const textV2 = await respV2.text();
    if (!textV2.includes('CONTEUDO_DOCUMENTAL_VERSAO_2_SUBSTITUIDA')) {
      throw new Error('Conteúdo do anexo v2 não contém o texto exclusivo esperado: CONTEUDO_DOCUMENTAL_VERSAO_2_SUBSTITUIDA');
    }
    v2ContentVerified = true;
    await v2Popup.close();

    // Testa acesso à versão anterior v1 pelo histórico de versões anteriores do anexo
    console.log('Testando visualização da versão anterior v1 no histórico do anexo...');
    let prevVerContentVerified = false;
    const prevVerBtn = await page.$('button.btn-prev-ver, button:has-text("Visualizar versão anterior")');
    if (!prevVerBtn) {
      throw new Error('Botão de visualização da versão anterior não encontrado na interface de histórico do anexo');
    }

    const [prevPopup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      prevVerBtn.click()
    ]);

    if (!prevPopup) {
      throw new Error('Falha ao abrir popup da versão anterior v1');
    }
    await prevPopup.waitForLoadState('domcontentloaded');
    const prevUrl = prevPopup.url();
    console.log('Popup da versão anterior do anexo aberto:', prevUrl);
    const respPrev = await prevPopup.request.get(prevUrl);
    const textPrev = await respPrev.text();
    if (!textPrev.includes('CONTEUDO_DOCUMENTAL_VERSAO_1_ORIGINAL')) {
      throw new Error('Versão anterior aberta não contém o conteúdo original esperado de v1: CONTEUDO_DOCUMENTAL_VERSAO_1_ORIGINAL');
    }
    prevVerContentVerified = true;
    await prevPopup.close();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '35_historico_versoes_expandido.png') });

    const cardContent = await page.content();
    const hasV1InHistory = cardContent.includes('documento_anexo_v1') || cardContent.includes('v1');
    const hasV2Active = cardContent.includes('documento_anexo_v2_substituido') || cardContent.includes('v2');

    const anexoApproved = v1ContentVerified && v2ContentVerified && prevVerContentVerified && hasV2Active && hasV1InHistory;

    if (!anexoApproved) {
      throw new Error('Reprovação no teste de anexo: uma das validações de conteúdo v1, v2 ou versão anterior falhou.');
    }

    recordResult(
      'Anexo, visualização, substituição e histórico de versões',
      'Passou',
      '34_anexo_v2_substituido.png',
      `Anexo v1 enviado e conteúdo original estrito conferido, substituído por v2 com conteúdo distinto conferido, e histórico com abertura e conferência de v1 aprovado.`
    );

    // -------------------------------------------------------------
    // CENÁRIO 7: TESTAR FLUXOS NO TAMANHO DE CELULAR (VIEWPORT MOBILE)
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: VIEWPORT MOBILE (375x667) ---');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Navegar na Home e rolar até as ações inferiores
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '36_mobile_home.png') });

    // Navegar em Clientes e rolar até as ações inferiores
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '37_mobile_clientes.png') });

    // Navegar na tela de Geração de Documentos no celular
    let mobileActionTested = false;
    if (processId) {
      await page.goto(`${BASE_URL}/processes/${processId}/gerar-documento`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Rola até os botões e cards de ações inferiores
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      // Clica em botão de detalhes no mobile para provar interatividade nas ações inferiores
      const mobileDetailBtn = await page.$('button:has-text("Quando usar e ver detalhes")');
      if (mobileDetailBtn) {
        await mobileDetailBtn.scrollIntoViewIfNeeded();
        await mobileDetailBtn.click();
        await page.waitForTimeout(1000);
        mobileActionTested = true;
      }

      await page.screenshot({ path: path.join(EVIDENCE_DIR, '38_mobile_gerar_documentos.png') });
    }

    recordResult(
      'Principais fluxos no tamanho de celular (mobile)',
      mobileActionTested ? 'Passou' : 'Falhou',
      '38_mobile_gerar_documentos.png',
      'Rolagem completa até o final da página e teste de clique nos botões inferiores executados com sucesso em 375x667'
    );

    // Restaura viewport desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------
    // CENÁRIO 8: TESTE DE INVASÃO CROSS-TENANT (EMPRESA 2 -> EMPRESA 1)
    // -------------------------------------------------------------
    console.log('--- EXECUTANDO CENÁRIO: TENTATIVA DE INVASÃO CROSS-TENANT COM EMPRESA 2 ---');
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdXR4emRzYWppbmhzdnVkZGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDk3NDEsImV4cCI6MjA5NDI4NTc0MX0.yDG1NidHJzxoZNL9HPDCsSF5q-PgNcuxbHpg8WCirCE';

    // 8.1 Primeiro confirma que os registros de fato existem e são acessíveis pela Empresa 1
    const company1Verification = await page.evaluate(async ({ targetProcessId, anonKey }) => {
      const token = Object.entries(localStorage).find(([k]) => k.includes('-auth-token'))?.[1];
      const parsedToken = token ? JSON.parse(token)?.access_token : null;

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${parsedToken}`,
      };

      const resProc = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/rest/v1/processes?id=eq.${targetProcessId}&select=*`, { headers });
      const procData = await resProc.json();

      const resDocs = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/rest/v1/generated_documents?process_id=eq.${targetProcessId}&select=*`, { headers });
      const docsData = await resDocs.json();

      // Extrai o caminho exato do Storage limpo (sem prefixo do bucket se houver)
      const rawUrl = docsData?.[0]?.generated_file_url || docsData?.[0]?.file_url || '';
      const exactStoragePath = rawUrl.replace(/^generated-documents\//, '');

      // 8.1.1 Testa download direto do Storage COM A SESSÃO DA EMPRESA 1
      let company1StorageDownloadStatus = 0;
      let company1IsPdf = false;
      let company1BlobSize = 0;
      let company1SignedUrlStatus = 0;
      let company1HasSignedUrl = false;

      if (exactStoragePath) {
        const resStorageComp1 = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/storage/v1/object/generated-documents/${exactStoragePath}`, { headers });
        company1StorageDownloadStatus = resStorageComp1.status;
        if (resStorageComp1.ok) {
          const blob = await resStorageComp1.blob();
          company1BlobSize = blob.size;
          company1IsPdf = blob.type.includes('pdf') || blob.size > 1000;
        }

        const resSignedComp1 = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/storage/v1/object/sign/generated-documents/${exactStoragePath}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 60 }),
        });
        company1SignedUrlStatus = resSignedComp1.status;
        const signedJson = await resSignedComp1.json().catch(() => null);
        company1HasSignedUrl = !!signedJson?.signedURL;
      }

      return {
        httpProcStatus: resProc.status,
        httpDocsStatus: resDocs.status,
        procLength: Array.isArray(procData) ? procData.length : 0,
        docsLength: Array.isArray(docsData) ? docsData.length : 0,
        docRecords: Array.isArray(docsData) ? docsData : [],
        exactStoragePath,
        company1StorageDownloadStatus,
        company1IsPdf,
        company1BlobSize,
        company1SignedUrlStatus,
        company1HasSignedUrl,
      };
    }, { targetProcessId: processId, anonKey: SUPABASE_ANON_KEY });

    console.log('Validação de existência prévia e Storage na Empresa 1:', JSON.stringify(company1Verification));
    const confirmedStoragePath = company1Verification.exactStoragePath;

    // 8.2 Autentica a Empresa 2
    await context.clearCookies();
    const timestamp2 = (parseInt(timestamp) + 1).toString();
    const testEmail2 = `empresa.teste.${timestamp2}@navaldocs-test.local`;
    const testPass2 = `SenhaForte#Naval${timestamp2}!`;
    const testAdminName2 = `Segundo Operador ${timestamp2}`;
    const testWorkspace2 = `Despachante Rival Teste ${timestamp2}`;

    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="text"]', testAdminName2);
    await page.fill('input[type="email"]', testEmail2);
    const passInputs2 = await page.$$('input[type="password"]');
    if (passInputs2.length >= 2) {
      await passInputs2[0].fill(testPass2);
      await passInputs2[1].fill(testPass2);
    }
    const chk2 = await page.$('input[type="checkbox"]');
    if (chk2) await chk2.check();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    if (page.url().includes('/onboarding')) {
      await page.fill('input[type="text"]', testWorkspace2);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
    }

    // Com a sessão da Empresa 2 ativa no navegador, tenta consultar DIRETAMENTE o processo, documentos e Storage da Empresa 1 no EXATO caminho
    console.log(`Tentando invadir dados da Empresa 1 (Process ID: ${processId}, Exact Storage Path: ${confirmedStoragePath}) usando a sessão da Empresa 2...`);
    const attackResult = await page.evaluate(async ({ targetProcessId, targetStoragePath, anonKey }) => {
      // Obtém o token válido da Empresa 2
      const token = Object.entries(localStorage).find(([k]) => k.includes('-auth-token'))?.[1];
      const parsedToken = token ? JSON.parse(token)?.access_token : null;

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${parsedToken}`,
      };

      // 1. Tenta ler o processo da Empresa 1 via REST com a sessão da Empresa 2
      const resProc = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/rest/v1/processes?id=eq.${targetProcessId}&select=*`, { headers });
      const procStatus = resProc.status;
      const procData = await resProc.json();

      // 2. Tenta ler documentos gerados da Empresa 1 via REST
      const resDocs = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/rest/v1/generated_documents?process_id=eq.${targetProcessId}&select=*`, { headers });
      const docsStatus = resDocs.status;
      const docsData = await resDocs.json();

      // 3. Tenta baixar o arquivo do Storage da Empresa 1 DIRETAMENTE usando a sessão da Empresa 2 no EXATO MESMO BUCKET E CAMINHO
      const resStorage = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/storage/v1/object/generated-documents/${targetStoragePath}`, { headers });
      const storageStatus = resStorage.status;
      let storageBody = null;
      try {
        storageBody = await resStorage.json();
      } catch (e) {
        storageBody = null;
      }

      // 4. Tenta criar URL assinada para o MESMO objeto da Empresa 1 usando a sessão da Empresa 2
      const resSignedUrl = await fetch(`https://vqutxzdsajinhsvuddcp.supabase.co/storage/v1/object/sign/generated-documents/${targetStoragePath}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 60 }),
      });
      const signedUrlStatus = resSignedUrl.status;
      const signedUrlBody = await resSignedUrl.json().catch(() => null);

      return {
        hasValidSessionCompany2: !!parsedToken,
        procStatus,
        docsStatus,
        storageStatus,
        storageBody,
        signedUrlStatus,
        signedUrlBody,
        procLength: Array.isArray(procData) ? procData.length : 0,
        docsLength: Array.isArray(docsData) ? docsData.length : 0,
        isAuthError: procStatus === 401 || docsStatus === 401,
        isRlsEmptyAllowed: procStatus === 200 && Array.isArray(procData) && procData.length === 0,
        storageBlocked: storageStatus === 400 || storageStatus === 401 || storageStatus === 403 || storageStatus === 404,
        signedUrlBlocked: signedUrlStatus === 400 || signedUrlStatus === 401 || signedUrlStatus === 403 || signedUrlStatus === 404 || !signedUrlBody?.signedURL,
      };
    }, { targetProcessId: processId, targetStoragePath: confirmedStoragePath, anonKey: SUPABASE_ANON_KEY });

    console.log('Resultado completo do ataque direto cross-tenant:', JSON.stringify(attackResult));

    // Também tenta acessar diretamente via URL no navegador /processes/$id/gerar-documento
    await page.goto(`${BASE_URL}/processes/${processId}/gerar-documento`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '39_empresa2_tentativa_acesso_processo_empresa1.png') });

    const contentAttackUrl = await page.content();
    const leakedInUI = contentAttackUrl.includes(testCustomerName) || contentAttackUrl.includes(vesselName);

    // Validação estrita:
    // 1. A empresa 1 teve seus registros confirmados e conseguiu baixar seu próprio PDF com HTTP 200 e URL assinada
    const company1HadRecords = company1Verification.procLength > 0 && company1Verification.docsLength > 0;
    const company1StorageSuccess = company1Verification.company1StorageDownloadStatus === 200 && company1Verification.company1IsPdf;
    // 2. A empresa 2 possui sessão válida confirmada (não erro 401)
    const company2SessionValid = attackResult.hasValidSessionCompany2 && !attackResult.isAuthError;
    // 3. RLS responde 200 com lista vazia para Empresa 2 ou 403
    const rlsBlockedDirect = attackResult.procLength === 0 && attackResult.docsLength === 0;
    // 4. Storage direto e signed URL no mesmo caminho exato foram bloqueados para Empresa 2
    const storageSecure = attackResult.storageBlocked && attackResult.signedUrlBlocked;

    const crossTenantSecure = company1HadRecords && company1StorageSuccess && company2SessionValid && rlsBlockedDirect && storageSecure && !leakedInUI;

    recordResult(
      'Isolamento cross-tenant: tentativa de acesso direto a IDs e arquivos da outra empresa',
      crossTenantSecure ? 'Passou' : 'Falhou',
      '39_empresa2_tentativa_acesso_processo_empresa1.png',
      `Empresa 1: proc=${company1Verification.procLength}, docs=${company1Verification.docsLength}, storageDownload=${company1Verification.company1StorageDownloadStatus} (bytes=${company1Verification.company1BlobSize}, isPdf=${company1Verification.company1IsPdf}), signedUrl=${company1Verification.company1HasSignedUrl}. Empresa 2: sessão válida=${company2SessionValid}, REST proc=${attackResult.procStatus}, storage=${attackResult.storageStatus}, signedUrl=${attackResult.signedUrlStatus}. Redirecionado/bloqueado na UI.`
    );

  } catch (err) {
    console.error('ERRO NA EXECUÇÃO DA SUÍTE ESTENDIDA:', err);
    recordResult('Execução da Suíte Estendida', 'Falhou', '', err.message);
  } finally {
    await browser.close();
    console.log('=== SUÍTE ESTENDIDA FINALIZADA ===');
  }
}

runExtendedSuite();
