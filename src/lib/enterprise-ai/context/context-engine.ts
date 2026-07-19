import { AIContextState, ContextResolution } from "./context-types";

export class ContextEngine {
  resolveReferences(text: string, state: AIContextState): ContextResolution {
    const normalized = text.toLowerCase();
    
    // Check for explicit "process" references
    if (this.matchesProcess(normalized)) {
      if (state.lastProcessId) {
        return {
          entityType: 'process',
          entityId: state.lastProcessId,
          confidence: 0.9,
          source: 'context'
        };
      }
    }

    // Check for ordinal references (first, second, etc.)
    const ordinalIndex = this.getOrdinalIndex(normalized);
    if (ordinalIndex !== null && state.lastSearchResults && state.lastSearchResults.length > ordinalIndex) {
      const result = state.lastSearchResults[ordinalIndex];
      // Assuming results have ID and type
      if (result.id) {
        return {
          entityType: result.type || 'process',
          entityId: result.id,
          confidence: 0.95,
          source: 'reference'
        };
      }
    }

    return {
      entityType: 'none',
      confidence: 0,
      source: 'context'
    };
  }

  private matchesProcess(text: string): boolean {
    const patterns = [
      'esse processo',
      'este processo',
      'o processo',
      'dele',
      'health',
      'saúde',
      'risco'
    ];
    return patterns.some(p => text.includes(p));
  }

  private getOrdinalIndex(text: string): number | null {
    if (text.includes('o primeiro')) return 0;
    if (text.includes('o segundo')) return 1;
    if (text.includes('o terceiro')) return 2;
    return null;
  }

  updateState(currentState: AIContextState, updates: Partial<AIContextState>): AIContextState {
    return {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
}
