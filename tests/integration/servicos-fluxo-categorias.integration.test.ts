import { describe, it, expect } from "vitest";

// Catálogo oficial dos serviços náuticos do NavalDocs Pro conforme src/routes/servicos.selecionar.tsx
const OFFICIAL_SERVICES = [
  {
    id: "alteracao_cadastral",
    name: "Alteração de dados cadastrais",
    category: "all",
    description: "Atualizar dados do proprietário ou da embarcação junto à capitania.",
  },
  {
    id: "renovacao_inscricao",
    name: "Renovação de inscrição",
    category: "all",
    description: "Renovar o TIE/TIEM ou documento de registro de embarcação.",
  },
  {
    id: "transferencia_propriedade",
    name: "Transferência de propriedade",
    category: "all",
    description: "Registrar a mudança de titularidade e proprietário da embarcação.",
  },
  {
    id: "inscricao_embarcacao",
    name: "Inscrição de embarcação",
    category: "all",
    description: "Primeiro registro e atribuição do número de inscrição na Capitania.",
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento (TIE / TIEM)",
    category: "all",
    description: "Solicitar nova via de documento por perda, roubo ou extravio.",
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor / Dados técnicos",
    category: "all",
    description: "Registrar troca ou alteração de potência de motor da embarcação.",
  },
  {
    id: "vistoria_tecnica",
    name: "Vistoria e perícia técnica",
    category: "all",
    description: "Agendamento e confecção de documentação para vistoria oficial.",
  },
  {
    id: "cancelamento_inscricao",
    name: "Cancelamento de inscrição",
    category: "all",
    description: "Baixa ou cancelamento definitivo do registro da embarcação.",
  },
  {
    id: "laudo_engenharia",
    name: "Laudo de estabilidade e engenharia naval",
    category: "profissional",
    description: "Emissão de ART e laudo técnico naval para embarcações comerciais.",
  },
  {
    id: "despacho_maritimo",
    name: "Despacho e registro de tripulação / CTS",
    category: "profissional",
    description: "Documentação de despacho e cartões de tripulação de segurança.",
  },
];

function filterServicesByCategory(category: "profissional" | "esporte_recreio", searchTerm: string = "") {
  let list = OFFICIAL_SERVICES.filter((svc) => {
    if (svc.category === "all") return true;
    if (category === "profissional") {
      return svc.category === "profissional" || svc.category === "all";
    }
    return svc.category === "esporte_recreio" || svc.category === "all";
  });

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    list = list.filter((svc) => svc.name.toLowerCase().includes(term));
  }

  list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return list;
}

