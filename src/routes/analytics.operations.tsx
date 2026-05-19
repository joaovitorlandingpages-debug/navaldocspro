import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  TrendingUp, Activity, Target, Clock, BarChart3, 
  ArrowUpRight, AlertTriangle, FileText, Layers, Ship, 
  Users, ChevronRight, Filter, Zap, CheckCircle2, ShieldCheck,
  DollarSign
} from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/analytics/operations")({
  component: AnalyticsOperations,
});

function AnalyticsOperations() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight uppercase">Analytics Operacional</h1>
          <p className="text-slate-500 font-medium italic">Visão detalhada de gargalos, produtividade e saúde dos processos.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest text-navy">
                <Filter className="h-4 w-4" /> Filtros
            </button>
            <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 shadow-lg shadow-primary/20">
                Exportar CSV
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Tempo Médio/Processo", value: "4.2 dias", trend: "-12h", positive: true, icon: <Clock /> },
          { label: "Taxa de Automação", value: "84%", trend: "+5%", positive: true, icon: <Target /> },
          { label: "Horas Economizadas", value: "450h", trend: "+24h", positive: true, icon: <Zap /> },
          { label: "Processos Concluídos", value: "1,240", trend: "+85", positive: true, icon: <CheckCircle2 /> },
          { label: "Eficiência de OCR", value: "98.2%", trend: "+0.5%", positive: true, icon: <Activity /> },
          { label: "Redução de Erros", value: "62%", trend: "+12%", positive: true, icon: <ShieldCheck /> },
          { label: "Produtividade Equipe", value: "94%", trend: "+2%", positive: true, icon: <Users /> },
          { label: "GRU Automatizadas", value: "320", trend: "+45", positive: true, icon: <DollarSign /> },
        ].map((stat, i) => (
          <Card key={i} className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-md transition-all group">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-xl text-primary group-hover:scale-110 transition-transform">{stat.icon}</div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
             </div>
             <h3 className="text-3xl font-black text-navy">{stat.value}</h3>
             <p className={`text-[10px] font-black mt-2 ${stat.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend} vs período anterior
             </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-10 rounded-[3rem] border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy mb-8">Produtividade por Categoria</h4>
            <div className="h-80 flex items-end gap-6 px-4">
                {[40, 70, 50, 90, 60, 80].map((h, i) => (
                    <div key={i} className="flex-grow bg-slate-100 rounded-t-xl h-full relative group">
                        <div className="bg-primary w-full absolute bottom-0 rounded-t-xl" style={{ height: `${h}%` }} />
                    </div>
                ))}
            </div>
        </Card>
        <Card className="p-10 rounded-[3rem] border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy mb-8">Gargalos Recorrentes</h4>
            <div className="space-y-6">
                {[
                    { title: "Validação Documental", count: 45 },
                    { title: "Assinatura Digital", count: 32 },
                    { title: "Protocolo Anatel", count: 18 },
                ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">{item.title}</span>
                        <span className="text-lg font-black text-navy">{item.count}</span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
}
