import { useState } from "react";
import { HelpCircle, ChevronRight, CheckCircle2, FileText, Signature, FolderPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationalGuide() {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, title: "Selecionar processo", icon: FileText },
    { id: 2, title: "Anexar documentos", icon: FolderPlus },
    { id: 3, title: "Gerar documentos", icon: FileText },
    { id: 4, title: "Assinar", icon: Signature },
    { id: 5, title: "Gerar dossiê", icon: CheckCircle2 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 animate-in fade-in">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-navy">Guia Rápido: Como operar um processo</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStep >= step.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              <step.icon className="h-3 w-3" />
              <span>PASSO {step.id}</span>
            </div>
            {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}
