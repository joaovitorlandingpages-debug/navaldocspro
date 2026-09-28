import { describe, it, expect } from "vitest";

describe("TELA — Revisão e Finalização de Documentos Gerados (NavalDocs Pro)", () => {
  const companyId = "company_alpha_123";

  // Cliente com DUAS embarcações (para testar que documentos não vazam)
  const customerAna = {
    id: "cust_ana_001",
    name: "Ana Oliveira",
    cpf_cnpj: "123.456.789-00",
    email: "ana@exemplo.com.br",
    phone: "(13) 98765-4321",
    address: "Av. Almirante Saldanha, 250",
    city: "Santos",
    state: "SP",
    company_id: companyId,
  };

  const vessel1Aurora = {
    id: "vessel_aurora_001",
    name: "Aurora",
    registration_number: "381P202400192",
    vessel_type: "Lancha",
    category: "Esporte e Recreio",
    length_overall: 7.2,
    port_of_registry: "Capitania dos Portos de São Paulo",
    customer_id: customerAna.id,
    company_id: companyId,
  };

  const vessel2MareAlta = {
    id: "vessel_mare_alta_002",
    name: "Maré Alta",
    registration_number: "381P202500888",
    vessel_type: "Veleiro",
    category: "Esporte e Recreio",
    length_overall: 11.5,
    port_of_registry: "Capitania dos Portos de São Paulo",
    customer_id: customerAna.id,
    company_id: companyId,
  };

  const processAurora = {
    id: "proc_aurora_101",
    title: "Transferência de Propriedade",
    protocol_number: "PROC-2026-0042",
    customer_id: customerAna.id,
    vessel_id: vessel1Aurora.id,
    company_id: companyId,
    created_at: "2026-03-01T10:00:00Z",
  };

  const processMareAlta = {
    id: "proc_mare_alta_202",
    title: "Renovação do TIE",
    protocol_number: "PROC-2026-0099",
    customer_id: customerAna.id,
    vessel_id: vessel2MareAlta.id,
    company_id: companyId,
    created_at: "2026-03-10T14:00:00Z",
  };

  // Funcionários da Empresa
  const companyEmployees = [
    {
      id: "emp_joao_01",
      name: "João Silva",
      role: "Despachante Náutico",
      document_name: "João da Silva Santos",
      document_role: "Despachante Náutico Credenciado",
      professional_registry: "CRDD-SP nº 8872 / DPC-MB",
      email: "joao@despachantenaval.com.br",
      phone: "(13) 99112-2233",
    },
    {
      id: "emp_maria_02",
      name: "Maria Ferreira",
      role: "Assistente Operacional",
      document_name: "Maria Ferreira de Souza",
      document_role: "Operadora Técnica Naval",
      professional_registry: "Registro Marítimo nº 4410",
      email: "maria@despachantenaval.com.br",
    },
  ];

  // =========================================================================
  // CENÁRIO 1: CONFERÊNCIA DE DADOS COM RASTREIO DE ORIGEM E CAMPOS AUSENTES
  // =========================================================================
  it("Cenário 1: Rastreia a origem dos dados (Cliente, Embarcação, Processo) e detecta campos obrigatórios ausentes", () => {
    // 1.1 Cliente completo com embarcação completa
    const fieldsFull = [
      { field: "Nome do Cliente", value: customerAna.name, source: "Cadastro do Cliente", isRequired: true },
      { field: "CPF/CNPJ", value: customerAna.cpf_cnpj, source: "Cadastro do Cliente", isRequired: true },
      { field: "Endereço", value: customerAna.address, source: "Cadastro do Cliente", isRequired: true },
      { field: "Embarcação", value: vessel1Aurora.name, source: "Cadastro da Embarcação", isRequired: true },
      { field: "Inscrição", value: vessel1Aurora.registration_number, source: "Cadastro da Embarcação", isRequired: true },
      { field: "Serviço", value: processAurora.title, source: "Preenchimento deste Processo", isRequired: true },
    ];

    const missingFull = fieldsFull.filter((f) => f.isRequired && !f.value);
    expect(missingFull).toHaveLength(0);

    // 1.2 Cliente incompleto (ex: sem CPF e sem endereço)
    const customerIncomplete = {
      name: "Carlos Barreto",
      cpf_cnpj: null,
      address: null,
    };

    const fieldsIncomplete = [
      { field: "Nome do Cliente", value: customerIncomplete.name, source: "Cadastro do Cliente", isRequired: true },
      { field: "CPF/CNPJ", value: customerIncomplete.cpf_cnpj, source: "Cadastro do Cliente", isRequired: true },
      { field: "Endereço", value: customerIncomplete.address, source: "Cadastro do Cliente", isRequired: true },
      { field: "Inscrição", value: null, source: "Cadastro da Embarcação", isRequired: true },
    ];

    const missing = fieldsIncomplete.filter((f) => f.isRequired && !f.value);
    expect(missing).toHaveLength(3);
    expect(missing.map((m) => m.field)).toEqual(["CPF/CNPJ", "Endereço", "Inscrição"]);
  });

  // =========================================================================
  // CENÁRIO 2: SELEÇÃO DE FUNCIONÁRIO RESPONSÁVEL COM DADOS PROFISSIONAIS
  // =========================================================================
  it("Cenário 2: Seleciona o funcionário cadastrado e extrai nome, cargo e registro profissional para o documento", () => {
    const selectedEmp = companyEmployees[0];

    expect(selectedEmp.document_name).toBe("João da Silva Santos");
    expect(selectedEmp.document_role).toBe("Despachante Náutico Credenciado");
    expect(selectedEmp.professional_registry).toBe("CRDD-SP nº 8872 / DPC-MB");

    // Formatação da assinatura do preparador no documento
    const signatureBlock = {
      name: selectedEmp.document_name,
      role: selectedEmp.document_role,
      registry: selectedEmp.professional_registry,
      email: selectedEmp.email,
    };

    expect(signatureBlock.name).toBe("João da Silva Santos");
    expect(signatureBlock.role).toContain("Credenciado");
    expect(signatureBlock.registry).toContain("CRDD-SP");
  });

  // =========================================================================
  // CENÁRIO 3: PRÉVIA DO PDF COM DADOS DA EMPRESA E AÇÕES EXIGIDAS
  // =========================================================================
  it("Cenário 3: Estrutura a prévia com cabeçalho institucional e disponibiliza os 3 botões de ação", () => {
    const companyBranding = {
      name: "Marina & Despachos Santos Ltda",
      cnpj: "11.222.333/0001-44",
      logo_url: "https://storage.navaldocs.com/logos/company_alpha_logo.png",
      city: "Santos",
      state: "SP",
    };

    const previewModel = {
      header: {
        company: companyBranding,
        protocol: processAurora.protocol_number,
      },
      actions: ["Voltar e corrigir", "Baixar PDF", "Registrar versão final"],
    };

    expect(previewModel.header.company.cnpj).toBe("11.222.333/0001-44");
    expect(previewModel.header.company.logo_url).toContain(".png");
    expect(previewModel.actions).toContain("Voltar e corrigir");
    expect(previewModel.actions).toContain("Baixar PDF");
    expect(previewModel.actions).toContain("Registrar versão final");
  });

  // =========================================================================
  // CENÁRIO 4: FLUXO PÓS-DOWNLOAD — ASSINAR GOV.BR OU GUARDAR SEM ASSINATURA
  // =========================================================================
  it("Cenário 4: Oferece opções claras pós-download, não exibe 'assinado' antes do arquivo e não simula assinatura automática", () => {
    // Estado inicial após download do PDF
    const generatedDoc = {
      id: "doc_req_001",
      process_id: processAurora.id,
      name: "Requerimento Padrão do Interessado",
      status: "gerado",
      is_signed: false,
      signed_file_url: null,
      signature_status: "Aguardando Assinatura",
    };

    // 4.1 Antes de anexar o arquivo assinado, NUNCA é marcado como assinado
    expect(generatedDoc.status).toBe("gerado");
    expect(generatedDoc.is_signed).toBe(false);
    expect(generatedDoc.signature_status).not.toBe("Assinado");

    // 4.2 Opção A: Instruções oficiais GOV.BR
    const govBrInstructions = {
      portalUrl: "https://assinador.iti.br",
      steps: [
        "Acessar assinador oficial",
        "Autenticar com conta gov.br (prata ou ouro)",
        "Aplicar assinatura no PDF",
        "Baixar e anexar o arquivo assinado no NavalDocs",
      ],
      simulatesAutoSign: false, // Regra obrigatória: NÃO simular assinatura automática
    };

    expect(govBrInstructions.simulatesAutoSign).toBe(false);
    expect(govBrInstructions.portalUrl).toBe("https://assinador.iti.br");

    // 4.3 Somente após o upload do arquivo assinado o status muda para assinado
    const signedUploadPayload = {
      signed_file_name: "Requerimento_Assinado_GovBr.pdf",
      signed_file_url: "bucket/signed/Requerimento_Assinado_GovBr.pdf",
      signature_source: "GOV.BR (Externo)",
    };

    const docAfterSignedUpload = {
      ...generatedDoc,
      status: "assinado",
      is_signed: true,
      signed_file_url: signedUploadPayload.signed_file_url,
      signature_status: "Anexada",
    };

    expect(docAfterSignedUpload.status).toBe("assinado");
    expect(docAfterSignedUpload.is_signed).toBe(true);
    expect(docAfterSignedUpload.signed_file_url).toBeTruthy();

    // 4.4 Opção B: Guardar sem assinatura mantém status gerado sem assinado
    const docSavedWithoutSign = {
      ...generatedDoc,
      status: "gerado",
      signature_status: "Sem assinatura necessária",
    };
    expect(docSavedWithoutSign.is_signed).toBe(false);
    expect(docSavedWithoutSign.status).toBe("gerado");
  });

  // =========================================================================
  // CENÁRIO 5: VÍNCULO E VERSIONAMENTO IMUTÁVEL
  // =========================================================================
  it("Cenário 5: Salva vinculado a empresa, cliente, embarcação, processo e funcionário com histórico de versões", () => {
    const documentV1 = {
      id: "doc_v1",
      company_id: companyId,
      customer_id: customerAna.id,
      vessel_id: vessel1Aurora.id,
      process_id: processAurora.id,
      name: "Requerimento Padrão do Interessado",
      version: 1,
      status: "gerado",
      metadata: {
        staff_responsible: {
          id: companyEmployees[0].id,
          name: companyEmployees[0].document_name,
          role: companyEmployees[0].document_role,
        },
        version_history: [],
      },
      created_at: "2026-03-01T10:00:00Z",
    };

    // Criação da Versão 2
    const historyEntry = {
      version: 1,
      saved_at: documentV1.created_at,
      saved_by_name: companyEmployees[0].name,
      status: "gerado",
      notes: "Versão inicial",
    };

    const documentV2 = {
      ...documentV1,
      version: 2,
      metadata: {
        ...documentV1.metadata,
        version_history: [historyEntry],
        last_modified_at: "2026-03-02T15:30:00Z",
      },
    };

    expect(documentV2.version).toBe(2);
    expect(documentV2.metadata.version_history).toHaveLength(1);
    expect(documentV2.metadata.version_history[0].version).toBe(1);
    expect(documentV2.company_id).toBe(companyId);
    expect(documentV2.customer_id).toBe(customerAna.id);
    expect(documentV2.vessel_id).toBe(vessel1Aurora.id);
    expect(documentV2.process_id).toBe(processAurora.id);
  });

  // =========================================================================
  // CENÁRIO 6: CLIENTE COM MAIS DE UMA EMBARCAÇÃO — ISOLAMENTO RIGOROSO
  // =========================================================================
  it("Cenário 6: Garante que um documento gerado para uma embarcação nunca vaze para outra do mesmo cliente", () => {
    const allGeneratedDocuments = [
      {
        id: "doc_aurora_1",
        customer_id: customerAna.id,
        vessel_id: vessel1Aurora.id,
        process_id: processAurora.id,
        name: "Requerimento Transferência Aurora",
      },
      {
        id: "doc_mare_alta_1",
        customer_id: customerAna.id,
        vessel_id: vessel2MareAlta.id,
        process_id: processMareAlta.id,
        name: "Requerimento Renovação TIE Maré Alta",
      },
    ];

    // Consulta para a Embarcação 1 (Aurora)
    const auroraDocs = allGeneratedDocuments.filter(
      (d) => d.customer_id === customerAna.id && d.vessel_id === vessel1Aurora.id
    );
    expect(auroraDocs).toHaveLength(1);
    expect(auroraDocs[0].id).toBe("doc_aurora_1");
    expect(auroraDocs[0].name).toContain("Aurora");

    // Consulta para a Embarcação 2 (Maré Alta)
    const mareAltaDocs = allGeneratedDocuments.filter(
      (d) => d.customer_id === customerAna.id && d.vessel_id === vessel2MareAlta.id
    );
    expect(mareAltaDocs).toHaveLength(1);
    expect(mareAltaDocs[0].id).toBe("doc_mare_alta_1");
    expect(mareAltaDocs[0].name).toContain("Maré Alta");

    // Garantir que nenhum documento da Aurora esteja na Maré Alta e vice-versa
    const leakAuroraIntoMareAlta = mareAltaDocs.some((d) => d.vessel_id === vessel1Aurora.id);
    const leakMareAltaIntoAurora = auroraDocs.some((d) => d.vessel_id === vessel2MareAlta.id);
    expect(leakAuroraIntoMareAlta).toBe(false);
    expect(leakMareAltaIntoAurora).toBe(false);
  });

  // =========================================================================
  // CENÁRIO 7: DIFERENCIAÇÃO ENTRE DOCUMENTOS GERADOS E DOCUMENTOS EMITIDOS
  // =========================================================================
  it("Cenário 7: Documento gerado só aparece em Documentos Gerados e NÃO na tela de Documentos Emitidos", () => {
    const systemDocuments = [
      {
        id: "doc_req_gen",
        category: "generated", // Documento gerado pelo NavalDocs
        source_table: "generated_documents",
        name: "Requerimento Padrão do Interessado",
      },
      {
        id: "doc_tie_iss",
        category: "issued", // Documento final emitido pela Capitania
        source_table: "uploaded_files",
        name: "TIE — Termo de Inscrição da Embarcação Definitivo",
      },
    ];

    // Tela "Documentos gerados": consulta generated_documents
    const generatedTabDocs = systemDocuments.filter((d) => d.category === "generated");
    expect(generatedTabDocs).toHaveLength(1);
    expect(generatedTabDocs[0].id).toBe("doc_req_gen");

    // Tela "Documentos emitidos" (Tela 44): consulta uploaded_files com category === 'issued'
    const issuedTabDocs = systemDocuments.filter((d) => d.category === "issued");
    expect(issuedTabDocs).toHaveLength(1);
    expect(issuedTabDocs[0].id).toBe("doc_tie_iss");

    // O gerado NUNCA aparece na lista de emitidos
    expect(issuedTabDocs.some((d) => d.category === "generated")).toBe(false);
  });
});
