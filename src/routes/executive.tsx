import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Briefcase, Clock, Award, BarChart3, Activity, DollarSign } from "lucide-react";

export const Route = createFileRoute("/executive")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — NavalDocs Pro" },
      { name: "description", content: "KPIs estratégicos para liderança." },
    ],
  }),
  component: ExecutiveDashboard,
});

function ExecutiveDashboard() {
  useEffect(() => { console.log("EXECUTIVE_DASHBOARD_READY"); }, []);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["executive-kpis"],
    queryFn: async () => {
      const [proc, cust, vess, docs] = await Promise.all([
        supabase.from("processes").select("id, status, created_at, compliance_score", { count: "exact" }),
        supabase.from("customers").select("id, created_at", { count: "exact" }),
        supabase.from("vessels").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id, status, created_at", { count: "exact" }),
      ]);

      const processes = proc.data || [];
      const completed = processes.filter((p: any) => ["completed", "Concluído", "concluido"].includes(p.status)).length;
      const inProgress = processes.filter((p: any) => ["in_progress", "Em Andamento"].includes(p.status)).length;
      const avgCompliance = processes.length
        ? Math.round(processes.reduce((s: number, p: any) => s + (p.compliance_score || 0), 0) / processes.length)
        : 0;

      const now = new Date();
      const thisMonth = processes.filter((p: any) => {
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prev = processes.filter((p: any) => {
        const d = new Date(p.created_at);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      }).length;
      const growth = prev ? Math.round(((thisMonth - prev) / prev) * 100) : thisMonth > 0 ? 100 : 0;

      return {
        totalProcesses: proc.count || 0,
        completed,
        inProgress,
        completionRate: proc.count ? Math.round((completed / proc.count) * 100) : 0,
        totalCustomers: cust.count || 0,
        totalVessels: vess.count || 0,
        totalDocuments: docs.count || 0,
        avgCompliance,
        monthGrowth: growth,
        thisMonth,
      };
    },
  });

  const cards = [
    { label: "Processos Totais", value: kpis?.totalProcesses ?? 0, icon: Briefcase, color: "text-primary", trend: `${kpis?.thisMonth ?? 0} este mês` },
    { label: "Taxa de Conclusão", value: `${kpis?.completionRate ?? 0}%`, icon: Award, color: "text-emerald-500", trend: `${kpis?.completed ?? 0} concluídos` },
    { label: "Compliance Médio", value: `${kpis?.avgCompliance ?? 0}%`, icon: BarChart3, color: "text-blue-500", trend: "Score global" },
    { label: "Crescimento Mensal", value: `${(kpis?.monthGrowth ?? 0) >= 0 ? "+" : ""}${kpis?.monthGrowth ?? 0}%`, icon: TrendingUp, color: (kpis?.monthGrowth ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500", trend: "vs mês anterior" },
    { label: "Clientes Ativos", value: kpis?.totalCustomers ?? 0, icon: Users, color: "text-navy", trend: "Base total" },
    { label: "Embarcações", value: kpis?.totalVessels ?? 0, icon: Activity, color: "text-navy", trend: "Frota gerida" },
    { label: "Documentos Gerados", value: kpis?.totalDocuments ?? 0, icon: DollarSign, color: "text-amber-500", trend: "Acervo total" },
    { label: "Em Andamento", value: kpis?.inProgress ?? 0, icon: Clock, color: "text-blue-500", trend: "Fila ativa" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8 pb-20">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-navy uppercase tracking-tight">Dashboard Executivo</h1>
        <p className="text-slate-500 font-medium mt-2">KPIs estratégicos para liderança e tomada de decisão.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="p-6 border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition">
            <c.icon className={`h-6 w-6 ${c.color} mb-4`} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
            <p className="text-3xl font-black text-navy mt-1">{isLoading ? "—" : c.value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">{c.trend}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-[#000B18] text-white border-none rounded-3xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 opacity-5">
          <Award className="h-72 w-72" />
        </div>
        <div className="relative z-10 grid md:grid-cols-3 gap-8">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Saúde Operacional</p>
            <p className="text-5xl font-black">{kpis?.avgCompliance ?? 0}<span className="text-2xl text-white/40">/100</span></p>
            <p className="text-xs text-white/60 mt-2">Compliance médio dos processos ativos</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Velocidade</p>
            <p className="text-5xl font-black">{kpis?.thisMonth ?? 0}</p>
            <p className="text-xs text-white/60 mt-2">Processos abertos este mês</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Escala</p>
            <p className="text-5xl font-black">{(kpis?.totalCustomers ?? 0) + (kpis?.totalVessels ?? 0)}</p>
            <p className="text-xs text-white/60 mt-2">Entidades gerenciadas (clientes + frota)</p>
          </div>
        </div>
      </Card>

      <Badge className="bg-amber-50 text-amber-700 border-none text-[9px] font-black uppercase tracking-widest">
        Dados em tempo real • Atualizado a cada acesso
      </Badge>
    </div>
  );
}
