// @ts-ignore
import { expect, test, describe } from "vitest";

import { calculateTimeInProgress } from "../utils/processMetrics";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

describe("calculateTimeInProgress", () => {
  test("returns 'Criado agora' for current date", () => {
    const now = new Date().toISOString();
    expect(calculateTimeInProgress(now, null)).toBe("Criado agora");
  });

  test("returns correct days for past date", () => {
    const tenDaysAgo = subDays(new Date(), 10).toISOString();
    expect(calculateTimeInProgress(tenDaysAgo, null)).toContain("10 dias");
  });

  test("returns finalized date when finalized_at is present", () => {
    const created = subDays(new Date(), 20).toISOString();
    const finalized = subDays(new Date(), 2).toISOString();
    const expected = `Finalizado em ${format(new Date(finalized), "dd/MM/yyyy", { locale: ptBR })}`;
    expect(calculateTimeInProgress(created, finalized)).toBe(expected);
  });
});
