import { CopilotSession, ConversationMessage } from "./copilot-types";
import { StructuredIntent } from "../intent/intent-types";

export class ConversationMemory {
  private static sessions: Map<string, CopilotSession> = new Map();

  static async getOrCreateSession(
    sessionId: string,
    userId: string,
    companyId: string
  ): Promise<CopilotSession> {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        userId,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversationHistory: [],
        metadata: {},
      };
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  static async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push(message);
      session.updatedAt = new Date();
    }
  }

  static async updateLastIntent(sessionId: string, intent: StructuredIntent): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastIntent = intent;
      session.updatedAt = new Date();
      
      // Memory: Context enrichment
      // If the intent is missing a customerId but we have one in memory, we could inject it here.
      // This is a simplified implementation for Sprint 5.6.
      if (intent.entities.customerId) {
        session.metadata.lastCustomerId = intent.entities.customerId;
      }
      if (intent.entities.vesselId) {
        session.metadata.lastVesselId = intent.entities.vesselId;
      }
    }
  }

  static async getMemoryContext(sessionId: string): Promise<Record<string, any>> {
    const session = this.sessions.get(sessionId);
    return session?.metadata || {};
  }

  static async clearSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  static clearAll(): void {
    this.sessions.clear();
  }
}
