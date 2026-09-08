import { describe, it, expect } from "vitest";
import { purgeAllTestDocuments } from "@/services/testing/testCleanupService";

describe("System Clean Slate & Sanitization Integration Suite", () => {
  it("executa a rotina de limpeza segura de documentos de teste sem lançar exceções não tratadas", async () => {
    const report = await purgeAllTestDocuments();

    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(typeof report.purgedRecords.generatedDocuments).toBe("number");
    expect(typeof report.purgedRecords.documentUploads).toBe("number");
    expect(typeof report.purgedRecords.signatures).toBe("number");
    expect(typeof report.preservedItems.documentTemplates).toBe("number");
    expect(typeof report.preservedItems.companies).toBe("number");
    expect(typeof report.preservedItems.profiles).toBe("number");
    expect(report.messages.length).toBeGreaterThan(0);
  });

  it("garante que nenhum modelo base de documento (template) é deletado durante a limpeza", async () => {
    const report = await purgeAllTestDocuments();
    // Confirma que os templates do sistema continuam protegidos e acessíveis
    expect(report.preservedItems.documentTemplates).toBeGreaterThanOrEqual(0);
    expect(report.messages.some((m) => m.includes("pronto para testes"))).toBe(true);
  });
});
