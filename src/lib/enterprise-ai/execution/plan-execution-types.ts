import { z } from "zod";

export const PlanStatusSchema = z.enum([
  "PENDING",
  "VALIDATING",
  "WAITING_CONFIRMATION",
  "RUNNING",
  "PAUSED",
  "FAILED",
  "RECOVERABLE_FAILED",
  "COMPLETED",
  "CANCELLED",
]);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

export const StepStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
  "WAITING_CONFIRMATION",
]);
export type StepStatus = z.infer<typeof StepStatusSchema>;

export const ExecutionSessionSchema = z.object({
  sessionId: z.string().uuid(),
  planId: z.string().uuid(),
  companyId: z.string(),
  userId: z.string(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  currentStepId: z.string().uuid().optional(),
  completedSteps: z.array(z.string().uuid()),
  failedSteps: z.array(z.string().uuid()),
  state: PlanStatusSchema,
  auditMetadata: z.record(z.any()).default({}),
  stepResults: z.record(z.string().uuid(), z.any()).default({}),
});
export type ExecutionSession = z.infer<typeof ExecutionSessionSchema>;

export interface ExecutionEvent {
  type: "START" | "STEP_COMPLETED" | "STEP_FAILED" | "CONFIRMATION_REQUIRED" | "CANCEL" | "RESUME" | "RETRY";
  sessionId: string;
  stepId?: string;
  payload?: any;
}
