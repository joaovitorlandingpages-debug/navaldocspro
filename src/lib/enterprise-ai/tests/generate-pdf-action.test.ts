import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeneratePdfAction } from "../actions/pdf/generate-pdf-action";
import { AIPermission } from "../actions/security/permission-types";
import { ActionStatus, ConfirmationPolicy } from "../actions/action-types";
import { ActionRegistry } from "../actions/action-registry";
import { ActionExecutor } from "../actions/execution/action-executor";
import { ActionValidator } from "../actions/security/action-validator";
import { PermissionGuard } from "../actions/security/permission-guard";

// Mock do Supabase e serviços externos
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

vi.mock("@/utils/pdf-export", () => ({
  generateAndUploadPdf: vi.fn(() => Promise.resolve({ path: "path/to/pdf", signedUrl: "http://signed-url" })),
}));

describe("GeneratePdfAction (Sprint 4.4)", () => {
  let action: GeneratePdfAction;
  const mockCompanyId = "company-123";
  const mockUserId = "user-456";
  const mockProcessId = "process-789";

  beforeEach(() => {
    vi.clearAllMocks();
    action = new GeneratePdfAction();
  });

  it("1. Metadata básico da Action", () => {
    expect(action.id).toBe("generate-pdf");
    expect(action.requiredPermissions).toContain(AIPermission.PROCESS_READ);
    expect(action.requiredPermissions).toContain(AIPermission.DOCUMENT_GENERATE);
  });

  it("2. Validação: Falha se processo não for encontrado", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any)().select().eq().single.mockResolvedValue({ data: null, error: new Error("Not found") });

    const result = await action.validate({ 
      input: { processId: mockProcessId }, 
      companyId: mockCompanyId 
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain("not found");
  });

  it("3. Validação: Falha se processo pertencer a outro tenant", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any)().select().eq().single.mockResolvedValue({ 
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
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any)().select().eq().single.mockResolvedValue({ 
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
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Mock fetch process data
    (supabase.from as any)().select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: { 
            id: mockProcessId, 
            title: "Test Process",
            companies: { name: "NavalDocs", logo_url: "logo.png" } 
          }, 
          error: null 
        })
      })
    });

    // Mock insert generated_documents
    (supabase.from as any)().insert.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({
          data: { id: "doc-123" },
          error: null
        })
      })
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
    expect(result.metadata?.pdfUrl).toBe("http://signed-url");
  });

  it("6. Integração com ActionExecutor", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Setup ActionRegistry e Executor
    ActionRegistry.clear();
    ActionRegistry.register(action);
    const executor = new ActionExecutor(ActionRegistry, new ActionValidator(), new PermissionGuard());

    // Mock sequence para o Executor
    // 1. Validate (ActionValidator calling guard + action.validate)
    // 2. Execute
    
    // Mock para validation (encontrar processo)
    (supabase.from as any)().select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: mockProcessId, company_id: mockCompanyId, title: "Process Title" },
          error: null
        })
      })
    });

    // Mock para insert
    (supabase.from as any)().insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "doc-999" },
          error: null
        })
      })
    });

    const authContext = {
      userId: mockUserId,
      companyId: mockCompanyId,
      role: "admin",
      permissions: [AIPermission.PROCESS_READ, AIPermission.DOCUMENT_GENERATE],
      isAuthenticated: true
    };

    const result = await executor.execute("generate-pdf", { processId: mockProcessId, options: { customContent: "Test" } }, authContext);

    expect(result.success).toBe(true);
    expect(result.actionId).toBe("generate-pdf");
    expect(result.metadata?.documentId).toBe("doc-999");
  });
});
