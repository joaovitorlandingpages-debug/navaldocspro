import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Brain, 
  Send, 
  History, 
  Lightbulb, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function Workspace3Right({ suggestions = [], process }: any) {
  return (
    <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-700">
      {/* Enterprise Copilot Sidebar */}
      <Card className="flex-1 flex flex-col border-slate-200 overflow-hidden shadow-xl bg-slate-50/20 backdrop-blur-xl">
        <div className="p-5 border-b bg-white/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Assistente IA</h3>
               <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Online & Sincronizado</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400">V5.6</Badge>
        </div>

        <ScrollArea className="flex-1 p-5">
           <div className="space-y-6">
              {/* Resumo Inteligente */}
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-amber-500" />
                    Resumo Inteligente
                 </p>
                 <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm italic text-[11px] text-slate-600 leading-relaxed">
                    "O processo está em fase de conformidade. Identifiquei que falta o documento de vistoria técnica para avançar para a emissão do PDF final. Recomendo solicitar a assinatura do cliente no Requerimento DPC."
                 </div>
              </div>

              {/* Sugestões Rápidas */}
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sugestões de Ação</p>
                 <div className="space-y-2">
                    {suggestions.slice(0, 3).map((s: any) => (
                      <button key={s.id} className="w-full text-left p-3 bg-white border border-slate-100 rounded-xl hover:border-primary/30 hover:shadow-md transition-all group">
                         <div className="flex items-start justify-between">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight pr-4">{s.title}</p>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary" />
                         </div>
                      </button>
                    ))}
                 </div>
              </div>

              {/* Últimas Ações / Pendências */}
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                    Pendências Críticas
                 </p>
                 <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                       <Clock className="h-4 w-4 text-rose-500" />
                       <span className="text-[10px] font-bold text-rose-900 uppercase">Assinatura Expirando (24h)</span>
                    </div>
                 </div>
              </div>

              {/* Conversation History (Mini) */}
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="h-3 w-3" />
                    Últimas Consultas
                 </p>
                 <div className="space-y-2 opacity-60 grayscale scale-95 origin-top">
                    <div className="flex items-start gap-2 max-w-[80%]">
                       <div className="h-6 w-6 rounded-lg bg-slate-200 flex-shrink-0" />
                       <div className="p-2 bg-slate-100 rounded-lg text-[9px]">Como está o OCR deste processo?</div>
                    </div>
                 </div>
              </div>
           </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white border-t">
           <div className="relative">
              <Input 
                placeholder="Pergunte ao Copilot..." 
                className="pr-10 h-10 bg-slate-50 border-slate-200 text-xs font-bold uppercase tracking-widest rounded-xl"
              />
              <button className="absolute right-3 top-2.5 h-5 w-5 text-primary hover:scale-110 transition-transform">
                 <Send className="h-4 w-4" />
              </button>
           </div>
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 text-center">
              Pressione Enter para enviar
           </p>
        </div>
      </Card>
    </div>
  );
}
