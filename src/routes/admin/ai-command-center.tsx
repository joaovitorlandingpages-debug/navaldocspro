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
        <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Sprint 4.3 — Action Executor + Audit + Rollback</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
            <h3 className="text-rose-400 font-black text-[10px] uppercase mb-2">Importante</h3>
            <p className="text-[10px] text-rose-200/70 font-medium leading-relaxed">
              O EACC já possui Orchestrator, Provider Layer, Action Engine, Registry, Permission Guard e Validator.
              <strong> NÃO alterar:</strong> Process Center, OCR, Documents, Signatures, Customer Portal, Health Engine ou Risk Engine.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h3 className="text-emerald-400 font-black text-[10px] uppercase mb-2">Objetivo</h3>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-relaxed">
              Criar o mecanismo responsável por executar uma Action de forma segura, auditável e preparada para rollback. 
              Fluxo: Action → Validator → Permission Guard → Executor → Audit → Rollback → ActionResult.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-slate-200 bg-white font-mono text-[11px] leading-relaxed shadow-sm">
          <ScrollArea className="h-[1200px] pr-4">
            <div className="space-y-12 whitespace-pre-wrap">
              <section id="ts-visual-edit-probe-860435879b784a11">
                <div className="bg-slate-50 border-2 border-slate-900 p-8 rounded-2xl shadow-xl">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 border-b-4 border-slate-900 pb-2 uppercase">ENTERPRISE AI COMMAND CENTER</h2>
                  <div className="space-y-6 font-mono text-xs leading-relaxed">
                    <div className="bg-amber-100 text-amber-900 p-2 font-bold text-center rounded">SPRINT 4.3 - ACTION EXECUTOR + AUDIT + ROLLBACK</div>
                    
                    <div className="bg-rose-50 p-4 border border-rose-200 rounded text-rose-800 text-[10px]">
                      <p className="font-bold mb-1 uppercase">IMPORTANTE</p>
                      <p>Pré-requisitos já implementados: AI Orchestrator, Provider Layer, Action Engine, Registry, Permission Guard, Validator.</p>
                      <p className="mt-1 font-bold">NÃO alterar: Process Center, OCR, Documents, Signatures, Customer Portal, Health Engine, Risk Engine.</p>
                      <p className="mt-1 italic">Ainda NÃO implementar lógica real das Actions. O objetivo é construir o pipeline de execução.</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="font-black text-slate-900 border-b-2 border-slate-900 mb-2 uppercase">1. ESTRUTURA DE ARQUIVOS (MANDATÓRIO)</p>
                        <div className="bg-white p-3 border border-slate-200 rounded">
                          <p className="font-bold text-emerald-600">src/lib/enterprise-ai/actions/execution/</p>
                          <ul className="grid grid-cols-2 gap-x-4 mt-1">
                            <li>• action-executor.ts</li>
                            <li>• execution-context.ts</li>
                            <li>• execution-result.ts</li>
                            <li>• rollback-engine.ts</li>
                            <li>• audit-logger.ts</li>
                            <li>• audit-types.ts</li>
                            <li>• execution-errors.ts</li>
                            <li>• index.ts</li>
                          </ul>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                          <p className="font-bold border-b mb-2">ACTION EXECUTOR</p>
                          <ul className="space-y-1 text-[10px]">
                            <li>• Receber Action</li>
                            <li>• Criar Contexto</li>
                            <li>• Executar Validação</li>
                            <li>• Executar Permission Guard</li>
                            <li>• Executar Action & Capturar Erros</li>
                            <li>• Medir Duração & Gerar Result</li>
                          </ul>
                        </div>
                        <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                          <p className="font-bold border-b mb-2">AUDIT & ROLLBACK</p>
                          <ul className="space-y-1 text-[10px]">
                            <li>• Registrar ID, Status, Tempos</li>
                            <li>• Registrar Warnings & Errors</li>
                            <li>• Se suportar: Executar Rollback()</li>
                            <li>• Registrar Sucesso/Falha Rollback</li>
                            <li>• Persistência em Audit Log</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <p className="font-black text-slate-900 border-b-2 border-slate-900 mb-2 uppercase">REQUISITOS DE TESTES (MIN. 15)</p>
                        <div className="bg-slate-900 text-amber-400 p-4 rounded text-[10px] grid grid-cols-2 gap-2">
                          <p>• Execução Válida/Inválida</p>
                          <p>• Validator/Guard Bloqueando</p>
                          <p>• Erro na Execução/Rollback</p>
                          <p>• Rollback (Suportado/Não)</p>
                          <p>• Audit Gerado com IDs Únicos</p>
                          <p>• Pipeline Completo & Duração</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100 border-2 border-slate-400 rounded-xl text-center">
                      <h3 className="text-lg font-black text-slate-500 uppercase italic">STATUS: AGUARDANDO IMPLEMENTAÇÃO REAL</h3>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
