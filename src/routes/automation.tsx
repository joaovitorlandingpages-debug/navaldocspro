import { createFileRoute } from "@tanstack/react-router";
import { Zap, Bot, ShieldCheck, Mail, FileCheck, Search, Activity, Cpu } from "lucide-react";
import { SmartOCR } from "@/components/SmartOCR";
import { AutomationFlow } from "@/components/AutomationFlow";

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Automações Ativas", value: "12", icon: <Zap className="text-amber-500" /> },
          { label: "Documentos OCR", value: "842", icon: <Search className="text-blue-500" /> },
          { label: "Erros de Fluxo", value: "0", icon: <ShieldCheck className="text-green-500" /> },
          { label: "Tempo Salvo", value: "124h", icon: <Activity className="text-primary" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4">{stat.icon}</div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-2xl font-black text-navy mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
           <div className="flex items-center gap-3 mb-2">
              <Cpu className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-navy">Editor de Fluxos</h2>
           </div>
           <AutomationFlow />
           
           <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold text-navy mb-4 uppercase text-xs tracking-widest">Regras Recentes</h3>
              <div className="space-y-3">
                 {[
                   { name: "Backup de Documentos", desc: "Sincroniza com Cloud a cada 4h.", status: "Online" },
                   { name: "Verificador de TIE", desc: "Checa validade de embarcação em tempo real.", status: "Online" }
                 ].map((rule, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                      <div>
                         <p className="font-bold text-navy text-sm">{rule.name}</p>
                         <p className="text-xs text-slate-500">{rule.desc}</p>
                      </div>
                      <span className="h-2 w-2 bg-green-500 rounded-full" />
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="flex items-center gap-3 mb-2">
              <Search className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-navy">OCR Inteligente</h2>
           </div>
           <SmartOCR />

           <div className="bg-navy text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                 <h4 className="text-lg font-bold mb-4 uppercase tracking-tighter text-primary">Logs de Automação</h4>
                 <div className="space-y-4 font-mono text-[10px]">
                    <p className="text-slate-400"><span className="text-green-500">[OK]</span> 14:22:01 - Documento PHX-01 validado com sucesso.</p>
                    <p className="text-slate-400"><span className="text-green-500">[OK]</span> 14:15:44 - E-mail enviado para cliente Ricardo.</p>
                    <p className="text-slate-400"><span className="text-blue-500">[INFO]</span> 14:10:00 - Backup concluído (2.4 GB processados).</p>
                    <p className="text-slate-400"><span className="text-amber-500">[WARN]</span> 13:55:12 - Carga alta detectada no serviço de OCR.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
