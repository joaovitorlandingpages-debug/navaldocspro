import React, { useState, useEffect } from 'react';
import { useWizardStore } from './Wizard2Store';
import { 
  StepClient, 
  StepVessel, 
  StepType, 
  StepChecklist, 
  StepDocuments, 
  StepReview 
} from './Wizard2Steps';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Rocket, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  User,
  Ship,
  ListChecks,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { confirmProcessVisible, notifyProcessesChanged } from '@/services/processes/processCreation';
import { materializeProcessBlueprint } from '@/services/processes/blueprintEngine';

const STEPS = [
  { id: 'documents', label: 'Docs', icon: FileText },
  { id: 'client', label: 'Cliente', icon: User },
  { id: 'vessel', label: 'Embarcação', icon: Ship },
  { id: 'type', label: 'Tipo', icon: Sparkles },
  { id: 'checklist', label: 'Checklist', icon: ListChecks },
  { id: 'review', label: 'Revisão', icon: CheckCircle2 },
];


export function ProcessWizard2({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { step, setStep, reset, companyId, setData, ...state } = useWizardStore();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.company_id && profile.company_id !== companyId) {
      setData({ companyId: profile.company_id });
    }
  }, [profile, companyId]);

  const currentIndex = STEPS.findIndex(s => s.id === step);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 'client') return !!state.customerId;
    if (step === 'vessel') return !!state.vesselId;
    if (step === 'type') return !!state.processTypeId;
    if (step === 'checklist') return state.docPicks.length > 0;
    return true;
  };

  const handleNext = () => {
    const nextStep = STEPS[currentIndex + 1]?.id as any;
    if (nextStep) setStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = STEPS[currentIndex - 1]?.id as any;
    if (prevStep) setStep(prevStep);
  };

  const handleFinish = async () => {
    if (!profile?.company_id || !state.customerId || !state.processTypeName) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('processes')
        .insert({
          company_id: profile.company_id,
          process_type: state.processTypeName,
          process_type_id: state.processTypeId,
          customer_id: state.customerId,
          vessel_id: state.vesselId,
          title: state.title || state.processTypeName,
          priority: state.priority,
          status: 'pending',
          branding_mode: state.brandingMode,
        } as any)
        .select('id').single();

      if (error) throw error;
      const processId = data.id;

      // Materialize documents
      try {
        await materializeProcessBlueprint(processId, {
          extraTemplateIds: state.docPicks,
        });
      } catch (e) {
        console.warn("Blueprint materialization failed, but process was created", e);
      }

      // Confirm visibility and notify
      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      notifyProcessesChanged(visibleProcess);

      toast.success("Processo criado com sucesso!", {
        description: "Abrindo o painel completo...",
        icon: <Rocket className="h-4 w-4 text-emerald-500" />
      });
      
      reset();
      onClose();
      
      // Animação discreta simulada pelo tempo de redirecionamento
      setTimeout(() => {
        navigate({ to: '/processes/$id', params: { id: processId } });
      }, 300);
    } catch (e: any) {
      toast.error("Erro ao criar processo: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-slate-200 shadow-2xl">
        {/* Modern Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 z-50">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
            style={{ width: `${progress}%` }}
          />
        </div>

        <DialogHeader className="p-6 pb-2 border-b border-slate-50 relative pt-8">
           <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  WIZARD <span className="text-primary">2.0</span>
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-2">
                   Zero Friction Experience <div className="h-1 w-1 rounded-full bg-slate-300" /> <span className="text-primary">Sprint UX 2.5</span>
                </DialogDescription>
              </div>
              
              {/* Step Indicators (Desktop) */}
              <div className="hidden sm:flex items-center gap-2">
                {STEPS.map((s, idx) => {
                  const Icon = s.icon;
                  const active = idx <= currentIndex;
                  return (
                    <div 
                      key={s.id}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        active ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                      }`}
                      title={s.label}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  );
                })}
              </div>
           </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          {step === 'client' && <StepClient />}
          {step === 'vessel' && <StepVessel />}
          {step === 'type' && <StepType />}
          {step === 'checklist' && <StepChecklist />}
          {step === 'documents' && <StepDocuments />}
          {step === 'review' && <StepReview />}
        </div>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentIndex === 0 || submitting}
            className="rounded-xl font-bold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl font-bold border-slate-200"
            >
              Cancelar
            </Button>
            
            {step === 'review' ? (
              <Button
                onClick={handleFinish}
                disabled={submitting}
                className="rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Criar Processo
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canNext() || submitting}
                className="rounded-xl font-black uppercase tracking-widest px-8"
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
