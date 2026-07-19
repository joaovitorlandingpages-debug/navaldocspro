import { expect, test, describe } from "vitest";
import { ProcessRiskEngine, ProcessRiskContext } from "../engines/ProcessRiskEngine";

describe("ProcessRiskEngine", () => {
  const createMockContext = (overrides: Partial<ProcessRiskContext> = {}): ProcessRiskContext => ({
    process: {
      id: '1',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    documentation: {
      totalRequired: 10,
      totalAttached: 10,
      totalApproved: 10,
      totalPending: 0,
      totalBlocking: 0,
      totalRejected: 0,
      totalOutdated: 0,
      percentage: 100,
      missing: 0,
      blocking: 0,
      critical: 0,
      expired: 0,
      expiringSoon: 0,
      waived: 0,
      notApplicable: 0,
    },
    checklist: { total: 0, pending: 0, blocking: 0, completed: 0, waivedWithoutReason: 0 },
    ocr: { pending: 0, failed: 0, lowConfidence: 0, missingRequiredFields: 0, divergences: 0 },
    signatures: { pending: 0, expired: 0, expiringSoon: 0, requiredNotCreated: 0, completedNotAdvanced: 0 },
    review: { pending: 0, overdue: 0, rejected: 0, adjustmentsRequested: 0 },
    deadlines: { overdue: false, daysRemaining: 10, inactivityDays: 0 },
    dataIntegrity: { customerIncomplete: false, vesselIncomplete: false, ownerIncomplete: false, engineIncomplete: false, inconsistencies: 0 },
    security: { integrityViolation: false, finalizedMutationAttempt: false },
    ...overrides
  });

  test("healthy process has low risk", () => {
    const ctx = createMockContext();
    const report = ProcessRiskEngine.evaluate(ctx);
    expect(report.level).toBe('low');
    expect(report.status).toBe('healthy');
    expect(report.positiveSignals).toContain('Toda documentação obrigatória anexada');
  });

  test("blocking documents trigger critical risk", () => {
    const ctx = createMockContext();
    ctx.documentation.blocking = 5;
    const report = ProcessRiskEngine.evaluate(ctx);
    expect(report.level).toBe('critical');
    expect(report.factors[0].code).toBe('DOC_BLOCKING');
  });

  test("overdue deadline triggers high risk", () => {
    const ctx = createMockContext();
    ctx.deadlines.overdue = true;
    const report = ProcessRiskEngine.evaluate(ctx);
    expect(report.level).toBe('high');
    expect(report.factors[0].code).toBe('DEADLINE_OVERDUE');
  });

  test("security violation triggers maximum risk", () => {
    const ctx = createMockContext();
    ctx.security.integrityViolation = true;
    const report = ProcessRiskEngine.evaluate(ctx);
    expect(report.level).toBe('critical');
    expect(report.score).toBe(100);
  });
});
