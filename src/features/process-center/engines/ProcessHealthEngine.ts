import { DocumentStats } from "../utils/processMetrics";

export interface HealthDimension {
  score: number;
  weight: number;
  status: 'healthy' | 'attention' | 'risk';
  causes: string[];
  recommendedActions: string[];
}

export interface ProcessHealthReport {
  overallScore: number;
  status: 'healthy' | 'attention' | 'risk';
  dimensions: {
    documentation: HealthDimension;
    checklist: HealthDimension;
    ocr: HealthDimension;
    signatures: HealthDimension;
    deadlines: HealthDimension;
    dataIntegrity: HealthDimension;
    review: HealthDimension;
  };
}

const HEALTH_CONFIG = {
  WEIGHTS: {
    DOCUMENTATION: 25,
    CHECKLIST: 20,
    OCR: 10,
    SIGNATURES: 15,
    DEADLINES: 10,
    DATA_INTEGRITY: 10,
    REVIEW: 10
  }
};

/**
 * ProcessHealthEngine - Deterministic logic for process health v1.1
 */
export class ProcessHealthEngine {
  static async calculate(processId: string, stats: DocumentStats, additionalData: any = {}): Promise<ProcessHealthReport> {
    const dimensions = {
      documentation: {
        score: stats.percentage,
        weight: HEALTH_CONFIG.WEIGHTS.DOCUMENTATION,
        status: (stats.percentage > 85 ? 'healthy' : stats.percentage > 60 ? 'attention' : 'risk') as any,
        causes: stats.totalBlocking > 0 ? [`${stats.totalBlocking} documentos obrigatórios ausentes`] : [],
        recommendedActions: stats.totalBlocking > 0 ? ["Anexe os documentos obrigatórios pendentes."] : []
      },
      checklist: {
        score: additionalData.checklistScore ?? 100,
        weight: HEALTH_CONFIG.WEIGHTS.CHECKLIST,
        status: (additionalData.checklistScore > 85 ? 'healthy' : 'attention') as any,
        causes: additionalData.checklistPending > 0 ? [`${additionalData.checklistPending} itens pendentes`] : [],
        recommendedActions: additionalData.checklistPending > 0 ? ["Concluir itens obrigatórios"] : []
      },
      ocr: {
        score: additionalData.ocrScore ?? 100,
        weight: HEALTH_CONFIG.WEIGHTS.OCR,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      signatures: {
        score: additionalData.signaturesScore ?? 100,
        weight: HEALTH_CONFIG.WEIGHTS.SIGNATURES,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      deadlines: {
        score: additionalData.deadlinesScore ?? 100,
        weight: HEALTH_CONFIG.WEIGHTS.DEADLINES,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      dataIntegrity: {
        score: additionalData.integrityScore ?? 100,
        weight: HEALTH_CONFIG.WEIGHTS.DATA_INTEGRITY,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      review: {
        score: stats.totalPending > 0 ? 70 : 100,
        weight: HEALTH_CONFIG.WEIGHTS.REVIEW,
        status: (stats.totalPending > 0 ? 'attention' : 'healthy') as any,
        causes: stats.totalPending > 0 ? [`${stats.totalPending} documentos aguardando revisão`] : [],
        recommendedActions: stats.totalPending > 0 ? ["Revisar documentos pendentes"] : []
      }
    };

    // Verify weight sum
    const totalWeight = Object.values(dimensions).reduce((acc, d) => acc + d.weight, 0);
    if (totalWeight !== 100) {
        console.warn(`Health weight sum is ${totalWeight}, expected 100`);
    }

    const overallScore = Math.round(
      Object.values(dimensions).reduce((acc, d) => acc + (d.score * d.weight / 100), 0)
    );

    const status = overallScore > 85 ? 'healthy' : overallScore > 60 ? 'attention' : 'risk';

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      status,
      dimensions
    };
  }
}
