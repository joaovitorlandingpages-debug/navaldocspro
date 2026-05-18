import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  HelpCircle, MessageCircle, Bug, Lightbulb, 
  Search, ExternalLink, ChevronRight, Send 
} from "lucide-react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
});

function SupportPage() {
  const { profile } = useAuth();
  const [ticket, setTicket] = useState({ title: "", description: "", type: "support" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        user_id: profile.id,
        company_id: profile.company_id,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type
      });

      if (error) throw error;
      toast.success("Feedback enviado com sucesso!");
      setTicket({ title: "", description: "", type: "support" });
    } catch (error) {
      toast.error("Erro ao enviar feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    { q: "Como configurar meu primeiro template?", a: "Vá em Biblioteca -> Novo Template e suba seu DOCX ou PDF." },
    { q: "Quais os formatos aceitos no OCR?", a: "PDF, PNG, JPG e JPEG de alta resolução." },
    { q: "Como alterar meu plano?", a: "Acesse Ajustes -> Assinatura e escolha seu novo plano." }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-black text-navy uppercase tracking-tight">Central de Suporte</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">Estamos aqui para ajudar você a automatizar sua engenharia naval com eficiência máxima.</p>
        <div className="relative max-w-xl mx-auto mt-8">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
           <input 
             placeholder="Pesquisar documentação ou FAQ..." 
             className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
           />
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" /> Enviar Mensagem
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setTicket({...ticket, type: 'support'})}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${ticket.type === 'support' ? 'bg-primary/5 border-primary text-primary' : 'bg-slate-50 border-transparent text-slate-400'}`}
                  >
                     <HelpCircle className="h-6 w-6" />
                     <span className="text-xs font-bold uppercase">Suporte</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTicket({...ticket, type: 'bug'})}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${ticket.type === 'bug' ? 'bg-red-50/5 border-red-500 text-red-500' : 'bg-slate-50 border-transparent text-slate-400'}`}
                  >
                     <Bug className="h-6 w-6" />
                     <span className="text-xs font-bold uppercase">Reportar Bug</span>
                  </button>
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Assunto</label>
                  <input 
                    required
                    value={ticket.title}
                    onChange={e => setTicket({...ticket, title: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/10"
                    placeholder="Título curto do seu problema ou sugestão..."
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Descrição Detalhada</label>
                  <textarea 
                    required
                    rows={5}
                    value={ticket.description}
                    onChange={e => setTicket({...ticket, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                    placeholder="Explique o que aconteceu ou como podemos melhorar..."
                  />
               </div>

               <button 
                 disabled={isSubmitting}
                 className="w-full bg-navy text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
               >
                 {isSubmitting ? "Enviando..." : <><Send className="h-5 w-5" /> Enviar Ticket</>}
               </button>
            </form>
          </section>

          <section className="space-y-4">
             <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" /> FAQ Sugerido
             </h2>
             <div className="grid gap-3">
                {faqs.map((f, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 group cursor-pointer hover:border-primary/20 transition-all">
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-navy">{f.q}</h4>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all" />
                     </div>
                     <p className="text-sm text-slate-500">{f.a}</p>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <div className="space-y-8">
           <div className="bg-gradient-to-br from-navy to-slate-800 p-8 rounded-[2rem] text-white shadow-xl">
              <h3 className="text-xl font-bold mb-4">Documentação Pro</h3>
              <p className="text-white/70 text-sm mb-6">Acesse o manual completo e tutoriais em vídeo para dominar todas as ferramentas.</p>
              <button className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                 Ver Documentação <ExternalLink className="h-4 w-4" />
              </button>
           </div>

           <div className="bg-slate-100 p-8 rounded-[2rem]">
              <h3 className="text-navy font-bold mb-4">Comunidade & Status</h3>
              <div className="space-y-4">
                 <Link to="/status" className="flex items-center justify-between text-sm font-bold text-slate-600 hover:text-primary transition-all">
                    Status do Sistema <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                 </Link>
                 <div className="h-px bg-slate-200" />
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Tempo médio de resposta: 2h</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
