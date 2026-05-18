import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, AlertTriangle, ShieldCheck, 
  Terminal, Search, Filter, Trash2
} from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const logs = [
    { id: 1, type: 'info', msg: 'Novo template DOCX processado com sucesso', user: 'Ricardo Eng.', time: '2 min atrás' },
    { id: 2, type: 'error', msg: 'Falha na conexão com Mercado Pago API', user: 'Sistema', time: '15 min atrás' },
    { id: 3, type: 'warning', msg: 'Limite de OCR atingido pela Empresa Naval X', user: 'Automation', time: '1h atrás' },
    { id: 4, type: 'info', msg: 'Upload de logo concluído', user: 'Ana Marina', time: '3h atrás' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Logs de Sistema</h1>
          <p className="text-slate-500 font-medium">Monitoramento técnico e auditoria de eventos.</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-white px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold uppercase text-red-500 flex items-center gap-2 hover:bg-red-50 transition-all">
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
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                 <div className="mt-1">
                    {log.type === 'error' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : 
                     log.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                     <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                 </div>
                 <div className="flex-grow">
                    <p className="text-slate-300 text-sm">{log.msg}</p>
                    <div className="flex items-center gap-4 mt-2">
                       <span className="text-[10px] font-bold text-white/30 uppercase">User: {log.user}</span>
                       <span className="text-[10px] font-bold text-white/30 uppercase">{log.time}</span>
                    </div>
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-all">
                    <button className="text-xs text-primary font-bold hover:underline">Auditar</button>
                 </div>
              </div>
            ))}
         </div>

         <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/20">
            <span>Audit Trail v1.0</span>
            <span>Logs mantidos por 30 dias</span>
         </div>
      </div>
    </div>
  );
}
