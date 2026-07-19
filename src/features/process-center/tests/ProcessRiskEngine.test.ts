import { describe, it, expect } from 'vitest';
import { ProcessRiskEngine } from '../engines/ProcessRiskEngine';
import { DocumentStats } from '../utils/processMetrics';

describe('ProcessRiskEngine', () => {
  const baseStats: DocumentStats = {
    totalRequired: 10,
    totalAttached: 5,
    totalApproved: 2,
    totalPending: 3,
    totalBlocking: 0,
    totalRejected: 0,
    totalOutdated: 0,
    percentage: 50
  };

  it('should return critical risk when there are blocking documents', () => {
    const stats = { ...baseStats, totalBlocking: 2 };
    const report = ProcessRiskEngine.evaluate('test-id', stats, 80);
    expect(report.level).toBe('critical');
    expect(report.causes).toContain('2 documentos obrigatórios ausentes');
  });

  it('should return high risk when health score is very low', () => {
    const report = ProcessRiskEngine.evaluate('test-id', baseStats, 40);
    expect(report.level).toBe('high');
    expect(report.causes).toContain('Health Score crítico (40%)');
  });

  it('should return not_evaluated when no data is present', () => {
    const emptyStats: DocumentStats = {
      totalRequired: 0,
      totalAttached: 0,
      totalApproved: 0,
      totalPending: 0,
      totalBlocking: 0,
      totalRejected: 0,
      totalOutdated: 0,
      percentage: 0
    };
    const report = ProcessRiskEngine.evaluate('test-id', emptyStats, 0);
    expect(report.level).toBe('not_evaluated');
  });

  it('should return low risk for a healthy process', () => {
    const healthyStats = { ...baseStats, totalBlocking: 0, percentage: 100 };
    const report = ProcessRiskEngine.evaluate('test-id', healthyStats, 95);
    expect(report.level).toBe('low');
  });
});
