import { computeHealthScore } from "@/services/documentation/healthEngine";
import { getProcessDocumentStats, DocumentStats } from "../utils/processMetrics";

export interface HealthDimension {
  score: number;
  weight: number;
  status: 'stable' | 'warning' | 'critical';
  causes: string[];
  recommendation: string;
}

export interface ProcessHealthReport {
  overallScore: number;
  dimensions: Record<string, HealthDimension>;
}

/**
 * ProcessHealthEngine - Centralized logic for process health
 */
export class ProcessHealthEngine {
  static async calculate(processId: string, stats: DocumentStats): Promise<ProcessHealthReport> {
    const dimensions: Record<string, HealthDimension> = {};

    // 1. Documentation Dimension
    dimensions.documentation = {
      score: stats.percentage,
      weight: 0.4,
      status: stats.percentage > 80 ? 'stable' : stats.percentage > 50 ? 'warning' : 'critical',
      causes: stats.totalBlocking > 0 ? [`${stats.totalBlocking} documentos obrigatórios ausentes`] : [],
      recommendation: stats.totalBlocking > 0 ? "Anexe os documentos obrigatórios pendentes." : "Documentação em dia."
    };

    // 2. Placeholder for other dimensions (OCR, Signatures, etc.)
    // In a real scenario, these would fetch real data
    dimensions.ocr = {
      score: 100, // Placeholder
      weight: 0.2,
      status: 'stable',
      causes: [],
      recommendation: "OCR operando com alta confiança."
    };

    dimensions.signatures = {
      score: 100, // Placeholder
      weight: 0.2,
      status: 'stable',
      causes: [],
      recommendation: "Sem assinaturas pendentes."
    };

    dimensions.checklist = {
      score: 100, // Placeholder
      weight: 0.2,
      status: 'stable',
      causes: [],
      recommendation: "Checklist operacional concluído."
    };

    const overallScore = Math.round(
      Object.values(dimensions).reduce((acc, d) => acc + (d.score * d.weight), 0)
    );

    return {
      overallScore,
      dimensions
    };
  }
}
