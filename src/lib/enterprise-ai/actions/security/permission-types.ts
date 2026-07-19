export enum AIPermission {
  PROCESS_READ = 'PROCESS_READ',
  PROCESS_WRITE = 'PROCESS_WRITE',
  PROCESS_CREATE = 'PROCESS_CREATE',
  PROCESS_DELETE = 'PROCESS_DELETE',
  DOCUMENT_READ = 'DOCUMENT_READ',
  DOCUMENT_GENERATE = 'DOCUMENT_GENERATE',
  SIGNATURE_CREATE = 'SIGNATURE_CREATE',
  CHECKLIST_UPDATE = 'CHECKLIST_UPDATE',
  CUSTOMER_CREATE = 'CUSTOMER_CREATE',
  VESSEL_CREATE = 'VESSEL_CREATE'
}

export interface SecurityContext {
  userId: string;
  companyId: string;
  role: string;
  permissions: string[];
  isAuthenticated: boolean;
}
