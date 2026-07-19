import { IntentError, IntentErrorCodes } from "./intent-errors";
import { StructuredIntent } from "./intent-types";

export interface IntentProvider {
  interpret(text: string): Promise<StructuredIntent>;
}

export class MockIntentProvider implements IntentProvider {
  async interpret(text: string): Promise<StructuredIntent> {
    const normalized = text.toLowerCase().trim();
    const intentId = crypto.randomUUID();
    
    // Basic pattern matching for the mock
    if (normalized.includes("processo") && normalized.includes("assinatura")) {
      return {
        intentId,
        originalText: text,
        normalizedText: normalized,
        intentType: "MULTI_ACTION",
        entities: this.extractEntities(normalized),
        confidence: 0.9,
        requestedActions: ["create-process", "request-signature"],
        warnings: [],
        metadata: { provider: "mock" }
      };
    }

    if (normalized.includes("processo")) {
      return {
        intentId,
        originalText: text,
        normalizedText: normalized,
        intentType: "CREATE_PROCESS",
        entities: this.extractEntities(normalized),
        confidence: 0.95,
        requestedActions: ["create-process"],
        warnings: [],
        metadata: { provider: "mock" }
      };
    }

    if (normalized.includes("pdf")) {
      return {
        intentId,
        originalText: text,
        normalizedText: normalized,
        intentType: "GENERATE_PDF",
        entities: {},
        confidence: 0.85,
        requestedActions: ["generate-pdf"],
        warnings: [],
        metadata: { provider: "mock" }
      };
    }

    if (normalized.includes("checklist")) {
      return {
        intentId,
        originalText: text,
        normalizedText: normalized,
        intentType: "COMPLETE_CHECKLIST",
        entities: {},
        confidence: 0.9,
        requestedActions: ["complete-checklist"],
        warnings: [],
        metadata: { provider: "mock" }
      };
    }

    if (normalized.includes("assinatura")) {
      return {
        intentId,
        originalText: text,
        normalizedText: normalized,
        intentType: "REQUEST_SIGNATURE",
        entities: {},
        confidence: 0.9,
        requestedActions: ["request-signature"],
        warnings: [],
        metadata: { provider: "mock" }
      };
    }

    return {
      intentId,
      originalText: text,
      normalizedText: normalized,
      intentType: "UNKNOWN",
      entities: {},
      confidence: 0.3,
      requestedActions: [],
      warnings: ["Intenção não reconhecida"],
      metadata: { provider: "mock" }
    };
  }

  private extractEntities(text: string): any {
    const entities: any = {};
    
    // Mock extraction logic
    if (text.includes("joão")) entities.customerName = "João";
    if (text.includes("navio") || text.includes("vessel")) entities.vesselName = "Sinfonia";
    
    return entities;
  }
}
