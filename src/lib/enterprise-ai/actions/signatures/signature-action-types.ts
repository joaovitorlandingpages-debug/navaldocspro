import { AIPermission } from '../security/permission-types';

export interface SignatureParticipantInput {
  participantId?: string; // If existing customer/user
  name: string;
  email: string;
  role: 'cliente' | 'engenheiro' | 'despachante' | 'responsavel_tecnico' | 'testemunha' | 'outro';
  signingOrder?: number;
  authenticationMethod?: 'email' | 'sms' | 'password' | 'none';
}

export interface RequestSignatureInput {
  processId: string;
  documentId: string;
  participants: SignatureParticipantInput[];
  expirationDate?: string;
  reminderEnabled?: boolean;
  message?: string;
  confirmationToken?: string;
}

export interface RequestSignatureResult {
  success: boolean;
  executionId: string;
  signatureRequestId: string;
  documentId: string;
  processId: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  expirationDate?: string;
  status: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}
