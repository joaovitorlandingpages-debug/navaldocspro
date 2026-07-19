import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Send, 
  Loader2, 
  AlertCircle,
  Code,
  CheckCircle2,
  History,
  MessageSquare,
  Plus
} from "lucide-react";
import { initializeEACC, AIOrchestrator, AIResponse, AgentRegistry, ToolRegistry } from "@/lib/enterprise-ai";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ai-command-center")({
  component: AICommandCenterPage,
});

function AICommandCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentsCount, setAgentsCount] = useState(0);
  const [toolsCount, setToolsCount] = useState(0);
  const [orchestrator, setOrchestrator] = useState<AIOrchestrator | null>(null);

  const isEnabled = isFeatureEnabled("ENTERPRISE_AI_COMMAND_CENTER_ENABLED");

  useEffect(() => {
    if (isEnabled) {
      const eacc = initializeEACC();
      setOrchestrator(eacc.orchestrator);
      setAgentsCount(AgentRegistry.list().length);
      setToolsCount(ToolRegistry.list().length);
    }
  }, [isEnabled]);

  if (!isEnabled) {
    return <Navigate to="/admin" />;
  }

  const handleTest = async () => {
    if (!message.trim() || !user || !orchestrator) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const request = {
        message,
        userId: user.id,
        companyId: profile.company_id || '',
      };

      const res = await orchestrator.process(request);
      setResponse(res);
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Cpu className="h-32 w-32" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase">Enterprise AI Command Center</h1>
        <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Security Engine & Automation Pipeline</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
            <h3 className="text-rose-400 font-black text-[10px] uppercase mb-2">Segurança Enterprise</h3>
            <p className="text-[10px] text-rose-200/70 font-medium leading-relaxed">
              Toda ação executada pela IA passa por um pipeline de segurança obrigatório: Validação de Estado, 
              Isolamento de Tenant, Verificação de Permissões e Auditoria de Execução.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h3 className="text-emerald-400 font-black text-[10px] uppercase mb-2">Capacidade Operacional</h3>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-relaxed">
              O motor de execução permite que a IA realize operações reais como criação de processos, 
              geração de documentos e requisição de assinaturas com supervisão humana.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-slate-200 bg-white font-mono text-[11px] leading-relaxed shadow-sm">
          <ScrollArea className="h-[1200px] pr-4">
            <div className="space-y-12 whitespace-pre-wrap">
              <section id="ts-visual-edit-probe-bbacb11511f6434d">
                ENTERPRISE AI CORE

SPRINT 5.6

ENTERPRISE COPILOT

==================================================
OBJETIVO
==================================================

Criar o primeiro Enterprise Copilot oficial do sistema.

O Copilot será apenas um orquestrador.

Ele NÃO executa regras de negócio.

Ele apenas conecta:

Intent Interpreter

↓

Planner

↓

PlanExecutionEngine

↓

ActionExecutor

↓

Business Actions

==================================================
NÃO ALTERAR
==================================================

Não modificar:

- Planner
- PlanExecutionEngine
- ActionExecutor
- Actions
- PermissionGuard
- ConfirmationService
- IdempotencyService

Apenas consumir essas camadas.

==================================================
ARQUITETURA
==================================================

Criar:

src/lib/enterprise-ai/copilot/

enterprise-copilot.ts

copilot-session.ts

copilot-context.ts

copilot-types.ts

copilot-errors.ts

copilot-response-builder.ts

conversation-memory.ts

conversation-validator.ts

index.ts

Criar testes:

src/lib/enterprise-ai/tests/copilot.test.ts

==================================================
FLUXO
==================================================

Mensagem

↓

IntentInterpreter

↓

StructuredIntent

↓

Planner

↓

ExecutionPlan

↓

PlanExecutionEngine

↓

Resultado

↓

Resposta ao usuário

==================================================
CONVERSA
==================================================

Criar sessões.

Cada sessão deve possuir:

sessionId

userId

companyId

createdAt

updatedAt

conversationHistory

lastIntent

lastExecutionPlan

lastExecutionResult

==================================================
MEMÓRIA
==================================================

Implementar memória curta.

Exemplos:

Usuário:

"Crie um processo para João."

Depois:

"Gere o PDF."

O Copilot deve compreender que o PDF pertence ao processo recém-criado.

A memória deve existir apenas durante a sessão.

==================================================
RESPOSTAS
==================================================

Criar ResponseBuilder.

Responder de forma natural.

Exemplos:

"Processo criado com sucesso."

"Foram gerados 3 PDFs."

"A assinatura foi enviada."

"Não encontrei o cliente."

"É necessária confirmação antes de continuar."

==================================================
CONFIRMAÇÃO
==================================================

Quando o plano entrar em:

WAITING_CONFIRMATION

Responder:

"Confirma a execução desta ação?"

Após confirmação:

resume()

==================================================
CANCELAMENTO
==================================================

Permitir:

"Cancelar."

↓

ExecutionEngine.cancel()

==================================================
ERROS
==================================================

Traduzir erros técnicos.

Exemplo:

MATERIALIZATION_FAILED

↓

"Não foi possível concluir esta etapa. Você pode tentar novamente."

Nunca mostrar stacktrace.

==================================================
CONTEXTO
==================================================

Cada mensagem deve possuir:

companyId

userId

permissions

tenant

locale

timezone

==================================================
SEGURANÇA
==================================================

O Copilot nunca:

- concede permissões;
- ignora PermissionGuard;
- executa Action diretamente;
- acessa banco diretamente.

==================================================
AUDITORIA
==================================================

Registrar:

sessionId

userId

companyId

mensagem

intent

planId

executionId

resultado

timestamp

==================================================
TESTES
==================================================

Criar pelo menos 50 testes cobrindo:

- conversa simples;
- múltiplas mensagens;
- memória;
- confirmação;
- cancelamento;
- retomada;
- erro recuperável;
- erro definitivo;
- permissões;
- múltiplos usuários;
- múltiplos tenants;
- resposta natural;
- tradução de erros;
- auditoria;
- contexto;
- sessão encerrada;
- sessão duplicada;
- histórico;
- integração completa.

==================================================
TYPECHECK
==================================================

Executar.

==================================================
BUILD
==================================================

Executar.

==================================================
PROIBIDO
==================================================

Não criar IA paralela.

Não duplicar Planner.

Não duplicar Executor.

Não duplicar regras.

==================================================
RELATÓRIO
==================================================

Apresentar:

- arquivos criados;
- arquitetura;
- fluxo completo;
- memória;
- gerenciamento de sessão;
- ResponseBuilder;
- integração;
- testes;
- typecheck;
- build;
- limitações.

==================================================
STATUS
==================================================

Usar apenas:

SPRINT 5.6 IMPLEMENTADA

SPRINT 5.6 PARCIAL

SPRINT 5.6 BLOQUEADA

Somente considerar IMPLEMENTADA se:

- utilizar exclusivamente o Intent Interpreter existente;
- utilizar exclusivamente o Planner existente;
- utilizar exclusivamente o PlanExecutionEngine existente;
- utilizar exclusivamente o ActionExecutor existente;
- memória funcionar;
- confirmação funcionar;
- cancelamento funcionar;
- 50+ testes aprovados;
- typecheck aprovado;
- build aprovado.
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}