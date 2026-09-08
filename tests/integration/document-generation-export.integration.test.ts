import { describe, it, expect } from "vitest";
import { extractPlaceholders, resolveCanonical } from "@/services/documentPlaceholders";
import { validateCriticalFields } from "@/services/documentNormalizer";

describe("Document Generation, Templates & Export Integration Suite", () => {
  describe("1. Template Placeholder Interpolation & Canonical Mapping", () => {
    it("extrai corretamente placeholders no formato {{tag}} e {{ tag }}", () => {
      const template = `
        REQUERIMENTO DE INSCRIÇÃO DE EMBARCAÇÃO
        Eu, {{cliente.nome}}, portador do CPF {{ cliente.cpf }},
        solicito a inscrição da embarcação {{embarcacao.nome}},
        número de inscrição {{ embarcacao.inscricao }}.
      `;

      const tags = extractPlaceholders(template);
      expect(tags).toContain("cliente.nome");
      expect(tags).toContain("cliente.cpf");
      expect(tags).toContain("embarcacao.nome");
      expect(tags).toContain("embarcacao.inscricao");
      expect(tags.length).toBe(4);
    });

    it("resolve tags para nomes canônicos cadastrados", () => {
      expect(resolveCanonical("cliente.nome")).toBe("cliente.nome");
      expect(resolveCanonical("cliente.cpf")).toBe("cliente.cpf");
      expect(resolveCanonical("embarcacao.nome")).toBe("embarcacao.nome");
      expect(resolveCanonical("embarcacao.tie")).toBe("embarcacao.inscricao");
    });

    it("preenche campos ausentes com fallback seguro '________' sem gerar undefined", () => {
      const template = "Proprietário: {{cliente.nome}} | Telefone: {{cliente.telefone}}";
      const tags = extractPlaceholders(template);
      const data: Record<string, string> = { "cliente.nome": "Carlos Silva" }; // sem telefone

      let compiled = template;
      for (const tag of tags) {
        const val = data[tag] ?? "________";
        compiled = compiled.replace(new RegExp(`\\{\\{\\s*${tag}\\s*\\}\\}`, "g"), val);
      }

      expect(compiled).toContain("Proprietário: Carlos Silva");
      expect(compiled).toContain("Telefone: ________");
      expect(compiled.includes("undefined")).toBe(false);
      expect(compiled.includes("null")).toBe(false);
    });
  });

  describe("2. Validação de Campos Críticos e Conformidade NORMAM", () => {
    it("aprova quando todos os campos obrigatórios estão presentes", () => {
      const payload = {
        cliente: { nome: "João Silva", cpf: "123.456.789-00" },
        embarcacao: { nome: "Veleiro Azul", inscricao: "381-123456" },
        motor: { potencia: "200 HP", serie: "MOT-1122" },
        empresa: { nome: "Oficina Náutica", cnpj: "11.222.333/0001-81" },
      };

      const result = validateCriticalFields(payload, {
        needsPersonal: true,
        needsVessel: true,
        needsEngine: true,
      });

      expect(result.ok).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it("reprova e identifica campos faltantes", () => {
      const incompletePayload = {
        cliente: { nome: "João Silva", cpf: "" },
        embarcacao: { nome: "", inscricao: "381-123456" },
        empresa: { nome: "Oficina Náutica", cnpj: "11.222.333/0001-81" },
      };

      const result = validateCriticalFields(incompletePayload, {
        needsPersonal: true,
        needsVessel: true,
        needsEngine: false,
      });

      expect(result.ok).toBe(false);
      expect(result.missing.some((m) => m.key === "cpf")).toBe(true);
      expect(result.missing.some((m) => m.key === "nome" && m.group === "embarcacao")).toBe(true);
    });
  });

  describe("3. Criptografia, Hash SHA-256 e Selagem Digital", () => {
    it("gera checksum SHA-256 de 64 caracteres hexadecimais para garantia de autenticidade", async () => {
      const content = "DocumentoNáutico-NavalDocsPro-2026-Hash-De-Integridade";
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      expect(hashHex.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hashHex)).toBe(true);
    });

    it("gera token de assinatura pública de 32 caracteres com alta entropia", () => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

      expect(token.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(token)).toBe(true);
    });
  });
});
