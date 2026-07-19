import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrchestrator } from '../core/ai-orchestrator';
import { AgentRegistry } from '../agents/agent-registry';
import { ToolRegistry } from '../tools/tool-registry';
import { ToolExecutor } from '../tools/tool-registry';
import { registerAgents } from '../agents/process-specialist.agent';
import { registerTools } from '../tools/tool-registry-init';
import { AIExecutionContext } from '../core/ai-types';
import { PromptBuilder } from '../prompts/prompt-builder';

vi.mock('../tools/tool-registry', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ToolExecutor: {
      execute: vi.fn()
    }
  };
});

describe('EACC Foundation', () => {
  const mockContext: AIExecutionContext = {
    userId: 'user-123',
    companyId: 'company-456',
    role: 'admin',
    permissions: ['processes.read'],
    locale: 'pt-BR'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    registerAgents();
    registerTools();
  });

  it('should identify search intent and call searchProcesses tool', async () => {
    (ToolExecutor.execute as any).mockResolvedValueOnce({
      toolId: 'searchProcesses',
      success: true,
      data: [{ process_number: 'P-001', vessel: { name: 'Vessel 1' } }],
      durationMs: 10
    });

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

  it('should isolate tenants (Mock validation)', async () => {
     const request = { message: 'Listar processos' };
     await AIOrchestrator.process(request, mockContext);
     
     expect(ToolExecutor.execute).toHaveBeenCalledWith(
       'searchProcesses', 
       expect.objectContaining({ companyId: 'company-456' }), 
       expect.any(Object)
     );
  });

  it('should build prompt correctly via PromptBuilder', () => {
    const agent = AgentRegistry.list()[0];
    const prompt = PromptBuilder.build(agent, mockContext, 'Test msg', []);
    expect(prompt).toContain(agent.name);
    expect(prompt).toContain(mockContext.userId);
  });

  it('should list agents and tools correctly', () => {
    expect(AgentRegistry.list().length).toBeGreaterThan(0);
    expect(ToolRegistry.list().length).toBeGreaterThan(0);
  });
});
