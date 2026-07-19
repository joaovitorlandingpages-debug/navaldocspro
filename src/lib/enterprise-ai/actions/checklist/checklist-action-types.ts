export type ChecklistOperation = "complete" | "waive" | "reopen";

export interface CompleteChecklistInput {
  processId: string;
  checklistItemId: string;
  operation: ChecklistOperation;
  expectedVersion: number;
  reason?: string;
  notes?: string;
  evidenceDocumentId?: string;
  confirmationToken?: string;
  metadata?: Record<string, unknown>;
}

export class ChecklistActionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ChecklistActionError";
  }
}

export class ChecklistItemNotFoundError extends ChecklistActionError {
  constructor(id: string) {
    super(`Checklist item not found: ${id}`, "CHECKLIST_ITEM_NOT_FOUND");
  }
}

export class ChecklistTenantMismatchError extends ChecklistActionError {
  constructor() {
    super("Checklist item tenant mismatch", "CHECKLIST_TENANT_MISMATCH");
  }
}

export class ChecklistInvalidTransitionError extends ChecklistActionError {
  constructor(message: string) {
    super(message, "CHECKLIST_INVALID_TRANSITION");
  }
}

export class ChecklistVersionConflictError extends ChecklistActionError {
  constructor(public currentVersion: number) {
    super(`Checklist item version conflict. Current version: ${currentVersion}`, "CHECKLIST_VERSION_CONFLICT");
  }
}

export class ChecklistPermissionDeniedError extends ChecklistActionError {
  constructor(message: string) {
    super(message, "CHECKLIST_PERMISSION_DENIED");
  }
}

export class ChecklistEvidenceInvalidError extends ChecklistActionError {
  constructor(message: string) {
    super(message, "CHECKLIST_EVIDENCE_INVALID");
  }
}

export class ChecklistConfirmationRequiredError extends ChecklistActionError {
  constructor(public summary: string, public publicToken?: string) {
    super("Human confirmation required for this operation", "CHECKLIST_CONFIRMATION_REQUIRED");
  }
}

export class ChecklistProcessFinalizedError extends ChecklistActionError {
  constructor() {
    super("Cannot modify checklist of a finalized process", "CHECKLIST_PROCESS_FINALIZED");
  }
}

export class ChecklistExecutionError extends ChecklistActionError {
  constructor(message: string) {
    super(message, "CHECKLIST_EXECUTION_ERROR");
  }
}
