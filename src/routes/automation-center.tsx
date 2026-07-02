import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Zap, 
  Cpu, 
  Settings2, 
  FileCheck, 
  History, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
  Target
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/automation-center")({
  component: AutomationCenter,
});

function AutomationCenter() {
  const { data: stats } = useQuery({
    queryKey: ["automation_stats_summary"],
    queryFn: async () => {
      // Simulando dados agregados de automação
      return {
        totalAutomated: 1240,
        ocrAccuracy: 98.4,
        timeSavedHours: 450,
        activeWorkflows: 12,
        moduleHealth: [
          { name: "OCR Core", status: "operational", uptime: "99.9%" },
          { name: "Doc Generator", status: "operational", uptime: "99.9%" },
          { name: "Auto Filler", status: "operational", uptime: "99.8%" },
          { name: "Validation Engine", status: "operational", uptime: "100%" },
        ],
        recentAutomations: [
          { id: 1, type: 'OCR', target: 'TIE - Casco 001', status: 'success', time: '1.2s' },
          { id: 2, type: 'DocGen', target: 'BCE - Marina Blue', status: 'success', time: '0.8s' },
          { id: 3, type: 'Validation', target: 'Memorial Técnico', status: 'success', time: '0.4s' },
          { id: 4, type: 'Sync', target: 'Base de Dados DPC', status: 'warning', time: '5.2s' },
        ]
      };
    },
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Engine de Automação Ativo</span>
          </div>
          <h1 className="text-4xl font-black text-navy uppercase tracking-tight flex items-center gap-4">
            <Cpu className="h-10 w-10 text-primary" /> Automation Center
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl">Monitore a eficiência, precisão do OCR e economia de tempo gerada pela inteligência NavalDocs Pro.</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-navy hover:shadow-lg transition-all flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Configurar Regras
           </button>
           <button className="bg-navy text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Recalibrar IA
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Documentos Automatizados", value: stats?.totalAutomated || "0", icon: <FileCheck />, color: "blue" },
          { label: "Precisão Média OCR", value: `${stats?.ocrAccuracy}%` || "0%", icon: <Target />, color: "emerald" },
          { label: "Horas Economizadas", value: `${stats?.timeSavedHours}h` || "0h", icon: <Clock />, color: "indigo" },
          { label: "Workflows Ativos", value: stats?.activeWorkflows || "0", icon: <Zap />, color: "amber" },
        ].map((stat, i) => (
          <Card key={i} className="p-8 border-none shadow-sm hover:shadow-md transition-all group rounded-3xl">
             <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 w-fit mb-6 group-hover:scale-110 transition-transform`}>
                {stat.icon}
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
             <h3 className="text-4xl font-black text-navy">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 p-10 rounded-3xl border-none shadow-sm overflow-hidden relative">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-1">Performance de Execução</h4>
                  <p className="text-xs text-slate-400 font-medium">Tempo médio de resposta por módulo (ms)</p>
               </div>
               <Badge className="bg-emerald-100 text-emerald-700 font-black uppercase text-[9px] tracking-widest">Tempo Real</Badge>
            </div>
            
            <div className="space-y-8">
               {stats?.moduleHealth.map((module, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                       <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-navy">{module.name}</span>
                       </div>
                       <span className="text-[10px] font-black text-emerald-500 uppercase">{module.uptime} Uptime</span>
                    </div>
                    <Progress value={95 + (i)} className="h-1.5 bg-slate-50" />
                 </div>
               ))}
            </div>

            <div className="mt-12 p-8 bg-slate-50 rounded-2xl border border-slate-100/50 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                     <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400">Eficiência Operacional</p>
                     <p className="text-sm font-bold text-navy">Ganhos de 42% na velocidade de processamento.</p>
                  </div>
               </div>
               <button className="text-[10px] font-black uppercase text-primary hover:underline">Ver Relatório Detalhado</button>
            </div>
         </Card>

         <Card className="p-10 rounded-3xl border-none shadow-sm bg-navy text-white relative overflow-hidden group">
            <Zap className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            <h4 className="font-black text-primary uppercase tracking-widest text-[10px] mb-8">Execuções Recentes</h4>
            <div className="space-y-6 relative z-10">
               {stats?.recentAutomations.map((item) => (
                 <div key={item.id} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-4">
                       <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                         item.status === 'success' ? 'bg-white/10 group-hover/item:bg-emerald-500/20' : 'bg-amber-500/10'
                       }`}>
                          {item.type === 'OCR' ? <Cpu className="h-5 w-5 text-primary" /> : <FileCheck className="h-5 w-5 text-white/40" />}
                       </div>
                       <div>
                          <p className="text-xs font-bold">{item.target}</p>
                          <p className="text-[9px] font-black uppercase opacity-40">{item.type} • {item.time}</p>
                       </div>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                 </div>
               ))}
            </div>
            <button className="mt-12 w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Histórico Completo</button>
         </Card>
      </div>

      <section className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex items-center justify-between mb-10">
            <div>
               <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-1">Detecção de Anomalias (Anti-Error Engine)</h4>
               <p className="text-xs text-slate-400 font-medium">Prevenção automática de inconsistências críticas.</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-primary" />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
               { title: "Divergência de Dados", desc: "IA detectou 12 erros de digitação em motores este mês.", icon: <AlertTriangle className="text-amber-500" /> },
               { title: "Fraude Documental", desc: "0 tentativas de upload de PDFs inválidos detectadas.", icon: <ShieldCheck className="text-emerald-500" /> },
               { title: "Assinaturas Pendentes", desc: "8 alertas automáticos enviados para engenheiros.", icon: <Clock className="text-indigo-500" /> },
            ].map((box, i) => (
               <div key={i} className="p-8 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-xl transition-all duration-500 group border border-transparent hover:border-slate-100">
                  <div className="mb-6 group-hover:scale-110 transition-transform">{box.icon}</div>
                  <h5 className="font-bold text-navy mb-2">{box.title}</h5>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{box.desc}</p>
               </div>
            ))}
         </div>
      </section>
    </div>
  );
}
