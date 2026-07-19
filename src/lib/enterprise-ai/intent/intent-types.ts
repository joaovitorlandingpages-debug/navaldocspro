import { z } from "zod";

export const IntentTypeSchema = z.enum([
  "CREATE_PROCESS",
  "GENERATE_PDF",
  "COMPLETE_CHECKLIST",
  "REQUEST_SIGNATURE",
  "MULTI_ACTION",
  "UNKNOWN"
]);

export type IntentType = z.infer<typeof IntentTypeSchema>;

export const EntitiesSchema = z.object({
  customerName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  vesselName: z.string().optional(),
  vesselId: z.string().uuid().optional(),
  documentType: z.string().optional(),
  processType: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dates: z.array(z.string()).optional(),
  participants: z.array(z.string()).optional(),
});

export type Entities = z.infer<typeof EntitiesSchema>;

export const StructuredIntentSchema = z.object({
  intentId: z.string().uuid(),
  originalText: z.string(),
  normalizedText: z.string(),
  intentType: IntentTypeSchema,
  entities: EntitiesSchema,
  confidence: z.number().min(0).max(1),
  requestedActions: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: z.record(z.any()),
});

export type StructuredIntent = z.infer<typeof StructuredIntentSchema>;
