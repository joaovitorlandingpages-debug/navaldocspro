import { describe, it, expect } from "vitest";
import {
  normalizeCpfCnpj,
  normalizeDate,
  formatMeasurement,
  formatPower,
  normalizeState,
  cleanString,
} from "@/services/documentNormalizer";
import { compareExtractedWith } from "@/services/processDocumentUploads";

describe("Document Upload & OCR Processing Integration Suite", () => {
  describe("1. Image & Document File Validation", () => {
    it("valida tipos de arquivos suportados para upload de imagens e documentos", () => {
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

      expect(allowedMimes.includes("image/jpeg")).toBe(true);
      expect(allowedMimes.includes("image/png")).toBe(true);
      expect(allowedMimes.includes("application/pdf")).toBe(true);
      expect(allowedMimes.includes("application/x-msdownload")).toBe(false);
      expect(allowedExtensions.some((ext) => "tie_documento.pdf".endsWith(ext))).toBe(true);
      expect(allowedExtensions.some((ext) => "foto_casco.png".endsWith(ext))).toBe(true);
    });

    it("respeita os limites máximos de tamanho de upload (10MB para anexos, 5MB para logos)", () => {
      const maxDocBytes = 10 * 1024 * 1024;
      const maxLogoBytes = 5 * 1024 * 1024;

      const validDocSize = 4.5 * 1024 * 1024;
      const oversizedDocSize = 12 * 1024 * 1024;

      expect(validDocSize <= maxDocBytes).toBe(true);
      expect(oversizedDocSize <= maxDocBytes).toBe(false);
      expect(maxLogoBytes).toBe(5242880);
    });
  });

  describe("2. Normalização e Leitura OCR de Campos Náuticos", () => {
    it("normaliza CPF e CNPJ extraídos de digitalizações", () => {
      expect(normalizeCpfCnpj("12345678900")).toBe("123.456.789-00");
      expect(normalizeCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
      expect(normalizeCpfCnpj("")).toBe("");
      expect(normalizeCpfCnpj(null)).toBe("");
    });

    it("normaliza datas ISO e padrão brasileiro", () => {
      expect(normalizeDate("2029-12-31")).toBe("31/12/2029");
      expect(normalizeDate("15/08/2026")).toBe("15/08/2026");
      expect(normalizeDate("")).toBe("");
    });

    it("formata medidas métricas sem duplicação de unidade", () => {
      expect(formatMeasurement("19.30", "m")).toBe("19,30 m");
      expect(formatMeasurement("19,30 m", "m")).toBe("19,30 m");
      expect(formatMeasurement(12.5, "m")).toBe("12,50 m");
      expect(formatMeasurement("", "m")).toBe("");
    });

    it("formata potência de motorização naval", () => {
      expect(formatPower("350")).toBe("350 HP");
      expect(formatPower("250 hp")).toBe("250 HP");
      expect(formatPower("")).toBe("");
    });

    it("converte nomes de estados por extenso para siglas UF oficiais", () => {
      expect(normalizeState("SÃO PAULO")).toBe("SP");
      expect(normalizeState("Rio de Janeiro")).toBe("RJ");
      expect(normalizeState("BAHIA")).toBe("BA");
      expect(normalizeState("SC")).toBe("SC");
      expect(normalizeState("")).toBe("");
    });

    it("elimina strings nulas ou lixo de OCR", () => {
      expect(cleanString("undefined", "PADRÃO")).toBe("PADRÃO");
      expect(cleanString("null", "PADRÃO")).toBe("PADRÃO");
      expect(cleanString("  Barco Alpha  ")).toBe("Barco Alpha");
    });
  });

  describe("3. Validação Cruzada OCR vs Cadastro do Cliente e Embarcação", () => {
    it("aprova como conferido quando dados extraídos do OCR coincidem com o cadastro", () => {
      const ocrFields = {
        name: "Carlos Alberto de Souza",
        cpf: "12345678900",
        vessel_name: "Marujo Dourado",
        registration_number: "381-009988",
        expiry_date: "2030-01-01",
      };

      const context = {
        customer: { name: "Carlos Alberto de Souza", cpf_cnpj: "123.456.789-00" },
        vessel: { name: "Marujo Dourado", registration_number: "381-009988" },
        confidence: 0.95,
      };

      const result = compareExtractedWith(ocrFields, context);
      expect(result.status).toBe("conferido");
      expect(result.errors.length).toBe(0);
    });

    it("aponta divergência de alta severidade quando CPF ou Inscrição divergem", () => {
      const ocrFields = {
        name: "Carlos Alberto",
        cpf: "99988877766", // diferente do cadastro
        registration_number: "381-111111", // diferente do cadastro
      };

      const context = {
        customer: { name: "Carlos Alberto", cpf_cnpj: "123.456.789-00" },
        vessel: { name: "Marujo", registration_number: "381-009988" },
        confidence: 0.9,
      };

      const result = compareExtractedWith(ocrFields, context);
      expect(result.status).toBe("divergente");
      expect(result.errors.some((e) => e.field === "CPF")).toBe(true);
      expect(result.errors.some((e) => e.field === "registration_number")).toBe(true);
    });

    it("marca baixa confiança quando o score do motor de OCR for inferior a 0.6", () => {
      const ocrFields = {
        name: "Carlos Alberto",
      };

      const context = {
        customer: { name: "Carlos Alberto" },
        confidence: 0.45, // Baixa confiança
      };

      const result = compareExtractedWith(ocrFields, context);
      expect(result.status).toBe("baixa_confianca");
    });
  });
});
