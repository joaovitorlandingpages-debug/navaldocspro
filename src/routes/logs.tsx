import { createFileRoute } from "@tanstack/react-router";
import { Terminal, Search, Download, ShieldCheck, Zap, Lock, Activity, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});

function LogsPage() {
  useEffect(() => {
    console.log("LOGS_PAGE_OK");
  }, []);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["app-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, company:companies(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-navy rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                 <History className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-navy uppercase">Logs de Atividade</h2>
            </div>
            <p className="text-slate-500 font-medium text-sm">Registro histórico de todas as operações e acessos no NavalDocs Pro.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button className="bg-white border border-slate-200 text-navy px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <Download className="h-4 w-4" /> Exportar Relatório
             </button>
          </div>
       </div>

       <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12">
             <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                   <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-navy">Fluxo de Eventos (Live)</h3>
                   </div>
                   <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input placeholder="Buscar log..." className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                   </div>
                </div>

                <div className="divide-y divide-slate-50 max-h-[800px] overflow-y-auto custom-scrollbar">
                   {isLoading ? (
                      <div className="p-12 text-center text-slate-400 italic">Sincronizando logs...</div>
                   ) : logs?.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">Nenhum log registrado ainda.</div>
                   ) : logs?.map((log: any) => (
                      <div key={log.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
                         <div className="flex items-center gap-6">
                            <div className="shrink-0 text-slate-300 font-mono text-[9px] font-bold w-16">
                               {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="w-48">
                               <span className="text-[11px] font-black text-navy block truncate uppercase tracking-tight">{log.company?.name || 'Sistema'}</span>
                               <Badge variant="outline" className="text-[8px] font-black tracking-tighter border-slate-100 px-1.5 h-4 uppercase">{log.module || 'General'}</Badge>
                            </div>
                            <div className="flex-grow">
                               <p className="text-[11px] font-bold text-slate-600 leading-tight">{log.action}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(log.created_at).toLocaleDateString()}</span>
                         </div>
                      </div>
                   ))}
                </div>
             </Card>
          </div>
       </div>
    </div>
  );
}
