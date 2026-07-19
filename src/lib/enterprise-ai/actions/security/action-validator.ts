import { ActionRegistry } from "../action-registry";
import { PermissionGuard } from "./permission-guard";
import { SecurityContext } from "./permission-types";
import { ValidationResult, ValidationStatus, createValidationResult } from "./validation-result";

export class ActionValidator {
  private guard = new PermissionGuard();

  async validate(actionId: string, context: SecurityContext, payload?: any): Promise<ValidationResult> {
    // 1. Check if Action is registered
    const action = ActionRegistry.get(actionId);
    if (!action) {
      return createValidationResult({
        success: false,
        status: ValidationStatus.INVALID,
        errors: [`Action ${actionId} is not registered`],
      });
    }

    // 2. Validate Security Context (Auth, Tenant, Role, Permissions)
    const securityResult = this.guard.validateContext(
      context, 
      action.requiredPermissions, 
      action.requiredRole
    );

    if (!securityResult.success) {
      return securityResult;
    }

    // 3. Delegate to Action-specific validation
    try {
      const actionSpecific = await action.validate({ ...payload, companyId: context.companyId });


      if (!actionSpecific.valid) {
        return createValidationResult({
          success: false,
          status: ValidationStatus.INVALID_STATE,
          errors: actionSpecific.errors || ["Action-specific validation failed"],
          authenticationValidated: true,
          tenantValidated: true,
        });
      }
    } catch (error: any) {
      return createValidationResult({
        success: false,
        status: ValidationStatus.INVALID,
        errors: [error.message || "Internal validation error"],
        authenticationValidated: true,
        tenantValidated: true,
      });
    }

    return securityResult;
  }
}
