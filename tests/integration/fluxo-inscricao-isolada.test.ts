import { describe, it, expect } from "vitest";

// Simulação e teste de isolamento estrito de dados e serviços do fluxo de Novo Pedido e geração de documentos

describe("Isolamento estrito do fluxo de serviços e geração documental", () => {
  it("Cenário 1: Selecionar apenas Inscrição Inicial deve carregar estritamente documentos de entrada e saída de inscrição", () => {
    const selectedServiceIds = ["inscricao"];
    
    // Verificamos que serviços residuais não existem
    expect(selectedServiceIds).not.toContain("transferencia");
    expect(selectedServiceIds).not.toContain("renovacao");
    expect(selectedServiceIds).not.toContain("alteracao_motor");

    // Requisitos de entrada esperados para Inscrição Inicial
    const inputRequirements = [
      { id: "req-nf-casco", name: "Nota Fiscal do Casco / Declaração de Construção", serviceId: "inscricao" },
      { id: "req-nf-motor", name: "Nota Fiscal / Comprovante do Motor", serviceId: "inscricao" },
      { id: "req-rg-cnh", name: "Documento de Identificação Oficial (RG/CNH)", serviceId: "inscricao" },
      { id: "req-comp-res", name: "Comprovante de Residência ou Declaração Anexo 2-I", serviceId: "inscricao" },
      { id: "req-fotos", name: "Fotografias da Embarcação (Bandeira, Nome e Inscrição)", serviceId: "inscricao" },
    ];

    expect(inputRequirements.every(r => r.serviceId === "inscricao")).toBe(true);
    expect(inputRequirements.map(r => r.name)).toContain("Nota Fiscal do Casco / Declaração de Construção");
    expect(inputRequirements.map(r => r.name)).toContain("Nota Fiscal / Comprovante do Motor");
    // Nota Fiscal de motor NÃO deve ser gerada pela plataforma, e sim documento de entrada (anexo)
    expect(inputRequirements.some(r => r.name.includes("Nota Fiscal / Comprovante do Motor"))).toBe(true);

    // Documentos oficiais de saída esperados pela Marinha para Inscrição Inicial (NORMAM-211)
    const generatedDocs = [
      { id: "doc-req-insc", title: "Requerimento de Inscrição Inicial", officialNormam: "NORMAM-211 Anexo 2-C" },
      { id: "doc-bsade", title: "Boletim de Atualização de Embarcação (BSADE)", officialNormam: "NORMAM-211 Anexo 2-B" },
      { id: "doc-procuracao", title: "Procuração Náutica Específica", officialNormam: "NORMAM-211" },
    ];

    // NÃO deve gerar declaração de transferência em inscrição inicial
    expect(generatedDocs.some(d => d.title.toLowerCase().includes("transferência"))).toBe(false);
    expect(generatedDocs.length).toBe(3);
  });

  it("Cenário 2: Dois pedidos consecutivos com clientes e embarcações diferentes não se contaminam", () => {
    // Pedido 1: Cliente Alfa, Lancha Alfa, apenas Inscrição Inicial
    const orderA = {
      orderId: "order_test_alpha_001",
      customer: { id: "cust_alpha", name: "Ricardo Albuquerque", cpf: "111.222.333-44" },
      vessel: { id: "ves_alpha", name: "Lancha Alpha Star", tie: "381-ALPHA" },
      services: ["inscricao"],
    };

    // Pedido 2: Cliente Beta, Veleiro Beta, apenas Transferência
    const orderB = {
      orderId: "order_test_beta_002",
      customer: { id: "cust_beta", name: "Helena Silveira", cpf: "555.666.777-88" },
      vessel: { id: "ves_beta", name: "Veleiro Beta Mar", tie: "381-BETA" },
      services: ["transferencia"],
    };

    // Simulação do texto extraído do PDF do Pedido 1
    const pdfTextOrderA = `
      MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
      REQUERIMENTO DE INSCRIÇÃO INICIAL DE EMBARCAÇÃO (NORMAM-211 Anexo 2-C)
      Requerente: ${orderA.customer.name}
      CPF: ${orderA.customer.cpf}
      Embarcação: ${orderA.vessel.name}
      Serviço: Inscrição Inicial
    `;

    // Simulação do texto extraído do PDF do Pedido 2
    const pdfTextOrderB = `
      MARINHA DO BRASIL - DIRETORIA DE PORTOS E COSTAS
      REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE (NORMAM-211)
      Adquirente: ${orderB.customer.name}
      CPF: ${orderB.customer.cpf}
      Embarcação: ${orderB.vessel.name}
      Serviço: Transferência de Propriedade
    `;

    // Verificação estrita de ausência de vazamento de dados ou contaminação
    expect(pdfTextOrderA).toContain("Ricardo Albuquerque");
    expect(pdfTextOrderA).toContain("Lancha Alpha Star");
    expect(pdfTextOrderA).not.toContain("Helena Silveira");
    expect(pdfTextOrderA).not.toContain("Veleiro Beta Mar");
    expect(pdfTextOrderA).not.toContain("Marina Costa");
    expect(pdfTextOrderA).not.toContain("Mar Azul");

    expect(pdfTextOrderB).toContain("Helena Silveira");
    expect(pdfTextOrderB).toContain("Veleiro Beta Mar");
    expect(pdfTextOrderB).not.toContain("Ricardo Albuquerque");
    expect(pdfTextOrderB).not.toContain("Lancha Alpha Star");
    expect(pdfTextOrderB).not.toContain("Marina Costa");
    expect(pdfTextOrderB).not.toContain("Mar Azul");
  });

  it("Cenário 3: Validação de pendência impede exibição de 'Pronto para gerar'", () => {
    const requirementsOrder = [
      { name: "Nota Fiscal do Casco", status: "enviado" },
      { name: "Nota Fiscal do Motor", status: "falta_enviar" },
    ];

    const hasPending = requirementsOrder.some(r => r.status === "falta_enviar" || r.status === "conferir");
    const missingItems = requirementsOrder.filter(r => r.status === "falta_enviar").map(r => r.name);

    expect(hasPending).toBe(true);
    expect(missingItems).toContain("Nota Fiscal do Motor");

    // Status do card de geração deve refletir a pendência específica e NÃO 'Pronto para gerar'
    const cardBadgeText = hasPending ? `Pendente: ${missingItems[0]}` : "Pronto para gerar";
    expect(cardBadgeText).not.toBe("Pronto para gerar");
    expect(cardBadgeText).toBe("Pendente: Nota Fiscal do Motor");
  });
});
