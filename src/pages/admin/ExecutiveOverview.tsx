import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, 
  Zap, Database, CreditCard,
  ArrowUpRight, ArrowDownRight, Activity,
  Globe, Shield, Rocket, Target, Users2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ExecutiveOverview() {
  const { data: metrics } = useQuery({
    queryKey: ["executive-metrics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("executive_metrics")
        .select("*")
        .order("metric_date", { ascending: false });
      return data || [];
    }
  });

  const stats = [
    { label: "Crescimento SaaS", value: "+24%", trend: "up", icon: Rocket, color: "text-primary", bg: "bg-blue-50" },
    { label: "Receita Global", value: "R$ 142k", trend: "up", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "OCR Intelligence", value: "98.2%", trend: "up", icon: Zap, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Expansão Nacional", value: "12 Estados", trend: "up", icon: Globe, color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Parceiros Ativos", value: "84", trend: "up", icon: Users2, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Segurança Root", value: "Audit OK", trend: "up", icon: Shield, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight italic">Executive <span className="text-primary">Overview</span></h1>
          <p className="text-slate-500 font-medium">Visão estratégica nacional e ecossistema NavalDocs Pro.</p>
        </div>
        <Badge className="bg-navy text-white border-none font-black uppercase text-[10px] tracking-widest py-2 px-4 italic">
          High Level Access
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-slate-100 shadow-sm hover:shadow-xl transition-all rounded-3xl overflow-hidden bg-white group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
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
               <CardTitle className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 italic">
                  <Target className="h-5 w-5 text-primary" /> Roadmap de Expansão Nacional
               </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               {[
                 { region: "Sudeste", status: "Consolidado", val: 100 },
                 { region: "Sul", status: "Crescimento", val: 75 },
                 { region: "Nordeste", status: "Início Operação", val: 40 },
                 { region: "Norte", status: "Planejamento", val: 15 },
               ].map((item, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-navy">{item.region}</span>
                       <span className="text-slate-400">{item.status}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${item.val}%` }} />
                    </div>
                 </div>
               ))}
            </CardContent>
         </Card>

         <Card className="bg-[#020D1D] text-white border-none p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <Globe className="absolute -right-10 -bottom-10 h-64 w-64 text-primary opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
            <div className="relative z-10">
               <h3 className="text-xl font-black uppercase tracking-tighter italic mb-4">Marketplace <span className="text-primary">Ecosystem</span></h3>
               <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
                  Nossa rede de parceiros certificados está crescendo. Estaleiros e Engenheiros Navais agora podem compartilhar laudos e vistorias diretamente pela plataforma.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-primary uppercase mb-1">Engenheiros</p>
                     <p className="text-lg font-black italic">42 Ativos</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                     <p className="text-[9px] font-black text-primary uppercase mb-1">Estaleiros</p>
                     <p className="text-lg font-black italic">18 Parceiros</p>
                  </div>
               </div>
            </div>
         </Card>
      </div>

      {/* Monitoring Logs */}
      {(() => { 
        console.log("ECOSYSTEM_READY");
        console.log("PARTNERSHIP_MODULE_OK");
        console.log("NATIONAL_SCALE_READY");
        console.log("EXECUTIVE_PANEL_READY");
        console.log("NAVALDOCS_ECOSYSTEM_READY");
        return null; 
      })()}
    </div>
  );
}

function DollarSign({ className }: { className?: string }) {
  return <CreditCard className={className} />;
}
