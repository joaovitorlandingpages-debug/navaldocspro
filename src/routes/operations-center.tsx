import { createFileRoute } from "@tanstack/react-router";
import { 
  Zap, 
  Search, 
  Activity, 
  Cpu, 
  LayoutDashboard, 
  ClipboardList, 
  Clock, 
  AlertCircle,
  Filter,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  MoreVertical,
  CheckCircle2
} from "lucide-react";
import { OperationalCharts } from "@/components/OperationalCharts";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/operations-center")({
  component: OperationsCenterPage,
});

function OperationsCenterPage() {
  const { profile } = useAuth();
  
  const { data: processes, isLoading } = useQuery({
    queryKey: ["ops-processes", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, vessels(name), customers(name)")
        .eq("company_id", profile?.company_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const { data: tasks } = useQuery({
    queryKey: ["ops-tasks", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operational_tasks")
        .select("*")
        .eq("company_id", profile?.company_id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const stats = [
    { label: "Fluxos Ativos", value: processes?.length || "0", icon: <Activity className="text-blue-500" />, trend: "Operação Nominal" },
    { label: "Pendências Críticas", value: tasks?.filter((t: any) => t.priority === 'critical' || t.priority === 'high').length || "0", icon: <AlertCircle className="text-red-500" />, trend: "Ação Imediata" },
    { label: "Automação Hoje", value: "142", icon: <Cpu className="text-primary" />, trend: "Eficiência +40%" },
    { label: "Prontos p/ Protocolo", value: processes?.filter((p: any) => p.completion_percentage === 100).length || "0", icon: <CheckCircle2 className="text-green-500" />, trend: "Fluxo Finalizado" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-navy rounded-xl flex items-center justify-center shadow-lg">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-semibold text-navy">Central de Operações</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg text-sm">
            Monitoramento em tempo real da produtividade, automações e gargalos operacionais.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-white">
            <Filter className="h-3.5 w-3.5" /> Filtrar Visão
          </Button>
          <Badge variant="secondary" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-navy font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" /> +12% Produtividade
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all group relative overflow-hidden rounded-2xl bg-white">
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
      
      {/* Visual Analytics Section */}
      <OperationalCharts />

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Inteligência IA (4 colunas) */}
        <div className="lg:col-span-4">
           <IntelligencePanel />
        </div>

        {/* Pipeline Operacional (8 colunas) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-sm font-semibold tracking-[0.2em] text-navy flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" /> Pipeline de Processos
             </h2>
             <span className="text-[10px] font-bold text-slate-400 uppercase">Atualizado agora</span>
          </div>

          <div className="space-y-3">
             {isLoading ? (
               Array(3).fill(0).map((_, i) => <Card key={i} className="h-24 bg-slate-50 animate-pulse rounded-3xl" />)
             ) : (
               processes?.map((process: any) => (
                 <Card key={process.id} className="p-5 border-slate-100 hover:shadow-lg transition-all rounded-2xl bg-white group border-l-4 border-l-primary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-colors shrink-0">
                             <ClipboardList className="h-6 w-6 text-navy" />
                          </div>
                          <div className="min-w-0">
                             <h4 className="text-sm font-semibold text-navy truncate">{process.vessels?.name || 'Sem Barco'}</h4>
                             <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{process.customers?.name || 'Sem Cliente'} • {process.type}</p>
                          </div>
                       </div>

                       <div className="flex-grow max-w-xs px-4">
                          <div className="flex justify-between items-center mb-1.5">
                             <span className="text-[9px] font-black uppercase text-slate-400">Progresso IA</span>
                             <span className="text-[10px] font-black text-primary">{process.completion_percentage}%</span>
                          </div>
                          <Progress value={process.completion_percentage} className="h-1.5" />
                       </div>

                       <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                             <div className="flex gap-1 mb-1 justify-end">
                                {process.is_blocked && (
                                   <Badge className="bg-red-500 text-white border-none text-[7px] font-black uppercase px-1.5 h-4">Bloqueado</Badge>
                                )}
                                {process.sla_status === 'warning' && (
                                   <Badge className="bg-amber-500 text-white border-none text-[7px] font-black uppercase px-1.5 h-4">SLA Alerta</Badge>
                                )}
                             </div>
                             <Badge className={`uppercase text-[8px] font-black ${
                               process.status === 'completed' ? 'bg-green-100 text-green-700' : 
                               process.status === 'waiting_protocol' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                             } border-none`}>
                                {process.status}
                             </Badge>
                             <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Última ação: {new Date(process.updated_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-xl">
                             <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all" />
                          </Button>
                       </div>
                    </div>
                 </Card>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
