import { useState, useEffect } from 'react';
import { 
  Rocket, CheckCircle2, Circle, 
  ChevronRight, X, PlayCircle 
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function WelcomeTour({ 
  onboardingStep, 
  onClose 
}: { 
  onboardingStep: number;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const steps: Step[] = [
    { id: '1', title: 'Perfil da Empresa', description: 'Configure seus dados básicos.', completed: onboardingStep > 1 },
    { id: '2', title: 'Plano Ativo', description: 'Assinatura configurada.', completed: onboardingStep > 2 },
    { id: '3', title: 'Usuário Master', description: 'Acesso administrativo.', completed: onboardingStep > 3 },
    { id: '4', title: 'Primeiro Cliente', description: 'Cadastre quem você atende.', completed: onboardingStep > 4 },
    { id: '5', title: 'Primeiro Barco', description: 'Vincule uma embarcação.', completed: onboardingStep > 5 },
    { id: '6', title: 'Primeiro Processo', description: 'Inicie uma automação.', completed: onboardingStep > 6 },
    { id: '7', title: 'Gerar Documento', description: 'Finalize sua primeira entrega.', completed: onboardingStep > 7 },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md w-full fixed bottom-8 right-8 z-[100]">
      <div className="bg-navy p-6 text-white relative">
        <button 
          onClick={() => { setIsOpen(false); onClose(); }}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-all"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-bold uppercase tracking-widest text-sm">Guia de Implementação Enterprise</h3>
        </div>
        <p className="text-xs text-white/60 mb-4 font-medium">Siga os passos para ativar sua central operacional v15.0.</p>
        <div className="space-y-2">
           <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-primary">
              <span>Progresso de Setup</span>
              <span>{Math.round(progress)}%</span>
           </div>
           <Progress value={progress} className="h-1.5 bg-white/10" />
        </div>
      </div>

      <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {steps.map((step) => (
          <div key={step.id} className="flex gap-4 items-start group">
            <div className="mt-1">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-200 group-hover:text-primary transition-all" />
              )}
            </div>
            <div className="flex-grow">
              <h4 className={`text-sm font-bold ${step.completed ? 'text-slate-400 line-through' : 'text-navy'}`}>
                {step.title}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">{step.description}</p>
            </div>
            {!step.completed && (
              <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
         <button className="flex items-center gap-2 text-[10px] font-black uppercase text-navy hover:text-primary transition-all">
            <PlayCircle className="h-4 w-4" /> Ver Tutorial
         </button>
         <Button size="sm" className="bg-primary text-[10px] font-black uppercase tracking-widest">
            Próximo Passo
         </Button>
      </div>
    </div>
  );
}
