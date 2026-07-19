export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface OperationalSuggestion {
  id: string;
  type: string;
  priority: SuggestionPriority;
  title: string;
  message: string;
  impact: string;
  reason: string;
  entityRelated?: string;
  resolutionPath?: string;
  createdAt: string;
}

import { DocumentStats } from "../utils/processMetrics";

/**
 * OperationalSuggestionEngine - Deterministic suggestions based on real data
 */
export class OperationalSuggestionEngine {
  static generate(processId: string, stats: DocumentStats): OperationalSuggestion[] {
    const suggestions: OperationalSuggestion[] = [];

    // Rule: Missing required documents
    if (stats.totalBlocking > 0) {
      suggestions.push({
        id: `missing-docs-${processId}`,
        type: 'documentation',
        priority: 'high',
        title: 'Documentos Obrigatórios Ausentes',
        message: `Existem ${stats.totalBlocking} documentos obrigatórios que ainda não foram anexados.`,
        impact: 'Impede a finalização e o protocolo do processo.',
        reason: 'Mapeamento de processo exige estes documentos para conformidade.',
        resolutionPath: `/admin/process-center/${processId}?tab=documentos`,
        createdAt: new Date().toISOString()
      });
    }

    // Rule: Pending approvals
    if (stats.totalPending > 0) {
      suggestions.push({
        id: `pending-approval-${processId}`,
        type: 'review',
        priority: 'medium',
        title: 'Documentos Aguardando Revisão',
        message: `Existem ${stats.totalPending} documentos aguardando sua validação manual.`,
        impact: 'Atrasa o fluxo de assinaturas e publicação.',
        reason: 'Upload realizado, aguardando aprovação do gestor.',
        resolutionPath: `/admin/process-center/${processId}?tab=workspace`,
        createdAt: new Date().toISOString()
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder: Record<SuggestionPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        info: 4
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}
