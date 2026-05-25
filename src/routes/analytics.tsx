import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  TrendingUp, Activity, Users, Clock, 
  FileText, Zap, BarChart3, PieChart, 
  ArrowUpRight, ArrowDownRight, Target,
  Calendar, Layers, Cpu, ShieldCheck, Ship,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackNavigation } from "@/components/navigation/BackNavigation";
import { PageHeader } from "@/components/navigation/PageHeader";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [counts, setCounts] = useState({
    customers: 0,
    vessels: 0,
    activeProcesses: 0,
    finishedProcesses: 0,
    documents: 0,
    ocrCount: 0,
    pendingDocuments: 0,
    expiringCertificates: 0
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
        const [cust, vess, activeProc, finishedProc, docs, pendingDocs, ocr] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('vessels').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('status', 'active'),
          supabase.from('processes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('status', 'completed'),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('status', 'pending'),
          supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('module', 'ocr'),
        ]);

        setCounts({
          customers: cust.count || 0,
          vessels: vess.count || 0,
          activeProcesses: activeProc.count || 0,
          finishedProcesses: finishedProc.count || 0,
          documents: docs.count || 0,
          ocrCount: ocr.count || 0,
          pendingDocuments: pendingDocs.count || 0,
          expiringCertificates: 3 // Mocked for now
        });
      }
    };

    console.log("ANALYTICS_OK");
    fetchCounts();
  }, []);

  const stats = [
    { label: "Processos Ativos", value: counts.activeProcesses.toString(), trend: "+5%", positive: true, icon: <Activity className="h-5 w-5" /> },
    { label: "Documentos Gerados", value: counts.documents.toString(), trend: "+12%", positive: true, icon: <FileText className="h-5 w-5" /> },
    { label: "OCR Executados", value: counts.ocrCount.toString(), trend: "+24%", positive: true, icon: <Zap className="h-5 w-5" /> },
    { label: "Produtividade", value: "94%", trend: "+2%", positive: true, icon: <TrendingUp className="h-5 w-5" /> },
  ];

  const secondaryStats = [
    { label: "Processos Finalizados", value: counts.finishedProcesses.toString(), icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Docs Pendentes", value: counts.pendingDocuments.toString(), icon: <Clock className="h-4 w-4" /> },
    { label: "Certificados Vencendo", value: counts.expiringCertificates.toString(), icon: <AlertCircle className="h-4 w-4" />, color: "text-rose-500" },
  ];

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <PageHeader 
        title="Analytics Executivo"
        description="Inteligência de dados e performance operacional em tempo real."
        actions={
          <div className="flex gap-3">
              <Link to="/analytics/operations" className="bg-white border border-slate-200 text-navy px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                 Operacional
              </Link>
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                 <FileText className="h-4 w-4" /> Exportar Relatório
              </button>
          </div>
        }
      />

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {secondaryStats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl bg-slate-50 ${stat.color || 'text-navy'}`}>
                  {stat.icon}
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-black text-navy">{stat.value}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy flex items-center gap-2">
                     <BarChart3 className="h-4 w-4 text-primary" /> Crescimento Operacional
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Volume de processos finalizados por categoria</p>
               </div>
            </div>
            
            <div className="h-80 flex items-end gap-4 px-4">
               {[65, 45, 80, 55, 90, 70, 85, 40, 75, 60, 95, 80].map((h, i) => (
                 <div key={i} className="flex-grow group relative">
                    <div className="w-full bg-slate-50 rounded-t-2xl group-hover:bg-primary/5 transition-all absolute bottom-0 left-0" style={{ height: '100%' }} />
                    <div className="w-full bg-gradient-to-t from-primary to-indigo-400 rounded-t-2xl transition-all absolute bottom-0 left-0 shadow-lg shadow-primary/20 group-hover:scale-y-105 origin-bottom" style={{ height: `${h}%` }} />
                 </div>
               ))}
            </div>
            <div className="flex justify-between mt-6 px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
               <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span>
            </div>
         </div>

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
    </div>
  );
}
