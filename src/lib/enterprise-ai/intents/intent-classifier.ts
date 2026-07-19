import { AIIntent, IntentClassification } from "./intent-types";

export class IntentClassifier {
  classify(text: string): IntentClassification {
    const normalized = text.toLowerCase();

    if (this.isSearch(normalized)) {
      if (normalized.includes('crítico') || normalized.includes('alto risco')) {
        return { intent: AIIntent.PROCESS_CRITICAL_LIST, confidence: 0.9, entities: {} };
      }
      if (normalized.includes('baixa saúde') || normalized.includes('saúde ruim')) {
        return { intent: AIIntent.PROCESS_LOW_HEALTH_LIST, confidence: 0.9, entities: {} };
      }
      return { intent: AIIntent.PROCESS_SEARCH, confidence: 0.85, entities: {} };
    }

    if (normalized.includes('saúde') && normalized.includes('risco')) {
      return { intent: AIIntent.PROCESS_HEALTH_AND_RISK, confidence: 0.95, entities: {} };
    }

    if (normalized.includes('saúde') || normalized.includes('health')) {
      return { intent: AIIntent.PROCESS_HEALTH, confidence: 0.9, entities: {} };
    }

    if (normalized.includes('risco') || normalized.includes('risk')) {
      return { intent: AIIntent.PROCESS_RISK, confidence: 0.9, entities: {} };
    }

    if (normalized.includes('resumo') || normalized.includes('sumário')) {
      return { intent: AIIntent.PROCESS_SUMMARY, confidence: 0.85, entities: {} };
    }

    if (normalized.includes('detalhes') || normalized.includes('abrir') || normalized.includes('veja')) {
      return { intent: AIIntent.PROCESS_DETAILS, confidence: 0.8, entities: {} };
    }

    if (normalized.includes('ajuda') || normalized.includes('socorro') || normalized.includes('pode fazer')) {
      return { intent: AIIntent.CONVERSATION_HELP, confidence: 0.9, entities: {} };
    }

    return { intent: AIIntent.UNKNOWN, confidence: 0.5, entities: {} };
  }

  private isSearch(text: string): boolean {
    const searchKeywords = ['liste', 'busque', 'procure', 'quais', 'encontre', 'meus processos'];
    return searchKeywords.some(kw => text.includes(kw));
  }
}
