import { z } from "zod";
import { ActionError } from "../action-types";

export const CreateProcessInputSchema = z.object({
  customerId: z.string().uuid(),
  vesselId: z.string().uuid().optional().nullable(),
  processType: z.string(),
  processTypeId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  initialChecklist: z.array(z.string()).optional(), // List of template IDs to include
  participants: z.array(z.object({
    customerId: z.string().uuid(),
    role: z.string(),
  })).optional(),
  attachments: z.array(z.string()).optional(), // Storage paths
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
  constructor(message: string) {
    super(message, "PROCESS_CREATION_ERROR");
    this.name = "ProcessCreationError";
  }
}

export class TenantMismatchError extends ActionError {
  constructor(entity: string) {
    super(`Tenant mismatch: ${entity} does not belong to the current company`, "TENANT_MISMATCH");
    this.name = "TenantMismatchError";
  }
}
