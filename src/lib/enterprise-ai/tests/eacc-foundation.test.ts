import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrchestrator, initializeEACC } from '../index';
import { ToolExecutor } from '../tools/tool-registry';
import { AIRequest } from '../core/ai-types';

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
  let orchestrator: AIOrchestrator;
  
  const mockRequest: AIRequest = {
    message: 'Listar meus processos',
    userId: 'user-123',
    companyId: 'company-456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const eacc = initializeEACC();
    orchestrator = eacc.orchestrator;
  });

  it('should identify search intent and call searchProcesses tool', async () => {
    (ToolExecutor.execute as any).mockResolvedValueOnce({
      toolId: 'searchProcesses',
      success: true,
      data: [{ id: '1', process_number: 'P-001', vessel: { name: 'Vessel 1' } }],
      durationMs: 10
    });

    const response = await orchestrator.process(mockRequest);

    expect(response.status).toBe('success');
    expect(response.selectedAgent).toBe('process-specialist');
    expect(response.executedTools.some((t: any) => t.toolId === 'searchProcesses')).toBe(true);
    expect(response.answer).toContain('Encontrei');
  });

  it('should handle unsupported intents gracefully', async () => {
    const request = { ...mockRequest, message: 'Qual a previsão do tempo?' };
    const response = await orchestrator.process(request);

    expect(response.status).toBe('unsupported_intent');
  });

  it('should isolate tenants', async () => {
     await orchestrator.process(mockRequest);
     
     expect(ToolExecutor.execute).toHaveBeenCalledWith(
       'searchProcesses', 
       expect.objectContaining({ companyId: 'company-456' }), 
       expect.any(Object)
     );
  });
});
