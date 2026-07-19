import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrchestrator } from '../core/ai-orchestrator';
import { AgentRegistry } from '../agents/agent-registry';
import { ToolRegistry } from '../tools/tool-registry';
import { registerAgents } from '../agents/process-specialist.agent';
import { registerTools } from '../tools/tool-registry-init';
import { AIExecutionContext } from '../core/ai-types';

describe('EACC Foundation', () => {
  const mockContext: AIExecutionContext = {
    userId: 'user-123',
    companyId: 'company-456',
    role: 'admin',
    permissions: ['processes.read'],
    locale: 'pt-BR'
  };

  beforeEach(() => {
    registerAgents();
    registerTools();
  });

  it('should identify search intent and call searchProcesses tool', async () => {
    const request = { message: 'Listar meus processos' };
    const response = await AIOrchestrator.process(request, mockContext);

    expect(response.selectedAgent).toBe('process-specialist');
    expect(response.executedTools.some(t => t.toolId === 'searchProcesses')).toBe(true);
    expect(response.answer).toContain('Encontrei');
  });

  it('should handle unsupported intents gracefully', async () => {
    const request = { message: 'Qual a previsão do tempo?' };
    const response = await AIOrchestrator.process(request, mockContext);

    expect(response.warnings).toContain('unsupported_intent');
    expect(response.answer).toContain('Desculpe');
  });

  it('should enforce tool permissions', async () => {
    const restrictedContext: AIExecutionContext = {
      ...mockContext,
      permissions: []
    };

    const request = { message: 'Listar processos' };
    const response = await AIOrchestrator.process(request, restrictedContext);

    const toolResult = response.executedTools.find(t => t.toolId === 'searchProcesses');
    expect(toolResult?.success).toBe(false);
    expect(toolResult?.error).toContain('Insufficient permissions');
  });

  it('should list agents and tools correctly', () => {
    expect(AgentRegistry.list().length).toBeGreaterThan(0);
    expect(ToolRegistry.list().length).toBeGreaterThan(0);
  });
});
