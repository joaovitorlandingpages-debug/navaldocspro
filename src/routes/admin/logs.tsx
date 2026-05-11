import { createFileRoute } from "@tanstack/react-router";
import { Terminal, Search, Trash2, ShieldAlert, Activity, Filter, Download } from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const logs = [
    { id: "L-9021", user: "Ricardo Almeida", action: "Geração de Memorial", ip: "192.168.1.45", date: "10/05 14:22:01", status: "Success" },
    { id: "L-9020", user: "System Master", action: "Backup Automático", ip: "127.0.0.1", date: "10/05 04:00:00", status: "Success" },
    { id: "L-9019", user: "Juliana Costa", action: "Login Fallback", ip: "201.24.11.2", date: "10/05 09:12:45", status: "Warning" },
    { id: "L-9018", user: "Unknown", action: "Falha de Autenticação", ip: "45.1.22.90", date: "09/05 23:55:12", status: "Error" },
    { id: "L-9017", user: "Marcos Silveira", action: "Upload de ART", ip: "189.12.3.4", date: "09/05 18:30:11", status: "Success" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Logs do Sistema</h2>
            <p className="text-slate-500 font-mono text-xs">Registro completo de auditoria e segurança.</p>
          </div>
          <div className="flex gap-2">
             <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Download className="h-4 w-4" /> Exportar CSV
             </button>
             <button className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Limpar Antigos
             </button>
          </div>
       </div>

       <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden font-mono text-xs">
          <div className="p-4 border-b border-white/10 flex gap-4 bg-black/40">
             <div className="flex items-center gap-2 text-red-500 mr-4">
                <Activity className="h-4 w-4" />
                <span className="font-black">LIVE STREAM</span>
             </div>
             <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input placeholder="Filtrar logs (ex: 'error', 'ricardo', '192.')..." className="w-full bg-black/20 border-white/10 pl-10 pr-4 py-2 rounded-lg outline-none focus:ring-1 focus:ring-red-500" />
             </div>
          </div>

          <div className="divide-y divide-white/5">
             {logs.map((log, i) => (
               <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-8">
                     <span className="text-slate-600 font-bold w-12">{log.id}</span>
                     <span className="text-slate-400 w-28">{log.date}</span>
                     <div className="w-48">
                        <span className="text-slate-200 font-bold block">{log.user}</span>
                        <span className="text-[10px] text-slate-500">{log.ip}</span>
                     </div>
                     <span className="text-slate-300 w-64">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className={`px-2 py-0.5 rounded-[4px] font-black tracking-tighter ${
                       log.status === 'Success' ? 'bg-green-500/20 text-green-500' : 
                       log.status === 'Error' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-yellow-500/20 text-yellow-500'
                     }`}>
                        {log.status.toUpperCase()}
                     </span>
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}
