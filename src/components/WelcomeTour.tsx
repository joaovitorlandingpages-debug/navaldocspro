import { useState, useEffect } from 'react';
import { 
  Rocket, CheckCircle2, Circle, 
  ChevronRight, X, PlayCircle, ArrowRight,
  Clock, AlertCircle, ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  status?: 'pending' | 'loading' | 'completed' | 'waiting';
}

export function WelcomeTour({ 
  onboardingStep, 
  onClose 
}: { 
  onboardingStep: number;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const { profile } = useAuth();
  const [dossierStatus, setDossierStatus] = useState<'pending' | 'completed' | 'waiting'>('waiting');
  const [readinessStatus, setReadinessStatus] = useState<'pending' | 'completed' | 'waiting'>('waiting');
  const [isLoading, setIsLoading] = useState(true);

  const isAdminMaster = profile?.role === 'admin_master' || profile?.role === 'admin_master_global';

  useEffect(() => {
    // Only log if admin
    if (isAdminMaster) {
      console.log("ENTERPRISE_CHECKLIST_AUDIT_START");
    }
    
    async function checkEnterpriseSteps() {
      if (!profile?.company_id) return;
      
      try {
        const { data: dossierData } = await supabase
          .from('process_dossiers')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('status', 'generated')
          .limit(1);

        const { data: docs } = await supabase
          .from('documents')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('document_role', 'gerado')
          .limit(1);
        
        if ((docs && docs.length > 0) || (dossierData && dossierData.length > 0)) {
          setDossierStatus('completed');
        } else {
          setDossierStatus('waiting');
        }

        const { data: scores } = await supabase
          .from('system_readiness_scores')
          .select('score');
        
        const avg = scores && scores.length > 0 
          ? scores.reduce((acc: number, curr: any) => acc + curr.score, 0) / scores.length 
          : 0;
        
        if (avg > 80) {
          setReadinessStatus('completed');
        } else {
          setReadinessStatus('waiting');
        }
      } catch (error) {
        console.error("Error auditing enterprise steps:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkEnterpriseSteps();

    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [profile?.company_id, isAdminMaster]);

  const steps: Step[] = [
    { id: '1', title: 'Perfil da Empresa', description: 'Configure os dados básicos da sua organização.', completed: onboardingStep >= 1 },
    { id: '2', title: 'Portal do Cliente', description: 'Ative sua área externa para clientes.', completed: onboardingStep >= 4 },
    { id: '3', title: 'Gestão de Frotas', description: 'Cadastre suas embarcações para gestão.', completed: onboardingStep >= 5 },
    { id: '4', title: 'Automação IA', description: 'Experimente a extração inteligente de dados.', completed: onboardingStep >= 6 },
    { id: '5', title: 'Fluxos de Trabalho', description: 'Organize seus processos operacionais.', completed: onboardingStep >= 7 },
  ];

  if (!isOpen) {
    return null;
  }



  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  const handleFinish = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in duration-700 max-w-[calc(100vw-2rem)] md:max-w-xl w-full relative z-[110] ring-1 ring-navy/5 flex flex-col max-h-[90vh]">
      <div className="bg-[#000B18] p-10 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-full h-full bg-primary/10 blur-[60px] -mr-40 group-hover:bg-primary/20 transition-all duration-1000" />
        <button 
          onClick={handleFinish}
          className="absolute top-8 right-8 text-white/40 hover:text-white transition-all z-20 h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/5"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <div className="p-4 bg-primary rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-[0.25em] text-[10px] text-primary mb-1">Configuração</h3>
            <h2 className="text-2xl font-black italic tracking-tighter leading-none uppercase">NavalDocs Pro</h2>
          </div>
        </div>
        
        <div className="space-y-4 relative z-10">
           <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
              <span className="text-white/40">Guia de Início</span>
              <span className="text-primary">Ativo</span>
           </div>
        </div>
      </div>

      <div className="p-8 md:p-10 space-y-6 overflow-y-auto custom-scrollbar bg-white flex-grow">
        <div className="text-center py-4">
           <p className="text-sm text-slate-500 font-medium">Explore as funcionalidades principais da plataforma para otimizar sua gestão naval.</p>
        </div>
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
              <p className="text-[11px] text-slate-400 font-bold mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>


      <div className="p-8 md:p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 justify-between shrink-0">
         <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-navy/40 hover:text-primary transition-all">
            <PlayCircle className="h-5 w-5" /> Assistir Tutorial
         </button>
         <Button 
           onClick={handleFinish}
           className="w-full sm:w-auto bg-navy text-[11px] font-black uppercase tracking-[0.2em] px-10 py-7 rounded-2xl shadow-xl hover:bg-slate-900 transition-all border border-navy/10 active:scale-95"
         >
            Começar Agora <ArrowRight className="ml-3 h-4 w-4" />
         </Button>
      </div>
    </div>
  );
}
