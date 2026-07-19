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
              <section id="ts-visual-edit-probe-053bd4e2646849ba">
                ENTERPRISE AI COMMAND CENTER

SPRINT 5.3

MULTI-ACTION PLANNER — FASE 1

==================================================
OBJETIVO
==================================================

Implementar o primeiro Planner oficial do Enterprise AI Command Center.

O Planner NÃO executa regras de negócio.

O Planner NÃO substitui nenhuma Action existente.

Sua única responsabilidade é:

- interpretar a intenção;
- montar um plano de execução;
- decidir a ordem das Actions;
- verificar dependências;
- identificar confirmações humanas necessárias;
- entregar o plano ao ActionExecutor.

==================================================
ACTIONS DISPONÍVEIS
==================================================

O Planner deve reutilizar exclusivamente:

- CreateProcessAction
- GeneratePdfAction
- CompleteChecklistAction
- RequestSignatureAction

Não criar novas versões dessas Actions.

==================================================
ARQUIVOS
==================================================

Criar:

src/lib/enterprise-ai/planner/

planner.ts

planner-types.ts

planner-engine.ts

planner-rules.ts

planner-errors.ts

index.ts

Criar testes:

src/lib/enterprise-ai/tests/planner.test.ts

==================================================
PLANO
==================================================

Criar:

ExecutionPlan

Campos mínimos:

planId

intent

steps[]

riskLevel

estimatedActions

requiresConfirmation

status

metadata

Cada Step deve conter:

stepId

actionId

dependsOn[]

status

requiredPermissions

confirmationRequired

estimatedDuration

retryPolicy

==================================================
PLANNER ENGINE
==================================================

Implementar:

PlannerEngine.plan()

Recebe:

- intenção estruturada;
- contexto do usuário;
- tenant;
- permissões.

Retorna:

ExecutionPlan

Não executa nenhuma Action.

==================================================
DEPENDÊNCIAS
==================================================

Exemplo:

CreateProcess

↓

GeneratePdf

↓

CompleteChecklist

↓

RequestSignature

O Planner deve impedir:

- ciclos;
- dependências inválidas;
- execução antes do pré-requisito.

==================================================
CONFIRMAÇÃO HUMANA
==================================================

Se qualquer Step exigir confirmação:

o plano inteiro deve indicar:

requiresConfirmation = true

O Planner não consome tokens.

Apenas informa que serão necessários.

==================================================
VALIDAÇÃO
==================================================

Antes de montar o plano validar:

- tenant;
- permissões;
- Actions registradas;
- ações desabilitadas;
- dependências.

==================================================
RISCO
==================================================

Calcular:

LOW

MEDIUM

HIGH

CRITICAL

Exemplo:

CreateProcess + Signature

↓

HIGH

==================================================
EXECUTOR
==================================================

Nesta Sprint

o Planner NÃO executa.

Apenas produz o plano.

==================================================
AUDITORIA
==================================================

Registrar:

planId

userId

companyId

intent

steps

risk

timestamp

Não registrar dados sensíveis.

==================================================
TESTES
==================================================

Criar pelo menos 30 testes cobrindo:

- plano simples;
- plano com CreateProcess;
- plano completo;
- dependências;
- ordem correta;
- Action inexistente;
- Action desabilitada;
- tenant inválido;
- permissões ausentes;
- cálculo de risco;
- confirmação obrigatória;
- ciclos;
- plano vazio;
- múltiplas Actions;
- serialização;
- auditoria.

==================================================
TYPECHECK
==================================================

Executar.

==================================================
BUILD
==================================================

Executar.

==================================================
PROIBIÇÕES
==================================================

Não alterar:

CreateProcessAction

GeneratePdfAction

CompleteChecklistAction

RequestSignatureAction

ConfirmationService

ActionExecutor

IdempotencyService

==================================================
RELATÓRIO
==================================================

Apresentar:

- arquivos criados;
- arquitetura do Planner;
- fluxo;
- testes;
- typecheck;
- build;
- limitações.

==================================================
STATUS
==================================================

Usar apenas:

SPRINT 5.3 IMPLEMENTADA

SPRINT 5.3 PARCIAL

SPRINT 5.3 BLOQUEADA
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}