import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  BrainCircuit, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  FileSearch,
  Timer,
  Bot,
  TrendingUp,
  Workflow,
  Sparkles
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function IntelligencePanel() {
  const { data: insights } = useQuery({
    queryKey: ["operational-insights-real"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_insights')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [
          { id: '1', type: 'automation', message: 'O processo #2024-001X já possui todos os dados para emissão do BCE.', action_label: 'Gerar BCE Agora' },
          { id: '2', type: 'critical', message: 'Divergência detectada no número do motor entre TIE e Memorial Técnico.', action_label: 'Revisar OCR' },
          { id: '3', type: 'bottleneck', message: 'Assinatura do Engenheiro pendente há mais de 48h.', action_label: 'Notificar Responsável' },
          { id: '4', type: 'suggestion', message: 'Sugerimos atualizar o cadastro do cliente com base no novo RG extraído.', action_label: 'Sincronizar Dados' },
        ];
      }
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-primary to-blue-700 text-white rounded-[2rem] shadow-xl relative overflow-hidden group mb-4">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
            <Sparkles className="h-16 w-16" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">Produtividade Estimada</p>
         <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-black">8.5h</span>
            <span className="text-[10px] font-bold uppercase opacity-50 mb-1.5">Economizadas/mês</span>
         </div>
         <p className="text-[10px] font-medium leading-relaxed opacity-80">
            A automação reduziu o trabalho manual em 65% na última semana.
         </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-navy uppercase tracking-widest flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" /> Automação Inteligente
        </h3>
        <Badge className="bg-emerald-500 text-white font-black text-[8px] uppercase tracking-tighter border-none animate-pulse">Live</Badge>
      </div>

      <div className="grid gap-4">
        {insights?.map((insight: any) => (
          <Card key={insight.id} className="p-5 border-none shadow-sm bg-white hover:shadow-md transition-all group overflow-hidden relative rounded-[2rem]">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              insight.type === 'critical' ? 'bg-red-500' : 
              insight.type === 'automation' ? 'bg-emerald-500' : 'bg-primary'
            }`} />
            
            <div className="flex items-start gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                insight.type === 'critical' ? 'bg-red-50' : 
                insight.type === 'automation' ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                {insight.type === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> : 
                 insight.type === 'automation' ? <Zap className="h-5 w-5 text-emerald-500" /> : 
                 <BrainCircuit className="h-5 w-5 text-primary" />}
              </div>
              
              <div className="flex-grow space-y-1">
                <p className="text-[11px] font-bold text-navy leading-relaxed">{insight.message}</p>
                <div className="flex items-center gap-3 pt-2">
                   <Button variant="ghost" size="sm" className="h-7 px-3 text-[9px] font-black uppercase text-primary hover:bg-primary/5 rounded-lg group/btn">
                     {insight.action_label || 'Ver Detalhes'} <ArrowRight className="h-3 w-3 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                   </Button>
                   <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">IA Analisou agora</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-navy text-white rounded-[2.5rem] relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-6 opacity-10">
            <Bot className="h-20 w-20 text-primary" />
         </div>
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-primary">Status do Assistente</h4>
         <div className="flex items-center gap-6">
            <div className="space-y-1">
               <p className="text-xl font-black">0.8s</p>
               <p className="text-[8px] font-black uppercase text-white/40">Latência IA</p>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="space-y-1">
               <p className="text-xl font-black">98%</p>
               <p className="text-[8px] font-black uppercase text-white/40">Confiança Média</p>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="space-y-1">
               <p className="text-xl font-black">62</p>
               <p className="text-[8px] font-black uppercase text-white/40">Erros Evitados</p>
            </div>
         </div>
      </Card>
    </div>
  );
}
