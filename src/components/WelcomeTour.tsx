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
    { id: '1', title: 'Perfil da Empresa', description: 'Configure seus dados básicos.', completed: onboardingStep >= 1 },
    { id: '2', title: 'Primeiro Cliente', description: 'Cadastre quem você atende.', completed: onboardingStep >= 4 },
    { id: '3', title: 'Primeira Embarcação', description: 'Vincule uma embarcação.', completed: onboardingStep >= 5 },
    { id: '4', title: 'Criar Processo', description: 'Inicie uma automação.', completed: onboardingStep >= 6 },
    { id: '5', title: 'Enviar Documento', description: 'Upload para análise.', completed: onboardingStep >= 7 },
    { id: '6', title: 'Executar OCR', description: 'Extração automática de dados.', completed: false },
    { id: '7', title: 'Gerar Documento', description: 'Finalize sua primeira entrega.', completed: false },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-md w-full fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[90] ring-1 ring-navy/5">
      <div className="bg-navy p-8 text-white relative overflow-hidden group">
        <Rocket className="absolute -right-8 -top-8 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-700" />
        <button 
          onClick={() => { setIsOpen(false); onClose(); }}
          className="absolute top-6 right-6 text-white/40 hover:text-white transition-all z-10"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="p-3 bg-primary/20 rounded-2xl">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest text-xs text-primary">Onboarding Premium</h3>
            <h2 className="text-xl font-bold leading-tight">Configuração Inicial</h2>
          </div>
        </div>
        <div className="space-y-3 relative z-10">
           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
              <span>Status de Implantação</span>
              <span className="text-primary">{Math.round(progress)}%</span>
           </div>
           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${progress}%` }}
              />
           </div>
        </div>
      </div>

      <div className="p-8 space-y-5 max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
        {steps.map((step) => (
          <div key={step.id} className="flex gap-5 items-start group">
            <div className="mt-1">
              {step.completed ? (
                <div className="h-6 w-6 bg-emerald-50 rounded-lg flex items-center justify-center">
                   <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              ) : (
                <div className="h-6 w-6 border-2 border-slate-100 rounded-lg flex items-center justify-center group-hover:border-primary/40 transition-all">
                   <Circle className="h-3 w-3 text-slate-200 group-hover:text-primary transition-all" />
                </div>
              )}
            </div>
            <div className="flex-grow">
              <h4 className={`text-sm font-bold tracking-tight ${step.completed ? 'text-slate-300' : 'text-navy'}`}>
                {step.title}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{step.description}</p>
            </div>
            {!step.completed && (
              <ChevronRight className="h-4 w-4 text-slate-200 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </div>
        ))}
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
         <button className="flex items-center gap-2 text-[10px] font-black uppercase text-navy hover:text-primary transition-all">
            <PlayCircle className="h-5 w-5" /> Ver Vídeo Tutorial
         </button>
         <Button className="bg-navy text-[10px] font-black uppercase tracking-widest px-6 py-5 rounded-2xl shadow-xl hover:opacity-90 transition-all">
            Próximo Passo
         </Button>
      </div>
    </div>
  );
}
