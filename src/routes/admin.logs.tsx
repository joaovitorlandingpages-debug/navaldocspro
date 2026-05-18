import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Activity, AlertTriangle, ShieldCheck, 
  Terminal, Search, Filter, Trash2
} from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin_system_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*, companies(name), profiles(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const clearLogs = async () => {
     const { error } = await supabase.from("system_logs").delete().neq('id', '00000000-0000-0000-0000-000000000000');
     if (!error) toast.success("Logs limpos com sucesso");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Logs de Sistema</h1>
          <p className="text-slate-500 font-medium">Monitoramento técnico e auditoria de eventos.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={clearLogs}
             className="bg-white px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold uppercase text-red-500 flex items-center gap-2 hover:bg-red-50 transition-all"
           >
              <Trash2 className="h-4 w-4" /> Limpar Logs
           </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-white/5">
         <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <Terminal className="h-6 w-6 text-primary" />
            <h3 className="text-white font-bold uppercase tracking-widest text-xs">Console de Eventos Real-time</h3>
         </div>

         <div className="space-y-4 font-mono">
            {isLoading ? (
              <div className="text-white/20 text-center py-10">Lendo console de eventos...</div>
            ) : logs?.length === 0 ? (
              <div className="text-white/20 text-center py-10">Nenhum evento registrado.</div>
            ) : (
              logs?.map((log: any) => (
                <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                   <div className="mt-1">
                      {log.event_type === 'error' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : 
                       log.event_type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                       <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                   </div>
                   <div className="flex-grow">
                      <p className="text-slate-300 text-sm">[{log.module.toUpperCase()}] {log.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                         <span className="text-[10px] font-bold text-white/30 uppercase">User: {log.profiles?.name || 'Sistema'}</span>
                         <span className="text-[10px] font-bold text-white/30 uppercase">Empresa: {log.companies?.name || 'Global'}</span>
                         <span className="text-[10px] font-bold text-white/30 uppercase">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                   </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-all">
                      <button className="text-xs text-primary font-bold hover:underline">Auditar</button>
                   </div>
                </div>
              ))
            )}
         </div>

         <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/20">
            <span>Audit Trail v1.0</span>
            <span>Logs mantidos por 30 dias</span>
         </div>
      </div>
    </div>
  );
}
