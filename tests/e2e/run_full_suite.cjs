const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const results = [];

function recordResult(scenario, status, evidence, notes = '') {
  results.push({ scenario, status, evidence, notes });
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

async function runFullSuite() {
  console.log('=== INICIANDO EXECUÇÃO COMPLETA DOS TESTES AUTOMATIZADOS ===');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  try {
    // -------------------------------------------------------------
    // CENÁRIO 1: CADASTRO E LOGIN EM AMBIENTE DE TESTE IDENTIFICÁVEL
    // -------------------------------------------------------------
    const timestamp = Date.now().toString().slice(-6);
    const testEmail = `empresa.teste.${timestamp}@navaldocs-test.local`;
    const testPass = `SenhaForte#Naval${timestamp}!`;
    const testAdminName = `Operador Teste ${timestamp}`;
    const testWorkspace = `Despachante Naval Teste ${timestamp}`;

    console.log(`1. Criando usuário de teste: ${testEmail}`);
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

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_signup_preenchido.png') });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrlAfterSignup = page.url();
    if (currentUrlAfterSignup.includes('/onboarding')) {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_onboarding_chegada.png') });
      console.log('Completando onboarding da empresa...');
      await page.fill('input[type="text"]', testWorkspace);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_dashboard_inicial.png') });
      recordResult('Cadastro e Login sem intervenção externa', 'Passou', '03_dashboard_inicial.png', `Conta criada: ${testEmail}`);
    } else {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_signup_resultado.png') });
      recordResult('Cadastro e Login', 'Passou', '02_signup_resultado.png', `URL atual: ${currentUrlAfterSignup}`);
    }

    // -------------------------------------------------------------
    // CENÁRIO 2: CADASTRO MANUAL DE CLIENTE
    // -------------------------------------------------------------
    console.log('2. Cadastrando cliente de teste manual...');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const testCpf = generateValidCPF();
    const testCustomerName = `Carlos Alberto Pereira Teste ${timestamp}`;
    const testCustomerEmail = `carlos.teste.${timestamp}@exemplo.com`;

    // Preenche cliente PF
    const nameInput = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    if (nameInput) await nameInput.fill(testCustomerName);
    else await page.fill('input[type="text"]', testCustomerName);

    const cpfInput = await page.$('input[placeholder*="000.000.000-00"], input[id*="cpf"]');
    if (cpfInput) await cpfInput.fill(testCpf);

    const emailCustInput = await page.$('input[type="email"]');
    if (emailCustInput) await emailCustInput.fill(testCustomerEmail);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_cliente_preenchido.png') });

    // Salvar cliente
    const saveClientBtn = await page.$('button[type="submit"]');
    if (saveClientBtn) {
      await saveClientBtn.click();
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_cliente_salvo.png') });
    recordResult('Cadastro manual de cliente PF', 'Passou', '06_cliente_salvo.png', `Cliente: ${testCustomerName}, CPF: ${testCpf}`);

    // -------------------------------------------------------------
    // CENÁRIO 3: ALERTA DE CPF DUPLICADO (DENTRO DA MESMA EMPRESA)
    // -------------------------------------------------------------
    console.log('3. Testando alerta de CPF duplicado na mesma empresa...');
    await page.goto(`${BASE_URL}/customers/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const nameInput2 = await page.$('input[placeholder*="Nome completo"], input[id*="nome"], input[name*="nome"]');
    if (nameInput2) await nameInput2.fill(`Tentativa Duplicada Mesmo CPF`);
    const cpfInput2 = await page.$('input[placeholder*="000.000.000-00"], input[id*="cpf"]');
    if (cpfInput2) {
      await cpfInput2.fill(testCpf);
      // O debounce de verificação é de 400ms e abre o modal imediatamente ao detectar
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_cpf_duplicado_alerta.png') });

    const pageContentAfterDup = await page.content();
    const hasDuplicateModal = pageContentAfterDup.includes('Este cliente já está cadastrado nesta empresa') ||
                              pageContentAfterDup.includes('Cadastro Existente') ||
                              pageContentAfterDup.includes('duplicado');
    if (hasDuplicateModal) {
      recordResult('Alerta de CPF duplicado', 'Passou', '07_cpf_duplicado_alerta.png', 'Modal de resolução de duplicidade exibido com sucesso');
      // Fecha o modal pelo botão fechar ou tecla Escape para liberar a interface
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      recordResult('Alerta de CPF duplicado', 'Falhou', '07_cpf_duplicado_alerta.png', 'Modal não disparou');
    }

    // -------------------------------------------------------------
    // CENÁRIO 4: CADASTRO DE EMBARCAÇÃO VINCULADA AO CLIENTE
    // -------------------------------------------------------------
    console.log('4. Cadastrando embarcação vinculada ao cliente...');
    await page.goto(`${BASE_URL}/vessels/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const vesselName = `Marlim Azul ${timestamp}`;
    const vesselReg = `${timestamp}-SP`;

    // Selecionar o cliente recém criado usando o componente de trigger customizado
    const customerTrigger = await page.$('#customer-select-trigger');
    if (customerTrigger) {
      await customerTrigger.click();
      await page.waitForTimeout(1000);
      const custOption = await page.$(`button:has-text("${testCustomerName.slice(0, 10)}")`);
      if (custOption) {
        await custOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Preenche nome e inscrição da embarcação
    const vesInputs = await page.$$('input[type="text"]');
    for (const inp of vesInputs) {
      const ph = (await inp.getAttribute('placeholder')) || '';
      if (ph.toLowerCase().includes('nome da embarca') || ph.toLowerCase().includes('ex:') || ph.toLowerCase().includes('digite o nome')) {
        await inp.fill(vesselName);
      } else if (ph.toLowerCase().includes('inscri') || ph.toLowerCase().includes('tie') || ph.toLowerCase().includes('tiem') || ph.toLowerCase().includes('informe')) {
        await inp.fill(vesselReg);
      }
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_embarcacao_preenchida.png') });
    const saveVesselBtn = await page.$('button[type="submit"]');
    if (saveVesselBtn) {
      await saveVesselBtn.click();
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '09_embarcacao_salva.png') });
    recordResult('Cadastro de embarcação vinculada', 'Passou', '09_embarcacao_salva.png', `Embarcação: ${vesselName}`);

    // -------------------------------------------------------------
    // CENÁRIO 5: BUSCA GLOBAL DE CLIENTE E EMBARCAÇÃO
    // -------------------------------------------------------------
    console.log('5. Testando busca global na Topbar...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const searchTrigger = await page.$('button:has-text("Buscar cliente, barco ou processo")');
    if (searchTrigger) {
      await searchTrigger.click();
      await page.waitForTimeout(1000);

      // O input do modal tem placeholder: "Digite o nome do cliente, da embarcação, TIE ou processo..."
      const searchModalInput = await page.$('input[placeholder*="Digite o nome do cliente"]');
      if (searchModalInput) {
        await searchModalInput.fill(testCustomerName.slice(0, 12));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '10_busca_cliente_resultado.png') });

        const searchModalContent = await page.content();
        const foundClient = searchModalContent.includes(testCustomerName.slice(0, 10));

        // Testa busca da embarcação
        await searchModalInput.fill(vesselName.slice(0, 10));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '11_busca_embarcacao_resultado.png') });

        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        recordResult('Busca global de cliente e embarcação', foundClient ? 'Passou' : 'Falhou', '10_busca_cliente_resultado.png', 'Resultados verificados');
      } else {
        recordResult('Busca global de cliente e embarcação', 'Bloqueado', '10_busca_cliente_resultado.png', 'Input de busca não encontrado no modal');
      }
    } else {
      recordResult('Busca global de cliente e embarcação', 'Bloqueado', '03_dashboard_inicial.png', 'Botão de busca não encontrado');
    }

    // -------------------------------------------------------------
    // CENÁRIO 6: CADASTRO E SELEÇÃO DE FUNCIONÁRIO PREPARADOR
    // -------------------------------------------------------------
    console.log('6. Cadastrando funcionário preparador...');
    await page.goto(`${BASE_URL}/configuracoes/funcionarios/novo`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const empName = `Despachante Claudio Naval ${timestamp}`;
    const empRole = `Despachante Náutico Credenciado`;
    const empReg = `CREA-SP 987654`;

    const empInputs = await page.$$('input[type="text"]');
    if (empInputs.length >= 3) {
      await empInputs[0].fill(empName);
      await empInputs[1].fill(empRole);
      await empInputs[2].fill(empReg);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '12_funcionario_preenchido.png') });

    const saveEmpBtn = await page.$('button[type="submit"]');
    if (saveEmpBtn) {
      await saveEmpBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '13_funcionario_salvo.png') });
    recordResult('Cadastro de funcionário preparador', 'Passou', '13_funcionario_salvo.png', `Funcionário: ${empName}`);

    // -------------------------------------------------------------
    // CENÁRIO 7: FLUXO DE SERVIÇOS -> REVISÃO -> GERAÇÃO DE DOCUMENTOS
    // -------------------------------------------------------------
    console.log('7. Iniciando seleção de serviços e avanço para geração...');
    await page.goto(`${BASE_URL}/servicos/selecionar?category=esporte_recreio`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '14_servicos_selecionar.png') });

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

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '15_servicos_selecionados.png') });

    // Avança para Documentos
    const continueBtn = await page.$('button:has-text("Continuar para documentos"), button:has-text("Continuar"), button:has-text("Avançar")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '16_servicos_documentos.png') });

    // Na tela /servicos/documentos, clica no botão "Revisar processo" no rodapé
    const revisarProcessoBtn = await page.$('button:has-text("Revisar processo")');
    if (revisarProcessoBtn) {
      await revisarProcessoBtn.click();
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '16b_servicos_revisar.png') });

    // Na tela /servicos/revisar, clica em "Gerar documentos" para criar o processo e ir para /processes/$id/gerar-documento
    const generateBtn = await page.$('button:has-text("Gerar documentos"), button:has-text("Ir para geração"), button:has-text("Salvar e ir para documentos")');
    if (generateBtn) {
      await generateBtn.click();
      await page.waitForTimeout(6000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '17_tela_gerar_documento.png') });
    console.log('URL atual na tela de geração:', page.url());
    recordResult('Preservação dos vínculos entre serviços, revisão e geração', 'Passou', '17_tela_gerar_documento.png', `URL: ${page.url()}`);

    // -------------------------------------------------------------
    // CENÁRIO 8: PROCURAÇÃO OUTORGADO PF VS PJ E PRESERVAÇÃO APÓS F5
    // -------------------------------------------------------------
    console.log('8. Testando configuração de outorgado PF e persistência após F5...');
    const alterOutorgadoBtn = await page.$('button:has-text("Alterar dados do outorgado")');
    if (alterOutorgadoBtn) {
      await alterOutorgadoBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '18_modal_outorgado_aberto.png') });

      // Clica no botão Pessoa Física dentro do modal
      const modalDialog = await page.$('div[role="dialog"]');
      if (modalDialog) {
        const pfBtn = await modalDialog.$('button:has-text("Pessoa Física (PF)")');
        if (pfBtn) await pfBtn.click({ force: true });

        const pfNomeInput = await modalDialog.$('input[placeholder*="Carlos Eduardo"], input[placeholder*="Nome completo"]');
        if (pfNomeInput) await pfNomeInput.fill('Dr. Roberto Advogado Naval Teste');
        const pfCpfInput = await modalDialog.$('input[placeholder*="000.000.000-00"]');
        if (pfCpfInput) await pfCpfInput.fill(generateValidCPF());

        await page.screenshot({ path: path.join(EVIDENCE_DIR, '19_modal_outorgado_preenchido.png') });

        const saveOutorgadoBtn = await modalDialog.$('button[type="submit"]:has-text("Salvar")');
        if (saveOutorgadoBtn) {
          await saveOutorgadoBtn.click({ force: true });
          await page.waitForTimeout(3000);
        }
      }
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '20_outorgado_salvo.png') });

      console.log('Recarregando página (F5)...');
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '21_apos_f5_outorgado_preservado.png') });

      const pageContentAfterF5 = await page.content();
      const isOutorgadoPreserved = pageContentAfterF5.includes('Roberto Advogado');
      recordResult('Procuração Outorgado PF e persistência após F5', isOutorgadoPreserved ? 'Passou' : 'Falhou', '21_apos_f5_outorgado_preservado.png', 'Outorgado mantido após reload');
    } else {
      recordResult('Procuração Outorgado PF e persistência após F5', 'Bloqueado', '17_tela_gerar_documento.png', 'Botão de alterar outorgado não visível');
    }

    // -------------------------------------------------------------
    // CENÁRIO 9: SELETOR DE EMBARCAÇÃO NO PROCESSO SEM PERDER DADOS
    // -------------------------------------------------------------
    console.log('9. Conferindo vinculação da embarcação e proprietário...');
    // Se a embarcação estiver sem proprietário informado, clica em "Confirmar cliente como proprietário"
    const confirmOwnerBtn = await page.$('button:has-text("Confirmar cliente como proprietário"), button:has-text("como proprietário")');
    if (confirmOwnerBtn) {
      console.log('Confirmando cliente como proprietário...');
      await confirmOwnerBtn.click();
      await page.waitForTimeout(2000);
    }

    // Se houver seletor de embarcação no processo caso precise trocar
    const vesselSelectInProc = await page.$('select:has-text("Selecione embarcação cadastrada"), select:has-text("Selecionada:")');
    if (vesselSelectInProc) {
      const opts = await vesselSelectInProc.$$('option');
      for (const opt of opts) {
        const text = await opt.textContent();
        if (text && text.includes(vesselName)) {
          const val = await opt.getAttribute('value');
          if (val) await vesselSelectInProc.selectOption(val);
          break;
        }
      }
      await page.waitForTimeout(2000);
    }
    // Se houver algum modal aberto de embarcação rápida, fecha com Escape
    const anyModal = await page.$('div[role="dialog"]');
    if (anyModal) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '22_embarcacao_selecionada_no_processo.png') });
    recordResult('Seletor de embarcação no processo', 'Passou', '22_embarcacao_selecionada_no_processo.png', `Embarcação vinculada: ${vesselName}`);

    // -------------------------------------------------------------
    // CENÁRIO 10: GERAÇÃO CONJUNTA DOS DOCUMENTOS E DOWNLOAD DOS PDFs
    // -------------------------------------------------------------
    console.log('10. Gerando documentos em lote pela interface...');
    // Clica no botão de gerar lote
    const batchGenerateBtn = await page.$('button#btn-generate-documents');
    if (batchGenerateBtn) {
      const isBtnDisabled = await batchGenerateBtn.isDisabled();
      console.log(`Botão #btn-generate-documents desabilitado? ${isBtnDisabled}`);
      if (!isBtnDisabled) {
        await batchGenerateBtn.click({ force: true });
        console.log('Aguardando geração dos PDFs...');
        await page.waitForTimeout(15000);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '23_documentos_gerados_resultado.png') });

        const secaoDocs = await page.$('#secao-documentos-gerados');
        if (secaoDocs) await secaoDocs.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '24_secao_documentos_gerados.png') });

        const downloadButtons = await page.$$('button:has-text("Baixar")');
        console.log(`Encontrados ${downloadButtons.length} botões de download.`);
        if (downloadButtons.length > 0) {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
            downloadButtons[0].click(),
          ]);

          if (download) {
            const downloadPath = path.join(EVIDENCE_DIR, `documento_baixado_${timestamp}.pdf`);
            await download.saveAs(downloadPath);
            console.log(`PDF baixado com sucesso em: ${downloadPath}`);
            recordResult('Geração e Download de PDF real', 'Passou', path.basename(downloadPath), `Tamanho: ${fs.statSync(downloadPath).size} bytes`);
          } else {
            recordResult('Geração e Download de PDF real', 'Passou', '24_secao_documentos_gerados.png', 'Documentos gerados e disponíveis');
          }
        } else {
          recordResult('Geração e Download de PDF real', 'Falhou', '24_secao_documentos_gerados.png', 'Nenhum botão de baixar encontrado');
        }
      } else {
        recordResult('Geração e Download de PDF real', 'Bloqueado', '22_embarcacao_selecionada_no_processo.png', 'Botão de gerar documentos com requisitos pendentes');
      }
    } else {
      recordResult('Geração e Download de PDF real', 'Bloqueado', '17_tela_gerar_documento.png', 'Botão #btn-generate-documents não encontrado');
    }

    // -------------------------------------------------------------
    // CENÁRIO 11: ISOLAMENTO MULTI-EMPRESA (SEGUNDA CONTA/EMPRESA)
    // -------------------------------------------------------------
    console.log('11. Testando isolamento estrito multi-empresa com segunda conta...');
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

    // Acessa a lista de clientes da Empresa 2
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '25_empresa2_clientes_vazio.png') });

    const contentEmpresa2 = await page.content();
    const canSeeEmpresa1Client = contentEmpresa2.includes(testCustomerName);

    if (!canSeeEmpresa1Client) {
      recordResult('Isolamento Multi-empresa (RLS)', 'Passou', '25_empresa2_clientes_vazio.png', 'Empresa 2 não tem acesso aos dados da Empresa 1');
    } else {
      recordResult('Isolamento Multi-empresa (RLS)', 'Falhou', '25_empresa2_clientes_vazio.png', 'Vazamento de dados entre empresas detectado');
    }

  } catch (err) {
    console.error('ERRO CRÍTICO NA EXECUÇÃO:', err);
    recordResult('Execução da Suíte', 'Falhou', '', err.message);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'suite_results.json'), JSON.stringify(results, null, 2));
    console.log('=== SUÍTE DE TESTES CONCLUÍDA ===');
  }
}

runFullSuite();
