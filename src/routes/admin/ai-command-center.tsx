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
              <section id="ts-visual-edit-probe-ed7ff8f90a4645f3">
                ENTERPRISE AI CORE

SPRINT 5.5

LLM INTENT INTERPRETER

==================================================
OBJETIVO
==================================================

Implementar a camada oficial de interpretação de linguagem natural do Enterprise AI Core.

IMPORTANTE

O LLM NÃO executa nenhuma Action.

O LLM NÃO cria planos.

O LLM NÃO chama o ActionExecutor.

Sua única responsabilidade é transformar linguagem natural em uma StructuredIntent.

O Planner continuará responsável por:

- descobrir Actions;
- validar permissões;
- montar ExecutionPlan;
- validar dependências;
- calcular risco.

==================================================
ARQUITETURA
==================================================

Criar:

src/lib/enterprise-ai/intent/

intent-interpreter.ts

intent-parser.ts

intent-types.ts

intent-schema.ts

intent-validator.ts

intent-errors.ts

intent-normalizer.ts

index.ts

Criar:

src/lib/enterprise-ai/tests/intent-interpreter.test.ts

==================================================
ENTRADA
==================================================

Receber:

texto livre

Exemplos:

"Crie um processo para o cliente João."

"Gere os PDFs."

"Envie os documentos para assinatura."

"Complete o checklist."

"Crie um processo e envie para assinatura."

==================================================
SAÍDA
==================================================

Retornar apenas:

StructuredIntent

Campos mínimos:

intentId

originalText

normalizedText

intentType

entities

confidence

requestedActions

warnings

metadata

==================================================
ENTIDADES
==================================================

Extrair quando possível:

customerName

customerId

vesselName

vesselId

documentType

processType

priority

dates

participants

==================================================
NORMALIZAÇÃO
==================================================

Normalizar:

acentos

maiúsculas

sinônimos

abreviações

erros simples de digitação

Nunca alterar o significado da frase.

==================================================
VALIDAÇÃO
==================================================

Detectar:

intenção ambígua

dados ausentes

entidades conflitantes

ação desconhecida

Quando necessário:

warnings[]

==================================================
CONFIANÇA
==================================================

Calcular:

0.0

↓

1.0

Exemplo:

0.95

↓

ação muito clara

0.40

↓

ambígua

==================================================
SEGURANÇA
==================================================

O Interpreter:

NÃO verifica permissões.

NÃO consulta banco.

NÃO cria processos.

NÃO executa Actions.

NÃO monta DAG.

==================================================
INTEGRAÇÃO
==================================================

PlannerEngine deverá aceitar:

StructuredIntent

em vez de depender de texto bruto.

==================================================
PROMPT INTERNO
==================================================

Criar um PromptBuilder interno para futuros provedores LLM.

Ele deve gerar instruções padronizadas para qualquer modelo.

Não integrar OpenAI, Gemini ou outro provedor nesta Sprint.

==================================================
PROVEDOR
==================================================

Criar interface:

IntentProvider

Implementar:

MockIntentProvider

A implementação futura deverá apenas substituir esse provider.

==================================================
TESTES
==================================================

Criar pelo menos 40 testes cobrindo:

- criar processo;
- gerar pdf;
- assinatura;
- checklist;
- múltiplas intenções;
- frases longas;
- frases curtas;
- erros ortográficos;
- sinônimos;
- ambiguidade;
- entidades;
- confidence;
- warnings;
- normalização;
- schema;
- provider mock;
- parser;
- validator.

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

Não modificar:

Planner

PlanExecutionEngine

ActionExecutor

ActionRegistry

Actions

ConfirmationService

IdempotencyService

==================================================
RELATÓRIO
==================================================

Apresentar:

- arquivos criados;
- arquitetura;
- fluxo;
- provider;
- parser;
- validator;
- testes;
- typecheck;
- build;
- limitações.

==================================================
STATUS
==================================================

Usar apenas:

SPRINT 5.5 IMPLEMENTADA

SPRINT 5.5 PARCIAL

SPRINT 5.5 BLOQUEADA

Somente declarar IMPLEMENTADA se:

- o LLM não executar nenhuma Action;
- retornar apenas StructuredIntent;
- Planner consumir StructuredIntent;
- 40+ testes aprovados;
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