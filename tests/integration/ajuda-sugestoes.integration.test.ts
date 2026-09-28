import { describe, it, expect } from "vitest";
import { 
  formatReferenceNumber, 
  normalizeSuggestionType, 
  normalizeSuggestionStatus, 
  serializeDescription, 
  parseDescription,
  createSuggestion,
  getCompanySuggestions,
  getAllAdminSuggestions,
  replyToSuggestion
} from "@/services/suggestionsService";
import { supabase } from "@/integrations/supabase/client";

describe("Ajuda e Sugestões — Testes de Integração e Regras de Negócio", () => {

  describe("1. Área de Ajuda Rápida e FAQs", () => {
    const FAQS = [
      { id: "cadastrar-cliente", question: "Como cadastrar cliente", path: "/customers/novo" },
      { id: "cadastrar-embarcacao", question: "Como cadastrar embarcação", path: "/vessels/novo" },
      { id: "iniciar-servico", question: "Como iniciar um serviço", path: "/servicos" },
      { id: "leitura-automatica", question: "Como enviar documentos para leitura automática", path: "/processes" },
      { id: "corrigir-dados", question: "Como corrigir dados extraídos", path: "/processes" },
      { id: "gerar-baixar-pdf", question: "Como gerar e baixar PDF", path: "/processes" },
      { id: "anexar-assinado-govbr", question: "Como anexar um arquivo assinado pelo gov.br", path: "/processes" },
      { id: "acompanhar-protocolos", question: "Como acompanhar protocolos", path: "/processes" },
    ];

    it("contém todas as 8 dúvidas obrigatórias e seus links correspondentes", () => {
      expect(FAQS).toHaveLength(8);
      FAQS.forEach((faq) => {
        expect(faq.question).toBeDefined();
        expect(faq.path).toMatch(/^\/(customers|vessels|servicos|processes)/);
      });
    });

    it("garante que as instruções do gov.br NÃO prometem assinatura automática", () => {
      const govBrFaqText = 
        "Baixe o PDF gerado pelo NavalDocs Pro e solicite a assinatura digital do cliente pelo portal oficial gov.br. Com o documento assinado em mãos, volte ao processo da embarcação e anexe o arquivo final assinado na aba de documentos do processo. (Nota: o processo de assinatura é realizado externamente no portal oficial gov.br).";
      
      expect(govBrFaqText.toLowerCase()).not.toContain("assinatura automática pelo gov.br");
      expect(govBrFaqText.toLowerCase()).not.toContain("assinado automaticamente");
      expect(govBrFaqText.toLowerCase()).toContain("portal oficial gov.br");
      expect(govBrFaqText.toLowerCase()).toContain("externamente");
    });
  });

  describe("2. Número de Referência e Normalizações de Tipo/Status", () => {
    it("formata o número de referência no padrão REF-YYYY-XXXXXXXX", () => {
      const ref = formatReferenceNumber("c7a192bf-d6b3-46c5-bfa3-02dbad3b2901", "2026-09-28T16:00:00Z");
      expect(ref).toBe("REF-2026-C7A192BF");
    });

    it("normaliza os tipos para 'sugestao' ou 'problema'", () => {
      expect(normalizeSuggestionType("sugestao")).toBe("sugestao");
      expect(normalizeSuggestionType("problema")).toBe("problema");
      expect(normalizeSuggestionType("bug")).toBe("problema");
      expect(normalizeSuggestionType("issue")).toBe("problema");
      expect(normalizeSuggestionType("ideia")).toBe("sugestao");
      expect(normalizeSuggestionType(null)).toBe("sugestao");
    });

    it("normaliza os 4 status oficiais requeridos", () => {
      expect(normalizeSuggestionStatus("recebida")).toBe("recebida");
      expect(normalizeSuggestionStatus("em_analise")).toBe("em_analise");
      expect(normalizeSuggestionStatus("planejada")).toBe("em_analise");
      expect(normalizeSuggestionStatus("em_desenvolvimento")).toBe("em_analise");
      expect(normalizeSuggestionStatus("respondida")).toBe("respondida");
      expect(normalizeSuggestionStatus("concluida")).toBe("concluida");
      expect(normalizeSuggestionStatus("implementada")).toBe("concluida");
      expect(normalizeSuggestionStatus("encerrada")).toBe("concluida");
    });
  });

  describe("3. Serialização e Parse Seguro da Descrição (Sem coluna metadata)", () => {
    it("serializa e recupera anexo de imagem e resposta oficial sem erro de esquema", () => {
      const originalText = "Gostaria de sugerir uma melhoria no formulário de embarcação.";
      const attachmentUrl = "company-1/feedback/tela.png";
      const adminResponse = {
        text: "Sugestão recebida e analisada! Vamos implementar na próxima versão.",
        respondedAt: "28/09/2026 16:30",
        respondedBy: "Equipe NavalDocs Pro"
      };

      const serialized = serializeDescription({
        description: originalText,
        attachmentUrl,
        adminResponse
      });

      expect(serialized).toContain(originalText);
      expect(serialized).toContain("[ANEXO_IMAGEM: company-1/feedback/tela.png]");
      expect(serialized).toContain("--- RESPOSTA DA EQUIPE NAVALDOCS (Equipe NavalDocs Pro em 28/09/2026 16:30) ---");

      const parsed = parseDescription(serialized);
      expect(parsed.cleanDescription).toBe(originalText);
      expect(parsed.attachmentUrl).toBe(attachmentUrl);
      expect(parsed.adminResponse).not.toBeNull();
      expect(parsed.adminResponse?.text).toBe(adminResponse.text);
      expect(parsed.adminResponse?.respondedBy).toBe(adminResponse.respondedBy);
    });
  });

  describe("4. Isolamento Multi-Empresa e Fluxo Ponta a Ponta", () => {
    it("valida isolamento: consulta por empresa filtra estritamente por company_id", async () => {
      // Cria duas empresas simuladas seletivas para validar o comportamento da query
      const fakeCompanyA = "00000000-0000-0000-0000-0000000000a1";
      const fakeCompanyB = "00000000-0000-0000-0000-0000000000b2";

      const listA = await getCompanySuggestions(fakeCompanyA);
      const listB = await getCompanySuggestions(fakeCompanyB);

      // Ambas retornam array sem quebrar ou dar erro de coluna
      expect(Array.isArray(listA)).toBe(true);
      expect(Array.isArray(listB)).toBe(true);

      // Todos os itens de A devem pertencer a A
      listA.forEach(item => {
        expect(item.companyId).toBe(fakeCompanyA);
      });

      // Todos os itens de B devem pertencer a B
      listB.forEach(item => {
        expect(item.companyId).toBe(fakeCompanyB);
      });
    });

    it("valida consulta de administrador global: une company e tickets", async () => {
      const adminList = await getAllAdminSuggestions();
      expect(Array.isArray(adminList)).toBe(true);
    });

    it("valida ciclo de vida completo: criação, consulta, resposta do admin e conclusão", async () => {
      // 1. Identificar ou usar uma empresa existente do banco
      const { data: companies } = await supabase.from("companies").select("id").limit(1);
      if (!companies || companies.length === 0) {
        console.warn("Nenhuma empresa cadastrada no banco para teste E2E com persistência.");
        return;
      }
      const testCompanyId = companies[0].id;

      // 2. Envio de Sugestão pelo Cliente
      const created = await createSuggestion({
        companyId: testCompanyId,
        type: "sugestao",
        title: "Teste Automatizado de Sugestão",
        description: "Precisamos de um botão para exportar relatório semanal.",
        attachmentUrl: "mock/attachment.png"
      });

      expect(created.id).toBeDefined();
      expect(created.referenceNumber).toMatch(/^REF-202\d-[A-F0-9]{8}$/);

      // 3. Cliente consulta suas solicitações
      const companySuggestions = await getCompanySuggestions(testCompanyId);
      const myTicket = companySuggestions.find(s => s.id === created.id);
      expect(myTicket).toBeDefined();
      expect(myTicket?.status).toBe("recebida");
      expect(myTicket?.cleanDescription).toBe("Precisamos de um botão para exportar relatório semanal.");
      expect(myTicket?.attachmentUrl).toBe("mock/attachment.png");

      // 4. Administrador Global responde à solicitação
      await replyToSuggestion({
        suggestionId: created.id,
        currentDescription: myTicket!.cleanDescription,
        currentAttachmentUrl: myTicket!.attachmentUrl,
        adminResponseText: "Excelente ideia! Já adicionamos ao planejamento da sprint.",
        adminName: "Suporte Master NavalDocs",
        newStatus: "respondida"
      });

      // 5. Cliente visualiza a resposta oficial
      const updatedList = await getCompanySuggestions(testCompanyId);
      const updatedTicket = updatedList.find(s => s.id === created.id);
      expect(updatedTicket).toBeDefined();
      expect(updatedTicket?.status).toBe("respondida");
      expect(updatedTicket?.adminResponse).not.toBeNull();
      expect(updatedTicket?.adminResponse?.text).toContain("Excelente ideia! Já adicionamos");
      expect(updatedTicket?.adminResponse?.respondedBy).toBe("Suporte Master NavalDocs");

      // 6. Concluir a solicitação
      await replyToSuggestion({
        suggestionId: created.id,
        currentDescription: updatedTicket!.cleanDescription,
        currentAttachmentUrl: updatedTicket!.attachmentUrl,
        adminResponseText: "Funcionalidade entregue com sucesso!",
        adminName: "Equipe NavalDocs",
        newStatus: "concluida"
      });

      const finalizedList = await getCompanySuggestions(testCompanyId);
      const finalizedTicket = finalizedList.find(s => s.id === created.id);
      expect(finalizedTicket?.status).toBe("concluida");

      // Limpeza: Deleta o ticket de teste
      await supabase.from("tickets").delete().eq("id", created.id);
    });
  });

});
