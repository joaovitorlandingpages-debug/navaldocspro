import { z } from "zod";
import { ActionRiskLevelSchema } from "./planner-types";
import { ConfirmationPolicy } from "../actions/action-types";

/**
 * Enhanced metadata required for actions to be discoverable and usable by the Planner.
 */
export const ActionMetadataSchema = z.object({
  actionId: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.string(),
  riskLevel: ActionRiskLevelSchema,
  requiredPermissions: z.array(z.string()),
  confirmationPolicy: z.nativeEnum(ConfirmationPolicy),
  dependencies: z.array(z.string()).default([]),
  retryPolicy: z.object({
    maxRetries: z.number().default(3),
    backoff: z.enum(["fixed", "exponential"]).default("exponential"),
  }).default({}),
  estimatedDuration: z.number().default(30), // in seconds
  enabled: z.boolean().default(true),
  supportsRetry: z.boolean().default(true),
  supportsPlanner: z.boolean().default(true),
});

export type ActionMetadata = z.infer<typeof ActionMetadataSchema>;

/**
 * Intent mapping rule for declarative discovery
 */
export const IntentRuleSchema = z.object({
  intentKeywords: z.array(z.string()),
  actionId: z.string(),
  priority: z.number().default(1),
});

export type IntentRule = z.infer<typeof IntentRuleSchema>;
