import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Services BEFORE Action/Executor imports
vi.mock("@/services/processes/process-creation-service", () => ({
  processCreationService: {
    createProcess: vi.fn().mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" }),
  }
}));

import { CreateProcessAction } from "../actions/process/create-process-action";
import { ActionStatus } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";
import { supabase } from "@/integrations/supabase/client";
import { processCreationService } from "@/services/processes/process-creation-service";

// Valid UUIDs for Zod
const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
const mockCompanyId = "550e8400-e29b-41d4-a716-446655440001";
const mockCustomerId = "550e8400-e29b-41d4-a716-446655440002";
const mockVesselId = "550e8400-e29b-41d4-a716-446655440003";
const mockTypeId = "550e8400-e29b-41d4-a716-446655440004";
const mockProcessId = "550e8400-e29b-41d4-a716-446655440999";
import { ActionExecutionError } from "../actions/execution/execution-errors";

// Mock Supabase
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
    is: vi.fn(),
    or: vi.fn(),
    delete: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
  };
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.single.mockReturnValue(m);
  m.maybeSingle.mockReturnValue(m);
  m.is.mockReturnValue(m);
  m.or.mockReturnValue(m);
  m.delete.mockReturnValue(m);
  m.in.mockReturnValue(m);
  m.order.mockReturnValue(m);
  
  m.auth.getUser.mockResolvedValue({ 
    data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } }, 
    error: null 
  });
  
  (m as any).then = (onRes: any) => Promise.resolve({ data: null, error: null }).then(onRes);
  
  return { supabase: m, _mocks: m };
});

// Mock Domain Services
vi.mock("@/services/processes/blueprintEngine", () => ({
  materializeProcessBlueprint: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/services/processes/processCreation", () => ({
  confirmProcessVisible: vi.fn().mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440999", company_id: "550e8400-e29b-41d4-a716-446655440001" }),
  notifyProcessesChanged: vi.fn(),
}));

vi.mock("@/services/processes/process-creation-service", () => ({
  processCreationService: {
    createProcess: vi.fn().mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440999", status: "pending" }),
  }
}));

// Mock Confirmation Service
vi.mock("../actions/confirmation/confirmation-service", () => ({
  confirmationService: {
    validateAndConsume: vi.fn().mockResolvedValue({ id: "conf-1" })
  }
}));

// Mock Audit Logger
vi.mock("../audit/audit-logger", () => ({
  auditLogger: {
    logStart: vi.fn().mockResolvedValue({}),
    logSuccess: vi.fn().mockResolvedValue({}),
    logFailure: vi.fn().mockResolvedValue({}),
  }
}));

