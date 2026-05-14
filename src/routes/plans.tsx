import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Check, ShieldCheck, Zap, Globe, 
  Headphones, Loader2, CreditCard,
  History, Calendar, ExternalLink
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/plans")({
  component: Plans,
});

function Plans() {
  const { plans, subscription, isLoadingSubscription, createPreference } = useSubscription();

  const handleUpgrade = async (planId: string) => {
    try {
      await createPreference.mutateAsync(planId);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Planos e Assinatura</h1>
            <p className="text-muted-foreground font-medium">Gerencie sua conta e escolha o melhor plano para crescer.</p>
          </div>
          
          {subscription && (
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                     <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Plano Ativo</p>
                     <p className="text-sm font-black text-navy uppercase">{subscription.plan?.name}</p>
                  </div>
               </div>
               <div className="h-10 w-px bg-slate-100" />
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Próxima Cobrança</p>
                  <p className="text-sm font-bold text-navy">
                    {subscription.current_period_end ? format(new Date(subscription.current_period_end), "dd 'de' MMMM", { locale: ptBR }) : '--'}
                  </p>
               </div>
               <Badge className="bg-green-500 text-white border-none uppercase text-[9px] font-black tracking-widest">
                 {subscription.status === 'active' ? 'Ativo' : 'Pendente'}
               </Badge>
            </div>
          )}
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
          {isLoadingSubscription ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando planos...</p>
            </div>
          ) : (
            plans?.map((plan) => {
              const isCurrent = subscription?.plan_id === plan.id;
              const isPopular = plan.name === "Professional";

              return (
                <div key={plan.id} className={`relative bg-white rounded-[2.5rem] border ${isPopular ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-100 shadow-sm'} p-10 flex flex-col transition-all hover:shadow-xl`}>
                  {isPopular && <span className="absolute top-0 right-12 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg shadow-primary/30">Mais Popular</span>}
                  
                  <div className="mb-10">
                      <div className={`h-12 w-12 rounded-2xl mb-6 flex items-center justify-center ${isPopular ? 'bg-primary text-white' : 'bg-slate-100 text-navy'}`}>
                        {plan.name === "Start" ? <Zap className="h-6 w-6" /> : plan.name === "Professional" ? <ShieldCheck className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                      </div>
                      <h3 className="text-xl font-black text-navy mb-2 uppercase tracking-tight">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-5xl font-black text-navy">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        <span className="text-slate-400 text-sm font-bold">/mês</span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="space-y-4 mb-12 flex-grow">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="h-5 w-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100">
                              <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-sm text-slate-600 font-bold">{feat}</span>
                        </div>
                      ))}
                      {plan.customer_limit && (
                        <div className="flex gap-4 items-center">
                          <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                              <Check className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-sm text-slate-600 font-bold">Até {plan.customer_limit} clientes</span>
                        </div>
                      )}
                  </div>

                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || createPreference.isPending}
                    className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                      isCurrent ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-default' : 
                      isPopular ? 'bg-primary text-white hover:scale-105 shadow-xl shadow-primary/25 active:scale-95' : 'bg-navy text-white hover:bg-navy/90 hover:scale-105 shadow-lg active:scale-95'
                    }`}
                  >
                      {createPreference.isPending && createPreference.variables === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        'Assinatura Atual'
                      ) : (
                        'Fazer Upgrade'
                      )}
                  </Button>
                </div>
              );
            })
          )}
       </div>

       <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-navy rounded-[3rem] p-12 text-white overflow-hidden relative shadow-2xl group">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Headphones className="h-48 w-48" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                  Suporte Enterprise
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight uppercase">Escala Ilimitada?</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">Infraestrutura dedicada para grandes frotas, integração via API e suporte in-loco.</p>
                <Button className="bg-white text-navy px-8 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                  Falar com Consultor
                </Button>
              </div>
          </div>

          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm">
             <h3 className="text-xl font-black text-navy mb-8 uppercase tracking-tight flex items-center gap-3">
                <History className="h-5 w-5 text-primary" /> Histórico Financeiro
             </h3>
             <div className="space-y-4">
                {[1, 2].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                           <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fatura #00{i+1}</p>
                           <p className="text-sm font-bold text-navy">10 Mai 2026</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-navy">R$ 297,00</p>
                        <Badge className="bg-green-100 text-green-700 border-none text-[8px] font-black uppercase tracking-tighter">Pago</Badge>
                     </div>
                  </div>
                ))}
                {!subscription && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-50 rounded-2xl">
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem faturas recentes</p>
                  </div>
                )}
             </div>
          </div>
       </div>

       <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
             </div>
             <div>
                <h4 className="text-sm font-black text-navy uppercase tracking-tight">Segurança no Pagamento</h4>
                <p className="text-xs text-amber-700 font-medium">Todos os pagamentos são processados via Mercado Pago com criptografia SSL.</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Powered by</span>
             <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" alt="Mercado Pago" className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all" />
          </div>
       </div>
    </div>
  );
}