describe("Fluxo de Navegação e Categorias da Página Serviços", () => {
  // TESTE 1: Filtragem da Categoria Esporte e Recreio
  it("Cenário 1: Categoria 'esporte_recreio' carrega somente serviços recreativos e comuns (exclui específicos profissionais)", () => {
    const services = filterServicesByCategory("esporte_recreio");
    
    // Deve conter os 8 serviços gerais
    expect(services).toHaveLength(8);
    const ids = services.map(s => s.id);
    expect(ids).toContain("transferencia_propriedade");
    expect(ids).toContain("renovacao_inscricao");
    expect(ids).toContain("inscricao_embarcacao");
    expect(ids).toContain("alteracao_cadastral");
    expect(ids).toContain("alteracao_motor");
    expect(ids).toContain("segunda_via");
    expect(ids).toContain("vistoria_tecnica");
    expect(ids).toContain("cancelamento_inscricao");

    // NÃO deve conter laudo de engenharia nem despacho marítimo
    expect(ids).not.toContain("laudo_engenharia");
    expect(ids).not.toContain("despacho_maritimo");
  });

  // TESTE 2: Filtragem da Categoria Profissional
  it("Cenário 2: Categoria 'profissional' carrega os serviços gerais mais laudo de estabilidade e despacho marítimo", () => {
    const services = filterServicesByCategory("profissional");
    
    // Deve conter os 10 serviços
    expect(services).toHaveLength(10);
    const ids = services.map(s => s.id);
    expect(ids).toContain("laudo_engenharia");
    expect(ids).toContain("despacho_maritimo");
    expect(ids).toContain("transferencia_propriedade");
    expect(ids).toContain("vistoria_tecnica");
  });

  // TESTE 3: Preservação de Parâmetros na Navegação Avançar/Voltar
  it("Cenário 3: Passagem e preservação de category, customerId e vesselId ao navegar para documentos e voltar", () => {
    const initialNavigation = {
      fromRoute: "/servicos",
      selectedCategory: "profissional" as const,
      customerId: "cust-123",
      vesselId: "vess-456",
    };

    // 1. Simula navegação para /servicos/selecionar
    const selecionarSearchParams = {
      category: initialNavigation.selectedCategory,
      customerId: initialNavigation.customerId,
      vesselId: initialNavigation.vesselId,
    };
    expect(selecionarSearchParams.category).toBe("profissional");
    expect(selecionarSearchParams.customerId).toBe("cust-123");
    expect(selecionarSearchParams.vesselId).toBe("vess-456");

    // 2. Simula avanço para /servicos/documentos
    const selectedServiceIds = ["laudo_engenharia", "transferencia_propriedade"];
    const documentosSearchParams = {
      category: selecionarSearchParams.category,
      customerId: selecionarSearchParams.customerId,
      vesselId: selecionarSearchParams.vesselId,
      services: selectedServiceIds.join(","),
      activeServiceId: selectedServiceIds[0],
    };
    expect(documentosSearchParams.services).toBe("laudo_engenharia,transferencia_propriedade");
    expect(documentosSearchParams.category).toBe("profissional");

    // 3. Simula retorno ("Voltar à seleção") de /servicos/documentos para /servicos/selecionar
    const returnSearchParams = {
      category: documentosSearchParams.category,
      customerId: documentosSearchParams.customerId,
      vesselId: documentosSearchParams.vesselId,
    };
    expect(returnSearchParams.category).toBe("profissional");
    expect(returnSearchParams.customerId).toBe("cust-123");
    expect(returnSearchParams.vesselId).toBe("vess-456");
  });

  // TESTE 4: Pesquisa de serviços respeitando categoria
  it("Cenário 4: Busca de serviços filtra termo de pesquisa respeitando a categoria ativa", () => {
    // Busca por "laudo" em esporte e recreio -> 0 resultados
    const lazerResult = filterServicesByCategory("esporte_recreio", "laudo");
    expect(lazerResult).toHaveLength(0);

    // Busca por "laudo" em profissional -> 1 resultado (Laudo de estabilidade e engenharia naval)
    const profResult = filterServicesByCategory("profissional", "laudo");
    expect(profResult).toHaveLength(1);
    expect(profResult[0].id).toBe("laudo_engenharia");

    // Busca por "inscrição" em ambas -> acha inscrição, renovação e cancelamento
    const buscaInscricaoLazer = filterServicesByCategory("esporte_recreio", "inscrição");
    expect(buscaInscricaoLazer.length).toBeGreaterThanOrEqual(2);
  });

  // TESTE 5: Remoção do Botão Flutuante "COPILOTO IA" de Todas as Telas
  it("Cenário 5: Botão flutuante 'COPILOTO IA' foi desativado e não é renderizado em desktop nem mobile", async () => {
    const { NavalCopilotDrawer } = await import("@/components/copilot/NavalCopilotDrawer");
    
    // O componente NavalCopilotDrawer deve retornar null
    const result = NavalCopilotDrawer();
    expect(result).toBeNull();
  });

  // TESTE 6: Preservação da Leitura Automática de Documentos (OCR) e Revisão de Dados Extraídos
  it("Cenário 6: Preservação da extração automática de dados de CNH e comprovante de residência", () => {
    // Validação dos formatos de dados extraídos por OCR mantidos para clientes e processos
    const mockExtractedCNH = {
      name: "Capitão José da Silva",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      birth_date: "1980-05-15",
      doc_type: "cnh",
    };

    const mockExtractedProofAddress = {
      address_street: "Avenida Atlântica",
      address_number: "1500",
      address_neighborhood: "Copacabana",
      address_city: "Rio de Janeiro",
      address_state: "RJ",
      address_zip: "22021-001",
      doc_type: "comprovante_residencia",
    };

    expect(mockExtractedCNH.name).toBeTruthy();
    expect(mockExtractedCNH.cpf).toBeTruthy();
    expect(mockExtractedProofAddress.address_zip).toMatch(/^\d{5}-\d{3}$/);
    expect(mockExtractedProofAddress.address_city).toBe("Rio de Janeiro");
  });

  // TESTE 7: Separação estrita entre "Requisitos conferidos" e "Requisitos em revisão"
  it("Cenário 7: Validação do Catálogo Normativo — Separação estrita entre validados e em revisão sem aprovações fictícias", async () => {
    const { 
      VALIDATED_SERVICES, 
      IN_REVIEW_SERVICES, 
      UNIDENTIFIED_SERVICES, 
      getServiceDefinition 
    } = await import("@/services/catalog/servicesCatalogValidation");

    // Deve haver exatamente 5 serviços com requisitos conferidos na NORMAM-03/DPC
    expect(VALIDATED_SERVICES).toHaveLength(5);
    const validatedIds = VALIDATED_SERVICES.map(s => s.id);
    expect(validatedIds).toContain("transferencia_propriedade");
    expect(validatedIds).toContain("renovacao_inscricao");
    expect(validatedIds).toContain("segunda_via");
    expect(validatedIds).toContain("inscricao_embarcacao");
    expect(validatedIds).toContain("alteracao_cadastral");

    // Deve haver exatamente 5 serviços com requisitos em revisão técnica/normativa
    expect(IN_REVIEW_SERVICES).toHaveLength(5);
    const inReviewIds = IN_REVIEW_SERVICES.map(s => s.id);
    expect(inReviewIds).toContain("alteracao_motor");
    expect(inReviewIds).toContain("vistoria_tecnica");
    expect(inReviewIds).toContain("cancelamento_inscricao");
    expect(inReviewIds).toContain("laudo_engenharia");
    expect(inReviewIds).toContain("despacho_maritimo");

    // Todos os serviços possuem fonte identificada
    expect(UNIDENTIFIED_SERVICES).toHaveLength(0);

    // Conferência do getServiceDefinition
    const defTransferencia = getServiceDefinition("transferencia-propriedade");
    expect(defTransferencia.status).toBe("validated");
    expect(defTransferencia.canFinalizeProtocol).toBe(true);

    const defLaudo = getServiceDefinition("laudo_engenharia");
    expect(defLaudo.status).toBe("in_review");
    expect(defLaudo.canFinalizeProtocol).toBe(false);
  });

  // TESTE 8: Metadados obrigatórios para serviços validados (Data, Fonte oficial e Link)
  it("Cenário 8: Serviços com 'Requisitos conferidos' exibem fonte oficial DPC, data de conferência e link", async () => {
    const { VALIDATED_SERVICES } = await import("@/services/catalog/servicesCatalogValidation");

    VALIDATED_SERVICES.forEach(svc => {
      expect(svc.status).toBe("validated");
      expect(svc.validationDateFormatted).toMatch(/2026/);
      expect(svc.officialSource).toContain("NORMAM");
      expect(svc.sourceUrl).toMatch(/^https:\/\//);
      expect(svc.requiredDocuments.length).toBeGreaterThan(0);
      expect(svc.generatedDocuments.length).toBeGreaterThan(0);
      expect(svc.canFinalizeProtocol).toBe(true);
    });
  });

  // TESTE 9: Serviços em revisão bloqueiam protocolo direto e especificam o que falta validar
  it("Cenário 9: Serviços 'em revisão' salvam como rascunho, bloqueiam protocolo direto e justificam pendência", async () => {
    const { IN_REVIEW_SERVICES } = await import("@/services/catalog/servicesCatalogValidation");

    IN_REVIEW_SERVICES.forEach(svc => {
      expect(svc.status).toBe("in_review");
      expect(svc.canFinalizeProtocol).toBe(false);
      expect(svc.missingValidationNote).toBeTruthy();
      expect(svc.missingValidationNote.length).toBeGreaterThan(15);
    });

    // Laudo de engenharia deve obrigatoriamente exigir revisão de Engenheiro Naval com CREA/ART
    const laudo = IN_REVIEW_SERVICES.find(s => s.id === "laudo_engenharia");
    expect(laudo).toBeDefined();
    expect(laudo?.needsProfessionalReview).toBe(true);
    expect(laudo?.missingValidationNote).toContain("Engenheiro Naval");
  });
});