describe("CreateProcessAction (Sprint 5.2.1 - Idempotency & Atomic Execution)", () => {
  let action: CreateProcessAction;
  let executor: ActionExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new CreateProcessAction();
    ActionRegistry.clear();
    ActionRegistry.register(action);
    
    const validator = new ActionValidator();
    const guard = new PermissionGuard();
    executor = new ActionExecutor(ActionRegistry, validator, guard);
    
    const m = (supabase as any);
    m.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
    
    // Default response for profile check
    m.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { company_id: mockCompanyId }, error: null })
            })
          })
        };
      }
      return m;
    });

    m.then = (onRes: any) => Promise.resolve({ data: null, error: null }).then(onRes);
  });

  const getMockSupabase = () => (supabase as any);

  const mockSupabaseSequence = (responses: Array<{data: any, error?: any}>) => {
    let index = 0;
    getMockSupabase().then = (onRes: any) => {
      const res = responses[index++] || { data: null, error: null };
      return Promise.resolve(res).then(onRes);
    };
  };

  const securityContext = {
    userId: mockUserId,
    companyId: mockCompanyId,
    role: "admin",
    permissions: ["PROCESS_CREATE", "CUSTOMER_READ", "VESSEL_READ"],
    isAuthenticated: true
  };

  describe("1. Audit & Service Responsibility", () => {
    it("should use processCreationService instead of direct insert", async () => {
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } } // Profile
      ]);

      await action.execute({
        customerId: mockCustomerId,
        processType: "Transferência",
        priority: "high",
        title: "Test",
        _user: { id: mockUserId }
      } as any);

      expect(processCreationService.createProcess).toHaveBeenCalled();
    });
  });

  describe("2. Persistent Idempotency", () => {
    it("should return existing result for completed idempotency key", async () => {
      const existingResult = { processId: mockProcessId, status: "completed" };
      const createdAt = new Date().toISOString();
      const updatedAt = new Date().toISOString();

      // RPC call to claim record
      getMockSupabase().rpc.mockResolvedValue({
        data: {
          id: "record-1",
          status: "completed",
          result: existingResult,
          execution_id: "exec-orig",
          created_at: createdAt,
          updated_at: updatedAt,
          payload_hash: "correct-hash"
        },
        error: null
      });

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          processType: "Transferência",
          idempotencyKey: "unique-intent-123"
        },
        securityContext
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.isIdempotentResponse).toBe(true);
      expect(result.metadata?.processId).toBe(mockProcessId);
      // Ensure no new execution happened
      expect(getMockSupabase().from).not.toHaveBeenCalledWith("processes");
    });

    it("should reject if payload hash mismatch for same idempotency key", async () => {
      getMockSupabase().rpc.mockResolvedValue({
        data: null,
        error: { message: "payload hash mismatch" }
      });

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          processType: "Transferência",
          idempotencyKey: "intent-123"
        },
        securityContext
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain("IDEMPOTENCY_PAYLOAD_MISMATCH");
    });

    it("should block concurrent executions for same key", async () => {
      getMockSupabase().rpc.mockResolvedValue({
        data: {
          id: "record-1",
          status: "processing",
          execution_id: "other-exec",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          processType: "Transferência",
          idempotencyKey: "intent-123"
        },
        securityContext
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("Concurrent execution");
    });
  });

  describe("3. Atomic Execution & Recovery", () => {
    it("should mark as recoverable_failed if materialization fails", async () => {
      // 1. Claim success (processing)
      vi.mocked(getMockSupabase().rpc).mockImplementationOnce((fn: string, args: any) => {
        return Promise.resolve({
          data: { id: "record-1", status: "processing", execution_id: args?._execution_id || "current-exec" },
          error: null
        }) as any;
      });

      // 2. Setup profile success
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } } // Profile in execute
      ]);

      // 3. Materialize fail
      const { materializeProcessBlueprint } = await import("@/services/processes/blueprintEngine");
      vi.mocked(materializeProcessBlueprint).mockRejectedValueOnce(new Error("Blueprint Error"));

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          vesselId: "550e8400-e29b-41d4-a716-446655440222", // Required field
          processType: "Transferência",
          processTypeId: mockTypeId, 
          confirmationToken: "mock-token", 
          idempotencyKey: "recovery-test"
        },
        securityContext
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.errorCode).toBe("MATERIALIZATION_FAILED");

      // Verify idempotency record update
      expect(getMockSupabase().update).toHaveBeenCalledWith(expect.objectContaining({
        status: "recoverable_failed",
        error_code: "MATERIALIZATION_FAILED",
        process_id: mockProcessId
      }));
    });


    it("should recover and skip process creation if record already has process_id (Retry Flow)", async () => {
      const { materializeProcessBlueprint } = await import("@/services/processes/blueprintEngine");
      vi.mocked(materializeProcessBlueprint).mockResolvedValue({ success: true } as any);

      // 1. Claim recoverable record
      getMockSupabase().rpc.mockImplementationOnce((fn: string, args: any) => {
        return Promise.resolve({
          data: { 
            id: "record-1", 
            status: "recoverable_failed", 
            process_id: mockProcessId,
            execution_id: args?._execution_id || "old-exec"
          },
          error: null
        }) as any;
      });

      // 2. Setup success for remaining steps
      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } } // Profile check
      ]);

      const result = await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          vesselId: "550e8400-e29b-41d4-a716-446655440222", // Fix Zod error: vesselId required
          processType: "Transferência",
          processTypeId: mockTypeId, 
          confirmationToken: "mock-token", 
          idempotencyKey: "retry-123"
        },
        securityContext
      );


      if (!result.success) {
        console.log("RECOVERY TEST FAIL:", result.errors, result.metadata);
      }
      expect(result.success).toBe(true);
      expect(result.metadata?.processId).toBe(mockProcessId);
      
      // CRITICAL: Verify NO process creation happened
      expect(processCreationService.createProcess).not.toHaveBeenCalled();
      
      // Verify update to completed
      expect(getMockSupabase().update).toHaveBeenCalledWith(expect.objectContaining({
        status: "completed",
        process_id: mockProcessId
      }));
    });
  });

  describe("4. Security & Isolation", () => {
    it("should prevent tenant spoofing by ignoring input companyId", async () => {
      getMockSupabase().rpc.mockResolvedValue({
        data: { id: "record-1", status: "processing" },
        error: null
      });

      mockSupabaseSequence([
        { data: { company_id: mockCompanyId } }, // Validate Profile
        { data: { company_id: mockCompanyId } }, // Validate Customer
        { data: { company_id: mockCompanyId } }, // Execute Profile
        { data: { id: mockProcessId, status: "pending" } }
      ]);

      await executor.execute(
        "create-process",
        {
          customerId: mockCustomerId,
          processType: "Transferência",
          companyId: "hacker-company", // Spoofer
          idempotencyKey: "intent-123"
        },
        securityContext
      );

      // Verify claim and insert used context, not input
      expect(getMockSupabase().rpc).toHaveBeenCalledWith(
        'claim_ai_idempotency_record',
        expect.objectContaining({ _company_id: mockCompanyId })
      );
    });

    it("should require PROCESS_CREATE permission", async () => {
      const lowSecurityContext = { ...securityContext, permissions: [] };
      
      const result = await executor.execute(
        "create-process",
        { customerId: mockCustomerId, processType: "T" },
        lowSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(ActionStatus.PERMISSION_DENIED);
    });
  });
});
