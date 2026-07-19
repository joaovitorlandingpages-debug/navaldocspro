export enum ValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  TENANT_ERROR = 'TENANT_ERROR',
  ROLE_DENIED = 'ROLE_DENIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE'
}

export interface ValidationResult {
  success: boolean;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  missingPermissions: string[];
  requiredRole?: string;
  tenantValidated: boolean;
  authenticationValidated: boolean;
}

export function createValidationResult(params: Partial<ValidationResult>): ValidationResult {
  return {
    success: params.success ?? false,
    status: params.status ?? ValidationStatus.INVALID,
    errors: params.errors ?? [],
    warnings: params.warnings ?? [],
    missingPermissions: params.missingPermissions ?? [],
    requiredRole: params.requiredRole,
    tenantValidated: params.tenantValidated ?? false,
    authenticationValidated: params.authenticationValidated ?? false,
  };
}
