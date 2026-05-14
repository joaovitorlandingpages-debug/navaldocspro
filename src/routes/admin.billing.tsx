import { createFileRoute } from "@tanstack/react-router";
import { 
  CreditCard, TrendingUp, TrendingDown, 
  ArrowUpRight, Users, Building, Calendar,
  CheckCircle2, AlertCircle, Loader2, Download
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/billing")({
  component: AdminBilling,
});

function AdminBilling() {
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          company:companies(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: subscriptions, isLoading: isLoadingSubs } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          company:companies(name),
          plan:plans(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const stats = [
    { label: "Receita Mensal (MRR)", value: "R$ 42.890", trend: "+12%", icon: <TrendingUp className="h-5 w-5 text-emerald-500" /> },
    { label: "Assinaturas Ativas", value: subscriptions?.filter(s => s.status === 'active').length || 0, trend: "+3", icon: <CheckCircle2 className="h-5 w-5 text-blue-500" /> },
    { label: "Pagamentos Pendentes", value: payments?.filter(p => p.status === 'pending').length || 0, trend: "-2", icon: <AlertCircle className="h-5 w-5 text-amber-500" /> },
    { label: "Taxa de Churn", value: "2.4%", trend: "Estável", icon: <TrendingDown className="h-5 w-5 text-red-500" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-white uppercase tracking-tight">Gestão Financeira</h1>
           <p className="text-slate-500 font-mono text-xs italic">Monitoramento de faturamento, planos e inadimplência.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2">
           <Download className="h-4 w-4" /> Exportar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-white/5 rounded-lg">{stat.icon}</div>
               <Badge className="bg-white/5 text-white/60 border-none text-[10px]">{stat.trend}</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         {/* Pagamentos Recentes */}
         <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
               <div className="p-8 border-b border-white/5">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <CreditCard className="h-4 w-4 text-emerald-500" /> Transações Recentes
                  </h3>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5">
                           <th className="px-8 py-4">Empresa</th>
                           <th className="px-8 py-4">Valor</th>
                           <th className="px-8 py-4">Status</th>
                           <th className="px-8 py-4">Data</th>
                           <th className="px-8 py-4"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {isLoadingPayments ? (
                          <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" /></td></tr>
                        ) : payments?.length === 0 ? (
                          <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-xs font-bold uppercase">Nenhum pagamento</td></tr>
                        ) : payments?.map((p) => (
                           <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-8 py-4">
                                 <div className="font-bold text-white text-sm">{p.company?.name}</div>
                                 <div className="text-[10px] text-slate-500 font-mono tracking-tighter">ID: {p.mercado_pago_payment_id?.slice(0, 8)}...</div>
                              </td>
                              <td className="px-8 py-4 text-sm font-black text-white">R$ {Number(p.amount).toFixed(2)}</td>
                              <td className="px-8 py-4">
                                 <Badge className={`border-none font-black text-[9px] uppercase tracking-widest ${
                                    p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                 }`}>
                                    {p.status === 'approved' ? 'Aprovado' : 'Pendente'}
                                 </Badge>
                              </td>
                              <td className="px-8 py-4 text-[11px] text-slate-400 font-medium">
                                 {format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}
                              </td>
                              <td className="px-8 py-4 text-right">
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10"><ArrowUpRight className="h-4 w-4 text-slate-500" /></Button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </Card>
         </div>

         {/* Assinaturas por Plano */}
         <div className="space-y-8">
            <Card className="bg-slate-900 border-white/10 rounded-[2.5rem] p-8">
               <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Assinaturas por Plano</h3>
               <div className="space-y-6">
                  {['Professional', 'Start', 'Enterprise'].map((plan) => {
                     const count = subscriptions?.filter(s => s.plan?.name === plan).length || 0;
                     const total = subscriptions?.length || 1;
                     const percentage = Math.round((count / total) * 100);

                     return (
                        <div key={plan} className="space-y-2">
                           <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-white uppercase">{plan}</span>
                              <span className="text-slate-500">{count} empresas ({percentage}%)</span>
                           </div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                   plan === 'Professional' ? 'bg-primary' : 
                                   plan === 'Enterprise' ? 'bg-purple-500' : 'bg-blue-500'
                                }`} 
                                style={{ width: `${percentage}%` }} 
                              />
                           </div>
                        </div>
                     );
                  })}
               </div>
            </Card>

            <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-[2.5rem] p-8 text-emerald-500">
               <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                     <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Webhooks Status</p>
                     <h4 className="font-bold text-white uppercase">Operacional</h4>
                  </div>
               </div>
               <p className="text-xs font-medium leading-relaxed opacity-80">As notificações do Mercado Pago estão sendo processadas em tempo real (Latência: 1.2s).</p>
            </div>
         </div>
      </div>
    </div>
  );
}
