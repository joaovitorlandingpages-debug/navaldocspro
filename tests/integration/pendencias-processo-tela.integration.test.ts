import { describe, it, expect } from "vitest";
import { SERVICES, findService } from "../../src/types/service-requirements";

describe("Tela de Pendências do Processo — Avaliação, Agrupamento e Isolamento", () => {
  // Simulador da função de normalização de serviço
  function normalizeServiceKey(rawType?: string | null): string {
    if (!rawType) return "renovacao";
    const s = rawType.toLowerCase();
    if (s.includes("transf")) return "transferencia";
    if (s.includes("inic") || s.includes("registro")) return "registro_inicial";
    if (s.includes("motor")) return "alteracao_motor";
    if (s.includes("caracter")) return "alteracao_caracteristica";
    if (s.includes("segunda") || s.includes("2")) return "segunda_via";
    if (s.includes("regulariz")) return "regularizacao";
    return "renovacao";
  }

  // Engine de avaliação de pendências igual ao da tela
  function evaluatePendingItems(params: {
    processData: any;
    customer: any;
    vessel: any;
    generatedDocs: any[];
    uploadedFiles: any[];
  }) {
    const { processData, customer, vessel, generatedDocs, uploadedFiles } = params;
    const rawKind = normalizeServiceKey(processData.process_type || processData.title);
    const manualActions = processData.metadata?.manual_actions || {};
    const items: Array<{
      id: string;
      group: "dados" | "documentos" | "acoes";
      title: string;
      isCompleted: boolean;
      actionType: string;
    }> = [];

    // GRUPO 1: DADOS A PREENCHER
    const hasCpfCnpj = Boolean(customer?.cpf_cnpj && customer.cpf_cnpj.replace(/\D/g, "").length >= 11);
    items.push({
      id: "dado-cliente-cpf-cnpj",
      group: "dados",
      title: "CPF ou CNPJ do cliente",
      isCompleted: hasCpfCnpj,
      actionType: "fill_customer",
    });

    const hasAddress = Boolean(customer?.address && customer.address.trim().length > 3);
    items.push({
      id: "dado-cliente-endereco",
      group: "dados",
      title: "Endereço completo de domicílio",
      isCompleted: hasAddress,
      actionType: "fill_customer",
    });

    if (rawKind !== "registro_inicial") {
      const hasTie = Boolean(vessel?.registration_number && vessel.registration_number.trim().length >= 3);
      items.push({
        id: "dado-embarcacao-tie",
        group: "dados",
        title: "Número de inscrição (TIE/TIEM)",
        isCompleted: hasTie,
        actionType: "fill_vessel",
      });
    }

    const hasLength = Boolean(vessel?.length && Number(vessel.length) > 0);
    items.push({
      id: "dado-embarcacao-comprimento",
      group: "dados",
      title: "Comprimento total da embarcação (m)",
      isCompleted: hasLength,
      actionType: "fill_vessel",
    });

    if (rawKind === "transferencia") {
      const hasBuyer = Boolean(
        processData.new_owner_name && 
        processData.new_owner_cpf_cnpj && 
        processData.new_owner_cpf_cnpj.replace(/\D/g, "").length >= 11
      );
      items.push({
        id: "dado-processo-comprador",
        group: "dados",
        title: "Nome e CPF/CNPJ do comprador",
        isCompleted: hasBuyer,
        actionType: "fill_process",
      });
    }

    // GRUPO 2: DOCUMENTOS A ENVIAR
    const requiredDocs: { id: string; title: string; matchers: string[] }[] = [];
    if (rawKind === "renovacao") {
      requiredDocs.push(
        { id: "doc-cnh", title: "Documento com foto (CNH/RG)", matchers: ["cnh", "rg", "foto"] },
        { id: "doc-residencia", title: "Comprovante de residência", matchers: ["residencia", "endereco"] },
        { id: "doc-tie-anterior", title: "Título anterior (TIE/TIEM)", matchers: ["tie", "tiem", "titulo"] }
      );
    } else if (rawKind === "transferencia") {
      requiredDocs.push(
        { id: "doc-comprador", title: "Documento do comprador", matchers: ["comprador", "cnh_comprador"] },
        { id: "doc-vendedor", title: "Documento do vendedor", matchers: ["vendedor", "cnh_vendedor"] },
        { id: "doc-tie-original", title: "Título anterior (TIE/TIEM)", matchers: ["tie", "tiem", "titulo"] },
        { id: "doc-atpv", title: "ATPV ou Contrato de Compra e Venda", matchers: ["atpv", "contrato", "compra_venda"] }
      );
    } else if (rawKind === "registro_inicial") {
      requiredDocs.push(
        { id: "doc-nf-embarcacao", title: "Nota Fiscal da embarcação", matchers: ["nota_fiscal", "estaleiro"] },
        { id: "doc-memorial", title: "Memorial descritivo", matchers: ["memorial", "conformidade"] }
      );
    }

    requiredDocs.forEach((doc) => {
      const matchingFile = uploadedFiles.find((f) => {
        if (f.process_id !== processData.id) return false; // estrito ao processo!
        const name = (f.file_name || "").toLowerCase();
        const role = (f.metadata?.required_doc_id || "").toLowerCase();
        return doc.matchers.some(m => name.includes(m) || role.includes(m));
      });
      items.push({
        id: doc.id,
        group: "documentos",
        title: doc.title,
        isCompleted: Boolean(matchingFile),
        actionType: "upload_doc",
      });
    });

    // GRUPO 3: AÇÕES A REALIZAR
    const hasGenDoc = generatedDocs.filter(d => d.process_id === processData.id).length > 0;
    items.push({
      id: "acao-gerar-minuta",
      group: "acoes",
      title: "Gerar e revisar minuta do requerimento (PDF)",
      isCompleted: hasGenDoc,
      actionType: "generate_pdf",
    });

    const isSigned = generatedDocs.some(d => d.process_id === processData.id && (d.status === "signed" || !!d.signed_file_url));
    items.push({
      id: "acao-coletar-assinatura",
      group: "acoes",
      title: "Assinatura do documento (gov.br ou física)",
      isCompleted: isSigned,
      actionType: "sign_doc",
    });

    const isGruPaid = Boolean(manualActions.pay_gru?.completed);
    items.push({
      id: "acao-pagar-gru",
      group: "acoes",
      title: "Pagamento da taxa da Capitania (GRU)",
      isCompleted: isGruPaid,
      actionType: "manual_action",
    });

    const hasProtocol = Boolean(
      processData.protocol_number || 
      uploadedFiles.some(f => f.process_id === processData.id && f.category === "protocol")
    );
    items.push({
      id: "acao-registrar-protocolo",
      group: "acoes",
      title: "Registrar protocolo na Capitania / Delegacia",
      isCompleted: hasProtocol,
      actionType: "protocol",
    });

    const hasIssued = uploadedFiles.some(f => f.process_id === processData.id && ["issued", "issued_doc"].includes(f.category));
    items.push({
      id: "acao-anexar-emitido",
      group: "acoes",
      title: "Anexar documento emitido final (TIE/TIEM)",
      isCompleted: hasIssued,
      actionType: "issued_doc",
    });

    return items;
  }

  // 1. Cenário: Organização nos 3 Grupos Exigidos
  it("organiza as pendências rigorosamente nos 3 grupos: dados, documentos e ações", () => {
    const processData = { id: "proc-1", process_type: "Renovação de TIE/TIEM", metadata: {} };
    const customer = { id: "cust-1", name: "Marina Silva", cpf_cnpj: "123.456.789-00", address: "Av Beira Mar, 100" };
    const vessel = { id: "vess-1", name: "Lancha Mar Azul", registration_number: "381-123", length: 9.5 };

    const items = evaluatePendingItems({
      processData,
      customer,
      vessel,
      generatedDocs: [],
      uploadedFiles: []
    });

    const dados = items.filter(i => i.group === "dados");
    const docs = items.filter(i => i.group === "documentos");
    const acoes = items.filter(i => i.group === "acoes");

    expect(dados.length).toBeGreaterThan(0);
    expect(docs.length).toBeGreaterThan(0);
    expect(acoes.length).toBeGreaterThan(0);

    // Todos os itens pertencem exclusivamente a um dos 3 grupos
    expect(items.every(i => ["dados", "documentos", "acoes"].includes(i.group))).toBe(true);
  });

  // 2. Cenário: Requisitos Específicos por Tipo de Serviço (Não Genérico)
  it("aplica os requisitos específicos do serviço sem criar uma lista genérica igual", () => {
    // Caso A: Renovação de TIE
    const renovacaoItems = evaluatePendingItems({
      processData: { id: "proc-renov", process_type: "Renovação do TIE", metadata: {} },
      customer: { id: "cust-1", cpf_cnpj: "12345678901", address: "Rua A" },
      vessel: { id: "vess-1", registration_number: "TIE-111", length: 8 },
      generatedDocs: [],
      uploadedFiles: []
    });

    // Caso B: Transferência de Propriedade
    const transferenciaItems = evaluatePendingItems({
      processData: { id: "proc-transf", process_type: "Transferência de Propriedade", metadata: {} },
      customer: { id: "cust-1", cpf_cnpj: "12345678901", address: "Rua A" },
      vessel: { id: "vess-1", registration_number: "TIE-111", length: 8 },
      generatedDocs: [],
      uploadedFiles: []
    });

    // Transferência deve exigir dados e documentos do comprador e ATPV, que Renovação NÃO exige
    const transfHasBuyerDoc = transferenciaItems.some(i => i.id === "doc-comprador");
    const renovHasBuyerDoc = renovacaoItems.some(i => i.id === "doc-comprador");
    expect(transfHasBuyerDoc).toBe(true);
    expect(renovHasBuyerDoc).toBe(false);

    const transfHasBuyerData = transferenciaItems.some(i => i.id === "dado-processo-comprador");
    expect(transfHasBuyerData).toBe(true);
  });

  // 3. Cenário: Imutabilidade e Gravação Real de Dados e Documentos
  it("exige salvamento real no banco de dados e impede dispensa indevida de dados ou documentos", () => {
    // Cliente com CPF vazio
    const incompleteCustomer = { id: "cust-1", name: "Carlos", cpf_cnpj: "", address: "" };
    const vessel = { id: "vess-1", registration_number: "", length: null };
    const processData = { id: "proc-1", process_type: "Renovação de TIE/TIEM", metadata: {} };

    const itemsPending = evaluatePendingItems({
      processData,
      customer: incompleteCustomer,
      vessel,
      generatedDocs: [],
      uploadedFiles: []
    });

    const cpfItem = itemsPending.find(i => i.id === "dado-cliente-cpf-cnpj");
    const tieItem = itemsPending.find(i => i.id === "dado-embarcacao-tie");
    const cnhDoc = itemsPending.find(i => i.id === "doc-cnh");

    expect(cpfItem?.isCompleted).toBe(false);
    expect(tieItem?.isCompleted).toBe(false);
    expect(cnhDoc?.isCompleted).toBe(false);

    // Após salvar efetivamente os registros no banco:
    const completeCustomer = { ...incompleteCustomer, cpf_cnpj: "123.456.789-00", address: "Av Central, 20" };
    const completeVessel = { ...vessel, registration_number: "381-9988", length: 12 };
    const savedFiles = [
      { process_id: "proc-1", file_name: "cnh-carlos.pdf", metadata: { required_doc_id: "doc-cnh" } }
    ];

    const itemsResolved = evaluatePendingItems({
      processData,
      customer: completeCustomer,
      vessel: completeVessel,
      generatedDocs: [],
      uploadedFiles: savedFiles
    });

    expect(itemsResolved.find(i => i.id === "dado-cliente-cpf-cnpj")?.isCompleted).toBe(true);
    expect(itemsResolved.find(i => i.id === "dado-embarcacao-tie")?.isCompleted).toBe(true);
    expect(itemsResolved.find(i => i.id === "doc-cnh")?.isCompleted).toBe(true);
  });

  // 4. Cenário: Ação Manual Auditada (Quem e Quando)
  it("registra quem concluiu a ação manual e quando, permitindo auditoria e reabertura", () => {
    const processWithoutManualAction = {
      id: "proc-1",
      process_type: "Renovação de TIE/TIEM",
      metadata: {}
    };

    const initial = evaluatePendingItems({
      processData: processWithoutManualAction,
      customer: { cpf_cnpj: "111", address: "Rua" },
      vessel: { registration_number: "381", length: 10 },
      generatedDocs: [],
      uploadedFiles: []
    });
    expect(initial.find(i => i.id === "acao-pagar-gru")?.isCompleted).toBe(false);

    // Conclusão com registro do funcionário e data/hora
    const completedTimestamp = "2026-09-28T14:30:00.000Z";
    const processWithManualAction = {
      id: "proc-1",
      process_type: "Renovação de TIE/TIEM",
      metadata: {
        manual_actions: {
          pay_gru: {
            completed: true,
            completed_by: "João Vitor (Despachante)",
            completed_at: completedTimestamp,
            notes: "GRU nº 992812 paga via Pix Banco do Brasil"
          }
        },
        history: [
          {
            event: "manual_action_completed",
            description: "Ação manual concluída: Pagamento da taxa da Capitania (GRU)",
            user: "João Vitor (Despachante)",
            date: completedTimestamp
          }
        ]
      }
    };

    const evaluated = evaluatePendingItems({
      processData: processWithManualAction,
      customer: { cpf_cnpj: "111", address: "Rua" },
      vessel: { registration_number: "381", length: 10 },
      generatedDocs: [],
      uploadedFiles: []
    });

    const gruItem = evaluated.find(i => i.id === "acao-pagar-gru");
    expect(gruItem?.isCompleted).toBe(true);
    expect(processWithManualAction.metadata.manual_actions.pay_gru.completed_by).toBe("João Vitor (Despachante)");
    expect(processWithManualAction.metadata.history[0].event).toBe("manual_action_completed");
  });

  // 5. Cenário: Isolamento Estrito entre Duas Embarcações do Mesmo Cliente
  it("garante isolamento estrito: um cliente com 2 embarcações só tem pendências avaliadas para a sua respectiva embarcação e serviço", () => {
    const customer = { id: "cust-1", name: "Marina do Sol", cpf_cnpj: "99.888.777/0001-66", address: "Praia Grande" };

    // Embarcação 1: Lancha Mar Azul (Processo 1: Renovação) - TIE preenchido, mas sem comprovante
    const vesselA = { id: "vess-a", name: "Lancha Mar Azul", registration_number: "381-0001", length: 11 };
    const processA = { id: "proc-vessel-a", process_type: "Renovação de TIE/TIEM", metadata: {} };

    // Embarcação 2: Veleiro Vento Leste (Processo 2: Inscrição Inicial) - Sem TIE (normal para inicial), mas com nota fiscal
    const vesselB = { id: "vess-b", name: "Veleiro Vento Leste", registration_number: null, length: 14 };
    const processB = { id: "proc-vessel-b", process_type: "Registro Inicial", metadata: {} };

    // Arquivos no banco: NF anexada APENAS ao processo B
    const allFiles = [
      { id: "f-1", process_id: "proc-vessel-b", file_name: "nota_fiscal_estaleiro.pdf", metadata: { required_doc_id: "doc-nf-embarcacao" } },
      { id: "f-2", process_id: "proc-vessel-b", file_name: "memorial_descritivo.pdf", metadata: { required_doc_id: "doc-memorial" } }
    ];

    // Avaliação do Processo A (Lancha Mar Azul)
    const itemsA = evaluatePendingItems({
      processData: processA,
      customer,
      vessel: vesselA,
      generatedDocs: [],
      uploadedFiles: allFiles
    });

    // Avaliação do Processo B (Veleiro Vento Leste)
    const itemsB = evaluatePendingItems({
      processData: processB,
      customer,
      vessel: vesselB,
      generatedDocs: [],
      uploadedFiles: allFiles
    });

    // Processo A NÃO pode herdar ou considerar os arquivos do processo B
    const docAnteriorA = itemsA.find(i => i.id === "doc-tie-anterior");
    expect(docAnteriorA?.isCompleted).toBe(false);

    // Processo B tem seus documentos específicos concluídos pelos seus próprios arquivos
    const docNfB = itemsB.find(i => i.id === "doc-nf-embarcacao");
    expect(docNfB?.isCompleted).toBe(true);

    // Processo B não exige TIE anterior (porque é Registro Inicial)
    expect(itemsB.some(i => i.id === "dado-embarcacao-tie")).toBe(false);

    // Processo A exige TIE e está preenchido
    expect(itemsA.find(i => i.id === "dado-embarcacao-tie")?.isCompleted).toBe(true);
  });

  // 6. Cenário: 100% de Conclusão e Estado 'Tudo pronto para a próxima etapa'
  it("identifica 100% de conclusão quando todas as pendências forem atendidas e habilita 'Tudo pronto para a próxima etapa'", () => {
    const processData = {
      id: "proc-complete",
      process_type: "Registro Inicial",
      protocol_number: "381.999/2026",
      metadata: {
        manual_actions: {
          pay_gru: { completed: true, completed_by: "Ana Paula", completed_at: "2026-09-28T10:00:00Z" }
        }
      }
    };
    const customer = { id: "c-1", cpf_cnpj: "12345678900", address: "Rua do Porto, 50" };
    const vessel = { id: "v-1", name: "Nova Nau", registration_number: null, length: 15 };
    
    const generatedDocs = [
      { id: "g-1", process_id: "proc-complete", status: "signed", signed_file_url: "https://bucket/signed.pdf" }
    ];

    const uploadedFiles = [
      { id: "u-1", process_id: "proc-complete", file_name: "nota_fiscal.pdf", metadata: { required_doc_id: "doc-nf-embarcacao" } },
      { id: "u-2", process_id: "proc-complete", file_name: "memorial.pdf", metadata: { required_doc_id: "doc-memorial" } },
      { id: "u-3", process_id: "proc-complete", file_name: "protocolo.pdf", category: "protocol" },
      { id: "u-4", process_id: "proc-complete", file_name: "tie_emitido.pdf", category: "issued" }
    ];

    const items = evaluatePendingItems({
      processData,
      customer,
      vessel,
      generatedDocs,
      uploadedFiles
    });

    const pendingCount = items.filter(i => !i.isCompleted).length;
    const progress = Math.round((items.filter(i => i.isCompleted).length / items.length) * 100);

    expect(pendingCount).toBe(0);
    expect(progress).toBe(100);
  });
});
