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
  m.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  m.maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  m.auth.getUser.mockResolvedValue({ 
    data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } }, 
    error: null 
  });
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
    
    // Reset sequences
    m.maybeSingle.mockReset();
    m.maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    m.single.mockReset();
    m.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  });

  const getMockSupabase = () => (supabase as any);

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
      getMockSupabase().maybeSingle
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile
        .mockResolvedValueOnce({ data: { company_id: "550e8400-e29b-41d4-a716-446655449999" }, error: null }); // Other Customer

      await expect(action.validate({
        customerId: mockCustomerId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any)).rejects.toThrow("Tenant mismatch");
    });

    it("should fail if vessel belongs to another tenant", async () => {
      getMockSupabase().maybeSingle
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Customer
        .mockResolvedValueOnce({ data: { company_id: "550e8400-e29b-41d4-a716-446655449999" }, error: null }); // Other Vessel

      await expect(action.validate({
        customerId: mockCustomerId,
        vesselId: mockVesselId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token"
      } as any)).rejects.toThrow("Tenant mismatch");
    });

    it("should fail if vessel belongs to another customer", async () => {
      getMockSupabase().maybeSingle
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Customer
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId, customer_id: "550e8400-e29b-41d4-a716-446655449999" }, error: null }); // Other Vessel owner

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
      getMockSupabase().maybeSingle
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Customer
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId, customer_id: mockCustomerId }, error: null }); // Vessel

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
      const m = getMockSupabase();
      m.single
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile check in execute
        .mockResolvedValueOnce({ data: { id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" }, error: null }); // Process insertion

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
      expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({
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
      const m = getMockSupabase();
      m.single
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "Database Error" } });

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

      const m = getMockSupabase();
      // Validator checks
      m.maybeSingle
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile in validate
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }); // Customer in validate
      
      // Execute checks
      m.single
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Profile in execute
        .mockResolvedValueOnce({ data: { id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" }, error: null }); // Process insertion

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
      const m = getMockSupabase();
      m.single
        .mockResolvedValueOnce({ data: { company_id: mockCompanyId }, error: null }) // Real company from profile
        .mockResolvedValueOnce({ data: { id: "550e8400-e29b-41d4-a716-446655440123", status: "pending" }, error: null });

      const input = {
        customerId: mockCustomerId,
        processType: "Transferência",
        processTypeId: mockTypeId,
        confirmationToken: "token",
        companyId: "malicious-company" // Attempted spoof
      };

      await action.execute(input as any);

      // Verify the insert used mockCompanyId, not malicious-company
      expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({
        company_id: mockCompanyId
      }));
    });
  });
});
