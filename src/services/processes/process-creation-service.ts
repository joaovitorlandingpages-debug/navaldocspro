import { supabase } from "@/integrations/supabase/client";
import { ProcessCreationError } from "@/lib/enterprise-ai/actions/process/process-action-types";

export interface CreateProcessParams {
  companyId: string;
  processType: string;
  processTypeId?: string;
  customerId: string;
  vesselId?: string | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export class ProcessCreationService {
  /**
   * Encapsulates the core process record creation.
   * This is the official domain function for inserting into 'processes'.
   */
  async createProcess(params: CreateProcessParams): Promise<{ id: string; status: string }> {
    const { data: process, error } = await supabase
      .from("processes")
      .insert({
        company_id: params.companyId,
        process_type: params.processType,
        process_type_id: params.processTypeId,
        customer_id: params.customerId,
        vessel_id: params.vesselId || null,
        title: params.title,
        description: params.description || null,
        priority: params.priority,
        status: "pending",
        is_draft: false,
        metadata: params.metadata || {},
      } as any)
      .select("id, status")
      .single();

    if (error || !process) {
      throw new ProcessCreationError(error?.message || "Process insertion failed");
    }

    return process;
  }
}

export const processCreationService = new ProcessCreationService();
