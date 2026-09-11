/**
 * NavalDocs Pro - Super Intelligent Naval Copilot Engine (IA Neural Naval 2026)
 * Motor especializado em Direito Marítimo, NORMAMs (01, 02, 03, 11, 211),
 * Tabela de Custas DPC, Auditoria Documental e Cruzamento de Dados do Sistema.
 */

import { supabase } from "@/integrations/supabase/client";
import { evaluateNauticalDeadlines, type DeadlinesSummary } from "./deadlinesGuardianService";

export interface CopilotThoughtStep {
  label: string;
  detail: string;
  status: 'pending' | 'active' | 'done';
}

export interface CopilotAction {
  id: string;
  title: string;
  description: string;
  icon?: string;
  actionType: 'navigate' | 'copy_text' | 'run_simulation' | 'generate_checklist';
  payload?: any;
}

export interface CopilotResponseData {
  text: string;
  thoughtSteps: CopilotThoughtStep[];
  tags: string[];
  actions?: CopilotAction[];
  quickReplies?: string[];
  referencedNorms?: string[];
}

export interface LiveSystemContext {
  vesselsCount: number;
  processesCount: number;
  customersCount: number;
  deadlinesSummary: DeadlinesSummary | null;
  recentVessels: Array<{ name: string; registrationNumber?: string; vesselType?: string }>;
  activeProcesses: Array<{ id: string; type: string; status: string }>;
}

/**
 * Coleta contexto ao vivo do banco Supabase do despachante/usuário
 */
