import { createFileRoute, Link } from "@tanstack/react-router";
import { Terminal, Search, Trash2, ShieldAlert, Activity, Filter, Download, Database, ShieldCheck, Cpu, Zap, Globe, Lock, Bug } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});


function AdminLogs() {
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    console.log("GLOBAL_LOGS_STABLE");
  }, []);

  const { data: globalLogs, isLoading: loadingGlobal } = useQuery({
    queryKey: ["admin-global-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_audit_logs")
        .select("*, profile:profiles(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: activityLogs, isLoading: loadingActivity } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, company:companies(name)")
        .order("created_at", { ascending: false })
        .limit(50);
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
                 <Terminal className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-semibold text-navy">Audit Console Global</h2>
            </div>
            <p className="text-slate-500 font-medium text-sm">Monitoramento de integridade, acessos e ações administrativas em tempo real.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button className="bg-white border border-slate-200 text-navy px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <Download className="h-4 w-4" /> Exportar CSV
             </button>
              <Link 
                to="/admin/frontend-errors"
                className="bg-white border border-slate-200 text-red-500 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-50 transition-all shadow-sm"
              >
                <Bug className="h-4 w-4" /> Frontend Errors
              </Link>
              <button className="bg-navy text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg">
                <ShieldCheck className="h-4 w-4 text-primary" /> Security Scan
              </button>

          </div>
       </div>

       <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
             <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                   <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold text-navy">Fluxo de Eventos Recentes</h3>
                   </div>
                   <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input placeholder="Filtrar eventos..." className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                   </div>
                </div>

                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                   {loadingActivity ? (
                      <div className="p-12 text-center text-slate-400 italic">Carregando telemetria...</div>
                   ) : activityLogs?.map((log: any) => (
                     <div key={log.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
                        <div className="flex items-center gap-6">
                           <div className="shrink-0 text-slate-300 font-mono text-[9px] font-bold w-16">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </div>
                           <div className="w-48">
                              <span className="text-[11px] font-black text-navy block truncate uppercase tracking-tight">{log.company?.name || 'Sistema'}</span>
                              <Badge variant="outline" className="text-[8px] font-black tracking-tighter border-slate-100 px-1.5 h-4 uppercase">{log.module}</Badge>
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

             <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-50 bg-navy text-white flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-semibold">Ações Administrativas Master</h3>
                   </div>
                   <Badge className="bg-primary text-white border-none text-[8px] font-black">AUDIT PROTECTED</Badge>
                </div>
                <div className="p-0">
                   {loadingGlobal ? (
                      <div className="p-12 text-center text-slate-400 italic">Carregando logs de auditoria...</div>
                   ) : globalLogs?.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-sm">Nenhuma ação administrativa registrada.</div>
                   ) : (
                      <div className="divide-y divide-slate-50">
                        {globalLogs?.map((log: any) => (
                           <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-navy font-bold text-[10px]">
                                    {log.profile?.name?.[0] || 'A'}
                                 </div>
                                 <div>
                                    <p className="text-[11px] font-black text-navy uppercase">{log.action}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{log.profile?.email} • {log.ip_address || 'Internal'}</p>
                                 </div>
                              </div>
                              <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(log.created_at).toLocaleString()}</span>
                           </div>
                        ))}
                      </div>
                   )}
                </div>
             </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <Card className="p-8 border-slate-100 bg-white rounded-3xl shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                   <Activity className="h-24 w-24 text-navy" />
                </div>
                <h3 className="text-xs font-semibold text-navy mb-6 flex items-center gap-2">
                   <Globe className="h-4 w-4 text-primary" /> Infra Telemetry
                </h3>
                <div className="space-y-6">
                   {[
                      { label: "Database Load", value: 12, color: "bg-emerald-500" },
                      { label: "Edge Response", value: 45, color: "bg-blue-500", suffix: "ms" },
                      { label: "Storage Capacity", value: 68, color: "bg-amber-500" },
                      { label: "OCR Queue", value: 0, color: "bg-primary" },
                   ].map((item, i) => (
                      <div key={i} className="space-y-2">
                         <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-slate-400">{item.label}</span>
                            <span className="text-navy">{item.value}{item.suffix || '%'}</span>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.value}%` }} />
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
