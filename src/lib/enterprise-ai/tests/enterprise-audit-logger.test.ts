import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionRegistry } from "../actions/action-registry";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";
import { AIPermission, SecurityContext } from "../actions/security/permission-types";
import { ActionStatus, AIAction, ActionResult, ConfirmationPolicy } from "../actions/action-types";
import { GeneratePdfAction } from "../actions/pdf/generate-pdf-action";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const m = {
    single: vi.fn(),
    maybeSingle: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    order: vi.fn(),
  };
  
  const setupMock = () => {
    m.from.mockReturnValue(m);
    m.select.mockReturnValue(m);
    m.insert.mockReturnValue(m);
    m.update.mockReturnValue(m);
    m.eq.mockReturnValue(m);
    m.gte.mockReturnValue(m);
    m.lte.mockReturnValue(m);
    m.order.mockReturnValue(m);
    m.single.mockImplementation(() => Promise.resolve({ data: { id: 'mock-id', company_id: '77f3e58c-d22a-43f6-932d-c20755f94d9b' }, error: null }));
    m.maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  };

  setupMock();

  return {
    supabase: m,
    _mocks: m,
    _resetMocks: setupMock
  };
});

vi.mock("@/utils/pdf-export", () => ({
  generateAndUploadPdf: vi.fn(() => Promise.resolve({ path: "path/to/pdf", signedUrl: "http://signed-url" })),
}));

