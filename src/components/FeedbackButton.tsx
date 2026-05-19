import { useState } from 'react';
import { 
  MessageSquare, Bug, Lightbulb, 
  X, Send, CheckCircle2, Activity 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { profile } = useAuth();
  
  const [feedback, setFeedback] = useState({
    type: 'bug' as 'bug' | 'suggestion' | 'ux',
    description: '',
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
        type: feedback.type,
        description: feedback.description,
        context_url: window.location.href,
        status: 'pending'
      });

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFeedback({ type: 'bug', description: '' });
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
      {!profile || window.location.pathname.startsWith('/auth') ? null : (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 left-4 md:left-8 z-[80] bg-navy text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute left-full ml-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl opacity-0 md:group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap">
            Feedback Operacional
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-navy p-8 text-white relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-all"
              >
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Feedback</h3>
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
                    <button 
                      type="button"
                      onClick={() => setFeedback({ ...feedback, type: 'bug' })}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${feedback.type === 'bug' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      <Bug className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase">Bug</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFeedback({ ...feedback, type: 'suggestion' })}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${feedback.type === 'suggestion' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      <Lightbulb className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase">Sugestão</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFeedback({ ...feedback, type: 'ux' })}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${feedback.type === 'ux' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      <Activity className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase">UX/UI</span>
                    </button>
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
