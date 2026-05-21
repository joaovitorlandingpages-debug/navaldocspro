import { useState, useEffect } from 'react';
import { 
  Rocket, CheckCircle2, Circle, 
  ChevronRight, X, PlayCircle, ArrowRight 
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
    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in duration-700 max-w-[calc(100vw-2rem)] md:max-w-md w-full relative z-[110] ring-1 ring-navy/5">
      <div className="bg-[#000B18] p-10 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-full h-full bg-primary/10 blur-[60px] -mr-40 group-hover:bg-primary/20 transition-all duration-1000" />
        <button 
          onClick={() => { setIsOpen(false); onClose(); }}
          className="absolute top-8 right-8 text-white/40 hover:text-white transition-all z-20 h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/5"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <div className="p-4 bg-primary rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-[0.25em] text-[10px] text-primary mb-1">Onboarding Premium</h3>
            <h2 className="text-2xl font-black italic tracking-tighter leading-none uppercase">Setup Inicial</h2>
          </div>
        </div>
        
        <div className="space-y-4 relative z-10">
           <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
              <span className="text-white/40">Status de Implantação</span>
              <span className="text-primary">{Math.round(progress)}%</span>
           </div>
           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 relative" 
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 right-0 h-full w-8 bg-white/20 blur-sm animate-pulse" />
              </div>
           </div>
        </div>
      </div>

      <div className="p-10 space-y-6 max-h-[450px] overflow-y-auto custom-scrollbar bg-white">
        {steps.map((step) => (
          <div key={step.id} className="flex gap-6 items-start group">
            <div className="mt-1">
              {step.completed ? (
                <div className="h-7 w-7 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm">
                   <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              ) : (
                <div className="h-7 w-7 border-2 border-slate-100 rounded-xl flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                   <Circle className="h-3 w-3 text-slate-200 group-hover:text-primary transition-all" />
                </div>
              )}
            </div>
            <div className="flex-grow">
              <h4 className={`text-[13px] font-black uppercase tracking-tight ${step.completed ? 'text-slate-300' : 'text-navy'}`}>
                {step.title}
              </h4>
              <p className="text-[11px] text-slate-400 font-bold mt-1 leading-relaxed">{step.description}</p>
            </div>
            {!step.completed && (
              <ChevronRight className="h-5 w-5 text-slate-200 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            )}
          </div>
        ))}
      </div>

      <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 justify-between">
         <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-navy/40 hover:text-primary transition-all">
            <PlayCircle className="h-5 w-5" /> Assistir Tutorial
         </button>
         <Button className="w-full sm:w-auto bg-navy text-[11px] font-black uppercase tracking-[0.2em] px-10 py-7 rounded-2xl shadow-xl hover:bg-slate-900 transition-all border border-navy/10 active:scale-95">
            Configurar Agora <ArrowRight className="ml-3 h-4 w-4" />
         </Button>
      </div>
    </div>
  );
}
