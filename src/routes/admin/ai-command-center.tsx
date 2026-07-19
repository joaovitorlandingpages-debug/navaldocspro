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
              <section id="ts-visual-edit-probe-218dc477921f47e8">
                <div className="bg-slate-50 border-2 border-slate-900 p-8 rounded-2xl shadow-xl">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 border-b-4 border-slate-900 pb-2 uppercase italic">SPRINT 5.2.1 - CREATE PROCESS ACTION</h2>
                  <div className="space-y-6 font-mono text-xs leading-relaxed">
                    <div className="bg-emerald-100 text-emerald-900 p-2 font-bold text-center rounded">ENTERPRISE AI COMMAND CENTER</div>
                    
                    <div className="bg-white p-6 border-l-4 border-slate-900 rounded shadow-sm">
                      <p className="font-bold text-lg mb-4 uppercase">OBJETIVO</p>
                      <p>Corrigir as lacunas encontradas na homologação técnica da CreateProcessAction.</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Idempotência real e persistente</li>
                        <li>• Segurança contra concorrência</li>
                        <li>• Recuperação de falhas (Materialização / Visibilidade)</li>
                        <li>• Atomicidade do fluxo de criação</li>
                        <li>• Cobertura de 30+ testes específicos</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 text-amber-400 p-4 rounded font-mono text-[10px] space-y-4">
                      <div>
                        <p className="text-white mb-2 font-bold uppercase border-b border-amber-400/30 pb-1">1. AUDITORIA DO INSERT</p>
                        <p>A CreateProcessAction não conterá INSERT direto em `processes`. A responsabilidade será delegada ao serviço oficial de domínio.</p>
                      </div>
                      
                      <div>
                        <p className="text-white mb-2 font-bold uppercase border-b border-amber-400/30 pb-1">2. IDEMPOTÊNCIA PERSISTENTE</p>
                        <p>Chave: companyId + userId + actionId + payload_hash. Estados: pending, processing, completed, failed, recoverable_failed.</p>
                      </div>

                      <div>
                        <p className="text-white mb-2 font-bold uppercase border-b border-amber-400/30 pb-1">3. ATOMICIDADE & RECUPERAÇÃO</p>
                        <p>Fluxo: Base Process → Materialize → Confirm Visible. Tratamento de falhas intermediárias com retry seguro e sem duplicidade.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                        <p className="font-bold border-b mb-2 uppercase">REQUISITOS MANDATÓRIOS</p>
                        <ul className="space-y-1 text-[10px]">
                          <li>✓ Human Confirmation persistente (SHA-256)</li>
                          <li>✓ Permission Check (PROCESS_CREATE, etc)</li>
                          <li>✓ Security Context (Tenant Isolation)</li>
                          <li>✓ Audit Log (Início, Sucesso, Falha, Recuperação)</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                        <p className="font-bold border-b mb-2 uppercase">TESTES OBRIGATÓRIOS (30+)</p>
                        <ul className="space-y-1 text-[10px]">
                          <li>• Concorrência real (simultânea)</li>
                          <li>• Tenant/User mismatch</li>
                          <li>• Timeout pós-criação / Retry</li>
                          <li>• Falha de materialização</li>
                          <li>• <strong>STATUS: AGUARDANDO IMPLEMENTAÇÃO</strong></li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 border-2 border-slate-700 rounded-xl text-center">
                      <h3 className="text-xl font-black text-white uppercase italic">SPRINT 5.2.1 EM DEFINIÇÃO</h3>
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