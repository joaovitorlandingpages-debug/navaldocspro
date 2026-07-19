import { IntentError, IntentErrorCodes } from "./intent-errors";
import { StructuredIntent } from "./intent-types";

export interface IntentProvider {
  interpret(text: string): Promise<StructuredIntent>;
}

export class MockIntentProvider implements IntentProvider {
  async interpret(text: string): Promise<StructuredIntent> {
    const normalized = text.toLowerCase().trim();
    const intentId = crypto.randomUUID();
    const actions = new Set<string>();
    let intentType: import("./intent-types").IntentType = "UNKNOWN";
    const warnings: string[] = [];

    // Identification patterns
    const hasProcess = normalized.includes("processo") || normalized.includes("cri");
    const hasPdf = normalized.includes("pdf") || normalized.includes("doc");
    const hasChecklist = normalized.includes("checklist");
    const hasSignature = normalized.includes("assinatura") || normalized.includes("assina");

    if (hasProcess) actions.add("create-process");
    if (hasPdf) actions.add("generate-pdf");
    if (hasChecklist) actions.add("complete-checklist");
    if (hasSignature) actions.add("request-signature");

    const requestedActions = Array.from(actions);

    if (requestedActions.length > 1) {
      intentType = "MULTI_ACTION";
    } else if (hasProcess) {
      intentType = "CREATE_PROCESS";
    } else if (hasPdf) {
      intentType = "GENERATE_PDF";
    } else if (hasChecklist) {
      intentType = "COMPLETE_CHECKLIST";
    } else if (hasSignature) {
      intentType = "REQUEST_SIGNATURE";
    }

    if (intentType === "UNKNOWN") {
      warnings.push("Intenção não reconhecida");
    }

    return {
      intentId,
      originalText: text,
      normalizedText: normalized,
      intentType,
      entities: this.extractEntities(normalized),
      confidence: requestedActions.length > 0 ? 0.95 : 0.3,
      requestedActions,
      warnings,
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
