/**
 * Sprint 4D.5 — Fatia 4
 * Diagnóstico determinístico (sem IA externa) a partir do CoverageResult.
 */
import type { CoverageResult } from "./types";

export type HealthTier = "ready" | "attention" | "incomplete" | "critical";

export function classifyHealth(score: number): HealthTier {
  if (score >= 90) return "ready";
  if (score >= 75) return "attention";
  if (score >= 50) return "incomplete";
  return "critical";
}

export function healthLabel(tier: HealthTier): string {
  switch (tier) {
    case "ready": return "Pronto para produção";
    case "attention": return "Atenção";
    case "incomplete": return "Incompleto";
    case "critical": return "Crítico";
  }
}

export function buildDiagnostic(result: CoverageResult): string {
  const parts: string[] = [];
  parts.push(`A documentação está com ${result.coverage}% de cobertura.`);

  const incomplete = result.processes.filter((p) => p.coverage < 100 && p.status !== "empty");
  if (incomplete.length === 0 && result.processes.length > 0) {
    parts.push("Todos os tipos de processo estão completos.");
  } else if (incomplete.length === 1) {
    parts.push(`1 tipo de processo está incompleto (${incomplete[0].process_type_name}).`);
  } else if (incomplete.length > 1) {
    const worst = [...incomplete].sort((a, b) => a.coverage - b.coverage)[0];
    parts.push(
      `${incomplete.length} tipos de processo estão incompletos. Resolva primeiro "${worst.process_type_name}".`,
    );
  }

  const structural: string[] = [];
  if (result.draftDocuments.length > 0) {
    structural.push(`${result.draftDocuments.length} modelo(s) em rascunho`);
  }
  if (result.brokenMappings.length > 0) {
    structural.push(`${result.brokenMappings.length} mapeamento(s) quebrado(s)`);
  }
  if (result.invalidPlaceholders.length > 0) {
    structural.push(`${result.invalidPlaceholders.length} placeholder(s) inválido(s)`);
  }
  if (result.missingDocuments.length > 0) {
    structural.push(`${result.missingDocuments.length} modelo(s) obrigatório(s) ausente(s)`);
  }
  if (structural.length > 0) {
    parts.push(`Existem ${structural.join(", ")}.`);
  }

  if (result.coverage === 100 && result.issues.length === 0) {
    parts.push("Nenhuma ação necessária no momento.");
  }

  return parts.join(" ");
}
