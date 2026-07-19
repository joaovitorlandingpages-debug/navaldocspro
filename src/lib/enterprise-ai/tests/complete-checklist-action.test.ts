import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompleteChecklistAction } from "../actions/checklist/complete-checklist-action";
import { ActionStatus } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";

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
  };
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  return { supabase: m, _mocks: m };
});

// Mock Optimistic Lock
vi.mock("@/lib/optimisticLock", () => ({
  casUpdate: vi.fn()
}));

// Mock Confirmation Service
vi.mock("../actions/confirmation/confirmation-service", () => ({
  confirmationService: {
    createConfirmation: vi.fn().mockResolvedValue({ publicToken: "mock-token" }),
    validateAndConsume: vi.fn().mockResolvedValue({ id: "conf-1" })
  }
}));

describe("CompleteChecklistAction (Sprint 5.0)", () => {
  let action: CompleteChecklistAction;
  const mockCompanyId = "company-123";
  const mockUserId = "user-456";
  const mockProcessId = "process-789";
  const mockItemId = "item-001";

  beforeEach(async () => {
    vi.clearAllMocks();
    action = new CompleteChecklistAction();
  });

  it("1. Metadata básico da Action", () => {
    expect(action.id).toBe("complete-checklist");
    expect(action.requiredPermissions).toContain("PROCESS_UPDATE");
    expect(action.requiredPermissions).toContain("CHECKLIST_UPDATE");
  });

  it("2. Validação: Campos obrigatórios", async () => {
    const result = await action.validate({ 
      processId: "", 
      checklistItemId: "",
      expectedVersion: undefined,
      operation: undefined
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("processId is required");
    expect(result.errors).toContain("checklistItemId is required");
    expect(result.errors).toContain("expectedVersion is required");
    expect(result.errors).toContain("operation is required");
  });

  it("3. Execução: Falha se processo não pertencer ao tenant", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    (supabaseMock.single as any).mockResolvedValueOnce({
      data: { id: mockProcessId, company_id: "wrong-tenant", status: "active" },
      error: null
    });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.errorCode).toBe("CHECKLIST_TENANT_MISMATCH");
  });

  it("4. Execução: Falha se processo estiver finalizado", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    (supabaseMock.single as any).mockResolvedValueOnce({
      data: { id: mockProcessId, company_id: mockCompanyId, status: "finalized" },
      error: null
    });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.errorCode).toBe("CHECKLIST_PROCESS_FINALIZED");
  });

  it("5. Execução: Falha se item não for encontrado", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    (supabaseMock.single as any)
      .mockResolvedValueOnce({ // Process
        data: { id: mockProcessId, company_id: mockCompanyId, status: "active" },
        error: null
      })
      .mockResolvedValueOnce({ // Item
        data: null,
        error: new Error("Not found")
      });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.errorCode).toBe("CHECKLIST_ITEM_NOT_FOUND");
  });

  it("6. Execução: Requer confirmação se token ausente", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    (supabaseMock.single as any)
      .mockResolvedValueOnce({ // Process
        data: { id: mockProcessId, company_id: mockCompanyId, status: "active" },
        error: null
      })
      .mockResolvedValueOnce({ // Item
        data: { id: mockItemId, process_id: mockProcessId, company_id: mockCompanyId, status: "pending", version: 1 },
        error: null
      });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.confirmationRequired).toBe(true);
    expect(result.metadata?.errorCode).toBe("CHECKLIST_CONFIRMATION_REQUIRED");
  });

  it("7. Execução: Sucesso completa o item (com token)", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    const { casUpdate } = await import("@/lib/optimisticLock");
    
    (supabaseMock.single as any)
      .mockResolvedValueOnce({ // Process
        data: { id: mockProcessId, company_id: mockCompanyId, status: "active" },
        error: null
      })
      .mockResolvedValueOnce({ // Item
        data: { id: mockItemId, process_id: mockProcessId, company_id: mockCompanyId, status: "pending", version: 1 },
        error: null
      });
    
    (casUpdate as any).mockResolvedValueOnce({ ok: true, version: 2, updated_at: "now" });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      confirmationToken: "valid-token",
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.currentStatus).toBe("completed");
    expect(result.metadata?.currentVersion).toBe(2);
  });

  it("8. Execução: Conflito de versão CAS", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    const { casUpdate } = await import("@/lib/optimisticLock");
    
    (supabaseMock.single as any)
      .mockResolvedValueOnce({ // Process
        data: { id: mockProcessId, company_id: mockCompanyId, status: "active" },
        error: null
      })
      .mockResolvedValueOnce({ // Item
        data: { id: mockItemId, process_id: mockProcessId, company_id: mockCompanyId, status: "pending", version: 2 },
        error: null
      });
    
    (casUpdate as any).mockResolvedValueOnce({ ok: false, conflict: true, currentVersion: 2, expectedVersion: 1 });

    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      confirmationToken: "valid-token",
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(false);
    expect(result.metadata?.errorCode).toBe("CHECKLIST_VERSION_CONFLICT");
  });

  it("9. Idempotência: Operação repetida retorna sucesso sem alterar", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    
    (supabaseMock.single as any).mockImplementation(async () => {
      // Logic inside action.execute
      const callCount = (supabaseMock.single as any).mock.calls.length;
      
      if (callCount % 2 === 1) { 
        // Process fetch (Calls 1, 3, 5...)
        return {
          data: { id: mockProcessId, company_id: mockCompanyId, status: "active" },
          error: null
        };
      }
      // Item fetch (Calls 2, 4, 6...)
      return {
        data: { 
          id: mockItemId, 
          process_id: mockProcessId, 
          company_id: mockCompanyId, 
          status: "completed", 
          version: 2, 
          notes: "ok",
          waiver_reason: null,
          document_id: null
        },
        error: null
      };
    });



    const executionId = "exec-id-123";
    const result = await action.execute({
      processId: mockProcessId,
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 2,
      confirmationToken: "valid-token",
      notes: "ok",
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId
    });


    expect(result.success).toBe(true);
    expect(result.metadata?.idempotent).toBe(true);
  });

  it("10. Integração Real via ActionExecutor", async () => {
    const { supabase: supabaseMock } = await import("@/integrations/supabase/client");
    const { casUpdate } = await import("@/lib/optimisticLock");
    
    ActionRegistry.clear();
    ActionRegistry.register(action);
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    (supabaseMock.single as any).mockImplementation(async () => {
      return {
        data: { id: mockProcessId, company_id: mockCompanyId, status: "active", process_id: mockProcessId, version: 1 },
        error: null
      };
    });
    
    (casUpdate as any).mockResolvedValueOnce({ ok: true, version: 2 });

    const authContext = {
      userId: mockUserId,
      companyId: mockCompanyId,
      role: "admin",
      permissions: ["PROCESS_READ", "PROCESS_UPDATE", "CHECKLIST_UPDATE"],
      isAuthenticated: true
    };

    const result = await executor.execute("complete-checklist", { 
      processId: mockProcessId, 
      checklistItemId: mockItemId,
      operation: "complete",
      expectedVersion: 1,
      confirmationToken: "token-123"
    }, authContext);

    expect(result.success).toBe(true);
    expect(result.actionId).toBe("complete-checklist");
  });
});
