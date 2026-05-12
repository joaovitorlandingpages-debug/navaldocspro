import { createFileRoute } from "@tanstack/react-router";
import { Zap, Bot, ShieldCheck, Mail, FileCheck } from "lucide-react";

export const Route = createFileRoute("/automation")({
  component: AutomationPage,
});

function AutomationPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Central de Automação</h1>
          <p className="text-muted-foreground font-medium">Configure regras, fluxos e inteligência para sua operação.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 flex items-center gap-2 shadow-lg shadow-primary/20">
          <Zap className="h-5 w-5" /> Nova Automação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Notificação de Processo", icon: Mail, status: "Ativo", desc: "Envia e-mail automático ao cliente quando o processo é criado." },
          { title: "Validação Documental", icon: FileCheck, status: "Pausado", desc: "Valida automaticamente GRUs anexadas por OCR." },
          { title: "Checklist de Embarcação", icon: Bot, status: "Ativo", desc: "Gera tarefas baseadas no tipo de vistoria da embarcação." },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${item.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {item.status}
              </span>
            </div>
            <h3 className="font-bold text-navy text-lg">{item.title}</h3>
            <p className="text-sm text-slate-500 mt-2">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
