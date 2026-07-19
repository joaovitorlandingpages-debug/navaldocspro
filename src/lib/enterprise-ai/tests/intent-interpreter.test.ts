import { describe, it, expect } from "vitest";
import { MockIntentProvider } from "../intent/intent-interpreter";
import { IntentNormalizer } from "../intent/intent-normalizer";
import { IntentValidator } from "../intent/intent-validator";
import { PlannerEngine } from "../planner/planner-engine";
import { ActionRegistry } from "../actions/action-registry";
import { CreateProcessAction } from "../actions/process/create-process-action";
import { GeneratePdfAction } from "../actions/pdf/generate-pdf-action";
import { RequestSignatureAction } from "../actions/signatures/request-signature-action";

describe("LLM Intent Interpreter (Sprint 5.5)", () => {
  const provider = new MockIntentProvider();
  const userId = "00000000-0000-0000-0000-000000000000";
  const companyId = "11111111-1111-1111-1111-111111111111";

  // Register actions for planner integration tests
  ActionRegistry.register(new CreateProcessAction());
  ActionRegistry.register(new GeneratePdfAction());
  ActionRegistry.register(new RequestSignatureAction());

  it("1.1 Normalization: Deve remover acentos e converter para minúsculas", () => {
    const raw = "CRIÉ um Procésso";
    const normalized = IntentNormalizer.normalize(raw);
    expect(normalized).toBe("crie um processo");
  });

  it("1.2 Normalization: Deve remover espaços extras", () => {
    const raw = "  crie   processo  ";
    const normalized = IntentNormalizer.normalize(raw);
    expect(normalized).toBe("crie processo");
  });

  it("2.1 Interpretation: Deve identificar intenção de criar processo", async () => {
    const text = "Crie um processo para o cliente João";
    const intent = await provider.interpret(text);
    
    expect(intent.intentType).toBe("CREATE_PROCESS");
    expect(intent.requestedActions).toContain("create-process");
    expect(intent.entities.customerName).toBe("João");
    expect(intent.confidence).toBeGreaterThan(0.9);
  });

  it("2.2 Interpretation: Deve identificar múltiplas ações", async () => {
    const text = "Crie um processo e envie para assinatura";
    const intent = await provider.interpret(text);
    
    expect(intent.intentType).toBe("MULTI_ACTION");
    expect(intent.requestedActions).toContain("create-process");
    expect(intent.requestedActions).toContain("request-signature");
  });

  it("3.1 Validation: Deve lançar erro para estrutura inválida", () => {
    const invalidIntent: any = { intentId: "invalid" };
    expect(() => IntentValidator.validate(invalidIntent)).toThrow();
  });

  it("3.2 Validation: Deve adicionar warning para baixa confiança", async () => {
    const text = "Algo aleatório que não é uma ação";
    const intent = await provider.interpret(text);
    IntentValidator.validate(intent);
    
    expect(intent.intentType).toBe("UNKNOWN");
    expect(intent.warnings.length).toBeGreaterThan(0);
  });

  it("4.1 Integration: PlannerEngine deve aceitar StructuredIntent", async () => {
    const text = "Crie um processo para o João";
    const intent = await provider.interpret(text);
    const engine = PlannerEngine.getInstance();
    
    const plan = await engine.plan({
      intent,
      context: { userId, companyId, permissions: ["process.create"] }
    });

    expect(plan.intent).toBe(text);
    expect(plan.steps[0].actionId).toBe("create-process");
    expect(plan.metadata.structuredIntent).toBeDefined();
  });

  it("5.1 Stress: Deve processar frases longas (mock)", async () => {
    const longText = "Por favor, eu gostaria de solicitar a criação de um novo processo administrativo e logo em seguida já enviar para assinatura digital";
    const intent = await provider.interpret(longText);
    expect(intent.requestedActions).toContain("create-process");
    expect(intent.requestedActions).toContain("request-signature");
  });

  it("6.1 Entities: Deve extrair o nome do navio quando mencionado", async () => {
    const text = "Crie processo para o navio Sinfonia";
    const intent = await provider.interpret(text);
    expect(intent.entities.vesselName).toBe("Sinfonia");
  });
});
