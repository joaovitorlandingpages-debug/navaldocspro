import { describe, it, expect } from "vitest";
import { sanitizePlainText, sanitizeSearchQuery, sanitizeAlphaNumeric } from "@/lib/sanitization";
import { mapFields } from "@/utils/document-mapper";

describe("Fluxo de Integração: Submissão Segura de Formulários & Geração de Documentos", () => {
  describe("1. Sanitização e Proteção contra XSS / Injeções", () => {
    it("deve remover tags <script> maliciosas de campos de texto livre", () => {
      const maliciousPayload = "Embarcação Alpha <script>alert('xss')</script> Modelo 2026";
      const cleaned = sanitizePlainText(maliciousPayload);

      expect(cleaned).not.toContain("<script>");
      expect(cleaned).toBe("Embarcação Alpha  Modelo 2026");
    });

    it("deve escapar caracteres curingas de busca ILIKE no PostgreSQL", () => {
      const searchInput = "100%_concluído\\naval";
      const sanitized = sanitizeSearchQuery(searchInput);

      expect(sanitized).toBe("100\\%\\_concluído\\\\naval");
    });

    it("deve filtrar caracteres não alfanuméricos em números de documentos/chassis", () => {
      const messyChassi = "Hull-BR@#$12345/2026";
      const sanitized = sanitizeAlphaNumeric(messyChassi);

      expect(sanitized).toBe("Hull-BR12345/2026");
    });
  });

  describe("2. Preenchimento Automático de Variáveis no Gerador de Documentos", () => {
    it("deve interpolar dados do cliente, embarcação e processo nos placeholders do modelo", () => {
      const templateFields = [
        { field_name: "cliente_nome", mapping_path: "customer.name" },
        { field_name: "cliente_cpf", mapping_path: "customer.cpf_cnpj" },
        { field_name: "embarcacao_nome", mapping_path: "vessel.name" },
        { field_name: "processo_numero", mapping_path: "process.process_number" },
      ];

      const sourceData = {
        customer: { name: "Roberto Silva", cpf_cnpj: "111.222.333-44" },
        vessel: { name: "Mar Aberto IV" },
        process: { process_number: "PROC-2026-009" }
      };

      const mapped = mapFields(templateFields, sourceData);

      expect(mapped[0].current_value).toBe("Roberto Silva");
      expect(mapped[1].current_value).toBe("111.222.333-44");
      expect(mapped[2].current_value).toBe("Mar Aberto IV");
      expect(mapped[3].current_value).toBe("PROC-2026-009");
    });

    it("deve retornar string vazia para campos opcionais não preenchidos sem estourar exceção", () => {
      const templateFields = [
        { field_name: "cliente_telefone", mapping_path: "customer.phone" },
      ];

      const sourceData = {
        customer: { name: "Carlos" }
      };

      const mapped = mapFields(templateFields, sourceData);
      expect(mapped[0].current_value).toBe("");
    });
  });
});
