import { DocumentStats } from "../utils/processMetrics";

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'not_evaluated';

export interface RiskFactor {
  code: string;
  category: 'documentation' | 'checklist' | 'ocr' | 'signatures' | 'deadlines' | 'dataIntegrity' | 'security' | 'review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  scoreContribution: number;
  cause: string;
  impact: string;
  recommendedAction: string;
  entityId?: string;
  resolutionPath?: string;
}

export interface ProcessRiskContext {
  process: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    deadline?: string;
    finalizedAt?: string | null;
    currentStage?: string;
  };
  documentation: DocumentStats & {
    missing: number;
    blocking: number;
    critical: number;
    expired: number;
    expiringSoon: number;
    waived: number;
    notApplicable: number;
  };
  checklist: {
    total: number;
    pending: number;
    blocking: number;
    completed: number;
    waivedWithoutReason: number;
  };
  ocr: {
    pending: number;
    failed: number;
    lowConfidence: number;
    missingRequiredFields: number;
    divergences: number;
  };
  signatures: {
    pending: number;
    expired: number;
    expiringSoon: number;
    requiredNotCreated: number;
    completedNotAdvanced: number;
  };
  review: {
    pending: number;
    overdue: number;
    rejected: number;
    adjustmentsRequested: number;
  };
  deadlines: {
    overdue: boolean;
    daysRemaining: number;
    inactivityDays: number;
  };
  dataIntegrity: {
    customerIncomplete: boolean;
    vesselIncomplete: boolean;
    ownerIncomplete: boolean;
    engineIncomplete: boolean;
    inconsistencies: number;
  };
  security: {
    integrityViolation: boolean;
    finalizedMutationAttempt: boolean;
  };
}

export interface ProcessRiskReport {
  level: RiskLevel;
  score: number | null;
  status: 'healthy' | 'attention' | 'risk';
  factors: RiskFactor[];
  positiveSignals: string[];
  recommendedActions: string[];
  evaluatedAt: string;
  evaluationVersion: string;
}

const PROCESS_RISK_CONFIG = {
  WEIGHTS: {
    CRITICAL_DOC_MISSING: 40,
    OVERDUE_DEADLINE: 50,
    SIGNATURE_EXPIRED: 30,
    OCR_FAILED: 15,
    SECURITY_VIOLATION: 100,
  },
  THRESHOLDS: {
    CRITICAL: 70,
    HIGH: 50,
    MEDIUM: 20,
  }
};

/**
 * ProcessRiskEngine - Deterministic risk evaluation v1.1
 */
export class ProcessRiskEngine {
  static evaluate(context: ProcessRiskContext): ProcessRiskReport {
    const factors: RiskFactor[] = [];
    const positiveSignals: string[] = [];
    let score = 0;

    // 1. Documentation Risk (Avoid Double Counting)
    if (context.documentation.blocking > 0) {
      const contribution = Math.min(40, context.documentation.blocking * 15);
      score += contribution;
      factors.push({
        code: 'DOC_BLOCKING',
        category: 'documentation',
        severity: 'critical',
        weight: PROCESS_RISK_CONFIG.WEIGHTS.CRITICAL_DOC_MISSING,
        scoreContribution: contribution,
        cause: `${context.documentation.blocking} documentos bloqueantes ausentes`,
        impact: 'Impede protocolo e finalização',
        recommendedAction: 'Anexar documentos obrigatórios',
        resolutionPath: `/admin/process-center/${context.process.id}?tab=documentos`
      });
    } else if (context.documentation.percentage === 100) {
      positiveSignals.push('Toda documentação obrigatória anexada');
    }

    // 2. Deadline Risk
    if (context.deadlines.overdue) {
      score += PROCESS_RISK_CONFIG.WEIGHTS.OVERDUE_DEADLINE;
      factors.push({
        code: 'DEADLINE_OVERDUE',
        category: 'deadlines',
        severity: 'critical',
        weight: PROCESS_RISK_CONFIG.WEIGHTS.OVERDUE_DEADLINE,
        scoreContribution: PROCESS_RISK_CONFIG.WEIGHTS.OVERDUE_DEADLINE,
        cause: 'Prazo do processo expirado',
        impact: 'Risco de multa ou perda de validade',
        recommendedAction: 'Finalizar processo imediatamente',
      });
    }

    // 3. Security Risk
    if (context.security.integrityViolation || context.security.finalizedMutationAttempt) {
      score = 100;
      factors.push({
        code: 'SECURITY_VIOLATION',
        category: 'security',
        severity: 'critical',
        weight: 100,
        scoreContribution: 100,
        cause: 'Violação de integridade ou tentativa de alteração em processo finalizado',
        impact: 'Bloqueio administrativo e auditoria',
        recommendedAction: 'Contatar administrador do sistema',
      });
    }

    // 4. Data Integrity
    if (context.dataIntegrity.customerIncomplete || context.dataIntegrity.vesselIncomplete) {
      score += 15;
      factors.push({
        code: 'DATA_INCOMPLETE',
        category: 'dataIntegrity',
        severity: 'medium',
        weight: 15,
        scoreContribution: 15,
        cause: 'Dados de cadastro incompletos',
        impact: 'Pode invalidar documentos gerados',
        recommendedAction: 'Completar cadastro do cliente e embarcação',
      });
    }

    // Classification
    let level: RiskLevel = 'low';
    if (score >= PROCESS_RISK_CONFIG.THRESHOLDS.CRITICAL || context.documentation.blocking > 0) {
      level = 'critical';
    } else if (score >= PROCESS_RISK_CONFIG.THRESHOLDS.HIGH) {
      level = 'high';
    } else if (score >= PROCESS_RISK_CONFIG.THRESHOLDS.MEDIUM) {
      level = 'medium';
    } else {
      level = 'low';
    }

    const status = level === 'critical' || level === 'high' ? 'risk' : level === 'medium' ? 'attention' : 'healthy';

    return {
      level,
      score: Math.min(100, score),
      status,
      factors,
      positiveSignals,
      recommendedActions: factors.map(f => f.recommendedAction),
      evaluatedAt: new Date().toISOString(),
      evaluationVersion: '1.1.0'
    };
  }
}
