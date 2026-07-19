export class AuditError extends Error {
  constructor(message: string, public readonly code: string = 'AUDIT_ERROR') {
    super(message);
    this.name = 'AuditError';
  }
}

export class AuditPersistenceError extends AuditError {
  constructor(message: string) {
    super(message, 'AUDIT_PERSISTENCE_ERROR');
  }
}
