import { expect, test, describe } from "vitest";
import { ProcessHealthEngine } from "../engines/ProcessHealthEngine";

describe("ProcessHealthEngine", () => {
  const baseStats = {
    totalRequired: 10,
    totalAttached: 10,
    totalApproved: 10,
    totalPending: 0,
    totalBlocking: 0,
    totalRejected: 0,
    totalOutdated: 0,
    percentage: 100
  };

  test("calculates overall score correctly with weights", async () => {
    const report = await ProcessHealthEngine.calculate("1", baseStats);
    expect(report.overallScore).toBe(100);
    expect(report.status).toBe('healthy');
  });

  test("documentation dimension reflects stats percentage", async () => {
    const stats = { ...baseStats, percentage: 50 };
    const report = await ProcessHealthEngine.calculate("1", stats);
    expect(report.dimensions.documentation.score).toBe(50);
    expect(report.dimensions.documentation.status).toBe('risk');
  });

  test("sum of weights is exactly 100", async () => {
    const report = await ProcessHealthEngine.calculate("1", baseStats);
    const totalWeight = Object.values(report.dimensions).reduce((acc: number, d: any) => acc + d.weight, 0);
    expect(totalWeight).toBe(100);
  });
});
