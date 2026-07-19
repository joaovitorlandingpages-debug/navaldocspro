import { ActionStatus } from '../action-types';

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

export class SignatureActionError extends Error {
  constructor(public message: string, public code: string = 'SIGNATURE_ACTION_ERROR') {
    super(message);
    this.name = 'SignatureActionError';
  }
}

export class DocumentNotFoundError extends SignatureActionError {
  constructor(documentId: string) {
    super(`Document ${documentId} not found`, 'DOCUMENT_NOT_FOUND');
  }
}

export class SignatureExecutionError extends SignatureActionError {
  constructor(message: string) {
    super(message, 'SIGNATURE_EXECUTION_ERROR');
  }
}

