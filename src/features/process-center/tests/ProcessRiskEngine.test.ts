import { expect, test, describe } from "vitest";
import { ProcessRiskEngine, RiskLevel } from "../engines/ProcessRiskEngine";
import { DocumentStats } from "../utils/processMetrics";

describe("ProcessRiskEngine", () => {
  const baseStats: DocumentStats = {
    totalRequired: 10,
    totalAttached: 10,
    totalApproved: 10,
    totalPending: 0,
    totalBlocking: 0,
    totalRejected: 0,
    totalOutdated: 0,
    percentage: 100
  };

  test("returns 'not_evaluated' for empty process", () => {
    const report = ProcessRiskEngine.evaluate("1", { ...baseStats, totalRequired: 0, totalAttached: 0 }, 100);
    expect(report.level).toBe('not_evaluated');
  });

  test("returns 'critical' for missing blocking documents", () => {
    const report = ProcessRiskEngine.evaluate("1", { ...baseStats, totalBlocking: 1 }, 100);
    expect(report.level).toBe('critical');
    expect(report.causes[0]).toContain("documentos obrigatórios ausentes");
  });

  test("returns 'high' for low health score", () => {
    const report = ProcessRiskEngine.evaluate("1", { ...baseStats, totalBlocking: 0 }, 30);
    expect(report.level).toBe('high');
    expect(report.causes[0]).toContain("Health Score crítico");
  });
});
