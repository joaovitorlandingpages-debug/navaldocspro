export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface OperationalSuggestion {
  id: string;
  type: 'documentation' | 'checklist' | 'ocr' | 'signatures' | 'deadlines' | 'registration' | 'review' | 'finalization';
  priority: SuggestionPriority;
  title: string;
  message: string;
  impact: string;
  reason: string;
  entityRelated?: string;
  resolutionPath?: string;
  sourceDate?: string;
  dismissible: boolean;
  blocker: boolean;
}

import { DocumentStats } from "../utils/processMetrics";

/**
 * OperationalSuggestionEngine - Deterministic suggestions based on real data
 */
export class OperationalSuggestionEngine {
  static generate(processId: string, stats: DocumentStats, processData: any): OperationalSuggestion[] {
    const suggestions: OperationalSuggestion[] = [];

    // --- DOCUMENTATION RULES ---
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
        dismissible: false,
        blocker: true
      });
    }

    // --- REVIEW RULES ---
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
        dismissible: true,
        blocker: false
      });
    }

    // --- REGISTRATION RULES (Customer/Vessel data) ---
    if (!processData.customer?.cpf_cnpj || !processData.customer?.email) {
      suggestions.push({
        id: `incomplete-customer-${processId}`,
        type: 'registration',
        priority: 'medium',
        title: 'Dados do Cliente Incompletos',
        message: 'O cliente vinculado não possui todos os dados obrigatórios preenchidos.',
        impact: 'Pode causar erros na geração de documentos dinâmicos.',
        reason: 'CPF/CNPJ ou Email ausentes.',
        resolutionPath: `/admin/customers/${processData.customer_id}`,
        dismissible: false,
        blocker: false
      });
    }

    if (!processData.vessel?.registration_number) {
        suggestions.push({
          id: `incomplete-vessel-${processId}`,
          type: 'registration',
          priority: 'medium',
          title: 'Dados da Embarcação Incompletos',
          message: 'A embarcação vinculada não possui número de inscrição.',
          impact: 'Documentos de transferência e renovação exigem este dado.',
          reason: 'Número de inscrição ausente.',
          resolutionPath: `/admin/vessels/${processData.vessel_id}`,
          dismissible: false,
          blocker: false
        });
    }

    // Sorting Logic: 1. Blocker, 2. Priority, 3. Date (if exists)
    return suggestions.sort((a, b) => {
      if (a.blocker && !b.blocker) return -1;
      if (!a.blocker && b.blocker) return 1;

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
