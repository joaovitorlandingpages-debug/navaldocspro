import { StructuredIntent, StructuredIntentSchema } from "./intent-types";
import { IntentError, IntentErrorCodes } from "./intent-errors";

export class IntentValidator {
  static validate(intent: StructuredIntent): void {
    const result = StructuredIntentSchema.safeParse(intent);
    
    if (!result.success) {
      throw new IntentError(
        IntentErrorCodes.VALIDATION_ERROR,
        "Intent structure is invalid",
        result.error.format()
      );
    }

    if (intent.confidence < 0.4) {
      intent.warnings.push("Confiança muito baixa para execução automática");
    }

    if (intent.intentType === "UNKNOWN" && intent.requestedActions.length === 0) {
      intent.warnings.push("Nenhuma ação identificada");
    }
  }
}
