import { PlanStatus } from "../execution/plan-execution-types";

export class CopilotResponseBuilder {
  static buildSuccess(sessionId: string, details: string, metadata: any = {}): any {
    return {
      text: details,
      sessionId,
      status: "SUCCESS",
      requiresConfirmation: false,
      metadata
    };
  }

  static buildWaitingConfirmation(sessionId: string, planId: string): any {
    return {
      text: "Confirma a execução desta ação?",
      sessionId,
      status: "WAITING_CONFIRMATION",
      requiresConfirmation: true,
      planId,
    };
  }

  static buildError(sessionId: string, error: any): any {
    let message = "Desculpe, ocorreu um erro interno.";
    
    // Technical error translation as per requirements
    if (error.code === "MATERIALIZATION_FAILED" || error.message?.includes("materialize")) {
      message = "Não foi possível concluir esta etapa. Você pode tentar novamente.";
    } else if (error.code === "UNAUTHORIZED") {
      message = "Você não possui permissão para realizar esta ação.";
    } else if (error.message) {
      // If the error has a clear message (like "Nenhum plano pendente"), use it
      message = error.message;
    }

    return {
      text: message,
      sessionId,
      status: "FAILED",
      requiresConfirmation: false,
      metadata: { errorCode: error.code || "UNKNOWN" }
    };
  }

  static buildCancellation(sessionId: string): any {
    return {
      text: "Ação cancelada com sucesso.",
      sessionId,
      status: "CANCELLED",
      requiresConfirmation: false
    };
  }
}
