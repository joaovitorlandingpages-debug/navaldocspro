import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, MessageSquare, TrendingUp } from "lucide-react";

export function ImprovementsPanel() {
  const { data: backlog, isLoading } = useQuery({
    queryKey: ["admin-backlog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_backlog")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-navy">Ciclo de Melhorias</h2>
        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">Evolução Enterprise</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
             <CardTitle className="text-sm font-black text-navy uppercase flex items-center gap-2">
               <TrendingUp className="h-4 w-4 text-primary" /> Backlog de Melhorias
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
             {isLoading ? (
               <div className="p-6 space-y-4">
                 {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />)}
               </div>
             ) : backlog?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma melhoria pendente</p>
                </div>
             ) : (
                backlog?.map((item: any) => (
                  <div key={item.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-black text-navy uppercase">{item.title}</span>
                      <Badge className={`text-[8px] font-black uppercase ${
                        item.priority === 'critical' ? 'bg-red-500' : 
                        item.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                      } text-white border-none`}>{item.priority}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
                  </div>
                ))
             )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
             <CardTitle className="text-sm font-black text-navy uppercase flex items-center gap-2">
               <MessageSquare className="h-4 w-4 text-primary" /> Feedback de Clientes
             </CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex items-center justify-center min-h-[300px]">
             <div className="text-center opacity-40">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aguardando novos feedbacks consolidados</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
