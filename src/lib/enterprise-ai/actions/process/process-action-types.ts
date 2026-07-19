import { z } from "zod";

export class ActionError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
    this.name = 'ActionError';
  }
}

export const CreateProcessInputSchema = z.object({
  processType: z.string(),
  processTypeId: z.string(),
  customerId: z.string(),
  vesselId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  initialChecklist: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  confirmationToken: z.string(),
});

export type CreateProcessInput = z.infer<typeof CreateProcessInputSchema>;

export class CustomerNotFoundError extends ActionError {
  constructor(id: string) {
    super(`Customer not found: ${id}`, "CUSTOMER_NOT_FOUND");
    this.name = "CustomerNotFoundError";
  }
}

export class VesselNotFoundError extends ActionError {
  constructor(id: string) {
    super(`Vessel not found: ${id}`, "VESSEL_NOT_FOUND");
    this.name = "VesselNotFoundError";
  }
}

export class ProcessCreationError extends ActionError {
  constructor(message: string, code = "PROCESS_CREATION_FAILED") {
    super(message, code);
    this.name = "ProcessCreationError";
  }
}
