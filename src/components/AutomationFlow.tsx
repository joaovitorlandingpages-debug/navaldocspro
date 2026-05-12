import { Zap, Plus, ArrowRight, Bell, Mail, FileText, CheckCircle2 } from "lucide-react";

export function AutomationFlow() {
  const steps = [
    { 
      type: "trigger", 
      title: "Quando: Novo Processo", 
      desc: "Um novo processo de Arrais Amador é aberto.",
      icon: <Plus className="h-5 w-5 text-blue-500" />,
      color: "blue"
    },
    { 
      type: "action", 
      title: "Então: Gerar Documentos", 
      desc: "Preencher automaticamente Procuração e Requerimento.",
      icon: <FileText className="h-5 w-5 text-indigo-500" />,
      color: "indigo"
    },
    { 
      type: "action", 
      title: "E: Notificar Cliente", 
      desc: "Enviar link de assinatura via WhatsApp e E-mail.",
      icon: <Bell className="h-5 w-5 text-amber-500" />,
      color: "amber"
    },
    { 
      type: "action", 
      title: "E: Atribuir Tarefa", 
      desc: "Vincular analista técnico responsável.",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      color: "emerald"
    }
  ];

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8">
        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-navy mb-2">Fluxo: Abertura Automatizada</h3>
      <p className="text-slate-500 text-sm mb-10">Automação configurada para economizar 45min por processo.</p>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="relative">
            <div className={`p-5 rounded-2xl border border-slate-100 flex items-center gap-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer group border-l-4 ${
              step.color === 'blue' ? 'border-l-blue-500' :
              step.color === 'indigo' ? 'border-l-indigo-500' :
              step.color === 'amber' ? 'border-l-amber-500' : 'border-l-emerald-500'
            }`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                step.color === 'blue' ? 'bg-blue-50' :
                step.color === 'indigo' ? 'bg-indigo-50' :
                step.color === 'amber' ? 'bg-amber-50' : 'bg-emerald-50'
              }`}>
                {step.icon}
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-navy text-sm">{step.title}</h4>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
            {i < steps.length - 1 && (
              <div className="h-4 w-px bg-slate-200 ml-9 my-1" />
            )}
          </div>
        ))}
      </div>

      <button className="w-full mt-8 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Adicionar Ação ao Fluxo
      </button>
    </div>
  );
}
