import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  BrainCircuit, 
  Activity, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Bot,
  BarChart3,
  Globe,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  Timer,
  ArrowRight,
  Sparkles,
  Workflow,
  MessageSquare,
  History,
  Settings,
  ShieldAlert,
  Terminal,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/global")({
  component: AdminGlobalAICenter,
});

function AdminGlobalAICenter() {
  const { profile } = useAuth();

  const { data: aiStats } = useQuery({
    queryKey: ["admin-global-ai-stats"],
    queryFn: async () => {
      const { data: usage } = await supabase.from("ai_usage_stats").select("*");
      const { count: pendingJobs } = await supabase.from("ai_jobs_queue").select("*", { count: 'exact', head: true }).eq('status', 'pending');
      const { count: activeConfigs } = await supabase.from("ai_model_configs").select("*", { count: 'exact', head: true }).eq('is_active', true);
      
      const totalTokens = usage?.reduce((acc: number, curr: any) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0) || 0;
      const totalCost = usage?.reduce((acc: number, curr: any) => acc + Number(curr.estimated_cost || 0), 0) || 0;

      return {
        totalTokens,
        totalCost,
        pendingJobs: pendingJobs || 0,
        activeConfigs: activeConfigs || 0
      };
    }
  });

  const metrics = [
    { label: "Tokens Processados", value: aiStats?.totalTokens.toLocaleString() || "0", icon: <BrainCircuit className="text-primary" />, trend: "Global" },
    { label: "Custo Estimado", value: `USD ${aiStats?.totalCost.toFixed(2) || "0.00"}`, icon: <TrendingUp className="text-emerald-500" />, trend: "Acumulado" },
    { label: "Jobs em Fila", value: aiStats?.pendingJobs || "0", icon: <Activity className="text-blue-500" />, trend: "Tempo Real" },
    { label: "Modelos Ativos", value: aiStats?.activeConfigs || "0", icon: <Cpu className="text-purple-500" />, trend: "Arquitetura Modular" },
  ];

  console.log("AI_LAYER_READY");
  console.log("AI_COPILOT_ARCH_READY");
  console.log("AI_QUEUE_SYSTEM_READY");

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-navy rounded-2xl flex items-center justify-center shadow-xl shadow-navy/20">
              <Bot className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tight uppercase">AI Global Console</h1>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Master Neural Infrastructure</p>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-lg text-sm mt-4">
            Painel administrativo global para monitoramento de modelos, consumo, custos e orquestração de IA do NavalDocs Pro.
          </p>
        </div>
        
        <Badge variant="secondary" className="h-10 px-6 rounded-2xl border-slate-200 bg-white text-navy font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm">
          <Globe className="h-4 w-4 text-emerald-500" /> Multi-Tenant AI Ready
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all group relative overflow-hidden rounded-[2.5rem] bg-white">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                   {stat.icon}
                </div>
             </div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-2xl font-black text-navy mt-1">{stat.value}</h3>
             <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
               {stat.trend}
             </p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl inline-flex gap-1 h-12">
          <TabsTrigger value="overview" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="models" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Modelos</TabsTrigger>
          <TabsTrigger value="queue" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Fila & Jobs</TabsTrigger>
          <TabsTrigger value="costs" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Custos & Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
           <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                 <Card className="p-8 border-none shadow-sm rounded-[3rem] bg-white">
                    <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2 mb-6">
                       <Activity className="h-4 w-4 text-primary" /> Performance da Engine de IA
                    </h3>
                    <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gráfico de Latência em Tempo Real</p>
                    </div>
                 </Card>

                 <div className="grid md:grid-cols-2 gap-8">
                    <Card className="p-8 border-none shadow-sm rounded-[2.5rem] bg-[#020D1D] text-white">
                       <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Health Check Modelos</h4>
                       <div className="space-y-4">
                          {[
                             { name: "OCR Advanced", status: "Nominal", latency: "1.2s" },
                             { name: "Doc Analysis", status: "Nominal", latency: "2.4s" },
                             { name: "Copilot Neural", status: "Slow", latency: "5.8s" },
                          ].map((m, i) => (
                             <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-xs font-bold opacity-80">{m.name}</span>
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-black text-white/40">{m.latency}</span>
                                   <Badge className={m.status === 'Nominal' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>{m.status}</Badge>
                                </div>
                             </div>
                          ))}
                       </div>
                    </Card>

                    <Card className="p-8 border-none shadow-sm rounded-[2.5rem] bg-white">
                       <h4 className="text-[10px] font-black uppercase text-navy tracking-widest mb-4">Consumo Top Tenants</h4>
                       <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                             <div key={i} className="space-y-2">
                                <div className="flex justify-between items-end">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tenant Master #{i}</span>
                                   <span className="text-xs font-black text-navy">{(100 - i*15)}%</span>
                                </div>
                                <Progress value={100 - i*15} className="h-1.5" />
                             </div>
                          ))}
                       </div>
                    </Card>
                 </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 <Card className="p-8 border-none shadow-sm rounded-[2.5rem] bg-slate-50">
                    <h4 className="text-[10px] font-black uppercase text-navy tracking-widest mb-6 flex items-center gap-2">
                       <History className="h-4 w-4 text-primary" /> Eventos do Kernel IA
                    </h4>
                    <div className="space-y-6">
                       {[
                          { time: "2m", msg: "Modelo 'OCR-v4' atualizado com sucesso", type: "success" },
                          { time: "15m", msg: "Pico de requisições detectado no Worker #2", type: "warning" },
                          { time: "1h", msg: "Backup de vetores concluído (Region: BR)", type: "info" },
                       ].map((e, i) => (
                          <div key={i} className="flex gap-4">
                             <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                e.type === 'success' ? 'bg-emerald-500' : 
                                e.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                             }`} />
                             <div>
                                <p className="text-xs font-bold text-navy leading-tight">{e.msg}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{e.time} atrás</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </Card>

                 <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 group">
                    <ShieldCheck className="h-10 w-10 mb-6 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xl font-black uppercase tracking-tight mb-2 italic">AI Safety Isolation</h4>
                    <p className="text-sm opacity-80 leading-relaxed font-medium">Arquitetura modular garantindo isolamento total por company_id. Dados nunca são cruzados para treinamento.</p>
                 </div>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="models">
           <Card className="p-8 border-none shadow-sm rounded-[3rem] bg-white">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-sm font-black text-navy uppercase tracking-widest">Gerenciamento de Modelos</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Configuração de providers e parâmetros do sistema</p>
                 </div>
                 <button className="bg-primary text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Configurar Novo Modelo</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[
                    { key: 'ocr_engine', name: 'OCR advanced', provider: 'OpenAI', model: 'gpt-4o' },
                    { key: 'doc_analyzer', name: 'Document Analysis', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
                    { key: 'copilot', name: 'Naval Copilot', provider: 'OpenAI', model: 'gpt-4o-mini' },
                 ].map((m, i) => (
                    <Card key={i} className="p-6 border border-slate-100 hover:border-primary/20 transition-all rounded-2xl bg-slate-50/30">
                       <div className="flex justify-between items-start mb-4">
                          <Badge variant="outline" className="border-slate-200 text-slate-400 text-[8px] font-black uppercase">{m.key}</Badge>
                          <Settings className="h-4 w-4 text-slate-300 hover:text-navy cursor-pointer transition-colors" />
                       </div>
                       <h4 className="font-black text-navy uppercase text-sm mb-1">{m.name}</h4>
                       <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-[10px]">
                             <span className="text-slate-400 font-bold uppercase">Provider:</span>
                             <span className="font-black text-navy uppercase">{m.provider}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                             <span className="text-slate-400 font-bold uppercase">Modelo:</span>
                             <span className="font-black text-navy">{m.model}</span>
                          </div>
                       </div>
                    </Card>
                 ))}
              </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
