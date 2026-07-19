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
        <h1 className="text-3xl font-black tracking-tighter mb-2">ENTERPRISE AI COMMAND CENTER</h1>
        <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Sprint 4 — Enterprise Action Execution Engine</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
            <h3 className="text-rose-400 font-black text-[10px] uppercase mb-2">Importante</h3>
            <p className="text-[10px] text-rose-200/70 font-medium leading-relaxed">
              O EACC já possui Orchestrator, Conversation, Context, Intent, Planner, Tool Registry e Provider Layer. 
              <strong> NÃO alterar:</strong> Process Center, OCR, Health, Risk, Document, Signature Engine ou Portal do Cliente.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h3 className="text-emerald-400 font-black text-[10px] uppercase mb-2">Objetivo</h3>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-relaxed">
              Transformar o EACC de um assistente que responde perguntas para um copiloto que executa ações reais com segurança. 
              Toda ação deve passar por Planejamento → Permission Guard → Validation → Execution → Audit.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-slate-200 bg-white font-mono text-[11px] leading-relaxed shadow-sm">
          <ScrollArea className="h-[1200px] pr-4">
            <div className="space-y-12 whitespace-pre-wrap">
              <section id="ts-visual-edit-probe-a0096557b1234e9e">
                <div className="text-slate-900">
==================================================
1. ACTION ENGINE
==================================================

Criar:

src/lib/enterprise-ai/actions/

action-types.ts

action-registry.ts

action-engine.ts

action-validator.ts

action-executor.ts

action-audit.ts

action-result.ts

==================================================
2. ACTION CONTRACT
==================================================

Criar interface:

AIAction

Campos:

id

name

description

requiredPermissions

requiredRole

confirmationPolicy

validation

execute()

rollback()

audit()

estimatedRisk

estimatedDuration

==================================================
3. ACTION REGISTRY
==================================================

Registrar inicialmente:

CreateProcessAction

UpdateProcessAction

GeneratePdfAction

RequestSignatureAction

CompleteChecklistAction

CreateCustomerAction

CreateVesselAction

AttachDocumentAction

CloseProcessAction

Cada Action deve ser independente.

==================================================
4. CONFIRMATION ENGINE
==================================================

Implementar níveis:

NONE

LOW

MEDIUM

HIGH

CRITICAL

Exemplos:

Consultar processos

NONE

Gerar PDF

LOW

Atualizar checklist

MEDIUM

Encerrar processo

HIGH

Excluir informações

CRITICAL

A IA deve solicitar confirmação quando necessário.

==================================================
5. ACTION VALIDATOR
==================================================

Antes da execução validar:

autenticação

tenant

permissões

papel

pré-condições

existência da entidade

estado atual

duplicidade

integridade

Caso qualquer validação falhe:

não executar.

==================================================
6. EXECUTION PIPELINE
==================================================

Fluxo:

Pergunta

↓

Intent

↓

Planner

↓

Action

↓

Validator

↓

Permission Guard

↓

Executor

↓

Audit

↓

Resposta

==================================================
7. ROLLBACK
==================================================

Toda Action deverá informar:

rollbackSupported

rollback()

Quando possível.

Caso contrário registrar:

rollbackNotSupported

==================================================
8. ACTION AUDIT
==================================================

Persistir:

executionId

userId

companyId

action

status

beforeState

afterState

duration

error

timestamp

==================================================
9. PERMISSION ENGINE
==================================================

Nenhuma Action poderá confiar:

companyId

role

permissions

recebidos pela interface.

Tudo deve vir do contexto autenticado.

==================================================
10. ACTION PLANNER
==================================================

Permitir planos como:

Criar Processo

↓

Criar Cliente (se necessário)

↓

Criar Embarcação (se necessário)

↓

Criar Processo

↓

Criar Blueprint

↓

Criar Checklist

↓

Resposta

==================================================
11. INTERFACE
==================================================

Na página:

/admin/ai-command-center

Mostrar:

Plano

Ações

Validações

Permissões

Confirmações

Execução

Tempo

Resultado

Auditoria

==================================================
12. AÇÕES OBRIGATÓRIAS
==================================================

Implementar totalmente:

CreateProcessAction

GeneratePdfAction

RequestSignatureAction

CompleteChecklistAction

As demais podem permanecer preparadas para expansão.

==================================================
13. TESTES
==================================================

Criar testes para:

Permission Guard

Validator

Executor

Rollback

Audit

Confirmation

Pipeline

Tenant Isolation

Actions

==================================================
14. BUILD
==================================================

Executar:

Vitest

Typecheck

Build

==================================================
15. NÃO REGRESSÃO
==================================================

Garantir que nenhum módulo existente foi quebrado.

==================================================
16. RELATÓRIO
==================================================

Apresentar:

Arquivos criados

Arquivos alterados

Actions implementadas

Pipeline

Testes

Build

Typecheck

Limitações

STATUS:

SPRINT 4 IMPLEMENTADO E VALIDADO

SPRINT 4 PARCIAL

SPRINT 4 BLOQUEADO

IMPORTANTE

O objetivo desta Sprint NÃO é adicionar mais infraestrutura.

O objetivo é permitir que o EACC execute ações reais no NavalDocs Pro com segurança, confirmação, auditoria e isolamento multi-tenant.
                </div>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
