import { z } from "zod";

export const ActionRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type ActionRiskLevel = z.infer<typeof ActionRiskLevelSchema>;

export const ExecutionStepStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);
export type ExecutionStepStatus = z.infer<typeof ExecutionStepStatusSchema>;

export const ExecutionPlanStatusSchema = z.enum([
  "DRAFT",
  "READY",
  "EXECUTING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type ExecutionPlanStatus = z.infer<typeof ExecutionPlanStatusSchema>;

export const ExecutionStepSchema = z.object({
  stepId: z.string().uuid(),
  actionId: z.string(),
  dependsOn: z.array(z.string().uuid()),
  status: ExecutionStepStatusSchema,
  requiredPermissions: z.array(z.string()),
  confirmationRequired: z.boolean(),
  estimatedDuration: z.number().optional(), // in seconds
  retryPolicy: z.object({
    maxRetries: z.number().default(3),
    backoff: z.enum(["fixed", "exponential"]).default("exponential"),
  }).optional(),
  input: z.any(),
});
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

export const ExecutionPlanSchema = z.object({
  planId: z.string().uuid(),
  intent: z.string(),
  steps: z.array(ExecutionStepSchema),
  riskLevel: ActionRiskLevelSchema,
  estimatedActions: z.number(),
  requiresConfirmation: z.boolean(),
  status: ExecutionPlanStatusSchema,
  companyId: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.any()).default({}),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export interface PlannerContext {
  userId: string;
  companyId: string;
  permissions: string[];
  tenantId?: string;
}

export interface PlannerRequest {
  intent: string;
  context: PlannerContext;
  structuredIntent?: any;
}