describe("Enterprise Audit Logger (Sprint 4.5)", () => {
  const mockCompanyId = "77f3e58c-d22a-43f6-932d-c20755f94d9b"; // Real UUID format
  const mockUserId = "99f3e58c-d22a-43f6-932d-c20755f94d9c"; // Real UUID format
  const mockProcessId = "88f3e58c-d22a-43f6-932d-c20755f94d9d"; // Real UUID format

  const authContext: SecurityContext = {
    userId: mockUserId,
    companyId: mockCompanyId,
    role: "admin",
    permissions: [AIPermission.PROCESS_READ, AIPermission.DOCUMENT_GENERATE],
    isAuthenticated: true
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    const { _resetMocks } = await import("@/integrations/supabase/client") as any;
    _resetMocks();
    ActionRegistry.clear();
  });

  it("1. Persistência: logStart cria registro PENDING", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    supabaseMock.single.mockResolvedValue({ 
      data: { id: "audit-1", execution_id: "exec-1", status: "PENDING" }, 
      error: null 
    });

    const result = await auditLogger.logStart({
      executionId: "exec-1",
      actionId: "test",
      actionName: "Test",
      userId: mockUserId,
      companyId: mockCompanyId
    });

    expect(result.success).toBe(true);
    expect(supabaseMock.from).toHaveBeenCalledWith("ai_action_audits");
    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: ActionStatus.PENDING,
      execution_id: "exec-1"
    }));
  });

  it("2. Persistência: logSuccess atualiza para SUCCESS", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    supabaseMock.single.mockResolvedValue({ 
      data: { id: "audit-1", status: "SUCCESS" }, 
      error: null 
    });

    const result = await auditLogger.logSuccess("exec-1", {
      durationMs: 500,
      metadata: { done: true }
    });

    expect(result.success).toBe(true);
    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      status: ActionStatus.SUCCESS,
      duration_ms: 500
    }));
  });

  it("3. Persistência: logFailure atualiza para FAILED", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    supabaseMock.single.mockResolvedValue({ 
      data: { id: "audit-1", status: "FAILED" }, 
      error: null 
    });

    const result = await auditLogger.logFailure("exec-1", {
      error: ["Crash"],
      durationMs: 300
    });

    expect(result.success).toBe(true);
    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      status: ActionStatus.FAILED,
      errors: ["Crash"]
    }));
  });

  it("4. Integração: ActionExecutor chama logStart e logSuccess", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    const logStartSpy = vi.spyOn(auditLogger, "logStart");
    const logSuccessSpy = vi.spyOn(auditLogger, "logSuccess");

    // Mock action
    class MockAction implements AIAction {
      id = "test";
      metadata = {
        actionId: "test",
        displayName: "Test",
        description: "Test",
        category: "TEST",
        riskLevel: "LOW" as const,
        requiredPermissions: [],
        confirmationPolicy: ConfirmationPolicy.NONE,
        dependencies: [],
        retryPolicy: { maxRetries: 3, backoff: "fixed" as const },
        estimatedDuration: 1,
        enabled: true,
        supportsRetry: true,
        supportsPlanner: true
      };
      async validate() { return { valid: true }; }
      async execute() { return { success: true, status: ActionStatus.SUCCESS, message: "Ok", executionId: "1", duration: 1 }; }
      async rollback() {}
    }

    ActionRegistry.register(new MockAction());
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    await executor.execute("test", {}, authContext);

    expect(logStartSpy).toHaveBeenCalled();
    expect(logSuccessSpy).toHaveBeenCalled();
  });

  it("5. Integração: GeneratePdfAction gera auditoria com documentId", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    const logSuccessSpy = vi.spyOn(auditLogger, "logSuccess").mockResolvedValue({ success: true });
    vi.spyOn(auditLogger, "logStart").mockResolvedValue({ success: true });

    // Mock sequence para GeneratePdfAction
    supabaseMock.single
      .mockResolvedValueOnce({ // Validation
        data: { id: mockProcessId, company_id: mockCompanyId }, 
        error: null 
      })
      .mockResolvedValueOnce({ // Fetch in Execute
        data: { id: mockProcessId, title: "Test", companies: { name: "X" } }, 
        error: null 
      })
      .mockResolvedValueOnce({ // Document insert
        data: { id: "doc-123" },
        error: null
      });

    const action = new GeneratePdfAction();
    ActionRegistry.register(action);
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    await executor.execute("generate-pdf", { processId: mockProcessId }, authContext);

    expect(logSuccessSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      documentId: "doc-123"
    }));
  });

  it("6. Robusteza: Erro na auditoria não trava a Action", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    vi.spyOn(auditLogger, "logStart").mockImplementation(async () => {
      throw new Error("Database down");
    });
    vi.spyOn(auditLogger, "logSuccess").mockImplementation(async () => {
      throw new Error("Database down");
    });
    vi.spyOn(auditLogger, "logSuccess").mockImplementation(async () => {
      throw new Error("Database down");
    });

    // Mock action
    class MockAction implements AIAction {
      id = "test";
      name = "Test";
      description = "Test";
      requiredPermissions = [];
      confirmationPolicy = ConfirmationPolicy.NONE;
      estimatedRisk = "LOW" as const;
      estimatedDuration = 1;
      async validate() { return { valid: true }; }
      async execute() { return { success: true, status: ActionStatus.SUCCESS, message: "Ok", executionId: "1", duration: 1 }; }
      async rollback() {}
    }

    ActionRegistry.register(new MockAction());
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    const result = await executor.execute("test", {}, authContext);

    expect(result.success).toBe(true); // Action continuou apesar do erro no log
  });

  it("7. Consultas: findByExecutionId busca no banco", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    supabaseMock.maybeSingle.mockResolvedValue({ 
      data: { execution_id: "exec-123" }, 
      error: null 
    });

    const audit = await auditLogger.findByExecutionId("exec-123");
    expect(audit?.execution_id).toBe("exec-123");
    expect(supabaseMock.eq).toHaveBeenCalledWith("execution_id", "exec-123");
  });

  it("8. Consultas: list aplica filtros corretamente", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    supabaseMock.from.mockReturnValue(supabaseMock);
    
    await auditLogger.list({ companyId: "comp-1", status: ActionStatus.SUCCESS });

    expect(supabaseMock.eq).toHaveBeenCalledWith("company_id", "comp-1");
    expect(supabaseMock.eq).toHaveBeenCalledWith("status", ActionStatus.SUCCESS);
  });

  it("9. RLS: Insert deve respeitar companyId do perfil", async () => {
    // Esse teste valida a lógica do Logger enviando o ID correto
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.logStart({
      executionId: "e1",
      actionId: "a1",
      actionName: "N",
      userId: "u1",
      companyId: "TENANT_ID"
    });

    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      company_id: "TENANT_ID"
    }));
  });

  it("10. Integridade: metadata é persistido como JSON", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.logStart({
      executionId: "e1",
      actionId: "a1",
      actionName: "N",
      userId: "u1",
      companyId: "c1",
      metadata: { complex: { object: true } }
    });

    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { complex: { object: true } }
    }));
  });

  it("11. Ciclo de Vida: Action cancelada ou erro de validação", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const logFailureSpy = vi.spyOn(auditLogger, "logFailure");

    // Mock action com erro de validação
    class InvalidAction implements AIAction {
      id = "test";
      name = "Test";
      description = "Test";
      requiredPermissions = [];
      confirmationPolicy = ConfirmationPolicy.NONE;
      estimatedRisk = "LOW" as const;
      estimatedDuration = 1;
      async validate() { return { valid: false, errors: ["Invalid"] }; }
      async execute() { return { success: false, status: ActionStatus.FAILED, message: "N/A", executionId: "1", duration: 1 }; }
      async rollback() {}
    }

    ActionRegistry.register(new InvalidAction());
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    await executor.execute("test", {}, authContext);

    expect(logFailureSpy).toHaveBeenCalled();
  });

  it("12. Performance: durationMs é gravado no logSuccess", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.logSuccess("exec-1", { durationMs: 1234 });

    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      duration_ms: 1234
    }));
  });

  it("13. Warnings: warnings são persistidos", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.logSuccess("exec-1", { warnings: ["Warning 1"] });

    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      warnings: ["Warning 1"]
    }));
  });

  it("14. Unicidade: executionId é respeitado", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.logStart({
      executionId: "STABLE_ID",
      actionId: "a",
      actionName: "n",
      userId: "u",
      companyId: "c"
    });

    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      execution_id: "STABLE_ID"
    }));
  });

  it("15. Filtro por período", async () => {
    const { auditLogger } = await import("../actions/audit/audit-logger");
    const client = await import("@/integrations/supabase/client");
    const supabaseMock = client.supabase;

    await auditLogger.list({ startDate: "2024-01-01", endDate: "2024-01-02" });

    expect(supabaseMock.gte).toHaveBeenCalledWith("created_at", "2024-01-01");
    expect(supabaseMock.lte).toHaveBeenCalledWith("created_at", "2024-01-02");
  });
});
