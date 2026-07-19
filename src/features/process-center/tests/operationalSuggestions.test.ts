import { expect, test, describe } from "vitest";
import { OperationalSuggestionEngine } from "../engines/OperationalSuggestionEngine";

describe("OperationalSuggestionEngine", () => {
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

  const mockProcess = {
    id: '1',
    customer: { cpf_cnpj: '123', email: 'test@test.com' },
    vessel: { registration_number: '999' }
  };

  test("generates suggestions for missing blocking documents", () => {
    const stats = { ...baseStats, totalBlocking: 2 };
    const suggestions = OperationalSuggestionEngine.generate("1", stats, mockProcess);
    const s = suggestions.find(s => s.id.startsWith('missing-docs'));
    expect(s).toBeDefined();
    expect(s?.blocker).toBe(true);
  });

  test("generates suggestions for incomplete registration", () => {
    const process = { ...mockProcess, customer: { cpf_cnpj: null } };
    const suggestions = OperationalSuggestionEngine.generate("1", baseStats, process);
    expect(suggestions.some(s => s.type === 'registration')).toBe(true);
  });

  test("sorts blockers first", () => {
    const stats = { ...baseStats, totalBlocking: 1, totalPending: 5 };
    const suggestions = OperationalSuggestionEngine.generate("1", stats, mockProcess);
    expect(suggestions[0].blocker).toBe(true);
  });
});
