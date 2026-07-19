import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Send, 
  Loader2, 
  AlertCircle,
  Code,
  CheckCircle2
} from "lucide-react";
import { initializeAI, AIOrchestrator, AIResponse, AgentRegistry, ToolRegistry } from "@/lib/enterprise-ai";
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

  const isEnabled = isFeatureEnabled("ENTERPRISE_AI_COMMAND_CENTER_ENABLED");

  useEffect(() => {
    if (isEnabled) {
      initializeAI();
      setAgentsCount(AgentRegistry.list().length);
      setToolsCount(ToolRegistry.list().length);
    }
  }, [isEnabled]);

  if (!isEnabled) {
    return <Navigate to="/admin" />;
  }

  const handleTest = async () => {
    if (!message.trim() || !user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const context = {
        userId: user.id,
        companyId: profile.company_id || '',
        role: profile.role || 'user',
        permissions: ['processes.read'],
        locale: 'pt-BR'
      };

      const res = await AIOrchestrator.process({ message }, context);
      setResponse(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <PageHeader 
        title="Enterprise AI Command Center" 
        description="Fundação técnica do cérebro operacional NavalDocs Pro."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Feature Flag</h3>
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black uppercase text-[10px] tracking-widest px-3">Ativo</Badge>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Provider</h3>
          </div>
          <Badge className="bg-blue-50 text-blue-600 border-none font-black uppercase text-[10px] tracking-widest px-3">Mock Provider</Badge>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Agentes</h3>
          </div>
          <p className="text-2xl font-black text-slate-900">{agentsCount}</p>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tools</h3>
          </div>
          <p className="text-2xl font-black text-slate-900">{toolsCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Code className="h-6 w-6 text-slate-400" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Sandbox de Orquestração</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Exemplos de intenção:</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["Listar processos", "Saúde do processo", "Riscos do processo"].map(t => (
                <Button 
                  key={t} 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest rounded-full"
                  onClick={() => setMessage(t)}
                >
                  {t}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite um comando para o Orchestrator..." 
                className="font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              />
              <Button 
                onClick={handleTest} 
                disabled={loading || !message.trim()}
                className="bg-slate-900 px-6 gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Executar
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 font-medium">
                <p className="font-black uppercase tracking-widest mb-1">Erro na Orquestração</p>
                {error}
              </div>
            </div>
          )}

          {response && (
            <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Resposta do Agente</p>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">{response.answer}</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log de Execução</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Agente Selecionado</span>
                    <Badge variant="outline" className="font-black uppercase text-[9px]">{response.selectedAgent}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Duração Total</span>
                    <span className="text-[10px] font-black text-slate-900">{response.durationMs}ms</span>
                  </div>
                  {response.executedTools.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        {t.success ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-rose-500" />}
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{t.toolId}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{t.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-8 border-slate-200 bg-slate-950 text-white overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Code className="h-40 w-40" />
           </div>
           <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-8 relative z-10">Audit Context (RAW)</h2>
           <div className="bg-black/40 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 overflow-x-auto relative z-10 border border-white/5">
              <pre>{JSON.stringify({
                featureFlag: isEnabled,
                agentsCount,
                toolsCount,
                lastResponse: response ? {
                  executionId: response.executionId,
                  tools: response.executedTools,
                  duration: response.durationMs
                } : null
              }, null, 2)}</pre>
           </div>
        </Card>
      </div>
    </div>
  );
}
