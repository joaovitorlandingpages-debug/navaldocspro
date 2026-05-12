import { createFileRoute } from "@tanstack/react-router";
import { Terminal, Search, Trash2, ShieldAlert, Activity, Filter, Download, Database, ShieldCheck, Cpu } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const [filter, setFilter] = useState("all");

  const logs = [
    { id: "L-9021", user: "Ricardo Almeida", action: "Geração de Memorial", ip: "192.168.1.45", date: "12/05 14:22:01", status: "Success", details: "Template ID #42" },
    { id: "L-9020", user: "System Master", action: "Backup Automático", ip: "127.0.0.1", date: "12/05 04:00:00", status: "Success", details: "S3 Bucket Sync" },
    { id: "L-9019", user: "Juliana Costa", action: "Login Fallback", ip: "201.24.11.2", date: "12/05 09:12:45", status: "Warning", details: "MFA bypass requested" },
    { id: "L-9018", user: "Unknown", action: "Falha de Autenticação", ip: "45.1.22.90", date: "11/05 23:55:12", status: "Error", details: "Rate limit exceeded" },
    { id: "L-9017", user: "Marcos Silveira", action: "Upload de ART", ip: "189.12.3.4", date: "11/05 18:30:11", status: "Success", details: "File: art_vessel_x.pdf" },
    { id: "L-9016", user: "Admin", action: "Bloqueio de Usuário", ip: "10.0.0.5", date: "11/05 15:45:00", status: "Warning", details: "User ID #4920" },
    { id: "L-9015", user: "System", action: "Database Migration", ip: "localhost", date: "11/05 02:00:00", status: "Success", details: "Schema v2.4.5" },
  ];

  const filteredLogs = filter === "all" ? logs : logs.filter(l => l.status.toLowerCase() === filter);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
              <h2 className="text-2xl font-black tracking-tight text-white">Event Log Console</h2>
            </div>
            <p className="text-slate-500 font-mono text-xs italic">Monitoramento em tempo real de infraestrutura e segurança.</p>
          </div>
          <div className="flex gap-3">
             <button className="bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                <Download className="h-4 w-4" /> Exportar JSON
             </button>
             <button className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                <Trash2 className="h-4 w-4" /> Purge Logs
             </button>
          </div>
       </div>

       <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
             <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center bg-black/40">
                   <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      <button onClick={() => setFilter("all")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Todos</button>
                      <button onClick={() => setFilter("error")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'error' ? 'bg-red-500/20 text-red-500' : 'text-slate-500'}`}>Erros</button>
                      <button onClick={() => setFilter("warning")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'warning' ? 'bg-yellow-500/20 text-yellow-500' : 'text-slate-500'}`}>Alertas</button>
                   </div>
                   <div className="relative flex-grow">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input placeholder="Filtrar por ID, Usuário ou IP..." className="w-full bg-black/40 border-white/5 pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 outline-none focus:ring-1 focus:ring-red-500" />
                   </div>
                </div>

                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                   {filteredLogs.map((log) => (
                     <div key={log.id} className="px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer border-l-2 border-l-transparent hover:border-l-red-500/50">
                        <div className="flex items-center gap-8 font-mono text-[11px]">
                           <span className="text-slate-600 font-bold w-12">{log.id}</span>
                           <span className="text-slate-500 w-24">{log.date}</span>
                           <div className="w-40">
                              <span className="text-slate-200 font-bold block truncate">{log.user}</span>
                              <span className="text-[9px] text-slate-600">{log.ip}</span>
                           </div>
                           <div className="w-64">
                              <span className="text-slate-300 font-medium block">{log.action}</span>
                              <span className="text-[9px] text-slate-600 italic">{log.details}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest ${
                             log.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
                             log.status === 'Error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                           }`}>
                              {log.status.toUpperCase()}
                           </span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                   <Activity className="h-4 w-4 text-red-500" /> System Health
                </h3>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-slate-500">CPU Usage</span>
                         <span className="text-red-400">42%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-red-500 w-[42%] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-slate-500">Memory</span>
                         <span className="text-blue-400">2.1 GB / 8 GB</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 w-[26%] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-slate-500">API Response</span>
                         <span className="text-green-400">45ms</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 w-[15%] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/20 p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform">
                  <ShieldAlert className="h-24 w-24" />
                </div>
                <h3 className="text-xs font-black text-red-400 mb-2 uppercase tracking-[0.2em]">Security Alert</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Detectado 3 tentativas de força bruta nas últimas 24h. Firewall master bloqueou automaticamente.</p>
                <button className="mt-4 text-[10px] font-black uppercase text-white bg-red-500 px-4 py-2 rounded-xl hover:bg-red-600 transition-all">Ver Detalhes</button>
             </div>
          </div>
       </div>
    </div>
  );
}
