import { DocumentStats } from "../utils/processMetrics";

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'not_evaluated';

export interface ProcessRiskReport {
  level: RiskLevel;
  score: number | null;
  causes: string[];
  impacts: string[];
  recommendedActions: string[];
}

/**
 * ProcessRiskEngine - Deterministic risk evaluation
 */
export class ProcessRiskEngine {
  static evaluate(processId: string, docStats: DocumentStats, healthScore: number): ProcessRiskReport {
    const causes: string[] = [];
    const impacts: string[] = [];
    const recommendedActions: string[] = [];
    let score = 0;

    // Rule 1: Missing critical/blocking documents
    if (docStats.totalBlocking > 0) {
      score += 40;
      causes.push(`${docStats.totalBlocking} documentos obrigatórios ausentes`);
      impacts.push("Impedimento de protocolo na Capitania/DPC");
      recommendedActions.push("Anexar documentos obrigatórios imediatamente");
    }

    // Rule 2: Low health score
    if (healthScore < 50) {
      score += 30;
      causes.push(`Health Score crítico (${healthScore}%)`);
      impacts.push("Alta probabilidade de indeferimento");
      recommendedActions.push("Revisar integridade dos dados e documentos");
    } else if (healthScore < 80) {
      score += 15;
    }

    // Determine Level
    let level: RiskLevel = 'low';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 20) level = 'medium';
    else if (score > 0) level = 'low';
    else level = 'low';

    // If we have no data at all (not even the process?), return not_evaluated
    if (docStats.totalRequired === 0 && docStats.totalAttached === 0) {
        return {
            level: 'not_evaluated',
            score: null,
            causes: ["Dados insuficientes para avaliação"],
            impacts: [],
            recommendedActions: ["Iniciar mapeamento do processo"]
        };
    }

    return {
      level,
      score,
      causes,
      impacts,
      recommendedActions
    };
  }
}
