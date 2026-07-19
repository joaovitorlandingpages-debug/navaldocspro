export enum ConfirmationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONSUMED = 'consumed',
  CANCELLED = 'cancelled'
}

export interface ActionConfirmation {
  id: string;
  tokenHash: string;
  executionId?: string;
  actionId: string;
  userId: string;
  companyId: string;
  processId?: string;
  resourceId?: string;
  operation: string;
  payloadHash: string;
  status: ConfirmationStatus;
  expiresAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
  consumedAt?: string;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface CreateConfirmationParams {
  actionId: string;
  userId: string;
  companyId: string;
  processId?: string;
  resourceId?: string;
  operation: string;
  payload: Record<string, any>;
  expiresInMinutes?: number;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  confirmation?: ActionConfirmation;
  errorCode?: string;
}
