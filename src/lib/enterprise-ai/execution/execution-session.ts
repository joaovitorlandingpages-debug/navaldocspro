import { ExecutionSession, PlanStatus } from "./plan-execution-types";
import { ExecutionStateMachine } from "./execution-state-machine";

export class ExecutionSessionManager {
  private sessions: Map<string, ExecutionSession> = new Map();

  createSession(planId: string, companyId: string, userId: string): ExecutionSession {
    const sessionId = crypto.randomUUID();
    const session: ExecutionSession = {
      sessionId,
      planId,
      companyId,
      userId,
      startedAt: new Date(),
      completedSteps: [],
      failedSteps: [],
      state: ExecutionStateMachine.getInitialStatus(),
      auditMetadata: {},
      stepResults: {},
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<ExecutionSession>): ExecutionSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (updates.state) {
      ExecutionStateMachine.validateTransition(session.state, updates.state);
    }

    const updated = { ...session, ...updates };
    this.sessions.set(sessionId, updated);
    return updated;
  }
}

export const sessionManager = new ExecutionSessionManager();
