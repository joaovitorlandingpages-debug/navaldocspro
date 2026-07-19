import { ActionStatus, ActionResult } from "./action-types";

export function createActionResult(
  params: Partial<ActionResult> & { executionId: string }
): ActionResult {
  return {
    success: params.success ?? false,
    status: params.status ?? ActionStatus.NOT_IMPLEMENTED,
    message: params.message ?? "",
    executionId: params.executionId,
    duration: params.duration ?? 0,
    warnings: params.warnings ?? [],
    errors: params.errors ?? [],
    metadata: params.metadata ?? {},
  };
}
