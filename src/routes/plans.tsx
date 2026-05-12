import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ShieldCheck, Zap, Globe, MessageSquare, Headphones } from "lucide-react";

export const Route = createFileRoute("/plans")({
  component: Plans,
});

function Plans() {
  const plans = [
    {
      name: "Individual",
      price: "R$ 149",
      description: "Ideal para engenheiros autônomos e consultores iniciantes.",
      features: ["Até 10 embarcações", "Documentos ilimitados", "Suporte por e-mail", "Templates base DPC", "Acesso Mobile"],
      current: false
    },
    {
      name: "Profissional",
      price: "R$ 299",
      description: "O poder completo para profissionais e pequenos escritórios.",
      features: ["Embarcações ilimitadas", "Assinatura Digital inclusa", "Suporte Prioritário", "Até 5 usuários", "API de consulta Marinha"],
      current: true,
      popular: true
    },
    {
      name: "Empresa",
      price: "R$ 899",
      description: "Infraestrutura robusta para grandes estaleiros e frotas.",
      features: ["Usuários ilimitados", "White-label (sua marca)", "Manager dedicado", "Treinamento presencial", "Customização de documentos"],
      current: false
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy tracking-tight">Planos e Assinatura</h1>
            <p className="text-muted-foreground">Gerencie sua conta e escolha o melhor plano para crescer.</p>
          </div>
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
             <button className="px-6 py-2 rounded-lg text-xs font-black uppercase bg-white shadow-sm text-navy">Mensal</button>
             <button className="px-6 py-2 rounded-lg text-xs font-black uppercase text-slate-500 hover:text-navy transition-all flex items-center gap-2">Anual <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md text-[9px]">-20%</span></button>
          </div>
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`relative bg-white rounded-[2.5rem] border ${plan.popular ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-100 shadow-sm'} p-10 flex flex-col transition-all hover:shadow-xl`}>
               {plan.popular && <span className="absolute top-0 right-12 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg shadow-primary/30">Mais Popular</span>}
               
               <div className="mb-10">
                  <div className={`h-12 w-12 rounded-2xl mb-6 flex items-center justify-center ${plan.popular ? 'bg-primary text-white' : 'bg-slate-100 text-navy'}`}>
                     {plan.name === "Individual" ? <Zap className="h-6 w-6" /> : plan.name === "Profissional" ? <ShieldCheck className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                  </div>
                  <h3 className="text-xl font-black text-navy mb-2 uppercase tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                     <span className="text-5xl font-black text-navy">{plan.price}</span>
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
               </div>

               <button className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                 plan.current ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-default' : 
                 plan.popular ? 'bg-primary text-white hover:scale-105 shadow-xl shadow-primary/25 active:scale-95' : 'bg-navy text-white hover:bg-navy/90 hover:scale-105 shadow-lg active:scale-95'
               }`}>
                  {plan.current ? 'Assinatura Atual' : 'Fazer Upgrade'}
               </button>
            </div>
          ))}
       </div>

       <div className="bg-navy rounded-[3rem] p-12 md:p-16 text-white flex flex-col md:flex-row gap-12 items-center justify-between overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <Headphones className="h-64 w-64" />
          </div>
          <div className="relative z-10 max-w-xl">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
               Solução Customizada
             </div>
             <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Precisa de escala ilimitada?</h3>
             <p className="text-slate-400 text-lg leading-relaxed">Oferecemos infraestrutura dedicada para frotas globais, integração via API e suporte in-loco para grandes operações.</p>
          </div>
          <button className="relative z-10 whitespace-nowrap bg-white text-navy px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95">
             Falar com Consultor
          </button>
       </div>
    </div>
  );
}
