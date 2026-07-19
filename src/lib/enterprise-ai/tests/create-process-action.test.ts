import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreateProcessAction } from "../actions/process/create-process-action";
import { ActionStatus } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";
import { supabase } from "@/integrations/supabase/client";

// Valid UUIDs for Zod
const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
const mockCompanyId = "550e8400-e29b-41d4-a716-446655440001";
const mockCustomerId = "550e8400-e29b-41d4-a716-446655440002";
const mockVesselId = "550e8400-e29b-41d4-a716-446655440003";
const mockTypeId = "550e8400-e29b-41d4-a716-446655440004";

// Mock Supabase - avoid using variables inside the factory to prevent hoisting issues
vi.mock("@/integrations/supabase/client", () => {
  const m = {
    auth: {
      getUser: vi.fn(),
    },
    single: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    rpc: vi.fn(),
    maybeSingle: vi.fn(),
  };
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.single.mockReturnValue(m); // Return self for chaining
  m.maybeSingle.mockReturnValue(m); // Return self for chaining
  m.auth.getUser.mockResolvedValue({ 
    data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } }, 
    error: null 
  });
  
  // Terminal promise methods
  (m as any).then = (onRes: any) => Promise.resolve({ data: null, error: null }).then(onRes);
  
  return { supabase: m, _mocks: m };
});

// Mock Blueprint Engine
vi.mock("@/services/processes/blueprintEngine", () => ({
  materializeProcessBlueprint: vi.fn().mockResolvedValue({ success: true }),
  previewProcessBlueprint: vi.fn().mockResolvedValue([]),
}));

// Mock Process Creation Helpers
vi.mock("@/services/processes/processCreation", () => ({
  confirmProcessVisible: vi.fn().mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440999", company_id: "550e8400-e29b-41d4-a716-446655440001" }),
  notifyProcessesChanged: vi.fn(),
}));

// Mock Confirmation Service
vi.mock("../actions/confirmation/confirmation-service", () => ({
  confirmationService: {
    createConfirmation: vi.fn().mockResolvedValue({ publicToken: "mock-token" }),
    validateAndConsume: vi.fn().mockResolvedValue({ id: "conf-1" })
  }
}));

