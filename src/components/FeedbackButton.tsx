import { useState } from 'react';
import {
  MessageSquare, Bug, Lightbulb,
  X, Send, CheckCircle2, Activity, HelpCircle, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { isPilotMode } from '@/lib/pilot-mode';

type FeedbackType = 'bug' | 'suggestion' | 'question' | 'praise' | 'ux' | 'ocr_poor';
type Priority = 'p0' | 'p1' | 'p2' | 'p3';

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug; active: string }[] = [
  { key: 'bug', label: 'Bug', icon: Bug, active: 'bg-red-50 border-red-200 text-red-600' },
  { key: 'suggestion', label: 'Sugestão', icon: Lightbulb, active: 'bg-amber-50 border-amber-200 text-amber-600' },
  { key: 'question', label: 'Dúvida', icon: HelpCircle, active: 'bg-blue-50 border-blue-200 text-blue-600' },
  { key: 'praise', label: 'Elogio', icon: Heart, active: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  { key: 'ux', label: 'UX/UI', icon: Activity, active: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
  { key: 'ocr_poor', label: 'OCR Ruim', icon: Activity, active: 'bg-purple-50 border-purple-200 text-purple-600' },
];

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'p0', label: 'P0 · Crítico' },
  { key: 'p1', label: 'P1 · Alto' },
  { key: 'p2', label: 'P2 · Médio' },
  { key: 'p3', label: 'P3 · Baixo' },
];

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { profile, isAdmin } = useAuth();

  // Durante a RC1 (piloto) todos os participantes podem enviar feedback.
  // Fora do piloto: apenas ambiente DEV ou administradores.
  const isDev = import.meta.env.DEV;
  const shouldShow = isDev || isAdmin || isPilotMode();

  const [feedback, setFeedback] = useState<{ type: FeedbackType; description: string; priority: Priority }>({
    type: 'bug',
    description: '',
    priority: 'p2',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("Você precisa estar logado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('operational_feedback').insert({
        user_id: profile.id,
        company_id: (profile as any).company_id ?? null,
        type: feedback.type,
        priority: feedback.priority,
        description: feedback.description,
        context_url: window.location.href,
        status: 'pending'
      });

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFeedback({ type: 'bug', description: '', priority: 'p2' });
      }, 3000);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {!shouldShow || !profile || window.location.pathname.startsWith('/auth') ? null : (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-40 left-4 md:left-8 z-[80] bg-navy text-white p-4 rounded-full shadow-2xl hover:bg-navy/90 transition-all group lg:mb-0 mb-safe-area-inset-bottom sm:bottom-24"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute left-full ml-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl opacity-0 md:group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap">
            Feedback Operacional
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-transform duration-300 max-h-[90vh] overflow-y-auto">
            <div className="bg-navy p-8 text-white relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-all"
              >
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-2xl font-semibold mb-2">Feedback</h3>
              <p className="text-white/60 text-xs font-medium">Ajude-nos a evoluir o NavalDocs Pro para seu dia a dia.</p>
            </div>

            <div className="p-8">
              {submitted ? (
                <div className="text-center py-10 animate-in zoom-in duration-500">
                  <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-bold text-navy mb-2">Obrigado!</h4>
                  <p className="text-slate-500 text-sm">Seu feedback foi registrado e será analisado por nossa equipe técnica.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {TYPES.map(({ key, label, icon: Icon, active }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFeedback({ ...feedback, type: key })}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${feedback.type === key ? active : 'bg-slate-50 border-transparent text-slate-400'}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase">{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prioridade</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRIORITIES.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFeedback({ ...feedback, priority: key })}
                          className={`py-3 rounded-xl border text-[9px] font-black uppercase transition-all ${feedback.priority === key ? 'bg-navy text-white border-navy' : 'bg-slate-50 border-transparent text-slate-400'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</label>
                    <textarea 
                      required
                      value={feedback.description}
                      onChange={e => setFeedback({ ...feedback, description: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] text-sm resize-none"
                      placeholder="Descreva detalhadamente o que aconteceu ou sua ideia..."
                    />
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-navy text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 shadow-xl"
                  >
                    {isSubmitting ? "Enviando..." : <><Send className="h-5 w-5" /> Enviar Agora</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
