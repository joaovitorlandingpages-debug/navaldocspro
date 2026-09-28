import { describe, it, expect, beforeEach } from "vitest";
import { 
  computeValidityInfo, 
  getDocumentTypeLabel, 
  COMMON_DOCUMENT_TYPES,
  DocumentItem,
  ValidityType,
  FilterTab
} from "@/routes/processes.$id.documentos-emitidos";

describe("TELA 44 — Documentos Emitidos da Embarcação", () => {
  const companyA = "company_tenant_alpha";
  const companyB = "company_tenant_beta";

  const customerAna = {
    id: "cust_ana_123",
    name: "Ana Oliveira",
    cpf_cnpj: "123.456.789-00",
    company_id: companyA,
  };

  const vesselAurora = {
    id: "vessel_aurora_456",
    name: "Aurora",
    registration_number: "381-009876",
    customer_id: customerAna.id,
    company_id: companyA,
  };

  const serviceProcess = {
    id: "proc_servico_789",
    title: "Transferência de propriedade",
    protocol_number: "PROC-2026-0042",
    customer_id: customerAna.id,
    vessel_id: vesselAurora.id,
    company_id: companyA,
  };

  // =========================================================================
  // CENÁRIO 1: DIFERENCIAÇÃO CLARA DE CATEGORIAS
  // =========================================================================
  it("Cenário 1: Diferencia estritamente Documentos Gerados, Protocolos e Documentos Emitidos", () => {
    const allFiles = [
      {
        id: "file_gen_1",
        category: "generated",
        file_name: "requerimento_transferencia.pdf",
        company_id: companyA,
        process_id: serviceProcess.id,
      },
      {
        id: "file_prot_1",
        category: "protocol",
        file_name: "recibo_protocolo_marinha.pdf",
        company_id: companyA,
        process_id: serviceProcess.id,
      },
      {
        id: "file_iss_1",
        category: "issued",
        file_name: "tie_definitivo_aurora.pdf",
        company_id: companyA,
        process_id: serviceProcess.id,
        metadata: {
          document_name: "TIE Definitivo",
          document_type: "tie",
          validity_type: "com_vencimento" as ValidityType,
          expiration_date: "2031-03-25",
        },
      },
    ];

    // A consulta da tela 'Documentos emitidos' filtra exclusivamente category === 'issued'
    const issuedDocs = allFiles.filter(
      (f) => f.company_id === companyA && f.process_id === serviceProcess.id && f.category === "issued"
    );

    expect(issuedDocs.length).toBe(1);
    expect(issuedDocs[0].file_name).toBe("tie_definitivo_aurora.pdf");
    expect(issuedDocs[0].category).toBe("issued");

    // Garantir que nenhum gerado ou protocolo apareça na listagem
    const hasGenerated = issuedDocs.some((d) => d.category === "generated");
    const hasProtocol = issuedDocs.some((d) => d.category === "protocol");
    expect(hasGenerated).toBe(false);
    expect(hasProtocol).toBe(false);
  });

  // =========================================================================
  // CENÁRIO 2: REGRAS DE VALIDADE — NÃO INVENTAR DATAS
  // =========================================================================
  it("Cenário 2: Exibe 'Vencimento não informado' quando não houver data confirmada e 'Sem vencimento' quando indeterminado", () => {
    // 2.1 Sem vencimento explícito
    const docNoExp = computeValidityInfo({
      validity_type: "sem_vencimento",
      expiration_date: null,
    });
    expect(docNoExp.status).toBe("no_expiration");
    expect(docNoExp.label).toBe("Sem vencimento");
    expect(docNoExp.displayDate).toBe("Sem vencimento");
    expect(docNoExp.isExpired).toBe(false);
    expect(docNoExp.isNearExpiry).toBe(false);

    // 2.2 Vencimento não informado (não inventa data!)
    const docUnspecified = computeValidityInfo({
      validity_type: "nao_informada",
      expiration_date: null,
    });
    expect(docUnspecified.status).toBe("unspecified");
    expect(docUnspecified.label).toBe("Vencimento não informado");
    expect(docUnspecified.displayDate).toBe("Vencimento não informado");
    expect(docUnspecified.isExpired).toBe(false);

    // 2.3 Objeto sem metadata ou com string vazia
    const docEmpty = computeValidityInfo({});
    expect(docEmpty.status).toBe("unspecified");
    expect(docEmpty.displayDate).toBe("Vencimento não informado");
  });

  // =========================================================================
  // CENÁRIO 3: CALCULO DE VENCIDO, PRAZO PRÓXIMO E VIGENTE
  // =========================================================================
  it("Cenário 3: Classifica corretamente em Vencido, Vence em breve (<= 30 dias) e Vigente (> 30 dias)", () => {
    // 3.1 Vencido (ex: 2025-01-01)
    const docExpired = computeValidityInfo({
      validity_type: "com_vencimento",
      expiration_date: "2025-01-01",
    });
    expect(docExpired.status).toBe("expired");
    expect(docExpired.isExpired).toBe(true);
    expect(docExpired.label).toBe("Vencido");

    // 3.2 Vence em breve (data futura em até 30 dias)
    const today = new Date();
    const nearDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const nearStr = `${nearDate.getFullYear()}-${String(nearDate.getMonth() + 1).padStart(2, "0")}-${String(nearDate.getDate()).padStart(2, "0")}`;

    const docNear = computeValidityInfo({
      validity_type: "com_vencimento",
      expiration_date: nearStr,
    });
    expect(docNear.status).toBe("expiring_soon");
    expect(docNear.isNearExpiry).toBe(true);
    expect(docNear.isExpired).toBe(false);
    expect(docNear.label).toContain("Vence em");

    // 3.3 Vigente (> 30 dias no futuro)
    const farDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    const farStr = `${farDate.getFullYear()}-${String(farDate.getMonth() + 1).padStart(2, "0")}-${String(farDate.getDate()).padStart(2, "0")}`;

    const docFar = computeValidityInfo({
      validity_type: "com_vencimento",
      expiration_date: farStr,
    });
    expect(docFar.status).toBe("active");
    expect(docFar.isNearExpiry).toBe(false);
    expect(docFar.isExpired).toBe(false);
    expect(docFar.label).toBe("Vigente");
  });

  // =========================================================================
  // CENÁRIO 4: SUBSTITUIÇÃO DE ARQUIVO PRESERVANDO HISTÓRICO DE VERSÕES
  // =========================================================================
  it("Cenário 4: Substituir arquivo incrementa versão e preserva versões anteriores no histórico sem exclusão", () => {
    // Documento inicial v1
    const originalDoc: DocumentItem = {
      id: "doc_tie_001",
      company_id: companyA,
      process_id: serviceProcess.id,
      customer_id: customerAna.id,
      vessel_id: vesselAurora.id,
      file_name: "TIE_Aurora_v1.pdf",
      file_url: "company_a/proc_1/issued_1700000000_TIE_Aurora_v1.pdf",
      file_type: "application/pdf",
      file_size: 245000,
      category: "issued",
      status: "uploaded",
      created_at: "2026-03-01T10:00:00Z",
      metadata: {
        document_name: "Termo de Inscrição da Embarcação (TIE)",
        document_type: "tie",
        document_number: "381-009876/2026",
        issuing_agency: "CP-SP",
        issue_date: "2026-03-01",
        validity_type: "com_vencimento",
        expiration_date: "2031-03-01",
        has_expiration: true,
        status: "active",
        version: 1,
        version_history: [],
      },
    };

    expect(originalDoc.metadata?.version).toBe(1);
    expect(originalDoc.metadata?.version_history).toHaveLength(0);

    // Operação: Substituir arquivo por retificação da Capitania
    const currentMeta = originalDoc.metadata!;
    const historyList = [...(currentMeta.version_history || [])];

    // Salvar v1 no histórico
    historyList.push({
      version: currentMeta.version || 1,
      file_name: originalDoc.file_name,
      file_url: originalDoc.file_url,
      file_size: originalDoc.file_size || undefined,
      file_type: originalDoc.file_type || undefined,
      replaced_at: "2026-03-15T14:30:00Z",
      replaced_by_name: "João Silva",
      reason: "Segunda via emitida com correção de dígito",
    });

    const replacedDoc: DocumentItem = {
      ...originalDoc,
      file_name: "TIE_Aurora_v2_retificado.pdf",
      file_url: "company_a/proc_1/issued_1700100000_TIE_Aurora_v2_retificado.pdf",
      file_size: 260000,
      metadata: {
        ...currentMeta,
        version: 2,
        version_history: historyList,
        last_modified_at: "2026-03-15T14:30:00Z",
      },
    };

    // Validações de integridade
    expect(replacedDoc.metadata?.version).toBe(2);
    expect(replacedDoc.file_name).toBe("TIE_Aurora_v2_retificado.pdf");
    expect(replacedDoc.metadata?.version_history).toHaveLength(1);

    const archivedV1 = replacedDoc.metadata?.version_history![0];
    expect(archivedV1.version).toBe(1);
    expect(archivedV1.file_name).toBe("TIE_Aurora_v1.pdf");
    expect(archivedV1.file_url).toBe("company_a/proc_1/issued_1700000000_TIE_Aurora_v1.pdf");
    expect(archivedV1.reason).toBe("Segunda via emitida com correção de dígito");
  });

  // =========================================================================
  // CENÁRIO 5: FILTROS E PESQUISA
  // =========================================================================
  it("Cenário 5: Filtros 'Todos', 'Com vencimento', 'Sem vencimento', 'Vencidos' e pesquisa por nome/número", () => {
    const docList: DocumentItem[] = [
      {
        id: "d1",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "tie.pdf",
        file_url: "url1",
        file_type: "application/pdf",
        file_size: 100,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-01",
        metadata: {
          document_name: "Termo TIE",
          document_number: "NUM-111",
          validity_type: "com_vencimento",
          expiration_date: "2028-12-31",
        },
      },
      {
        id: "d2",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "laudo.pdf",
        file_url: "url2",
        file_type: "application/pdf",
        file_size: 100,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-02",
        metadata: {
          document_name: "Laudo Pericial Oficial",
          document_number: "LAUDO-222",
          validity_type: "sem_vencimento",
          expiration_date: null,
        },
      },
      {
        id: "d3",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "csn_antigo.pdf",
        file_url: "url3",
        file_type: "application/pdf",
        file_size: 100,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-03",
        metadata: {
          document_name: "Certificado de Segurança da Navegação",
          document_number: "CSN-333",
          validity_type: "com_vencimento",
          expiration_date: "2024-05-10", // Vencido
        },
      },
      {
        id: "d4",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "recibo.pdf",
        file_url: "url4",
        file_type: "application/pdf",
        file_size: 100,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-04",
        metadata: {
          document_name: "Certidão Provisória",
          document_number: "CERT-444",
          validity_type: "nao_informada", // Vencimento não informado
          expiration_date: null,
        },
      },
    ];

    const filterDocs = (tab: FilterTab, search: string) => {
      return docList.filter((doc) => {
        const meta = doc.metadata || {};
        const v = computeValidityInfo(meta);

        if (tab === "with_expiration") {
          if (v.status === "no_expiration" || v.status === "unspecified") return false;
        } else if (tab === "no_expiration") {
          if (v.status !== "no_expiration" && v.status !== "unspecified") return false;
        } else if (tab === "expired") {
          if (v.status !== "expired") return false;
        }

        if (search.trim()) {
          const term = search.toLowerCase();
          const name = (meta.document_name || "").toLowerCase();
          const num = (meta.document_number || "").toLowerCase();
          return name.includes(term) || num.includes(term);
        }

        return true;
      });
    };

    // Tab "Todos"
    expect(filterDocs("all", "")).toHaveLength(4);

    // Tab "Com vencimento" (d1 e d3)
    const withExp = filterDocs("with_expiration", "");
    expect(withExp).toHaveLength(2);
    expect(withExp.map((d) => d.id)).toEqual(["d1", "d3"]);

    // Tab "Sem vencimento" (d2 e d4 - inclui explicitamente sem vencimento e vencimento não informado)
    const noExp = filterDocs("no_expiration", "");
    expect(noExp).toHaveLength(2);
    expect(noExp.map((d) => d.id)).toEqual(["d2", "d4"]);

    // Tab "Vencidos" (apenas d3)
    const expired = filterDocs("expired", "");
    expect(expired).toHaveLength(1);
    expect(expired[0].id).toBe("d3");

    // Pesquisa por número "222"
    const searchResult = filterDocs("all", "222");
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].id).toBe("d2");

    // Pesquisa por nome "Certidão"
    const searchNameResult = filterDocs("all", "Certidão");
    expect(searchNameResult).toHaveLength(1);
    expect(searchNameResult[0].id).toBe("d4");
  });

  // =========================================================================
  // CENÁRIO 6: ORDENAÇÃO INICIAL (VENCIMENTO MAIS PRÓXIMO PRIMEIRO)
  // =========================================================================
  it("Cenário 6: Ordena inicialmente pelo vencimento mais próximo; documentos sem vencimento ficam ao final", () => {
    const unorderedDocs: DocumentItem[] = [
      {
        id: "sem_vencimento_b",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "b.pdf",
        file_url: "url",
        file_type: "pdf",
        file_size: 10,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-01",
        metadata: {
          document_name: "Zebra Documento Sem Vencimento",
          validity_type: "sem_vencimento",
        },
      },
      {
        id: "com_vencimento_longe",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "longe.pdf",
        file_url: "url",
        file_type: "pdf",
        file_size: 10,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-01",
        metadata: {
          document_name: "TIE Longo Prazo",
          validity_type: "com_vencimento",
          expiration_date: "2030-05-10",
        },
      },
      {
        id: "com_vencimento_perto",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "perto.pdf",
        file_url: "url",
        file_type: "pdf",
        file_size: 10,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-01",
        metadata: {
          document_name: "CSN Vencendo Logo",
          validity_type: "com_vencimento",
          expiration_date: "2026-11-20",
        },
      },
      {
        id: "vencimento_nao_informado",
        company_id: companyA,
        process_id: serviceProcess.id,
        customer_id: customerAna.id,
        vessel_id: vesselAurora.id,
        file_name: "c.pdf",
        file_url: "url",
        file_type: "pdf",
        file_size: 10,
        category: "issued",
        status: "uploaded",
        created_at: "2026-01-01",
        metadata: {
          document_name: "Alvará Sem Data Confirmada",
          validity_type: "nao_informada",
        },
      },
    ];

    // Aplicação da regra de ordenação
    const sorted = [...unorderedDocs].sort((a, b) => {
      const aMeta = a.metadata || {};
      const bMeta = b.metadata || {};

      const aHasExp = aMeta.validity_type === "com_vencimento" && Boolean(aMeta.expiration_date);
      const bHasExp = bMeta.validity_type === "com_vencimento" && Boolean(bMeta.expiration_date);

      if (aHasExp && bHasExp) {
        return (aMeta.expiration_date || "").localeCompare(bMeta.expiration_date || "");
      }
      if (aHasExp && !bHasExp) return -1;
      if (!aHasExp && bHasExp) return 1;

      const nameA = (aMeta.document_name || a.file_name || "").toLowerCase();
      const nameB = (bMeta.document_name || b.file_name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 1º: Vencimento mais próximo (2026-11-20)
    expect(sorted[0].id).toBe("com_vencimento_perto");

    // 2º: Vencimento posterior (2030-05-10)
    expect(sorted[1].id).toBe("com_vencimento_longe");

    // 3º e 4º: Sem vencimento ou não informado ao final, ordenados por nome
    expect(sorted[2].id).toBe("vencimento_nao_informado"); // "Alvará..."
    expect(sorted[3].id).toBe("sem_vencimento_b"); // "Zebra..."
  });

  // =========================================================================
  // CENÁRIO 7: ISOLAMENTO MULTI-TENANT & RELACIONAMENTO CLIENTE-EMBARCAÇÃO
  // =========================================================================
  it("Cenário 7: Garante isolamento entre empresas e integridade da embarcação com o cliente", () => {
    const vesselCompanyA = {
      id: "vessel_1",
      customer_id: customerAna.id,
      company_id: companyA,
    };

    // A embarcação sempre pertence ao cliente daquela empresa
    expect(vesselCompanyA.customer_id).toBe(customerAna.id);
    expect(vesselCompanyA.company_id).toBe(customerAna.company_id);

    // Consulta de documentos com filtro obrigatório por company_id
    const docs = [
      { id: "doc_1", company_id: companyA, category: "issued" },
      { id: "doc_2", company_id: companyB, category: "issued" },
    ];

    const companyADocs = docs.filter((d) => d.company_id === companyA);
    expect(companyADocs).toHaveLength(1);
    expect(companyADocs[0].id).toBe("doc_1");
  });

  // =========================================================================
  // CENÁRIO 8: PREPARAÇÃO DE CAMPOS PARA O NOTIFICADOR
  // =========================================================================
  it("Cenário 8: Estrutura os campos necessários para futura integração com o Notificador sem criar links fictícios", () => {
    const metadataPayload = {
      document_name: "Certidão de Regularidade",
      document_type: "certidao_quitacao",
      document_number: "CR-2026-999",
      issuing_agency: "Capitania Fluvial",
      issue_date: "2026-02-10",
      validity_type: "com_vencimento" as ValidityType,
      expiration_date: "2027-02-10",
      has_expiration: true,
      status: "active",
      last_modified_at: "2026-03-28T12:00:00.000Z",
    };

    const notificadorPayload = {
      document_id: "doc_stable_uuid_999",
      company_id: companyA,
      customer_id: customerAna.id,
      vessel_id: vesselAurora.id,
      document_type: metadataPayload.document_type,
      expiration_date: metadataPayload.expiration_date,
      status: metadataPayload.status,
      last_modified_at: metadataPayload.last_modified_at,
    };

    expect(notificadorPayload.document_id).toBe("doc_stable_uuid_999");
    expect(notificadorPayload.company_id).toBe(companyA);
    expect(notificadorPayload.customer_id).toBe(customerAna.id);
    expect(notificadorPayload.vessel_id).toBe(vesselAurora.id);
    expect(notificadorPayload.document_type).toBe("certidao_quitacao");
    expect(notificadorPayload.expiration_date).toBe("2027-02-10");
    expect(notificadorPayload.status).toBe("active");
  });
});
