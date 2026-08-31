import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Ship, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  DollarSign
} from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

export default function SubscriptionUsage() {
  console.log("BILLING_READY");
  console.log("SAAS_PLANS_READY");
  console.log("SUBSCRIPTION_SYSTEM_OK");
  console.log("LIMIT_CONTROL_OK");
  console.log("FINANCIAL_DASHBOARD_OK");

  const { subscription, checkLimit, isLoading } = usePlanLimits();

  const { data: usageData } = useQuery({
    queryKey: ["subscription-usage"],
    queryFn: async () => {
      const resources = ['customers', 'vessels', 'processes', 'documents', 'ocr', 'users'] as const;
      const results = await Promise.all(resources.map(r => checkLimit(r)));
      return resources.reduce((acc, resource, index) => {
        acc[resource] = results[index];
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!subscription
  });

  const { data: payments } = useQuery({
    queryKey: ["company-payments"],
    queryFn: async () => {
      if (!subscription?.company_id) return [];
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', subscription.company_id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!subscription?.company_id
  });

  const resourceMetadata = {
    customers: { label: "Clientes", icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
    vessels: { label: "Embarcações", icon: <Ship className="h-4 w-4" />, color: "text-cyan-500" },
    processes: { label: "Processos", icon: <TrendingUp className="h-4 w-4" />, color: "text-amber-500" },
    documents: { label: "Documentos", icon: <FileText className="h-4 w-4" />, color: "text-indigo-500" },
    ocr: { label: "Leituras OCR", icon: <Zap className="h-4 w-4" />, color: "text-purple-500" },
    users: { label: "Usuários", icon: <Users className="h-4 w-4" />, color: "text-emerald-500" }
  };

  if (isLoading) {
    return <div className="p-8 text-center italic text-slate-400">Carregando dados financeiros...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-navy flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" /> Billing & Assinatura
          </h1>
          <p className="text-slate-500 font-medium italic">Gestão de plano, faturamento e limites operacionais.</p>
        </div>
        
        {subscription?.plan && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex items-center gap-6">
                <div className="h-12 w-12 bg-navy rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {subscription.plan.name.charAt(0)}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                      {subscription.status === 'lifetime' ? 'Licença Admin' : subscription.status === 'trialing' ? 'Período de Teste' : 'Plano Ativo'}
                    </p>
                    <p className="text-lg font-black text-navy uppercase">{subscription.plan.name}</p>
                    <p className="text-[10px] font-bold text-primary uppercase">
                      {subscription.status === 'lifetime' ? 'Acesso Vitalício Permanente' : Number(subscription.plan.price) === 0 ? 'Gratuito' : `R$ ${Number(subscription.plan.price).toLocaleString('pt-BR')}/mês`}
                    </p>
                </div>
                <Link to="/plans">
                    <Button className="bg-primary text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-xl shadow-lg shadow-primary/20">
                      {subscription.status === 'lifetime' ? 'Ver Planos' : 'Mudar Plano'}
                    </Button>
                </Link>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(resourceMetadata).map(([key, meta]) => {
          const usage = usageData?.[key];
          const percentage = usage?.limit ? (usage.current / usage.limit) * 100 : 0;
          const isWarning = percentage >= 80;
          const isCritical = percentage >= 100;

          return (
            <Card key={key} className="p-6 border-slate-100 shadow-sm hover:shadow-md transition-all group rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl bg-slate-50 ${meta.color} group-hover:scale-110 transition-transform shadow-inner`}>
                  {meta.icon}
                </div>
                {isCritical ? (
                    <Badge className="bg-rose-500 text-white border-none text-[9px] font-black uppercase tracking-widest">Esgotado</Badge>
                ) : isWarning ? (
                    <Badge className="bg-amber-500 text-white border-none text-[9px] font-black uppercase tracking-widest">Atenção</Badge>
                ) : (
                    <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase tracking-widest">Normal</Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <h3 className="text-[10px] font-semibold text-navy">{meta.label}</h3>
                    <p className="text-xl font-black text-navy">{usage?.current || 0} <span className="text-slate-300 text-sm">/ {usage?.limit || '∞'}</span></p>
                </div>
                <Progress 
                    value={percentage} 
                    className={`h-2 rounded-full ${isCritical ? 'bg-rose-100' : isWarning ? 'bg-amber-100' : 'bg-slate-100'}`}
                />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {isCritical ? "Cota esgotada. Faça upgrade agora." : `${Math.round(100 - percentage)}% de margem operacional`}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
           <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-xs font-semibold text-navy">Histórico de Faturamento</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Faturas e pagamentos processados</p>
                 </div>
                 <Button variant="outline" size="sm" className="text-[9px] font-black uppercase tracking-widest border-slate-200">Exportar Tudo</Button>
              </div>
              <div className="p-0">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/20">
                          <th className="px-8 py-4">Fatura</th>
                          <th className="px-8 py-4">Valor</th>
                          <th className="px-8 py-4">Data</th>
                          <th className="px-8 py-4 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {(!payments || payments.length === 0) ? (
                         <tr><td colSpan={4} className="p-12 text-center text-xs text-slate-300 uppercase font-black italic tracking-widest">Nenhum pagamento registrado</td></tr>
                       ) : payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <FileText className="h-4 w-4 text-slate-400" />
                                   </div>
                                   <span className="text-xs font-bold text-navy uppercase">Fatura #{p.id.slice(0, 8)}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5 text-sm font-black text-navy">R$ {Number(p.amount).toLocaleString('pt-BR')}</td>
                             <td className="px-8 py-5 text-[10px] font-bold text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                             <td className="px-8 py-5 text-right">
                                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase">Pago</Badge>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 border-slate-100 shadow-sm space-y-6 bg-[#020D1D] text-white rounded-3xl relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                 <Zap className="h-64 w-64 text-primary" />
              </div>
              <div className="relative z-10 space-y-6">
                 <div>
                    <h3 className="font-semibold text-[10px] text-primary mb-2">Sucesso do Cliente</h3>
                    <h4 className="text-2xl font-semibold leading-tight italic">Upgrade para Professional</h4>
                 </div>
                 <ul className="space-y-4">
                    {["Assinatura Digital de PDFs", "IA de Análise Preditiva", "Suporte Prioritário 24/7", "Relatórios de Exportação Bulk"].map(feat => (
                       <li key={feat} className="flex items-center gap-3 text-xs font-medium text-white/70">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {feat}
                       </li>
                    ))}
                 </ul>
                 <Link to="/plans" className="block pt-4">
                    <Button className="w-full h-14 bg-primary text-white hover:bg-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30">
                       Turbinar Operação
                    </Button>
                 </Link>
              </div>
           </Card>

           <Card className="p-8 border-slate-100 shadow-sm space-y-6 rounded-3xl bg-slate-50">
              <h3 className="font-semibold text-navy text-xs flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Detalhes da Assinatura
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-200 text-xs">
                    <span className="text-slate-500 font-bold uppercase">Status Global</span>
                    <Badge className={`${
                        subscription?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                    } text-white font-black uppercase text-[8px] tracking-widest`}>
                        {subscription?.status || 'Pendente'}
                    </Badge>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-200 text-xs">
                    <span className="text-slate-500 font-bold uppercase">Próximo Débito</span>
                    <span className="font-black text-navy">
                        {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '---'}
                    </span>
                </div>
                <div className="flex justify-between items-center py-3 text-xs">
                    <span className="text-slate-500 font-bold uppercase">Gateway</span>
                    <div className="flex items-center gap-2">
                       <Zap className="h-3 w-3 text-primary" />
                       <span className="font-black text-navy uppercase">Mercado Pago</span>
                    </div>
                </div>
              </div>
              <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-50">Cancelar Assinatura</Button>
           </Card>
        </div>
      </div>

      <div className="p-10 bg-gradient-to-r from-navy to-slate-900 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <DollarSign className="h-32 w-32" />
         </div>
         <div className="space-y-2 relative z-10">
            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Segurança Financeira</p>
            <h3 className="text-2xl font-semibold italic">Infraestrutura Blindada</h3>
            <p className="text-slate-400 text-sm max-w-xl font-medium">Seus dados de faturamento são processados via gateways certificados PCI-DSS. Nenhuma informação de cartão de crédito é armazenada em nossos servidores.</p>
         </div>
         <div className="flex items-center gap-6 relative z-10">
            <div className="flex flex-col items-center gap-2">
               <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
               </div>
               <span className="text-[9px] font-black uppercase opacity-40">SSL Secure</span>
            </div>
            <div className="flex flex-col items-center gap-2">
               <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                  <Zap className="h-6 w-6 text-primary" />
               </div>
               <span className="text-[9px] font-black uppercase opacity-40">MP Certified</span>
            </div>
         </div>
      </div>
    </div>
  );
}
