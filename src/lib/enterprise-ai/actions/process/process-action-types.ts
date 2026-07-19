import { z } from "zod";
// import { ActionError } from "../action-types";

export class ActionError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
    this.name = 'ActionError';
  }
}


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
    Object.setPrototypeOf(this, CustomerNotFoundError.prototype);
  }
}

export class VesselNotFoundError extends ActionError {
  constructor(id: string) {
    super(`Vessel not found: ${id}`, "VESSEL_NOT_FOUND");
    Object.setPrototypeOf(this, VesselNotFoundError.prototype);
  }
}

export class ProcessCreationError extends ActionError {
  public status = 'FAILED';
  constructor(message: string, code: string = "PROCESS_CREATION_ERROR") {
    super(message, code);
    this.name = "ProcessCreationError";
    Object.setPrototypeOf(this, ProcessCreationError.prototype);
  }
}

export class TenantMismatchError extends ActionError {
  constructor(entity: string) {
    super(`Tenant mismatch: ${entity} does not belong to the current company`, "TENANT_MISMATCH");
    Object.setPrototypeOf(this, TenantMismatchError.prototype);
  }
}
