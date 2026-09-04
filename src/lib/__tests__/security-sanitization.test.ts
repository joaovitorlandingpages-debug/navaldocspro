import { describe, it, expect } from "vitest";
import {
  sanitizeSearchQuery,
  sanitizePlainText,
  sanitizeAlphaNumeric,
} from "@/lib/sanitization";
import {
  customerFormSchema,
  vesselFormSchema,
  processFormSchema,
  searchFilterSchema,
} from "@/lib/validations/operationalSchemas";

describe("Sanitization Utilities", () => {
  describe("sanitizeSearchQuery", () => {
    it("escapes SQL ILIKE wildcards %, _, and \\", () => {
      const input = "100%_safe\\query";
      const result = sanitizeSearchQuery(input);
      expect(result).toBe("100\\%\\_safe\\\\query");
    });

    it("removes null bytes", () => {
      const input = "malicious\0term%inject";
      const result = sanitizeSearchQuery(input);
      expect(result).toBe("maliciousterm\\%inject");
    });

    it("truncates excessively long search inputs to prevent DoS", () => {
      const longString = "a".repeat(150);
      const result = sanitizeSearchQuery(longString, 50);
      expect(result.length).toBe(50);
    });

    it("handles empty or null gracefully", () => {
      expect(sanitizeSearchQuery(null)).toBe("");
      expect(sanitizeSearchQuery(undefined)).toBe("");
      expect(sanitizeSearchQuery("")).toBe("");
    });
  });

  describe("sanitizePlainText", () => {
    it("strips HTML script tags and embedded content", () => {
      const dirty = '<script>alert("xss")</script>Oficina Naval';
      const clean = sanitizePlainText(dirty);
      expect(clean).toBe("Oficina Naval");
    });

    it("strips general HTML tags", () => {
      const dirty = "<b>Embarcação</b> <i>Alfa</i>";
      const clean = sanitizePlainText(dirty);
      expect(clean).toBe("Embarcação Alfa");
    });
  });

  describe("sanitizeAlphaNumeric", () => {
    it("cleans CPF/CNPJ or codes keeping safe characters", () => {
      const dirty = "12.345.678/0001-90 <script>";
      const clean = sanitizeAlphaNumeric(dirty);
      expect(clean).toBe("12.345.678/0001-90");
    });
  });
});

describe("Zod Operational Schemas", () => {
  it("validates and sanitizes customer form input", () => {
    const input = {
      name: "   <b>Oficina Marítima</b>   ",
      email: "contato@OFICINA.COM.BR",
      phone: "(21) 99999-8888",
    };

    const parsed = customerFormSchema.parse(input);
    expect(parsed.name).toBe("Oficina Marítima");
    expect(parsed.email).toBe("contato@oficina.com.br");
  });

  it("rejects invalid customer email", () => {
    const input = {
      name: "Cliente Teste",
      email: "email-invalido",
    };

    expect(() => customerFormSchema.parse(input)).toThrow();
  });

  it("validates vessel form input", () => {
    const input = {
      name: "Barco Alpha",
      customer_id: "123e4567-e89b-12d3-a456-426614174000",
      registration_number: "RJ-12345",
    };

    const parsed = vesselFormSchema.parse(input);
    expect(parsed.name).toBe("Barco Alpha");
    expect(parsed.registration_number).toBe("RJ-12345");
  });

  it("validates process form input with enum priority and status", () => {
    const input = {
      customer_id: "123e4567-e89b-12d3-a456-426614174000",
      process_type: "Revisão e Vistoria",
      priority: "high" as const,
      status: "pending" as const,
      due_date: "2026-10-15",
    };

    const parsed = processFormSchema.parse(input);
    expect(parsed.priority).toBe("high");
    expect(parsed.due_date).toBe("2026-10-15");
  });

  it("sanitizes search filter term via transform", () => {
    const filter = {
      term: "lancha%_rapida",
    };

    const parsed = searchFilterSchema.parse(filter);
    expect(parsed.term).toBe("lancha\\%\\_rapida");
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });
});
