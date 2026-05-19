import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  TrendingUp, Activity, Users, Clock, 
  FileText, Zap, BarChart3, PieChart, 
  ArrowUpRight, ArrowDownRight, Target,
  Calendar, Layers, Cpu, ShieldCheck, Ship
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [counts, setCounts] = useState({
    customers: 0,
    vessels: 0,
    processes: 0,
    documents: 0
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        const [cust, vess, proc, docs] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('vessels').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        ]);

        setCounts({
          customers: cust.count || 0,
          vessels: vess.count || 0,
          processes: proc.count || 0,
          documents: docs.count || 0
        });
      }
    };

    fetchCounts();
  }, []);

  const stats = [
    { label: "Processos Concluídos", value: counts.processes.toString(), trend: "+12.5%", positive: true, icon: <Target className="h-5 w-5" /> },
    { label: "Embarcações", value: counts.vessels.toString(), trend: "+5%", positive: true, icon: <Ship className="h-5 w-5" /> },
    { label: "Total Clientes", value: counts.customers.toString(), trend: "+2%", positive: true, icon: <Users className="h-5 w-5" /> },
    { label: "Documentos Gerados", value: counts.documents.toString(), trend: "+24h", positive: true, icon: <Zap className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight uppercase">Analytics Executivo</h1>
          <p className="text-slate-500 font-medium italic">Inteligência de dados e performance operacional em tempo real.</p>
        </div>
        <div className="flex gap-3">
            <Link to="/analytics/operations" className="bg-white border border-slate-200 text-navy px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
               Operacional
            </Link>
            <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
               <FileText className="h-4 w-4" /> Exportar Relatório
            </button>
        </div>
      </div>

      {/* Tabs for different analytics views */}
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <Link to="/analytics" activeProps={{ className: "text-primary border-primary" }} className="text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent pb-4 px-2 hover:text-navy transition-all">Geral</Link>
        <Link to="/analytics/operations" activeProps={{ className: "text-primary border-primary" }} className="text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent pb-4 px-2 hover:text-navy transition-all">Operacional</Link>
        <button className="text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent pb-4 px-2 hover:text-navy transition-all opacity-50 cursor-not-allowed">Billing (Pro)</button>
        <button className="text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent pb-4 px-2 hover:text-navy transition-all opacity-50 cursor-not-allowed">OCR Analytics (Pro)</button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
               {stat.icon}
            </div>
            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-slate-50 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                     {stat.icon}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
               </div>
               <h3 className="text-3xl font-black text-navy mb-2">{stat.value}</h3>
               <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${stat.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stat.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.trend} <span className="text-slate-300 ml-1">vs mês anterior</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Chart Card */}
         <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy flex items-center gap-2">
                     <BarChart3 className="h-4 w-4 text-primary" /> Crescimento Operacional
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Volume de processos finalizados por categoria</p>
               </div>
               <select className="bg-slate-50 border-none text-[10px] font-black uppercase rounded-lg px-4 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-all">
                  <option>Todos os Departamentos</option>
                  <option>Engenharia</option>
                  <option>Documentação</option>
               </select>
            </div>
            
            {/* Pseudo-Chart Visual */}
            <div className="h-80 flex items-end gap-4 px-4">
               {[65, 45, 80, 55, 90, 70, 85, 40, 75, 60, 95, 80].map((h, i) => (
                 <div key={i} className="flex-grow group relative">
                    <div 
                      className="w-full bg-slate-50 rounded-t-2xl group-hover:bg-primary/5 transition-all absolute bottom-0 left-0" 
                      style={{ height: '100%' }}
                    />
                    <div 
                      className="w-full bg-gradient-to-t from-primary to-indigo-400 rounded-t-2xl transition-all absolute bottom-0 left-0 shadow-lg shadow-primary/20 group-hover:scale-y-105 origin-bottom" 
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navy text-white text-[10px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap">
                       {Math.round(h * 1.5)} docs
                    </div>
                 </div>
               ))}
            </div>
            <div className="flex justify-between mt-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
               <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span>
            </div>
         </div>

         {/* Distribution Card */}
         <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy mb-10 flex items-center gap-2">
               <PieChart className="h-4 w-4 text-primary" /> Saúde Operacional
            </h4>
            <div className="relative h-64 flex items-center justify-center">
               <div className="h-48 w-48 rounded-full border-[16px] border-slate-50 relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[16px] border-primary border-t-transparent border-r-transparent rotate-45" />
                  <div className="text-center">
                     <p className="text-3xl font-black text-navy">92%</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SLA Cumprido</p>
                  </div>
               </div>
            </div>
            <div className="mt-8 space-y-4">
               {[
                 { label: "Em Prazo", value: "88%", color: "bg-primary" },
                 { label: "Atraso Leve", value: "8%", color: "bg-indigo-300" },
                 { label: "Risco Crítico", value: "4%", color: "bg-rose-400" },
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`h-2 w-2 rounded-full ${item.color}`} />
                       <span className="text-xs font-bold text-slate-500 uppercase">{item.label}</span>
                    </div>
                    <span className="text-xs font-black text-navy">{item.value}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Intelligence & Bottlenecks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-20 -bottom-20 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Cpu className="h-80 w-80" />
            </div>
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 bg-primary/20 rounded-2xl flex items-center justify-center">
                     <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em]">IA Insights: Gargalos Detectados</h4>
               </div>
               <div className="space-y-6">
                  {[
                    { title: "Validação de GRU", impact: "Alto", desc: "Atraso médio de 1.4 dias na conferência manual.", action: "Ativar Automação OCR" },
                    { title: "Coleta de Assinaturas", impact: "Médio", desc: "Processos parados aguardando Eng. Responsável.", action: "Configurar Lembretes" }
                  ].map((insight, i) => (
                    <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all group/item cursor-pointer">
                       <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm">{insight.title}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${insight.impact === 'Alto' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                             Impacto {insight.impact}
                          </span>
                       </div>
                       <p className="text-xs text-slate-400 mb-4">{insight.desc}</p>
                       <button className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 group-hover/item:translate-x-1 transition-transform">
                          {insight.action} <ArrowUpRight className="h-3 w-3" />
                       </button>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="h-10 w-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <Layers className="h-5 w-5 text-primary" />
               </div>
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy">Performance por Usuário</h4>
            </div>
            <div className="space-y-8">
               {[
                 { name: "Ricardo Almeida", role: "Master", score: 98, status: "online" },
                 { name: "Mariana Souza", role: "Engenheira", score: 85, status: "offline" },
                 { name: "João Silva", role: "Despachante", score: 72, status: "online" },
                 { name: "Carlos Oliveira", role: "Operacional", score: 64, status: "offline" },
               ].map((user, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-navy text-xs relative">
                             {user.name[0]}
                             <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <div>
                             <p className="font-bold text-navy text-sm">{user.name}</p>
                             <p className="text-[10px] text-slate-400 font-black uppercase">{user.role}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-navy">{user.score}</p>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Eficiência</p>
                       </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full" style={{ width: `${user.score}%` }} />
                    </div>
                 </div>
               ))}
            </div>
            <button className="w-full mt-10 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-navy transition-colors border-t border-slate-50">Ver Ranking Completo</button>
         </div>
      </div>
    </div>
  );
}
