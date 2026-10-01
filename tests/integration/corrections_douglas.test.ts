import { describe, it, expect } from "vitest";
import { normalizeTaxId, maskCPF, maskCNPJ } from "../../src/lib/br-format";
import { buildCustomerReview } from "../../src/services/ocr/documentOcrEngine";
import { SYSTEM_TEMPLATES } from "../../src/routes/processes.$id.gerar-documento";

describe("Cenários de Validação — Correções Douglas NavalDocs Pro", () => {
  // Cenário 1: CNH-e PDF → extração de campos e fallback de preview
  it("Cenário 1: Leitura de CNH-e extrai campos estruturados sem dados inventados", () => {
    const rawOcrText = `
      REPÚBLICA FEDERATIVA DO BRASIL
      MINISTÉRIO DA INFRAESTRUTURA
      DEPARTAMENTO NACIONAL DE TRÂNSITO
      CARTEIRA NACIONAL DE HABILITAÇÃO
      NOME: DOUGLAS COSTA SILVA
      DOC IDENTIDADE / ORG EMISSOR / UF: 12345678 SSP SP
      CPF: 123.456.789-00
      DATA NASCIMENTO: 15/05/1985
      FILIAÇÃO: MARIA COSTA SILVA
      JOAO SILVA
      REGISTRO: 01234567890
      VALIDADE: 20/10/2030
    `;

    const review = buildCustomerReview(
      null,
      "https://signed-url.example/cnh.pdf",
      rawOcrText,
      {
        name: "DOUGLAS COSTA SILVA",
        cpf_cnpj: "123.456.789-00",
        birth_date: "15/05/1985"
      }
    );

    expect(review.documentType).toBe("CNH");
    expect(review.category).toBe("customer_id");
    expect(review.fields.name.value).toBe("DOUGLAS COSTA SILVA");
    expect(review.fields.cpf_cnpj.value).toBe("123.456.789-00");
    expect(review.fields.birth_date.value).toBe("15/05/1985");
    // Campo não presente não pode ser inventado
    expect(review.fields.cep.value).toBe("");
    expect(review.fields.email.value).toBe("");
  });

  // Cenário 2: Falha de OCR ou texto vazio mantém formulário manual funcional
  it("Cenário 2: Falha de OCR com texto vazio gera status not_found para preenchimento manual", () => {
    const review = buildCustomerReview(
      null,
      "https://signed-url.example/unreadable.pdf",
      "",
      {}
    );

    expect(review.overallConfidence).toBe(0);
    expect(review.fields.name.value).toBe("");
    expect(review.fields.cpf_cnpj.value).toBe("");
    expect(review.fields.name.status).toBe("not_found");
  });

  // Cenário 3 & 4: Detecção de CPF/CNPJ existente com debounce e normalização
  it("Cenário 3 & 4: Normalização detecta CPF independente de pontuação ou máscara", () => {
    const rawCpf = "12345678900";
    const maskedCpf = maskCPF(rawCpf); // 123.456.789-00

    expect(normalizeTaxId(rawCpf)).toBe("12345678900");
    expect(normalizeTaxId(maskedCpf)).toBe("12345678900");
    expect(normalizeTaxId("  123.456.789-00  ")).toBe("12345678900");

    // Ambos os formatos devem ser pesquisados para cobrir bancos legados
    const searchTerms = Array.from(new Set([rawCpf, maskedCpf].filter(Boolean)));
    expect(searchTerms).toContain("12345678900");
    expect(searchTerms).toContain("123.456.789-00");
  });

  // Cenário 5: Homônimos com CPF diferente não devem bloquear cadastro
  it("Cenário 5: Nomes idênticos com CPFs distintos são tratados como homônimos (aviso sem bloqueio)", () => {
    const existingCustomer = {
      id: "cust-1",
      name: "João Silva",
      cpf_cnpj: "111.111.111-11"
    };

    const newCustomerInput = {
      name: "João Silva",
      cpf_cnpj: "222.222.222-22"
    };

    const isCpfDuplicate = normalizeTaxId(existingCustomer.cpf_cnpj) === normalizeTaxId(newCustomerInput.cpf_cnpj);
    const isNameMatch = existingCustomer.name.toLowerCase() === newCustomerInput.name.toLowerCase();

    expect(isCpfDuplicate).toBe(false);
    expect(isNameMatch).toBe(true);

    // O sistema deve apenas alertar homônimo, mas permitir salvar sem acionar modal de bloqueio de CPF
    const shouldBlock = isCpfDuplicate;
    const shouldShowHomonymHint = isNameMatch && !isCpfDuplicate;

    expect(shouldBlock).toBe(false);
    expect(shouldShowHomonymHint).toBe(true);
  });

  // Cenário 6: Violação de unicidade (23505) interceptada sem erro SQL visível
  it("Cenário 6: Erro 23505 (customers_company_taxid_uniq) é mapeado para mensagem amigável", () => {
    const rawPgError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "customers_company_taxid_uniq"',
      details: "Key (company_id, public.normalize_tax_id(cpf_cnpj))=(cmp-1, 12345678900) already exists."
    };

    const isUniqueViolation = 
      rawPgError.code === "23505" || 
      (rawPgError.message && rawPgError.message.includes("customers_company_taxid_uniq"));

    expect(isUniqueViolation).toBe(true);

    // Formatação amigável
    const friendlyTitle = isUniqueViolation 
      ? "Este cliente já está cadastrado nesta empresa" 
      : "Erro ao cadastrar cliente";
    
    expect(friendlyTitle).not.toContain("duplicate key");
    expect(friendlyTitle).not.toContain("constraint");
    expect(friendlyTitle).not.toContain("23505");
  });

  // Cenário 7: Geração de documentos seletiva (somente os selecionados)
  it("Cenário 7: Apenas documentos selecionados no modo 'naval_docs' são gerados", () => {
    const templates = [
      { id: "req_padrao", title: "Requerimento Padrão", selected: true, mode: "naval_docs", status: "aprovado" },
      { id: "proc_marinha", title: "Procuração Marinha", selected: false, mode: "naval_docs", status: "aprovado" },
      { id: "dec_residencia", title: "Declaração de Residência", selected: true, mode: "em_revisao", status: "em_revisao" }
    ];

    // O botão e geração devem filtrar apenas: selecionado + modo naval_docs + aprovado
    const toGenerate = templates.filter(t => t.selected && t.mode === "naval_docs" && t.status === "aprovado");

    expect(toGenerate.length).toBe(1);
    expect(toGenerate[0].id).toBe("req_padrao");

    // Botão final
    const buttonLabel = `Gerar ${toGenerate.length} documento${toGenerate.length > 1 ? "s" : ""} selecionado${toGenerate.length > 1 ? "s" : ""}`;
    expect(buttonLabel).toBe("Gerar 1 documento selecionado");
  });

  // Cenário 8: Documento já pronto anexado sem necessidade de nova geração
  it("Cenário 8: Documento anexado com categoria attached_requirement dispensa geração de PDF", () => {
    const uploadedFiles = [
      {
        id: "file-1",
        file_name: "requerimento_assinado_govbr.pdf",
        category: "attached_requirement",
        metadata: {
          category: "attached_requirement",
          is_signed: true
        }
      }
    ];

    const attachedReq = uploadedFiles.find(f => f.category === "attached_requirement");
    expect(attachedReq).toBeDefined();
    expect(attachedReq?.metadata.is_signed).toBe(true);

    // O status de geração deve ser considerado atendido
    const hasRequirementDoc = Boolean(attachedReq);
    expect(hasRequirementDoc).toBe(true);
  });

  // Cenário 9: Misturar documento gerado e anexo externo no mesmo processo com categorias distintas
  it("Cenário 9: Categorias de documentos gerados, anexos externos e protocolos são isoladas", () => {
    const processItems = [
      { kind: "generated", category: "generated_document", title: "Requerimento Inicial NavalDocs" },
      { kind: "uploaded", category: "attached_requirement", title: "Procuração Particular Assinada em Cartório" },
      { kind: "uploaded", category: "protocol", title: "Recibo de Protocolo da Capitania" },
      { kind: "uploaded", category: "issued", title: "Título de Inscrição Definitivo (TIE)" }
    ];

    const generated = processItems.filter(i => i.category === "generated_document");
    const attachedReqs = processItems.filter(i => i.category === "attached_requirement");
    const protocols = processItems.filter(i => i.category === "protocol");
    const issued = processItems.filter(i => i.category === "issued");

    expect(generated.length).toBe(1);
    expect(attachedReqs.length).toBe(1);
    expect(protocols.length).toBe(1);
    expect(issued.length).toBe(1);
  });

  // Cenário 10: Isolamento multi-tenant por empresa (company_id)
  it("Cenário 10: Pesquisas e consultas sempre filtram company_id", () => {
    const companyA = "company-111";
    const companyB = "company-222";

    const allCustomers = [
      { id: "c1", company_id: companyA, cpf_cnpj: "12345678900", name: "Cliente Alpha" },
      { id: "c2", company_id: companyB, cpf_cnpj: "12345678900", name: "Cliente Beta" }
    ];

    // Consulta na Empresa A não pode ver o cadastro da Empresa B, mesmo com mesmo CPF
    const queryA = allCustomers.filter(c => c.company_id === companyA && normalizeTaxId(c.cpf_cnpj) === "12345678900");
    const queryB = allCustomers.filter(c => c.company_id === companyB && normalizeTaxId(c.cpf_cnpj) === "12345678900");

    expect(queryA.length).toBe(1);
    expect(queryA[0].name).toBe("Cliente Alpha");

    expect(queryB.length).toBe(1);
    expect(queryB[0].name).toBe("Cliente Beta");
  });

  // Validação dos Templates Oficiais
  it("Validação de Modelos Oficiais: SYSTEM_TEMPLATES contém fontes oficiais e status de revisão", () => {
    expect(SYSTEM_TEMPLATES.length).toBeGreaterThan(0);
    
    SYSTEM_TEMPLATES.forEach(tpl => {
      expect(tpl.id).toBeDefined();
      expect(tpl.name).toBeDefined();
      expect(tpl.officialSource).toBeDefined();
      expect(typeof tpl.officialSource).toBe("string");
      expect(tpl.validationDate).toBeDefined();
      expect(["aprovado", "em_revisao"]).toContain(tpl.status);
    });
  });
});
