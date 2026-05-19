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
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const { data: insights } = useQuery({
    queryKey: ['operational_insights', processId],
    queryFn: async () => {
      // In a real scenario, this fetches from the new operational_insights table
      const { data } = await supabase
        .from('operational_insights')
        .select('*')
        .eq('is_resolved', false)
        .limit(3);
      
      if (!data || data.length === 0) {
        return [
          { 
            id: '1', 
            type: 'automation', 
            message: 'Este processo pode gerar automaticamente o BCE.', 
            action_label: 'Gerar Documento',
            confidence_score: 0.98 
          },
          { 
            id: '2', 
            type: 'critical', 
            message: 'Existe divergência no número do motor entre os documentos.', 
            action_label: 'Revisar OCR',
            confidence_score: 0.95 
          },
          { 
            id: '3', 
            type: 'suggestion', 
            message: 'Falta apenas uma assinatura para protocolar na Anatel.', 
            action_label: 'Solicitar Assinatura',
            confidence_score: 1.0 
          }
        ] as Insight[];
      }
      return data as Insight[];
    }
  });

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-24 right-8 z-[100] bg-primary text-navy p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group animate-in zoom-in duration-300"
    >
      <Bot className="h-6 w-6" />
      <span className="absolute right-full mr-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
        Assistente Naval IA
      </span>
    </button>
  );

  return (
    <div className={`fixed bottom-24 right-8 z-[100] w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden transition-all duration-500 animate-in slide-in-from-bottom-8 ${isMinimized ? 'h-20' : 'h-auto'}`}>
       <div className="bg-navy p-6 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center relative">
                <Bot className="h-6 w-6 text-primary" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-navy rounded-full" />
             </div>
             <div>
                <h3 className="font-black uppercase tracking-widest text-[10px] text-primary">NavalDocs Assistant</h3>
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
