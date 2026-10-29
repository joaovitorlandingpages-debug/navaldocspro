import { describe, it, expect } from "vitest";
import { buildOrderDocuments } from "@/routes/processes.visualizar-e-editar";
import { buildDynamicServiceGroups } from "@/routes/processes.arquivos-gerados";
import { OUTPUT_DOCS_CATALOG } from "@/routes/processes.novo-pedido";

describe("Auditoria e Fluxo Documental Documento por Documento", () => {
  const customerName = "Marina Costa";
  const vesselName = "Mar Azul";

  it("1. Auditoria das fontes oficiais: cada modelo possui classificação de documento, fonte e assinaturas", () => {
    expect(OUTPUT_DOCS_CATALOG.length).toBeGreaterThanOrEqual(8);

    OUTPUT_DOCS_CATALOG.forEach((doc) => {
      // Diferenciação obrigatória de natureza
      expect(["official_form", "platform_generated"]).toContain(doc.documentType);
      // Fonte oficial e data de edição
      expect(doc.officialSource).toBeDefined();
      expect(doc.officialSource.length).toBeGreaterThan(5);
      expect(doc.sourceUrl).toMatch(/^https?:\/\//);
      expect(doc.editionDate).toBeDefined();
      // Requisitos e assinaturas
      expect(doc.purpose).toBeDefined();
      expect(doc.signerRole).toBeDefined();
      expect(doc.personalDataFields.length).toBeGreaterThan(0);
      if (doc.serviceId !== "habilitacao_cha") {
        expect(doc.vesselDataFields.length).toBeGreaterThan(0);
      }
      expect(doc.attachments.length).toBeGreaterThan(0);
    });
  });

  it("2. Seleção isolada de Inscrição Inicial gera exclusivamente os 3 documentos regulamentares previstos", () => {
    const docs = buildOrderDocuments(["inscricao"], customerName, vesselName);

    expect(docs).toHaveLength(3);
    const docIds = docs.map(d => d.id);
    expect(docIds).toContain("doc_req_inscricao");
    expect(docIds).toContain("doc_bsade");
    expect(docIds).toContain("doc_procuracao");

    // Não deve conter documentos de outros serviços
    expect(docIds).not.toContain("doc_req_transf");
    expect(docIds).not.toContain("doc_decl_transf");
    expect(docIds).not.toContain("doc_req_renov");
    expect(docIds).not.toContain("doc_termo_motor");
  });

  it("3. Controle do Usuário: se usuário desmarcar BSADE e Procuração, gera exclusivamente o Requerimento de Inscrição", () => {
    const selectedDocIds = ["doc_req_inscricao"];
    const docs = buildOrderDocuments(["inscricao"], customerName, vesselName, selectedDocIds);

    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe("doc_req_inscricao");
    expect(docs[0].title).toBe("Requerimento de Inscrição Inicial");
  });

  it("4. Arquivos Gerados: filtra rigorosamente para conter apenas os documentos explicitamente selecionados", () => {
    // Caso 1: Usuário selecionou gerar apenas o BSADE
    const groupsSoloBsade = buildDynamicServiceGroups(
      ["inscricao"],
      customerName,
      vesselName,
      true,
      ["doc_bsade"]
    );

    expect(groupsSoloBsade).toHaveLength(1);
    expect(groupsSoloBsade[0].files).toHaveLength(1);
    expect(groupsSoloBsade[0].files[0].id).toBe("doc_bsade");
    expect(groupsSoloBsade[0].files[0].name).toBe("BSADE-inscricao.pdf");

    // Caso 2: Usuário selecionou Requerimento + Procuração
    const groupsCombo = buildDynamicServiceGroups(
      ["inscricao"],
      customerName,
      vesselName,
      true,
      ["doc_req_inscricao", "doc_procuracao"]
    );

    expect(groupsCombo).toHaveLength(1);
    expect(groupsCombo[0].files).toHaveLength(2);
    const generatedIds = groupsCombo[0].files.map(f => f.id);
    expect(generatedIds).toContain("doc_req_inscricao");
    expect(generatedIds).toContain("doc_procuracao");
    expect(generatedIds).not.toContain("doc_bsade");
  });

  it("5. Requisitos por documento diferenciam 'preenchimento do PDF' de 'protocolo na Capitania'", () => {
    const reqInscricao = OUTPUT_DOCS_CATALOG.find(d => d.id === "doc_req_inscricao");
    expect(reqInscricao).toBeDefined();

    const nfCasco = reqInscricao?.attachments.find(a => a.id === "doc-nf-casco");
    expect(nfCasco?.isProtocolOnly).toBe(false); // Preenchimento do PDF

    const fotos = reqInscricao?.attachments.find(a => a.id === "doc-fotos-embarcacao");
    expect(fotos?.isProtocolOnly).toBe(true); // Exigido apenas para protocolo

    // Anexo compartilhado reusável entre documentos sem duplicar upload
    expect(nfCasco?.sharedWithDocIds).toContain("doc_bsade");
  });

  it("6. Não exige documentos de transferência nem de motor quando o serviço for somente Inscrição Inicial", () => {
    const inscricaoDocs = OUTPUT_DOCS_CATALOG.filter(d => d.serviceId === "inscricao");
    
    // Todos os anexos exigidos para os documentos de inscrição
    const allInscricaoAttachments = inscricaoDocs.flatMap(d => d.attachments.map(a => a.id));
    
    expect(allInscricaoAttachments).not.toContain("doc-embarcacao-transf");
    expect(allInscricaoAttachments).not.toContain("doc-comprador");
    expect(allInscricaoAttachments).not.toContain("doc-vendedor");
    expect(allInscricaoAttachments).not.toContain("doc-motor-alt");
  });

  it("7. Geração de Segunda Via, Vistoria, Habilitação CHA e Alteração Cadastral", () => {
    // Segunda via
    const docsSegundaVia = buildOrderDocuments(["segunda_via"], customerName, vesselName);
    expect(docsSegundaVia.map(d => d.id)).toEqual(["doc_req_segunda_via", "doc_decl_perda"]);

    // Vistoria
    const docsVistoria = buildOrderDocuments(["vistoria"], customerName, vesselName);
    expect(docsVistoria.map(d => d.id)).toEqual(["doc_req_vistoria"]);

    // CHA Amador
    const docsCha = buildOrderDocuments(["habilitacao_cha"], customerName, "");
    expect(docsCha.map(d => d.id)).toEqual(["doc_req_cha"]);

    // Alteração Cadastral
    const docsAltCad = buildOrderDocuments(["alteracao_cadastral"], customerName, "");
    expect(docsAltCad.map(d => d.id)).toEqual(["doc_req_alteracao_cadastral"]);
  });

  it("8. Embarcação Comercial utiliza NORMAM-201 e não aplica automaticamente modelo de esporte e recreio", () => {
    const comercialDoc = OUTPUT_DOCS_CATALOG.find(d => d.id === "doc_req_comercial");
    expect(comercialDoc).toBeDefined();
    expect(comercialDoc?.officialSource).toContain("NORMAM-201/DPC");
    expect(comercialDoc?.officialSource).not.toContain("NORMAM-211/DPC");

    const docsComercial = buildOrderDocuments(
      ["inscricao"],
      "Oceanic Brasil Navegação LTDA",
      "Cargueiro Atlântico Sul",
      ["doc_req_comercial"]
    );
    expect(docsComercial).toHaveLength(1);
    expect(docsComercial[0].id).toBe("doc_req_comercial");
    expect(docsComercial[0].title).toBe("Requerimento de Embarcação Comercial / Profissional");
  });

  it("9. Isolamento rigoroso entre pedidos consecutivos com pessoas e embarcações distintas", () => {
    // Pedido 1
    const p1Docs = buildOrderDocuments(["inscricao"], "Marina Costa", "Mar Azul");
    expect(p1Docs[0].customerName).toBe("Marina Costa");
    expect(p1Docs[0].vesselName).toBe("Mar Azul");

    // Pedido 2
    const p2Docs = buildOrderDocuments(["transferencia"], "Carlos Ramos", "Vento Forte");
    expect(p2Docs[0].customerName).toBe("Carlos Ramos");
    expect(p2Docs[0].vesselName).toBe("Vento Forte");

    // Garantir que p2 não herdou nada de p1
    expect(p2Docs.map(d => d.customerName)).not.toContain("Marina Costa");
    expect(p2Docs.map(d => d.vesselName)).not.toContain("Mar Azul");
  });
});
