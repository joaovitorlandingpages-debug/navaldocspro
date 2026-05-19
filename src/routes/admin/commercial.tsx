import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  TrendingUp, Users, Building, 
  DollarSign, Activity, FileText, 
  BarChart3, Target, Zap, 
  ArrowUpRight, ArrowDownRight,
  UserCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

export const Route = createFileRoute("/admin/commercial")({
  component: CommercialDashboard,
});

function CommercialDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["commercial_metrics"],
    queryFn: async () => {
      const { data: companies } = await supabase.from("companies").select("*");
      const { data: usage } = await supabase.from("usage_analytics").select("*");
      
      const pilotCompanies = companies?.filter((c: any) => c.is_pilot) || [];
      const activeCompanies = companies?.filter((c: any) => c.status === 'active') || [];
      
      return {
        companies: companies?.length || 0,
        pilot: pilotCompanies.length,
        active: activeCompanies.length,
        mrr: (activeCompanies.length * 450) + (pilotCompanies.length * 150), // Simulando MRR
        usage: usage?.length || 0,
        growth: 12.5
      };
    },
  });

  const chartData = [
    { month: 'Jan', revenue: 42000, users: 450, growth: 5 },
    { month: 'Fev', revenue: 45000, users: 480, growth: 8 },
    { month: 'Mar', revenue: 48000, users: 520, growth: 12 },
    { month: 'Abr', revenue: 51000, users: 580, growth: 15 },
    { month: 'Mai', revenue: 54000, users: 650, growth: 18 },
  ];

  const stats = [
    { label: "Empresas Ativas", value: metrics?.active || "0", icon: <Building className="h-5 w-5" />, trend: "+2 este mês", color: "blue" },
    { label: "Clientes Piloto", value: metrics?.pilot || "0", icon: <UserCheck className="h-5 w-5" />, trend: "Evolução contínua", color: "emerald" },
    { label: "MRR Estimado", value: `R$ ${metrics?.mrr || "0"}`, icon: <DollarSign className="h-5 w-5" />, trend: "+15% YoY", color: "indigo" },
    { label: "Taxa de Conversão", value: "24%", icon: <Target className="h-5 w-5" />, trend: "+3.2%", color: "amber" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Dashboard Comercial</h1>
          <p className="text-slate-500 font-medium">Gestão de crescimento, receita e clientes piloto.</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-navy transition-all">Exportar PDF</button>
           <button className="bg-navy text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all">Novo Lead</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 w-fit mb-4 group-hover:scale-110 transition-transform`}>
               {stat.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-navy mt-2">{stat.value}</h3>
            <div className="flex items-center gap-1 mt-2">
               <ArrowUpRight className="h-3 w-3 text-emerald-500" />
               <p className="text-[10px] font-bold text-emerald-600 uppercase">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h4 className="font-black text-navy uppercase tracking-widest text-xs">Crescimento de Receita (MRR)</h4>
               <select className="bg-slate-50 border-none text-[10px] font-bold uppercase rounded-lg px-2 py-1 outline-none">
                  <option>Últimos 6 meses</option>
                  <option>Último ano</option>
               </select>
            </div>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#001F3F" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#001F3F" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                        itemStyle={{fontWeight: 800}}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#001F3F" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
            <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-6">Utilização por Módulo</h4>
            <div className="space-y-6 flex-grow">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                     <span>OCR Intelligence</span>
                     <span className="text-primary">88%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-primary w-[88%] rounded-full" />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                     <span>Automação Documental</span>
                     <span className="text-emerald-500">72%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 w-[72%] rounded-full" />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                     <span>Gestão de Processos</span>
                     <span className="text-indigo-500">94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 w-[94%] rounded-full" />
                  </div>
               </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 p-8 rounded-b-[2.5rem]">
               <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                     <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400">Insight Comercial</p>
                     <p className="text-xs font-bold text-navy">Focar expansão no módulo de OCR em Junho.</p>
                  </div>
               </div>
               <button className="w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-navy hover:bg-slate-50 transition-all">Ver Detalhes</button>
            </div>
         </div>
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
         <h4 className="font-black text-navy uppercase tracking-widest text-xs mb-8">Clientes Piloto em Destaque</h4>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
               <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Zap className="h-6 w-6 text-primary" />
                     </div>
                     <div>
                        <h5 className="font-bold text-navy">Naval Corp {i}</h5>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Fase: Implementação Real</p>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Eficiência</span>
                        <span className="text-emerald-500">+45%</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Tempo Economizado</span>
                        <span>12h / sem</span>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </section>
    </div>
  );
}
