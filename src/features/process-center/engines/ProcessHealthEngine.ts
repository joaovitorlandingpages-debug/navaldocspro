import { computeHealthScore } from "@/services/documentation/healthEngine";
import { getProcessDocumentStats, DocumentStats } from "../utils/processMetrics";

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

/**
 * ProcessHealthEngine - Centralized logic for process health
 */
export class ProcessHealthEngine {
  static async calculate(processId: string, stats: DocumentStats): Promise<ProcessHealthReport> {
    const dimensions = {
      documentation: {
        score: stats.percentage,
        weight: 25,
        status: (stats.percentage > 85 ? 'healthy' : stats.percentage > 60 ? 'attention' : 'risk') as any,
        causes: stats.totalBlocking > 0 ? [`${stats.totalBlocking} documentos obrigatórios ausentes`] : [],
        recommendedActions: stats.totalBlocking > 0 ? ["Anexe os documentos obrigatórios pendentes."] : []
      },
      checklist: {
        score: 100, // TODO: Connect to real checklist status
        weight: 20,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      ocr: {
        score: 100, // TODO: Connect to real ocr_extractions
        weight: 10,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      signatures: {
        score: 100, // TODO: Connect to real signature_requests
        weight: 15,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      deadlines: {
        score: 100,
        weight: 10,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      dataIntegrity: {
        score: 100,
        weight: 10,
        status: 'healthy' as any,
        causes: [],
        recommendedActions: []
      },
      review: {
        score: stats.totalPending > 0 ? 70 : 100,
        weight: 10,
        status: (stats.totalPending > 0 ? 'attention' : 'healthy') as any,
        causes: stats.totalPending > 0 ? [`${stats.totalPending} documentos aguardando revisão`] : [],
        recommendedActions: stats.totalPending > 0 ? ["Revisar documentos pendentes"] : []
      }
    };

    const overallScore = Math.round(
      Object.values(dimensions).reduce((acc, d) => acc + (d.score * d.weight / 100), 0)
    );

    const status = overallScore > 85 ? 'healthy' : overallScore > 60 ? 'attention' : 'risk';

    return {
      overallScore,
      status,
      dimensions
    };
  }
}
