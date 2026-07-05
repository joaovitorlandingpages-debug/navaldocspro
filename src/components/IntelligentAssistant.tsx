import { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  Zap, 
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Insight {
  id: string;
  type: 'automation' | 'critical' | 'bottleneck' | 'suggestion' | 'error_prevention';
  message: string;
  action_label?: string;
  action_url?: string;
  confidence_score: number;
}

export function IntelligentAssistant({ processId }: { processId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['auth-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    }
  });

  const isAuthPage = typeof window !== 'undefined' && (window.location.pathname.startsWith('/auth') || window.location.pathname === '/');

  // Onda 3B.3 — só consulta insights quando o painel está aberto e visível.
  // Antes: refetch a cada 30s em toda página (root-mounted). Agora: enabled
  // apenas quando painel aberto + não minimizado, polling a cada 5min.
  const { data: insights, refetch } = useQuery({
    queryKey: ['operational_insights', processId, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('operational_insights')
        .select('*')
        .eq('is_resolved', false)
        .order('confidence_score', { ascending: false });
      
      if (processId) {
        query = query.eq('process_id', processId);
      } else {
        query = query.eq('company_id', profile?.company_id);
      }
      
      const { data, error } = await query.limit(5);
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [
          { 
            id: 'welcome', 
            type: 'suggestion', 
            message: `Olá, ${profile?.full_name?.split(' ')[0]}! Eu sou sua IA Operacional. Estou analisando seus processos em tempo real.`, 
            confidence_score: 1.0 
          }
        ] as Insight[];
      }
      return data as Insight[];
    },
    enabled: isOpen && !isMinimized && !!profile?.company_id && !isAuthPage,
    refetchInterval: isOpen && !isMinimized ? 5 * 60_000 : false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-24 right-4 md:right-8 z-[80] bg-primary text-navy p-4 rounded-full shadow-2xl hover:bg-primary/90 transition-all group lg:mb-0 mb-safe-area-inset-bottom"
    >
      <Bot className="h-6 w-6" />
      <span className="absolute right-full mr-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl opacity-0 md:group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">
        Assistente Naval IA
      </span>
    </button>
  );

  if (!profile || isAuthPage) return null;


  return (
    <div className={`fixed bottom-8 right-4 md:bottom-24 md:right-8 z-[80] w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 mb-safe-area-inset-bottom lg:mb-0 ${isMinimized ? 'h-20' : 'h-auto max-h-[80vh] md:max-h-none'}`}>
       <div className="bg-navy p-6 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center relative">
                <Bot className="h-6 w-6 text-primary" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-navy rounded-full" />
             </div>
             <div>
                <h3 className="font-semibold text-[10px] text-primary">NavalDocs Assistant</h3>
                <h2 className="text-lg font-bold leading-none">Inteligência Operacional</h2>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setIsMinimized(!isMinimized)}
               className="text-white/40 hover:text-white transition-all p-2"
             >
                {isMinimized ? <ChevronRight className="h-5 w-5 rotate-90" /> : <ChevronRight className="h-5 w-5 -rotate-90" />}
             </button>
             <button 
               onClick={() => setIsOpen(false)}
               className="text-white/40 hover:text-white transition-all p-2"
             >
                <X className="h-5 w-5" />
             </button>
          </div>
       </div>

       {!isMinimized && (
         <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {insights?.map((insight) => (
               <div key={insight.id} className="group relative p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg hover:border-primary/20 border border-transparent transition-all duration-300">
                  <div className="flex items-start gap-3">
                     <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                       insight.type === 'critical' ? 'bg-rose-100 text-rose-600' : 
                       insight.type === 'automation' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
                     }`}>
                        {insight.type === 'critical' ? <AlertTriangle className="h-3 w-3" /> : 
                         insight.type === 'automation' ? <Zap className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                     </div>
                     <div className="space-y-2">
                        <p className="text-xs font-bold text-navy leading-relaxed">{insight.message}</p>
                        {insight.action_label && (
                           <button className="flex items-center gap-2 text-[9px] font-black uppercase text-primary hover:underline group/btn">
                              {insight.action_label} <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100 mt-2">
               <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                  <span>Análise de Contexto</span>
                  <span className="text-emerald-500 flex items-center gap-1">
                     <div className="h-1 w-1 bg-emerald-500 rounded-full" /> Ativo
                  </span>
               </div>
            </div>
         </div>
       )}

       <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-navy transition-all">
             <MessageSquare className="h-4 w-4" /> Perguntar IA
          </button>
          <Badge className="bg-white border-slate-200 text-slate-400 font-bold uppercase text-[8px] tracking-widest">v15.0 Neural</Badge>
       </div>
    </div>
  );
}
