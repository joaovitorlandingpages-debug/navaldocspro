import { SecurityContext, AIPermission } from "./permission-types";
import { ValidationStatus, ValidationResult, createValidationResult } from "./validation-result";

export class PermissionGuard {
  validateContext(context: SecurityContext, requiredPermissions: string[], requiredRole?: string): ValidationResult {
    if (!context.isAuthenticated) {
      return createValidationResult({
        success: false,
        status: ValidationStatus.AUTH_REQUIRED,
        errors: ["User is not authenticated"],
      });
    }

    if (!context.companyId) {
      return createValidationResult({
        success: false,
        status: ValidationStatus.TENANT_ERROR,
        errors: ["Invalid tenant (companyId is missing)"],
        authenticationValidated: true,
      });
    }

    if (requiredRole && context.role !== requiredRole && context.role !== 'admin_master') {
      return createValidationResult({
        success: false,
        status: ValidationStatus.ROLE_DENIED,
        errors: [`Required role: ${requiredRole}. Current role: ${context.role}`],
        authenticationValidated: true,
        tenantValidated: true,
        requiredRole,
      });
    }

    const missing = requiredPermissions.filter(p => !context.permissions.includes(p));
    if (missing.length > 0) {
      return createValidationResult({
        success: false,
        status: ValidationStatus.PERMISSION_DENIED,
        errors: [`Missing permissions: ${missing.join(", ")}`],
        authenticationValidated: true,
        tenantValidated: true,
        missingPermissions: missing,
      });
    }

    return createValidationResult({
      success: true,
      status: ValidationStatus.VALID,
      authenticationValidated: true,
      tenantValidated: true,
    });
  }

  // Multi-tenant isolation helper
  validateOwnership(resourceCompanyId: string, contextCompanyId: string): boolean {
    return resourceCompanyId === contextCompanyId;
  }
}
