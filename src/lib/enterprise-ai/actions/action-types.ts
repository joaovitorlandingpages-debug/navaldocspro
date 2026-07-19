import { ActionError } from "./process/process-action-types";

export { ActionError };

export enum ConfirmationPolicy {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ActionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export interface AIAction {
  id: string;
  metadata: {
    actionId: string;
    displayName: string;
    description: string;
    category: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiredPermissions: string[];
    confirmationPolicy: ConfirmationPolicy;
    dependencies: string[];
    retryPolicy: {
      maxRetries: number;
      backoff: 'fixed' | 'exponential';
    };
    estimatedDuration: number; // in seconds
    enabled: boolean;
    supportsRetry: boolean;
    supportsPlanner: boolean;
  };

  
  validate(context: any): Promise<{ valid: boolean; errors?: string[] }>;
  execute(context: any): Promise<ActionResult>;
  rollback(context: any): Promise<void>;
}

export interface ActionResult {
  success: boolean;
  status: ActionStatus;
  message: string;
  executionId: string;
  duration: number;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}
