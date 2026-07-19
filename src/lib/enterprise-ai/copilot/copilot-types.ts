import { z } from "zod";
import { StructuredIntentSchema } from "../intent/intent-types";
import { ExecutionPlanSchema } from "../planner/planner-types";

export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const CopilotSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string(),
  companyId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  conversationHistory: z.array(ConversationMessageSchema),
  lastIntent: StructuredIntentSchema.optional(),
  lastExecutionPlan: ExecutionPlanSchema.optional(),
  lastExecutionResult: z.any().optional(),
  metadata: z.record(z.any()).default({}),
});
export type CopilotSession = z.infer<typeof CopilotSessionSchema>;

export const CopilotContextSchema = z.object({
  companyId: z.string(),
  userId: z.string(),
  permissions: z.array(z.string()),
  tenant: z.string().optional(),
  locale: z.string().default("pt-BR"),
  timezone: z.string().default("UTC"),
});
export type CopilotContext = z.infer<typeof CopilotContextSchema>;

export const CopilotResponseSchema = z.object({
  text: z.string(),
  sessionId: z.string().uuid(),
  requiresConfirmation: z.boolean().default(false),
  planId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  status: z.enum(["SUCCESS", "WAITING_CONFIRMATION", "FAILED", "PROCESSING", "CANCELLED"]),
  metadata: z.record(z.any()).default({}),
});
export type CopilotResponse = z.infer<typeof CopilotResponseSchema>;
