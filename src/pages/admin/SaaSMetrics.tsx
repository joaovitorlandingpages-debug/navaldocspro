import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, 
  Zap, Database, CreditCard,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminSaaSMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-saas-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_global_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data;
    }
  });

  const current = metrics?.[0] || {};
  const previous = metrics?.[1] || {};

  const stats = [
    { label: "Receita (MRR)", value: `R$ ${current.total_mrr?.toLocaleString()}`, trend: current.total_mrr > previous.total_mrr ? "up" : "down", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Empresas Ativas", value: current.total_companies, trend: current.total_companies >= previous.total_companies ? "up" : "down", icon: Users, color: "text-primary", bg: "bg-blue-50" },
    { label: "Usuários (DAU)", value: current.active_users_daily, trend: "up", icon: Activity, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Churn Rate", value: `${current.churn_rate}%`, trend: "down", icon: BarChart3, color: "text-red-500", bg: "bg-red-50" },
    { label: "Uso OCR Global", value: current.ocr_total_usage, trend: "up", icon: Zap, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Storage Global", value: `${Math.round(Number(current.storage_total_bytes) / (1024**3))} GB`, trend: "up", icon: Database, color: "text-cyan-500", bg: "bg-cyan-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Métricas SaaS Avançadas</h1>
        <p className="text-slate-500 font-medium">KPIs de crescimento, retenção e saúde financeira da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-slate-100 shadow-sm hover:shadow-xl transition-all rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                {stat.trend === 'up' ? (
                  <div className="flex items-center gap-1 text-emerald-500">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-[10px] font-black italic">+4.2%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-500">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-[10px] font-black italic">-1.8%</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-navy mt-1 tracking-tighter">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-navy p-8">
            <CardTitle className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" /> Distribuição de Receita
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-navy uppercase">Plano Enterprise</span>
                <span className="text-xs font-bold text-slate-400">R$ 8.400 /mês</span>
              </div>
              <Progress value={65} className="h-2 bg-slate-100" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-navy uppercase">Plano Professional</span>
                <span className="text-xs font-bold text-slate-400">R$ 3.800 /mês</span>
              </div>
              <Progress value={30} className="h-2 bg-slate-100" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-navy uppercase">Add-ons (OCR Extra)</span>
                <span className="text-xs font-bold text-slate-400">R$ 600 /mês</span>
              </div>
              <Progress value={5} className="h-2 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
            <CardTitle className="text-navy text-sm font-black uppercase tracking-widest flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" /> Uso da Infraestrutura
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sucesso OCR</p>
                <h4 className="text-3xl font-black text-emerald-500 tracking-tighter">98.4%</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 italic">Meta: 99%</p>
              </div>
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Latência Média</p>
                <h4 className="text-3xl font-black text-primary tracking-tighter">142ms</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 italic">Meta: {"< 200ms"}</p>
              </div>
            </div>
            <div className="pt-4">
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                A IA operacional detectou um gargalo no processamento de documentos técnicos entre 14h e 16h. Escalonamento automático de workers ativado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
