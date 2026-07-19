import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeneratePdfAction } from "../actions/pdf/generate-pdf-action";
import { AIPermission } from "../actions/security/permission-types";
import { ActionStatus } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";

// Mock do Supabase - usando o factory do vi.mock para ser hoisted corretamente
vi.mock("@/integrations/supabase/client", () => {
  const m = {
    single: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
  };
  
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));

  return {
    supabase: m,
    _mocks: m
  };
});

vi.mock("@/utils/pdf-export", () => ({
  generateAndUploadPdf: vi.fn(() => Promise.resolve({ path: "path/to/pdf", signedUrl: "http://signed-url" })),
}));

describe("GeneratePdfAction (Sprint 4.4)", () => {
  let action: GeneratePdfAction;
  let supabaseMock: any;
  const mockCompanyId = "company-123";
  const mockUserId = "user-456";
  const mockProcessId = "process-789";

  beforeEach(async () => {
    vi.clearAllMocks();
    action = new GeneratePdfAction();
    const client = await import("@/integrations/supabase/client");
    supabaseMock = client.supabase;
    supabaseMock.single.mockResolvedValue({ data: null, error: null });
  });

  it("1. Metadata básico da Action", () => {
    expect(action.id).toBe("generate-pdf");
    expect(action.requiredPermissions).toContain(AIPermission.PROCESS_READ);
    expect(action.requiredPermissions).toContain(AIPermission.DOCUMENT_GENERATE);
  });

  it("2. Validação: Falha se processo não for encontrado", async () => {
    supabaseMock.single.mockResolvedValue({ data: null, error: new Error("Not found") });

    const result = await action.validate({ 
      input: { processId: mockProcessId }, 
      companyId: mockCompanyId 
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("not found");
  });

  it("3. Validação: Falha se processo pertencer a outro tenant", async () => {
    supabaseMock.single.mockResolvedValue({ 
      data: { id: mockProcessId, company_id: "other-company" }, 
      error: null 
    });

    const result = await action.validate({ 
      input: { processId: mockProcessId }, 
      companyId: mockCompanyId 
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("another tenant");
  });

  it("4. Validação: Sucesso para processo válido e tenant correto", async () => {
    supabaseMock.single.mockResolvedValue({ 
      data: { id: mockProcessId, company_id: mockCompanyId }, 
      error: null 
    });

    const result = await action.validate({ 
      input: { processId: mockProcessId }, 
      companyId: mockCompanyId 
    });

    expect(result.valid).toBe(true);
  });

  it("5. Execução: Sucesso completa o fluxo", async () => {
    // Mock sequence
    supabaseMock.single
      .mockResolvedValueOnce({
        data: { 
          id: mockProcessId, 
          title: "Test Process",
          companies: { name: "NavalDocs", logo_url: "logo.png" } 
        }, 
        error: null 
      })
      .mockResolvedValueOnce({
        data: { id: "doc-123" },
        error: null
      });

    const result = await action.execute({
      input: { processId: mockProcessId, options: { customContent: "Hello PDF" } },
      companyId: mockCompanyId,
      userId: mockUserId,
      executionId: "exec-1"
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(ActionStatus.SUCCESS);
    expect(result.metadata?.documentId).toBe("doc-123");
  });

  it("6. Integração com ActionExecutor", async () => {
    ActionRegistry.clear();
    ActionRegistry.register(action);
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    // Setup behavior for validation and execution
    supabaseMock.single.mockImplementation(async () => {
      // Logic inside action.execute or action.validate
      const callCount = supabaseMock.single.mock.calls.length;
      
      if (callCount <= 2) { 
        // Validation + First fetch in Execute
        return {
          data: { 
            id: mockProcessId, 
            company_id: mockCompanyId, 
            title: "Process Title",
            companies: { name: "NavalDocs" }
          },
          error: null
        };
      }
      // Second call in execute (doc insert select)
      return {
        data: { id: "doc-999" },
        error: null
      };
    });

    const authContext = {
      userId: mockUserId,
      companyId: mockCompanyId,
      role: "admin",
      permissions: [AIPermission.PROCESS_READ, AIPermission.DOCUMENT_GENERATE],
      isAuthenticated: true
    };

    const result = await executor.execute("generate-pdf", { processId: mockProcessId }, authContext);

    expect(result.success).toBe(true);
    expect(result.actionId).toBe("generate-pdf");
    expect(result.metadata?.documentId).toBe("doc-999");
  });
});