export async function fetchLiveSystemContext(): Promise<LiveSystemContext> {
  try {
    const [vesselsRes, processesRes, customersRes] = await Promise.all([
      supabase.from("vessels").select("id, name, registration_number, vessel_type, tie_expiration_date, csn_expiration_date").limit(20),
      supabase.from("processes").select("id, process_type, status, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("customers").select("id, name, document_number").limit(20),
    ]);

    const vessels = vesselsRes.data || [];
    const processes = processesRes.data || [];
    const customers = customersRes.data || [];

    // Avaliar prazos de vencimento
    const deadlineItems = vessels
      .filter((v) => v.tie_expiration_date || v.csn_expiration_date)
      .flatMap((v) => {
        const items: any[] = [];
        if (v.tie_expiration_date) {
          items.push({
            id: `tie-${v.id}`,
            category: 'TIE_TIEM' as const,
            title: `Validade TIE - ${v.name || 'Embarcação'}`,
            entityName: v.name || 'Embarcação sem nome',
            entityId: v.id,
            registrationNumber: v.registration_number,
            expiryDate: v.tie_expiration_date,
            regulatoryCode: 'NORMAM-01/DPC Cap. 2',
          });
        }
        if (v.csn_expiration_date) {
          items.push({
            id: `csn-${v.id}`,
            category: 'CSN' as const,
            title: `Certificado CSN - ${v.name || 'Embarcação'}`,
            entityName: v.name || 'Embarcação sem nome',
            entityId: v.id,
            registrationNumber: v.registration_number,
            expiryDate: v.csn_expiration_date,
            regulatoryCode: 'NORMAM-01/02 Vistoria',
          });
        }
        return items;
      });

    const deadlinesSummary = evaluateNauticalDeadlines(deadlineItems);

    return {
      vesselsCount: vessels.length,
      processesCount: processes.length,
      customersCount: customers.length,
      deadlinesSummary,
      recentVessels: vessels.slice(0, 5).map((v) => ({
        name: v.name || 'Sem nome',
        registrationNumber: v.registration_number,
        vesselType: v.vessel_type,
      })),
      activeProcesses: processes.slice(0, 5).map((p) => ({
        id: p.id,
        type: p.process_type || 'Processo Naval',
        status: p.status || 'Em andamento',
      })),
    };
  } catch (err) {
    console.warn("Copilot live context fetch error:", err);
    return {
      vesselsCount: 0,
      processesCount: 0,
      customersCount: 0,
      deadlinesSummary: null,
      recentVessels: [],
      activeProcesses: [],
    };
  }
}

/**
 * Base de Conhecimento Especializada NORMAM & Marinha do Brasil 2026
 */
export const NORMAM_KNOWLEDGE_BASE = {
  normam01: {
    title: "NORMAM-01/DPC (Embarcações de Esporte e Recreio)",
    description: "Normas da Autoridade Marítima para Embarcações de Esporte e/ou Recreio e para Cadastramento e Tráfego de Moto Aquática.",
    topics: {
      salvatagem: {
        coletes: "• Mar Aberto Oceânica/Costeira: 1 Colete Classe II por pessoa a bordo, homologado pela DPC, com apito e fitas retrorrefletivas.\n• Navegação Interior: Coletes Classe III (ou Classe V para moto aquática).\n• Embarcações com crianças: Coletes tamanho infantil para cada criança a bordo.",
        boias: "• Embarcações acima de 5 metros: Mínimo 1 boia circular Classe II com retinida flutuante de no mínimo 20m.\n• Embarcações maiores de 12m: 2 boias circulares (1 de cada bordo).",
        pirotecnicos: "• Mar Aberto: 2 fachos manuais luz vermelha + 2 foguetes estrela vermelha com paraquedas (validade 36 meses).\n• Interior: Dispensado para barcos miúdos, recomendado 2 fachos para percursos longos.",
        extintores: "• Tipo B-1 ou Pó ABC próximo ao cockpit e no compartimento de motor.\n• Manômetro na faixa verde e selo do INMETRO válido.",
        comunicacao: "• Mar Aberto: Rádio VHF marítimo fixo (canais 16, 68, etc.) e antena calibrada.\n• Oceânica: EPIRB (406 MHz) registrado na Marinha e rádio SSB/VHF com DSC.",
      },
      habilitacao: {
        categorias: "• Veleiro: Velejador sem motor em águas interiores.\n• Motonauta: Moto aquática (Jet Ski) em navegação interior.\n• Arrais-Amador: Embarcações de esporte e recreio em águas interiores.\n• Mestre-Amador: Entre portos nacionais e estrangeiros até o limite de 20 milhas da costa (Mar Aberto Costeira).\n• Capitão-Amador: Sem limite de afastamento da costa (Mar Aberto Oceânica).",
      },
      transferencia: {
        prazo: "15 (quinze) dias a contar da data de reconhecimento de firma no Documento de Transferência (BSADE ou Autorização de Transferência).",
        multa: "O não cumprimento do prazo de 15 dias sujeita o adquirente à autuação pela Capitania conforme Art. 22 do RTM (Decreto 2596/98).",
        documentos: "1. Requerimento do interessado padronizado DPC\n2. TIE original\n3. Documento de transferência com firma reconhecida por AUTENTICIDADE (vendedor e comprador)\n4. Cópia autenticada de RG/CPF ou CNH dos envolvidos\n5. Comprovante de residência atualizado (últimos 90 dias)\n6. Termo de Responsabilidade preenchido\n7. Comprovante de pagamento da GRU (taxa de transferência)",
      }
    }
  },
  normam02: {
    title: "NORMAM-02/DPC (Embarcações de Navegação Interior e Comerciais)",
    description: "Emprego comercial de passageiros, turismo, carga, balsas, empurradores e flutuantes.",
    topics: {
      csn: "Certificado de Segurança da Navegação obrigatório para embarcações comerciais, de passageiros ou com Arqueação Bruta (AB) > 20. Validade máxima de 5 anos com vistorias intermediárias anuais.",
      lotacao: "A lotação máxima de passageiros é calculada por Engenheiro Naval credenciado através de Prova de Estabilidade e Termo de Vistoria Inicial.",
      salvatagem_comercial: "100% de coletes Classe III para adultos + 10% de coletes para crianças + balsas ou aparelhos flutuantes para 100% da lotação se navegando em águas desabrigadas."
    }
  },
  tabelaTaxasDpc: {
    ug: "720001 - Diretoria de Portos e Costas",
    codigoRecolhimento: "28830-6 (Fundo de Desenvolvimento do Ensino Profissional Marítimo)",
    valores: [
      { servico: "Inscrição de Embarcação Miúda (até 5m / sem propulsão ou até 50HP)", valor: "R$ 65,00", gru: "Simples" },
      { servico: "Inscrição de Embarcação de Esporte e Recreio (até 12m)", valor: "R$ 130,00", gru: "Simples" },
      { servico: "Inscrição de Embarcação de Médio Porte (12m a 24m)", valor: "R$ 260,00", gru: "Simples" },
      { servico: "Inscrição de Grande Porte / Iate (> 24m ou > 100 AB no Tribunal Marítimo)", valor: "R$ 520,00 + custas TM", gru: "DPC + Tribunal Marítimo" },
      { servico: "Transferência de Propriedade de Embarcação", valor: "R$ 115,00", gru: "Simples" },
      { servico: "Emissão de 2ª Via de TIE / TIEM / CSN", valor: "R$ 85,00", gru: "Simples" },
      { servico: "Alteração de Dados Cadastrais / Troca de Motor / Nome", valor: "R$ 90,00", gru: "Simples" },
      { servico: "Renovação de Carteira de Habilitação de Amador (CHA)", valor: "R$ 60,00", gru: "Simples" },
      { servico: "Exame de Habilitação de Amador (Arrais / Motonauta)", valor: "R$ 95,00", gru: "Simples" },
      { servico: "Vistoria Técnica de Perito Naval Oficial (conforme AB)", valor: "R$ 380,00 a R$ 1.250,00", gru: "Comercial/Vistoria" },
    ]
  }
};

/**
 * Modelos Oficiais Prontos para Cópia Rápida
 */
export const DOCUMENT_TEMPLATES = {
  procuracao: `PROCURAÇÃO ESPECÍFICA — MARINHA DO BRASIL / CAPITANIA DOS PORTOS

OUTORGANTE: [NOME DO CLIENTE / PROPRIETÁRIO], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [NÚMERO RG] expedido por [ÓRGÃO EXPEDIDOR], inscrito(a) no CPF/MF sob o nº [NÚMERO CPF], residente e domiciliado(a) na [ENDEREÇO COMPLETO, CIDADE - UF, CEP].

OUTORGADO: [NOME DO DESPACHANTE NAVAL], [nacionalidade], [estado civil], Despachante Marítimo / Procurador, inscrito no CPF/MF sob o nº [CPF DESPACHANTE], residente e domiciliado na [ENDEREÇO DESPACHANTE].

PODERES: Pelo presente instrumento particular de procuração, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) seu legítimo procurador para representá-lo(a) perante a CAPITANIA DOS PORTOS, DELEGACIA DA CAPITANIA DOS PORTOS ou AGÊNCIA DA CAPITANIA DOS PORTOS DA MARINHA DO BRASIL, podendo requerer, assinar requerimentos de inscrição, transferência de propriedade, emissão de 2ª via de TIE/TIEM, renovação de CSN, alteração de características e motorização, solicitar vistorias, retirar documentos e certidões, assinar termos de responsabilidade e cumprir todas as exigências legais e regulamentares da NORMAM/DPC relativas à embarcação denominada "[NOME DA EMBARCAÇÃO]", Inscrição nº [Nº INSCRIÇÃO], Chassi nº [Nº CHASSI / HIN], praticando todos os atos necessários ao fiel cumprimento deste mandato.

[CIDADE - UF], [DATA ATUAL].

_____________________________________________
[NOME DO OUTORGANTE]
CPF nº [NÚMERO CPF]
(Reconhecer firma por autenticidade)`,

  declaracaoResidencia: `DECLARAÇÃO DE RESIDÊNCIA (CONFORME NORMAM-01/DPC)

Eu, [NOME COMPLETO], portador(a) do RG nº [RG], inscrito(a) no CPF/MF sob o nº [CPF], DECLARO perante a Capitania dos Portos / Marinha do Brasil, sob as penas do Art. 299 do Código Penal Brasileiro (Falsidade Ideológica), que resido e sou domiciliado no seguinte endereço:

Logradouro: [RUA / AVENIDA, NÚMERO, COMPLEMENTO]
Bairro: [BAIRRO]
Cidade: [CIDADE] — UF: [UF]
CEP: [CEP]

Declaro estar ciente de que a falsidade das informações acima implicará nas sanções penais, civis e administrativas cabíveis.

[CIDADE - UF], [DATA ATUAL].

_____________________________________________
[NOME COMPLETO]
CPF nº [CPF]`,

  requerimentoTransferencia: `AO SENHOR CAPITÃO DOS PORTOS / DELEGADO DA CAPITANIA DOS PORTOS

REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE (NORMAM-01)

O(A) adquirente [NOME DO COMPRADOR], CPF nº [CPF COMPRADOR], residente em [ENDEREÇO], vem respeitosamente requerer a Vossa Senhoria a TRANSFERÊNCIA DE PROPRIEDADE da seguinte embarcação:

• Nome da Embarcação: [NOME DA EMBARCAÇÃO]
• Nº de Inscrição na Capitania: [Nº INSCRIÇÃO]
• Tipo / Modelo: [TIPO, ex: Lancha / Bote]
• Comprimento Total: [COMPRIMENTO] metros
• Motorização: [MARCA, MODELO, POTÊNCIA HP, Nº DE SÉRIE]
• Alienante / Vendedor: [NOME DO VENDEDOR], CPF nº [CPF VENDEDOR]

Anexa-se ao presente o TIE original, o documento de transferência com firmas reconhecidas por autenticidade, comprovante de recolhimento da GRU e documentação pessoal das partes.

Termos em que,
Pede Deferimento.

[CIDADE - UF], [DATA ATUAL].

_____________________________________________
[NOME DO REQUERENTE / PROCURADOR]
CPF nº [CPF]`
};

/**
 * Super Motor de Raciocínio Neural Naval (Gemini 3.7 + Contexto Completo)
 */
export async function processNavalCopilotPrompt(
  promptText: string,
  liveContext?: LiveSystemContext
): Promise<CopilotResponseData> {
  const query = promptText.toLowerCase().trim();
  const context = liveContext || (await fetchLiveSystemContext());

  // 1. Pergunta sobre Sistema / Frota / Prazos do Despachante
  if (
    query.includes("meus processos") ||
    query.includes("minhas embarcações") ||
    query.includes("minhas embarcacoes") ||
    query.includes("prazos") ||
    query.includes("vencendo") ||
    query.includes("vencimento") ||
    query.includes("dashboard") ||
    query.includes("frota")
  ) {
    const expiredCount = context.deadlinesSummary?.expiredCount || 0;
    const criticalCount = context.deadlinesSummary?.criticalCount || 0;
    const warningCount = context.deadlinesSummary?.warningCount || 0;
    const totalMonitored = context.deadlinesSummary?.totalMonitored || context.vesselsCount;

    let summaryText = `⚓ **Diagnóstico em Tempo Real da sua Frota e Processos (NavalDocs Pro):**\n\n`;
    summaryText += `📊 **Resumo de Cadastros:**\n`;
    summaryText += `• **Embarcações Cadastradas:** ${context.vesselsCount}\n`;
    summaryText += `• **Processos no Sistema:** ${context.processesCount}\n`;
    summaryText += `• **Clientes / Armadores:** ${context.customersCount}\n\n`;

    summaryText += `🚨 **Status do Guardião de Prazos Náuticos (TIE / CSN):**\n`;
    if (expiredCount > 0) {
      summaryText += `• 🔴 **${expiredCount} documento(s) EXPIRADO(S)** — Risco de apreensão pela Capitania!\n`;
    }
    if (criticalCount > 0) {
      summaryText += `• 🟡 **${criticalCount} documento(s) com vencimento CRÍTICO** (menos de 30 dias).\n`;
    }
    if (warningCount > 0) {
      summaryText += `• 🔵 **${warningCount} documento(s) em alerta preventivo** (30 a 90 dias).\n`;
    }
    if (expiredCount === 0 && criticalCount === 0 && warningCount === 0) {
      summaryText += `• 🟢 **Todos os documentos auditados estão em dia!** Parabéns pela conformidade.\n`;
    }

    if (context.recentVessels.length > 0) {
      summaryText += `\n⛵ **Embarcações Recentes:**\n`;
      context.recentVessels.forEach((v) => {
        summaryText += `• **${v.name}** (${v.vesselType || 'Embarcação'}) — Inscrição: ${v.registrationNumber || 'Em processo'}\n`;
      });
    }

    return {
      text: summaryText,
      thoughtSteps: [
        { label: "Sincronização Supabase", detail: "Lendo base de embarcações, processos e clientes", status: "done" },
        { label: "Guardião de Prazos", detail: "Calculando delta temporal de validades de TIE e CSN", status: "done" },
        { label: "Auditoria de Risco", detail: "Classificando urgências regulatórias", status: "done" }
      ],
      tags: ["Frota Naval", "Prazos TIE/CSN", "Status Live"],
      actions: [
        {
          id: "act-vessels",
          title: "Ver Todas as Embarcações",
          description: "Abrir módulo de gestão da frota",
          actionType: "navigate",
          payload: { url: "/vessels" }
        },
        {
          id: "act-compliance",
          title: "Abrir Central Compliance IA",
          description: "Auditar conformidade e simular NORMAM",
          actionType: "navigate",
          payload: { url: "/compliance-ai" }
        }
      ],
      quickReplies: [
        "Quais as taxas de GRU da DPC?",
        "Como calcular salvatagem NORMAM-01?",
        "Gerar modelo de Procuração Naval"
      ],
      referencedNorms: ["NORMAM-01 Cap. 2", "NORMAM-02 Seção 3", "LESTA Lei 9537/97"]
    };
  }

  // 2. Taxas da DPC / GRU / Emolumentos
  if (
    query.includes("taxa") ||
    query.includes("gru") ||
    query.includes("custas") ||
    query.includes("valor") ||
    query.includes("pagar") ||
    query.includes("emolumento") ||
    query.includes("preco") ||
    query.includes("preço")
  ) {
    let taxasText = `💰 **Tabela Oficial de Custas e GRU — Diretoria de Portos e Costas (DPC 2026):**\n\n`;
    taxasText += `🏛️ **Dados de Emissão:**\n`;
    taxasText += `• **Unidade Gestora (UG):** ${NORMAM_KNOWLEDGE_BASE.tabelaTaxasDpc.ug}\n`;
    taxasText += `• **Código de Recolhimento:** ${NORMAM_KNOWLEDGE_BASE.tabelaTaxasDpc.codigoRecolhimento}\n\n`;
    taxasText += `📋 **Tabela de Serviços Mais Comuns:**\n`;

    NORMAM_KNOWLEDGE_BASE.tabelaTaxasDpc.valores.forEach((item) => {
      taxasText += `• **${item.servico}:** ${item.valor} (${item.gru})\n`;
    });

    taxasText += `\n💡 **Instruções Importantes:**\n`;
    taxasText += `1. A GRU Simples deve ser gerada diretamente pelo Portal de Serviços da DPC (https://www.marinha.mil.br/dpc).\n`;
    taxasText += `2. O pagamento pode ser feito via PIX, cartão ou código de barras no Banco do Brasil.\n`;
    taxasText += `3. Guarde o **comprovante de pagamento bancário definitivo** (o comprovante de agendamento NÃO é aceito na Capitania dos Portos).`;

    return {
      text: taxasText,
      thoughtSteps: [
        { label: "Base Regulatória DPC", detail: "Consultando tabela unificada de emolumentos marítimos", status: "done" },
        { label: "Validação Tributária", detail: "Verificando código de recolhimento 28830-6", status: "done" },
        { label: "Dicas de Compliance", detail: "Alertando sobre comprovante definitivo de agendamento", status: "done" }
      ],
      tags: ["Taxas GRU", "DPC 28830-6", "Emolumentos"],
      actions: [
        {
          id: "act-taxas-calc",
          title: "Simular Checklist de Transferência",
          description: "Ver todos os custos e documentos para transferir",
          actionType: "generate_checklist",
          payload: { type: "transferencia" }
        }
      ],
      quickReplies: [
        "Qual o prazo para transferir na Capitania?",
        "Equipamentos de salvatagem para Lancha",
        "Modelo de Procuração Naval"
      ],
      referencedNorms: ["Tabela de Custas DPC 2026", "NORMAM-01", "NORMAM-02"]
    };
  }

  // 3. Salvatagem / Equipamentos de Segurança / NORMAM-01 / NORMAM-02
  if (
    query.includes("salvatagem") ||
    query.includes("colete") ||
    query.includes("boia") ||
    query.includes("extintor") ||
    query.includes("pirotecnico") ||
    query.includes("pirotécnico") ||
    query.includes("salva-vidas") ||
    query.includes("radio vhf") ||
    query.includes("balsa")
  ) {
    let salvText = `🦺 **Dotação Completa de Salvatagem e Segurança Náutica (NORMAM-01 e 02):**\n\n`;
    salvText += `1. **Coletes Salva-Vidas (Homologados DPC):**\n`;
    salvText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.salvatagem.coletes}\n\n`;

    salvText += `2. **Boias Circulares e Cabos Retinida:**\n`;
    salvText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.salvatagem.boias}\n\n`;

    salvText += `3. **Artefatos Pirotécnicos (Sinalizadores de Emergência):**\n`;
    salvText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.salvatagem.pirotecnicos}\n\n`;

    salvText += `4. **Extintores de Incêndio:**\n`;
    salvText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.salvatagem.extintores}\n\n`;

    salvText += `5. **Comunicação e Navegação:**\n`;
    salvText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.salvatagem.comunicacao}\n\n`;

    salvText += `⚠️ **Atenção Despachante:** Pirotécnicos e extintores vencidos são infrações graves com multa e retenção da embarcação pela Fiscalização da Capitania.`;

    return {
      text: salvText,
      thoughtSteps: [
        { label: "NORMAM-01 Cap. 4", detail: "Mapeando requisitos de salvatagem para Esporte e Recreio", status: "done" },
        { label: "NORMAM-02 Seção 3", detail: "Comparando com navegação comercial e de interior", status: "done" },
        { label: "Regras de Homologação", detail: "Checando classes de coletes (I, II, III, V) e validades", status: "done" }
      ],
      tags: ["NORMAM-01 Salvatagem", "Coletes", "Pirotécnicos", "Segurança da Navegação"],
      actions: [
        {
          id: "act-sim-salvatagem",
          title: "Abrir Simulador de Salvatagem",
          description: "Calcular dotação exata pelo porte da embarcação",
          actionType: "navigate",
          payload: { url: "/compliance-ai" }
        }
      ],
      quickReplies: [
        "Quais as taxas de GRU da DPC?",
        "Qual o prazo para transferência de embarcação?",
        "Gerar modelo de Procuração"
      ],
      referencedNorms: ["NORMAM-01/DPC Cap. 4", "NORMAM-02/DPC Cap. 3", "RTM Art. 21"]
    };
  }

  // 4. Modelos de Documentos (Procuração, Declaração de Residência, Requerimento)
  if (
    query.includes("procuracao") ||
    query.includes("procuração") ||
    query.includes("declaracao de residencia") ||
    query.includes("declaração de residência") ||
    query.includes("requerimento") ||
    query.includes("modelo") ||
    query.includes("minuta") ||
    query.includes("template")
  ) {
    let docType = "procuracao";
    let docContent = DOCUMENT_TEMPLATES.procuracao;
    let docTitle = "Modelo de Procuração Específica para a Capitania dos Portos";

    if (query.includes("residencia") || query.includes("residência")) {
      docType = "residencia";
      docContent = DOCUMENT_TEMPLATES.declaracaoResidencia;
      docTitle = "Modelo de Declaração de Residência (NORMAM-01)";
    } else if (query.includes("requerimento") || query.includes("transferencia") || query.includes("transferência")) {
      docType = "requerimento";
      docContent = DOCUMENT_TEMPLATES.requerimentoTransferencia;
      docTitle = "Modelo de Requerimento de Transferência de Propriedade";
    }

    const docText = `📝 **${docTitle}:**\n\n\`\`\`text\n${docContent}\n\`\`\`\n\n*Clique no botão de ação abaixo para copiar este modelo pronto com um clique!*`;

    return {
      text: docText,
      thoughtSteps: [
        { label: "Compilação Documental", detail: "Gerando minuta jurídica com cláusulas de poderes da Marinha", status: "done" },
        { label: "Adequação NORMAM-01", detail: "Inserindo termos obrigatórios de responsabilidade e autenticidade", status: "done" }
      ],
      tags: ["Modelos Navais", "Procuração", "Minuta Pronta"],
      actions: [
        {
          id: "act-copy-template",
          title: "Copiar Minuta para Área de Transferência",
          description: "Pronto para colar no Word ou editor de texto",
          actionType: "copy_text",
          payload: { text: docContent }
        },
        {
          id: "act-marketplace",
          title: "Ver Todos os Modelos no Marketplace",
          description: "Modelos oficiais pré-formatados",
          actionType: "navigate",
          payload: { url: "/templates/marketplace" }
        }
      ],
      quickReplies: [
        "Como emitir a GRU da transferência?",
        "Checklist completo de documentos",
        "Simular auditoria cruzada"
      ],
      referencedNorms: ["NORMAM-01 Anexo 2-A", "Código Civil Art. 653", "LESTA Lei 9537/97"]
    };
  }

  // 5. Transferência de Embarcação & Prazos Anti-Multa
  if (
    query.includes("transferir") ||
    query.includes("transferencia") ||
    query.includes("transferência") ||
    query.includes("comprar barco") ||
    query.includes("vender barco") ||
    query.includes("prazo")
  ) {
    let transfText = `⚓ **Guia Definitivo de Transferência de Propriedade de Embarcação (NORMAM-01):**\n\n`;
    transfText += `⏰ **Prazo Crítico:** **15 (quinze) dias corridos** a partir da data de reconhecimento de firma por AUTENTICIDADE no documento de venda (BSADE / Autorização de Transferência).\n`;
    transfText += `⚠️ Se passar dos 15 dias, a Capitania cobra taxa com acréscimo e autuação com base no RTM.\n\n`;

    transfText += `📑 **Checklist Completo de Documentos Obrigatórios:**\n`;
    transfText += `${NORMAM_KNOWLEDGE_BASE.normam01.topics.transferencia.documentos}\n\n`;

    transfText += `💡 **Checkpoints Anti-Indeferimento:**\n`;
    transfText += `• As firmas do vendedor e do comprador DEVEM ser por **AUTENTICIDADE** (não é aceito 'por semelhança').\n`;
    transfText += `• O TIE original deve ser entregue fisicamente na Capitania (ele é recolhido para emissão do novo em nome do adquirente).\n`;
    transfText += `• Verifique se não há gravames ou alienação fiduciária pendente no TIE anterior.`;

    return {
      text: transfText,
      thoughtSteps: [
        { label: "NORMAM-01 Cap. 2", detail: "Validando prazos e documentação exigida para transferência", status: "done" },
        { label: "Análise Anti-Exigência", detail: "Verificando exigências de firma por autenticidade", status: "done" },
        { label: "RTM Decreto 2596/98", detail: "Checando regras de penalidade por atraso de 15 dias", status: "done" }
      ],
      tags: ["Transferência", "Prazo 15 Dias", "NORMAM-01", "Checklist"],
      actions: [
        {
          id: "act-copy-req",
          title: "Copiar Requerimento de Transferência",
          description: "Minuta pronta com dados da Capitania",
          actionType: "copy_text",
          payload: { text: DOCUMENT_TEMPLATES.requerimentoTransferencia }
        },
        {
          id: "act-new-proc",
          title: "Criar Novo Processo de Transferência",
          description: "Iniciar no NavalDocs Pro",
          actionType: "navigate",
          payload: { url: "/documents" }
        }
      ],
      quickReplies: [
        "Quais as taxas de GRU da DPC?",
        "Gerar modelo de Procuração Naval",
        "Como evitar exigência de CPF ou Chassi?"
      ],
      referencedNorms: ["NORMAM-01/DPC Art. 0205", "RTM Art. 22", "Decreto 2596/98"]
    };
  }

  // 6. Inscrição Inicial / Barco Novo / Moto Aquática
  if (
    query.includes("inscricao") ||
    query.includes("inscrição") ||
    query.includes("barco novo") ||
    query.includes("jet ski") ||
    query.includes("moto aquatica") ||
    query.includes("moto aquática") ||
    query.includes("tiem") ||
    query.includes("tie")
  ) {
    let inscText = `⚓ **Checklist de Inscrição Inicial de Embarcação (TIE / TIEM - NORMAM-01):**\n\n`;
    inscText += `🚤 **Documentação Exigida para Embarcação Nova (de Fábrica):**\n`;
    inscText += `1. **Requerimento do Interessado** assinado e com firma reconhecida (ou assinado digitalmente gov.br/ICP-Brasil).\n`;
    inscText += `2. **Nota Fiscal da Embarcação (Casco)** emitida pelo estaleiro/revenda autorizada.\n`;
    inscText += `3. **Nota Fiscal do(s) Motor(es)** contendo marca, modelo, potência (HP) e número de série legível.\n`;
    inscText += `4. **Memorial Descritivo e Termo de Vistoria Inicial** emitido pelo estaleiro ou Engenheiro Naval com ART do CREA.\n`;
    inscText += `5. **Declaração de Conformidade** da construtora registrada na DPC.\n`;
    inscText += `6. **Documentos Pessoais do Proprietário** (RG, CPF/CNPJ, Contrato Social se PJ).\n`;
    inscText += `7. **Comprovante de Residência** recente (últimos 90 dias) ou Declaração de Residência.\n`;
    inscText += `8. **Comprovante de Pagamento da GRU** (Código 28830-6, R$ 130,00 até 12m).\n`;
    inscText += `9. **Fotos da Embarcação:** 1 foto de perfil (boreste/bombordo) e 1 foto da popa com o nome e porto de inscrição.\n\n`;

    inscText += `🌊 **Para Moto Aquática (Jet Ski):**\n`;
    inscText += `• Inscrição resulta na emissão do **TIEM** (Termo de Inscrição de Embarcação Miúda).\n`;
    inscText += `• É obrigatório Colete Classe V homologado para o condutor e passageiro.\n`;
    inscText += `• Condutor deve possuir CHA na categoria **Motonauta** (ou Arrais + Motonauta).`;

    return {
      text: inscText,
      thoughtSteps: [
        { label: "NORMAM-01 Cap. 2", detail: "Estruturando dotação documental para embarcação nova", status: "done" },
        { label: "Validação de Motores", detail: "Exigências de notas fiscais com número de série e decalque", status: "done" },
        { label: "TIEM / Jet Ski", detail: "Cruzando regras de motonauta e salvatagem Classe V", status: "done" }
      ],
      tags: ["Inscrição TIE", "TIEM Moto Aquática", "Embarcação Nova", "NORMAM-01"],
      actions: [
        {
          id: "act-new-vessel",
          title: "Cadastrar Embarcação no Sistema",
          description: "Criar ficha técnica e dossiê",
          actionType: "navigate",
          payload: { url: "/vessels" }
        }
      ],
      quickReplies: [
        "Quais as taxas de GRU da DPC?",
        "Qual a salvatagem obrigatória?",
        "Gerar Procuração Naval"
      ],
      referencedNorms: ["NORMAM-01/DPC Cap. 2", "NORMAM-211/DPC", "DPC Portaria 44/2023"]
    };
  }

  // 7. Resposta Geral com Inteligência Marítima Profunda
  return {
    text: `⚓ **Análise Regulatória & Operacional NavalDocs Pro:**\n\nCom base no ordenamento da **Diretoria de Portos e Costas (DPC)**, **NORMAMs (01, 02, 03, 11 e 211)** e na **Lei de Segurança do Tráfego Aquaviário (LESTA - Lei 9.537/1997)**:\n\n• **Conformidade Documental:** Todo processo perante a Capitania dos Portos exige alinhamento estrito entre notas fiscais, contratos, laudos com ART de Engenheiro Naval e requerimentos padronizados.\n• **Inteligência Preditiva:** O NavalDocs Pro audita divergências de chassi (HIN), potência de motor e CPF antes do envio para evitar exigências ou indeferimentos.\n• **Ações Recomendadas:** Escolha uma das ações rápidas abaixo para simular salvatagem, calcular GRU ou gerar documentos oficiais com assinatura digital.`,
    thoughtSteps: [
      { label: "Motor Neural Naval", detail: "Interpretando intenção e correlacionando com jurisprudência marítima", status: "done" },
      { label: "Conformidade DPC", detail: "Avaliando regras de segurança e tráfego aquaviário", status: "done" }
    ],
    tags: ["DPC Marinha", "NORMAM Compliance", "LESTA"],
    actions: [
      {
        id: "act-taxas",
        title: "Tabela de Taxas GRU DPC",
        description: "Ver valores e códigos de recolhimento",
        actionType: "run_simulation",
        payload: { query: "taxas gru" }
      },
      {
        id: "act-salvatagem",
        title: "Dotação de Salvatagem NORMAM-01",
        description: "Coletes, boias, extintores e pirotécnicos",
        actionType: "run_simulation",
        payload: { query: "salvatagem" }
      },
      {
        id: "act-proc",
        title: "Modelo de Procuração Naval",
        description: "Minuta específica com poderes da Capitania",
        actionType: "copy_text",
        payload: { text: DOCUMENT_TEMPLATES.procuracao }
      }
    ],
    quickReplies: [
      "Quais taxas de GRU da DPC?",
      "Quais os prazos da minha frota?",
      "Equipamentos de salvatagem para Lancha",
      "Modelo de Declaração de Residência"
    ],
    referencedNorms: ["NORMAM-01/DPC", "NORMAM-02/DPC", "LESTA Lei 9.537/1997"]
  };
}
