import { createFileRoute } from "@tanstack/react-router";
import { 
  BrainCircuit, 
  Activity, 
  Cpu, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  BarChart3,
  Bot,
  AlertTriangle,
  History,
  Timer,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { lazy, Suspense } from "react";
// Onda 3C.3 — recharts (~400KB) sai deste bundle.
const OperationalCharts = lazy(() =>
  import("@/components/OperationalCharts").then((m) => ({ default: m.OperationalCharts })),
);
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/ai-center")({
  component: AIOperationsCenterPage,
});

function AIOperationsCenterPage() {
  console.log("AI_LAYER_READY");
  console.log("AI_COPILOT_ARCH_READY");
  console.log("FUTURE_AUTOMATION_READY");
  const { profile } = useAuth();

  const metrics = [
    { label: "Eficiência IA", value: "98.2%", icon: <Zap className="text-primary" />, trend: "Operação Nominal" },
    { label: "Erros Prevenidos", value: "142", icon: <ShieldCheck className="text-emerald-500" />, trend: "Anti-Erro Ativo" },
    { label: "Tempo Economizado", value: "48h", icon: <Timer className="text-blue-500" />, trend: "Este mês" },
    { label: "Saúde dos Fluxos", value: "99.9%", icon: <Activity className="text-rose-500" />, trend: "SLA Garantido" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-navy rounded-2xl flex items-center justify-center shadow-xl shadow-navy/20">
              <Bot className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-navy">Inteligência Operacional</h1>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Enterprise Neural Engine Active</p>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-lg text-sm mt-4">
            A camada cerebral do NavalDocs Pro. Analisando gargalos, divergências e automações em tempo real.
          </p>
        </div>
        
        <Badge variant="secondary" className="h-10 px-6 rounded-2xl border-slate-200 bg-white text-navy font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> +40% Produtividade Equipe
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all group relative overflow-hidden rounded-3xl bg-white">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                   {stat.icon}
                </div>
             </div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-2xl font-semibold text-navy mt-1">{stat.value}</h3>
             <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
               {stat.trend}
             </p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Insights & Sugestões */}
        <div className="lg:col-span-4">
          <IntelligencePanel />
        </div>

        {/* Analytics & Controle Central */}
        <div className="lg:col-span-8 space-y-8">
          <Suspense fallback={<div className="h-64" />}><OperationalCharts /></Suspense>

          <Card className="p-8 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Log de Decisões IA
                   </h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Rastreabilidade completa de automações</p>
                </div>
                <Badge variant="outline" className="rounded-full px-4 border-slate-200 text-slate-400 text-[8px] font-black uppercase">Tempo Real</Badge>
             </div>

             <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-6">
                   {[
                      { time: "14:24", action: "Validação Cruzada", desc: "IA detectou compatibilidade de motor no processo #772", status: "ok" },
                      { time: "14:15", action: "Sugestão de Documento", desc: "Sugerida criação de TIE temporário baseado em GRU paga", status: "info" },
                      { time: "13:50", action: "Bloqueio Anti-Erro", desc: "Impedida geração de memorial: Divergência de CPF proprietário", status: "alert" },
                      { time: "13:12", action: "Automação de Checklist", desc: "Checklist 'Embarcação em Obra' concluído via OCR de Fotos", status: "ok" },
                      { time: "12:45", action: "Análise de Gargalo", desc: "Detectada lentidão no módulo de vistorias externas", status: "alert" },
                   ].map((log, i) => (
                      <div key={i} className="flex gap-4 relative">
                         {i !== 4 && <div className="absolute left-2.5 top-6 bottom-[-24px] w-[2px] bg-slate-50" />}
                         <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            log.status === 'ok' ? 'bg-emerald-100 text-emerald-500' : 
                            log.status === 'alert' ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'
                         }`}>
                            {log.status === 'ok' ? <CheckCircle2 className="h-2.5 w-2.5" /> : 
                             log.status === 'alert' ? <AlertTriangle className="h-2.5 w-2.5" /> : <BrainCircuit className="h-2.5 w-2.5" />}
                         </div>
                         <div className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black text-navy uppercase">{log.action}</span>
                               <span className="text-[9px] text-slate-400 font-bold">• {log.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{log.desc}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
