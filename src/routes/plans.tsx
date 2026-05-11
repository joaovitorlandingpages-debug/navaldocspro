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
    <div className="space-y-8 animate-in fade-in duration-500">
       <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Planos e Assinatura</h1>
          <p className="text-muted-foreground">Gerencie sua conta e escolha o melhor plano para crescer.</p>
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`relative bg-white rounded-3xl border ${plan.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-100'} p-8 flex flex-col`}>
               {plan.popular && <span className="absolute top-0 right-12 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Mais Popular</span>}
               
               <div className="mb-8">
                  <h3 className="text-xl font-bold text-navy mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                     <span className="text-4xl font-black text-navy">{plan.price}</span>
                     <span className="text-slate-400 text-sm">/mês</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{plan.description}</p>
               </div>

               <div className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                       <div className="h-5 w-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                       </div>
                       <span className="text-sm text-slate-600 font-medium">{feat}</span>
                    </div>
                  ))}
               </div>

               <button className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                 plan.current ? 'bg-slate-100 text-slate-400 cursor-default' : 
                 plan.popular ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20' : 'bg-navy text-white hover:bg-navy/90'
               }`}>
                  {plan.current ? 'Plano Atual' : 'Fazer Upgrade'}
               </button>
            </div>
          ))}
       </div>

       <div className="bg-navy rounded-3xl p-10 text-white flex flex-col md:flex-row gap-10 items-center justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <Headphones className="h-32 w-32" />
          </div>
          <div className="relative z-10">
             <h3 className="text-2xl font-bold mb-2">Precisa de algo personalizado?</h3>
             <p className="text-slate-400 max-w-md">Oferecemos soluções Enterprise para frotas com mais de 500 embarcações e necessidades específicas de integração.</p>
          </div>
          <button className="relative z-10 whitespace-nowrap bg-white text-navy px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform">
             Falar com Especialista
          </button>
       </div>
    </div>
  );
}
