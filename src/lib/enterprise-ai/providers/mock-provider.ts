import { AIExecutionContext, AIResponse, AgentDefinition, ToolExecutionResult } from "../core/ai-types";
import { PromptBuilder } from "../prompts/prompt-builder";

export interface AIProvider {
  generateResponse(
    agent: AgentDefinition,
    context: AIExecutionContext,
    message: string,
    toolResults: ToolExecutionResult[]
  ): Promise<AIResponse>;
}

export class MockProvider implements AIProvider {
  async generateResponse(
    agent: AgentDefinition,
    context: AIExecutionContext,
    message: string,
    toolResults: ToolExecutionResult[]
  ): Promise<AIResponse> {
    const start = Date.now();
    
    // Build prompt (for audit/telemetry simulation)
    const prompt = PromptBuilder.build(agent, context, message, toolResults);
    // console.log("[EACC-Prompt]", prompt); // Silent for now

    // Deterministic mock logic based on tool results
    let answer = "Entendido. ";
    const executedTools = toolResults.map(tr => ({
      toolId: tr.toolId,
      success: tr.success,
      durationMs: tr.durationMs,
      error: tr.error
    }));

    const searchTool = toolResults.find(r => r.toolId === 'searchProcesses');
    const getProcessTool = toolResults.find(r => r.toolId === 'getProcess');
    const healthTool = toolResults.find(r => r.toolId === 'getProcessHealth');
    const riskTool = toolResults.find(r => r.toolId === 'getProcessRisk');

    if (searchTool?.success && searchTool.data) {
      const count = searchTool.data.length;
      answer += `Encontrei ${count} processo(s) que correspondem à sua pesquisa. `;
      if (count > 0) {
        answer += "Aqui estão os mais recentes:\n";
        searchTool.data.forEach((p: any) => {
          answer += `- ${p.process_number} (${p.vessel?.name || 'Sem embarcação'})\n`;
        });
      }
    }

    if (getProcessTool?.success && getProcessTool.data) {
      const p = getProcessTool.data;
      answer += `O processo ${p.process_number} está com status "${p.status}". `;
      answer += `Embarcação: ${p.vessel?.name || 'N/A'}. Cliente: ${p.customer?.name || 'N/A'}. `;
    }

    if (healthTool?.success && healthTool.data) {
      const h = healthTool.data;
      answer += `A pontuação de saúde (Health Score) é ${h.score}/100. `;
      if (h.score < 50) answer += "Identifiquei problemas críticos na documentação. ";
    }

    if (riskTool?.success && riskTool.data) {
      const r = riskTool.data;
      answer += `A avaliação de risco é "${r.level.toUpperCase()}". `;
      if (r.level === 'critical' || r.level === 'high') {
        answer += `Principais riscos: ${r.factors.slice(0, 2).map((f: any) => f.description).join(', ')}. `;
      }
    }

    if (toolResults.length === 0) {
      answer = "Não consegui executar ferramentas para responder sua pergunta. Como posso ajudar com seus processos navais?";
    }

    return {
      answer,
      selectedAgent: agent.id,
      executedTools,
      executionId: Math.random().toString(36).substring(7),
      durationMs: Date.now() - start
    };
  }
}
