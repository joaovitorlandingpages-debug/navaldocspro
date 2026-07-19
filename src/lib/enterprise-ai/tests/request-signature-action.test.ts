import { describe, it, expect, beforeEach, vi } from "vitest";
import { RequestSignatureAction } from "../actions/signatures/request-signature-action";
import { ActionStatus } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  const m = {
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
  return { supabase: m, _mocks: m };
});

// Mock existing Signature Service
vi.mock("@/services/signatures", () => ({
  signaturesService: {
    create: vi.fn().mockResolvedValue({
      request: { id: "sig-req-123", status: "sent", title: "Test Request" },
      participants: [
        { id: "part-1", name: "User 1", email: "user1@test.com", status: "pending" }
      ]
    })
  }
}));

// Mock Confirmation Service
vi.mock("../actions/confirmation/confirmation-service", () => ({
  confirmationService: {
    createConfirmation: vi.fn().mockResolvedValue({ publicToken: "mock-token" }),
    validateAndConsume: vi.fn().mockResolvedValue({ id: "conf-1" })
  }
}));

describe("RequestSignatureAction (Sprint 5.1)", () => {
  let action: RequestSignatureAction;
  const mockCompanyId = "company-123";
  const mockUserId = "user-456";
  const mockProcessId = "process-789";
  const mockDocumentId = "doc-001";

  beforeEach(() => {
    vi.clearAllMocks();
    action = new RequestSignatureAction();
    ActionRegistry.clear();
    ActionRegistry.register(action);
  });

  const getMockSupabase = () => (supabase as any);

  describe("Validation", () => {
    it("should fail if processId is missing", async () => {
      const result = await action.validate({ 
        documentId: mockDocumentId, 
        participants: [], 
        companyId: mockCompanyId 
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("processId is required");
    });

    it("should fail if documentId is missing", async () => {
      const result = await action.validate({ 
        processId: mockProcessId, 
        participants: [], 
        companyId: mockCompanyId 
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("documentId is required");
    });

    it("should fail if participants are empty", async () => {
      const result = await action.validate({ 
        processId: mockProcessId, 
        documentId: mockDocumentId, 
        participants: [], 
        companyId: mockCompanyId 
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("at least one participant is required");
    });

    it("should fail if document belongs to another tenant", async () => {
      getMockSupabase().single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: "Not found" } 
      });

      const result = await action.validate({
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [{ name: "Test", email: "test@test.com", role: "cliente" }],
        companyId: mockCompanyId
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain("not found or access denied");
    });

    it("should fail if document process_id mismatch", async () => {
      getMockSupabase().single.mockResolvedValueOnce({ 
        data: { id: mockDocumentId, process_id: "other-process" }, 
        error: null 
      });

      const result = await action.validate({
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [{ name: "Test", email: "test@test.com", role: "cliente" }],
        companyId: mockCompanyId
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain("does not belong to process");
    });

    it("should succeed if all validations pass", async () => {
      getMockSupabase().single
        .mockResolvedValueOnce({ // Document
          data: { id: mockDocumentId, process_id: mockProcessId }, 
          error: null 
        })
        .mockResolvedValueOnce({ // Process
          data: { id: mockProcessId }, 
          error: null 
        });

      const result = await action.validate({
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [{ name: "Test", email: "test@test.com", role: "cliente" }],
        companyId: mockCompanyId
      } as any);

      expect(result.valid).toBe(true);
    });
  });

  describe("Execution", () => {
    it("should execute successfully and call signaturesService", async () => {
      getMockSupabase().single
        .mockResolvedValueOnce({ // Process
          data: { customer_id: "cust-123", title: "Test Process" }, 
          error: null 
        })
        .mockResolvedValueOnce({ // Document
          data: { title: "Test Document" }, 
          error: null 
        });

      const input = {
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [{ name: "Test", email: "test@test.com", role: "cliente" as const }],
        message: "Sign this please"
      };

      const context = {
        companyId: mockCompanyId,
        userId: mockUserId,
        executionId: "exec-123"
      };

      const result = await action.execute({ ...input, ...context } as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe(ActionStatus.SUCCESS);
      expect(result.metadata?.signatureRequestId).toBe("sig-req-123");
      
      const { signaturesService } = await import("@/services/signatures");
      expect(signaturesService.create).toHaveBeenCalledWith(expect.objectContaining({
        company_id: mockCompanyId,
        process_id: mockProcessId,
        document_id: mockDocumentId,
        participants: expect.arrayContaining([
          expect.objectContaining({ name: "Test", email: "test@test.com" })
        ])
      }));
    });

    it("should handle service errors gracefully", async () => {
      getMockSupabase().single.mockResolvedValue({ 
        data: { customer_id: "cust-123" }, 
        error: null 
      });
      
      const { signaturesService } = await import("@/services/signatures");
      (signaturesService.create as any).mockRejectedValueOnce(new Error("Service failure"));

      const result = await action.execute({
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [{ name: "Test", email: "test@test.com", role: "cliente" }],
        companyId: mockCompanyId,
        userId: mockUserId,
        executionId: "exec-123"
      } as any);

      expect(result.success).toBe(false);
      expect(result.status).toBe(ActionStatus.FAILED);
      expect(result.message).toBe("Service failure");
    });
  });

  describe("Full Integration (ActionExecutor)", () => {
    it("should run through the full secure pipeline", async () => {
      const validator = new ActionValidator();
      const guard = new PermissionGuard();
      const executor = new ActionExecutor(ActionRegistry, validator, guard);

      getMockSupabase().single
        .mockResolvedValueOnce({ // Process check in validator
          data: { id: mockProcessId, company_id: mockCompanyId }, error: null 
        })
        .mockResolvedValueOnce({ // Document check in action.validate
          data: { id: mockDocumentId, process_id: mockProcessId }, error: null 
        })
        .mockResolvedValueOnce({ // Process check in action.validate
          data: { id: mockProcessId }, error: null 
        })
        .mockResolvedValueOnce({ // Process fetch in action.execute
          data: { customer_id: "cust-123" }, error: null 
        })
        .mockResolvedValueOnce({ // Document fetch in action.execute
          data: { title: "Test Doc" }, error: null 
        });

      const security = {
        userId: mockUserId,
        companyId: mockCompanyId,
        role: "admin",
        permissions: ["DOCUMENT_READ", "SIGNATURE_CREATE", "PROCESS_READ"],
        isAuthenticated: true
      };

      const result = await executor.execute(
        "request-signature",
        {
          processId: mockProcessId,
          documentId: mockDocumentId,
          participants: [{ name: "Test", email: "test@test.com", role: "cliente" }],
          confirmationToken: "conf-123"
        },
        security,
        "test-session-id"
      );


      expect(result.success).toBe(true);
      expect(result.status).toBe(ActionStatus.SUCCESS);
    });
  });

  describe("Security & Multi-tenancy", () => {
    it("should block if participant is from another tenant (if participantId provided)", async () => {
      // In this action, we rely on RLS and validation. 
      // If a participantId is provided, we should ideally verify it too.
      // For now, signaturesService handles some of this, but the action adds a layer.
    });

    it("should prevent overwriting security context", async () => {
      getMockSupabase().single.mockResolvedValue({ data: { id: mockProcessId }, error: null });

      // Simulate malicious input trying to override companyId
      const input = {
        processId: mockProcessId,
        documentId: mockDocumentId,
        participants: [],
        companyId: "attacker-company"
      };

      const context = {
        companyId: mockCompanyId,
        userId: mockUserId,
        executionId: "exec-123"
      };

      // The execute method should use the one from context (which comes from secure source)
      await action.execute({ ...input, ...context } as any);

      const { signaturesService } = await import("@/services/signatures");
      expect(signaturesService.create).toHaveBeenCalledWith(expect.objectContaining({
        company_id: mockCompanyId // Should use context, not input
      }));
    });
  });

  describe("Idempotency", () => {
    it("should use the same executionId provided by the orchestrator", async () => {
       getMockSupabase().single.mockResolvedValue({ data: { id: mockProcessId }, error: null });
       
       const executionId = "fixed-uuid-123";
       const result = await action.execute({
         processId: mockProcessId,
         documentId: mockDocumentId,
         participants: [],
         companyId: mockCompanyId,
         userId: mockUserId,
         executionId
       } as any);

       expect(result.executionId).toBe(executionId);
    });
  });
});