describe("CreateProcessAction (Sprint 5.2)", () => {
  let action: CreateProcessAction;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new CreateProcessAction();
    ActionRegistry.clear();
    ActionRegistry.register(action);
    
    // Default mock setup for successful validation
    const m = (supabase as any);
    m.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
    
    // Reset sequences by overriding 'then'
    m.then = (onRes: any) => Promise.resolve({ data: null, error: null }).then(onRes);
  });

  const getMockSupabase = () => (supabase as any);

  const mockSupabaseResponse = (data: any, error: any = null) => {
    getMockSupabase().then = (onRes: any) => Promise.resolve({ data, error }).then(onRes);
  };

  const mockSupabaseSequence = (responses: Array<{data: any, error?: any}>) => {
    let index = 0;
    getMockSupabase().then = (onRes: any) => {
      const res = responses[index++] || { data: null, error: null };
      return Promise.resolve(res).then(onRes);
    };
  };

  describe("Validation", () => {
    it("should fail if customerId is missing", async () => {
      const result = await action.validate({
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain("customerId");
    });

    it("should fail if customer belongs to another tenant", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile
        { data: { company_id: "550e8400-e29b-41d4-a716-446655449999" } } // Other Customer
      ]);

      await expect(action.validate({
        customerId: mockCustomerId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any)).rejects.toThrow("Tenant mismatch");
    });

    it("should fail if vessel belongs to another tenant", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile
        { data: { company_id: mockCompanyId } }, // Customer
        { data: { company_id: "550e8400-e29b-41d4-a716-446655449999" } } // Other Vessel
      ]);

      await expect(action.validate({
        customerId: mockCustomerId,
        vesselId: mockVesselId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any)).rejects.toThrow("Tenant mismatch");
    });

    it("should fail if vessel belongs to another customer", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile
        { data: { company_id: mockCompanyId } }, // Customer
        { data: { company_id: mockCompanyId, customer_id: "550e8400-e29b-41d4-a716-446655449999" } } // Other Vessel owner
      ]);

      const result = await action.validate({
        customerId: mockCustomerId,
        vesselId: mockVesselId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Vessel does not belong to the selected customer");
    });

    it("should succeed if all data is valid", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile
        { data: { company_id: mockCompanyId } }, // Customer
        { data: { company_id: mockCompanyId, customer_id: mockCustomerId } } // Vessel
      ]);

      const result = await action.validate({
        customerId: mockCustomerId,
        vesselId: mockVesselId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any);
      expect(result.valid).toBe(true);
    });
  });

  describe("Execution", () => {
    it("should create process and materialize blueprint", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile check in execute
        { data: { id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" } } // Process insertion
      ]);

      const input = {
        customerId: mockCustomerId,
        vesselId: mockVesselId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        title: "Test Process AI",
        priority: "high" as const,
        initialChecklist: ["550e8400-e29b-41d4-a716-446655440005"],
        confirmationToken: "token"
      };

      const result = await action.execute(input);

      expect(result.success).toBe(true);
      expect(result.metadata?.processId).toBe("550e8400-e29b-41d4-a716-446655440999");
      
      // Verify reuse of insert logic
      expect(getMockSupabase().insert).toHaveBeenCalledWith(expect.objectContaining({
        customer_id: mockCustomerId,
        vessel_id: mockVesselId,
        process_type: "Transferência",
        title: "Test Process AI",
        priority: "high"
      }));

      // Verify reuse of blueprint engine
      const { materializeProcessBlueprint } = await import("@/services/processes/blueprintEngine");
      expect(materializeProcessBlueprint).toHaveBeenCalled();
      
      // Verify notification
      const { notifyProcessesChanged } = await import("@/services/processes/processCreation");
      expect(notifyProcessesChanged).toHaveBeenCalled();
    });

    it("should handle insertion errors", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } },
        { data: null, error: { message: "Database Error" } }
      ]);

      const input = {
        customerId: mockCustomerId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      };

      const result = await action.execute(input as any);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Database Error");
    });
  });

  describe("Full Pipeline Integration", () => {
    it("should run through ActionExecutor with confirmation", async () => {
      const validator = new ActionValidator();
      const guard = new PermissionGuard();
      const executor = new ActionExecutor(ActionRegistry, validator, guard);

      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Profile in validate
        { data: { company_id: mockCompanyId } }, // Customer in validate
        { data: { company_id: mockCompanyId } }, // Vessel (optional check if validator does it)
        { data: { company_id: mockCompanyId } }, // Profile in execute
        { data: { id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" } } // Process insertion
      ]);





      const security = {
        userId: mockUserId,
        companyId: mockCompanyId,
        role: "admin",
        permissions: ["PROCESS_CREATE", "CUSTOMER_READ", "VESSEL_READ"],
        isAuthenticated: true
      };

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          processType: "Transferência",
          processTypeId: mockTypeId,
          confirmationToken: "conf-123"
        },
        security
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe(ActionStatus.SUCCESS);
      
      // Verify confirmation was consumed
      const { confirmationService } = await import("../actions/confirmation/confirmation-service");
      expect(confirmationService.validateAndConsume).toHaveBeenCalled();
    });
  });

  describe("Security Mandates", () => {
    it("should strictly use user company_id and not allow spoofing via input", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Real company from profile
        { data: { id: "550e8400-e29b-41d4-a716-446655440123", status: "pending" } }
      ]);

      const input = {
        customerId: mockCustomerId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token",
        companyId: "malicious-company" // Attempted spoof
      };

      await action.execute(input as any);

      // Verify the insert used mockCompanyId, not malicious-company
      expect(getMockSupabase().insert).toHaveBeenCalledWith(expect.objectContaining({
        company_id: mockCompanyId
      }));
    });
  });
});
