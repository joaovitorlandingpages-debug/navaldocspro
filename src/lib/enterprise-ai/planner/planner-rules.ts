import { z } from "zod";
import { ActionRiskLevel, ActionRiskLevelSchema } from "./planner-types";
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

/**
 * Calculate overall risk level for a plan based on steps' individual risks.
 */
export function calculateOverallRisk(steps: { actionId: string, riskLevel?: ActionRiskLevel }[]): ActionRiskLevel {
  const risks = steps.map(s => s.riskLevel || "LOW");
  
  if (risks.includes("CRITICAL")) return "CRITICAL";
  
  const highCount = risks.filter(r => r === "HIGH").length;
  if (highCount >= 1) return "HIGH";
  
  const mediumCount = risks.filter(r => r === "MEDIUM").length;
  if (mediumCount >= 3) return "HIGH"; // Accumulated risk
  if (mediumCount >= 1) return "MEDIUM";
  
  return "LOW";
}

/**
 * Default intent mapping rules
 */
export const DEFAULT_INTENT_RULES: IntentRule[] = [
  { intentKeywords: ["processo", "process", "criar processo", "proc"], actionId: "create-process", priority: 1 },
  { intentKeywords: ["pdf", "documento", "gerar pdf"], actionId: "generate-pdf", priority: 1 },
  { intentKeywords: ["checklist", "concluir checklist"], actionId: "complete-checklist", priority: 1 },
  { intentKeywords: ["assinatura", "signature", "enviar assinatura", "assinar", "sign"], actionId: "request-signature", priority: 1 },
];
