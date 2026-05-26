import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  DollarSign, Users, CreditCard, Activity, TrendingUp, 
  ArrowUpCircle, ArrowDownCircle, Building, Search, Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export const Route = createFileRoute('/admin/billing')({
  component: AdminBilling,
});

function AdminBilling() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    console.log("BILLING_ADMIN_OK");
  }, []);

  if (loading) return null;
  if (!profile?.isAdmin && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard" />;
  }

  const { data: plans } = useQuery({
    queryKey: ['admin-global-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (error) throw error;
      return data;
    }
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-global-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: mrrData } = useQuery({
    queryKey: ['admin-mrr-calc'],
    queryFn: async () => {
       // Real MRR calculation from active subscriptions
       const { data } = await supabase
         .from('subscriptions')
         .select('*, plan:plans(price)')
         .eq('status', 'active');
       
       return data?.reduce((acc: number, s: any) => acc + (Number(s.plan?.price) || 0), 0) || 0;
    }
  });

  const totalRevenue = payments?.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) || 0;
  const activeSubsCount = [...new Set(payments?.map((p: any) => p.company_id))].length;

  const stats = [
    { label: "Receita Total", value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign className="text-emerald-500" />, trend: "+12.5%", trendUp: true },
    { label: "MRR Real", value: `R$ ${(mrrData || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp className="text-blue-500" />, trend: "+4.2%", trendUp: true },
    { label: "Assinaturas Ativas", value: activeSubsCount.toString(), icon: <Users className="text-indigo-500" />, trend: "+2", trendUp: true },
    { label: "Taxa de Churn", value: "1.2%", icon: <ArrowDownCircle className="text-rose-500" />, trend: "-0.5%", trendUp: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest px-2">Global Finance</Badge>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revenue Ops</span>
           </div>
           <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestão Financeira</h1>
           <p className="text-slate-500 font-medium">Monitoramento consolidado de assinaturas e fluxo de caixa SaaS.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl gap-2 border-slate-200">
              <Download className="h-4 w-4" /> Exportar Relatório
           </Button>
           <Button className="bg-navy text-white rounded-xl gap-2 shadow-lg">
              <CreditCard className="h-4 w-4" /> Configurar Planos
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6 border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
                   {stat.icon}
                </div>
                <Badge variant="outline" className={`text-[10px] font-black border-none ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {stat.trendUp ? <ArrowUpCircle className="h-3 w-3 mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                   {stat.trend}
                </Badge>
             </div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-2xl font-black text-navy mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
           <h3 className="text-sm font-black text-navy uppercase tracking-widest">Pagamentos Recentes</h3>
           <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar transação..." className="pl-10 h-10 rounded-xl bg-white border-slate-200 text-xs" />
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50/30 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                    <th className="px-8 py-4">Empresa</th>
                    <th className="px-8 py-4">Valor</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Data</th>
                    <th className="px-8 py-4 text-right">Método</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {isLoading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Carregando faturamento...</td></tr>
                 ) : payments?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-[10px] font-bold">
                                {p.company?.name?.[0] || 'E'}
                             </div>
                             <p className="text-xs font-bold text-navy uppercase">{p.company?.name || 'Empresa Desconhecida'}</p>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-sm font-black text-navy">
                          R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                       </td>
                       <td className="px-8 py-5">
                          <Badge className={`uppercase text-[8px] font-black border-none ${
                             p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                             p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                             {p.status}
                          </Badge>
                       </td>
                       <td className="px-8 py-5 text-[10px] font-bold text-slate-400">
                          {new Date(p.created_at).toLocaleString('pt-BR')}
                       </td>
                       <td className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {p.payment_method || 'Cartão'}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </Card>

      <div className="mt-12 space-y-6">
         <h3 className="text-xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" /> Planos SaaS Ativos
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans?.map((plan: any) => (
               <Card key={plan.id} className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-xl transition-all group border-t-8 border-t-primary">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h4 className="text-xl font-black text-navy uppercase tracking-tighter">{plan.name}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">R$ {Number(plan.price).toLocaleString()}/mês</p>
                     </div>
                     <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase">v{plan.version || 1}</Badge>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Usuários</span>
                        <span className="text-navy">{plan.user_limit || 'Ilimitado'}</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>OCR Jobs</span>
                        <span className="text-navy">{plan.ocr_limit || '---'}</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Storage</span>
                        <span className="text-navy">{plan.storage_limit_gb ? `${plan.storage_limit_gb}GB` : '---'}</span>
                     </div>
                  </div>
                  <Button variant="ghost" className="w-full mt-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary border border-primary/10 hover:bg-primary/5">Editar Definição</Button>
               </Card>
            ))}
         </div>
      </div>

      <div className="bg-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group mt-12">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <TrendingUp className="h-64 w-64" />
         </div>
         <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
               <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-emerald-400">Performance Comercial</h4>
               <h3 className="text-3xl font-black mb-6">Crescimento Sustentável.</h3>
               <p className="text-slate-400 leading-relaxed mb-8">
                  O NavalDocs Pro mantém um LTV (Life Time Value) superior à média do mercado naval devido à integração crítica de fluxos DPC.
               </p>
               <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl">
                  Analisar Projeções
               </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">CAC Médio</p>
                  <p className="text-xl font-black text-emerald-400">R$ 142</p>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">LTV</p>
                  <p className="text-xl font-black text-emerald-400">R$ 3.8k</p>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">Upgrades</p>
                  <p className="text-xl font-black text-emerald-400">+15%</p>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-2">Inadimplência</p>
                  <p className="text-xl font-black text-rose-400">0.8%</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}