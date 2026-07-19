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
      <PageHeader 
        title="Enterprise AI Command Center" 
        description="Plataforma de inteligência conversacional e orquestração de agentes especializados."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security</h3>
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black uppercase text-[10px] tracking-widest px-3">RLS Protected</Badge>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Foundation</h3>
          </div>
          <Badge className="bg-blue-50 text-blue-600 border-none font-black uppercase text-[10px] tracking-widest px-3">Sprint 2 V2.0</Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Histórico */}
        <Card className="lg:col-span-1 p-4 border-slate-200 h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico
            </h2>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start text-xs font-medium bg-slate-100 border-none">
                <MessageSquare className="h-3 w-3 mr-2" /> Nova Conversa
              </Button>
            </div>
          </ScrollArea>
        </Card>

        {/* Chat & Executor */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-8 border-slate-200 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex-1 mb-6">
              {response ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                    <p className="text-slate-700 leading-relaxed">{response.answer}</p>
                  </div>

                  {response.plan && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Plan</h3>
                      <div className="space-y-2">
                        {response.plan.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-3 text-xs bg-white border border-slate-100 rounded-lg p-3">
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : step.status === 'failed' ? (
                              <AlertCircle className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            )}
                            <span className="text-slate-600">{step.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.executedTools.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tools Used</h3>
                      <div className="flex flex-wrap gap-2">
                        {response.executedTools.map((t, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-slate-50">
                            {t.toolId} ({t.durationMs}ms)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.suggestedActions.length > 0 && (
                    <div className="flex gap-2">
                      {response.suggestedActions.map((action, idx) => (
                        <Button key={idx} variant="outline" size="sm" className="text-[10px] uppercase font-bold tracking-wider h-8">
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Bot className="h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium">Como posso ajudar com seus processos navais hoje?</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: 'Analise o risco do processo P-1024' ou 'Quais navios estão atrasados?'"
                className="flex-1 bg-slate-50 border-slate-200 h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              />
              <Button 
                onClick={handleTest} 
                disabled={loading || !message.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 px-6"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
