/**
 * Sprint 4D.5 — Fatia 3
 * Health Score canônico. Regras centralizadas — UI não recalcula.
 *
 * Faixas de referência:
 *   100  Sistema totalmente pronto
 *    95  Falta 1 modelo
 *    80  Existem drafts pendentes
 *    60  Existem processos incompletos
 *    40  Sistema não recomendado
 */

export interface HealthInput {
  coverage: number;              // 0..100
  missingCount: number;
  draftCount: number;
  brokenMappingsCount: number;
  invalidPlaceholdersCount: number;
  missingFieldsCount: number;
  outdatedVersionsCount: number;
  incompleteProcessTypes: number; // processos com coverage < 100
}

export function computeHealthScore(input: HealthInput): number {
  // Cobertura vale mais do que o resto.
  let score = input.coverage;

  // Cada modelo faltando: -5, com mínimo em -25.
  score -= Math.min(25, input.missingCount * 5);
  // Cada draft pendente: -3 (até -15).
  score -= Math.min(15, input.draftCount * 3);
  // Cada mapping quebrado: -6 (até -30). Estrutural, penaliza forte.
  score -= Math.min(30, input.brokenMappingsCount * 6);
  // Placeholders inválidos: -4 cada (até -20).
  score -= Math.min(20, input.invalidPlaceholdersCount * 4);
  // Campos obrigatórios sem mapping: -5 (até -20).
  score -= Math.min(20, input.missingFieldsCount * 5);
  // Versões inconsistentes: -4 (até -12).
  score -= Math.min(12, input.outdatedVersionsCount * 4);
  // Processos incompletos: -5 (até -25).
  score -= Math.min(25, input.incompleteProcessTypes * 5);

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}
