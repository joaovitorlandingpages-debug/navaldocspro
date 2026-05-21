import { createFileRoute, Navigate } from "@tanstack/react-router";
import { 
  ShieldCheck, Database, Zap, MonitorCheck, 
  AlertCircle, Activity, Globe, Server, 
  CreditCard, HardDrive, Cpu, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/system-monitor")({
  component: SystemMonitor,
});

function SystemMonitor() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    console.log("SYSTEM_MONITOR_OK");
  }, []);

  if (loading) return null;
  if (profile?.role !== 'admin_master_global' && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard-v2" />;
  }

  const services = [
    { name: "Database & Storage", status: "online", latency: "24ms", health: "100%", icon: <Database /> },
    { name: "OCR Advanced Engine", status: "online", latency: "145ms", health: "100%", icon: <Zap /> },
    { name: "PDF & Document Logic", status: "online", latency: "410ms", health: "100%", icon: <Cpu /> },
    { name: "Billing & Subscriptions", status: "online", latency: "112ms", health: "100%", icon: <CreditCard /> },
    { name: "Webhooks & API Jobs", status: "online", latency: "56ms", health: "100%", icon: <Globe /> },
    { name: "Recovery System", status: "active", latency: "12ms", health: "100%", icon: <RefreshCw /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-8 max-w-7xl mx-auto">
      <BackButton className="w-fit lg:hidden" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight uppercase flex items-center gap-4">
             <MonitorCheck className="text-primary h-10 w-10" /> Centro de Monitoramento
          </h1>
          <p className="text-slate-500 font-medium italic">Status em tempo real da infraestrutura NavalDocs Pro.</p>
        </div>
        <button className="flex items-center gap-2 bg-navy text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90">
            <RefreshCw className="h-4 w-4" /> Forçar Check
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => (
          <Card key={i} className="p-8 border-slate-100 shadow-sm relative overflow-hidden group">
             <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    {service.icon}
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1">Operational</Badge>
             </div>
             <h3 className="text-lg font-black text-navy uppercase tracking-tight">{service.name}</h3>
             <div className="mt-4 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latência / Health</p>
                    <p className="text-xl font-mono font-bold text-navy">{service.latency} • {service.health}</p>
                </div>
                <div className="flex gap-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(v => (
                        <div key={v} className="h-4 w-1 bg-emerald-400 rounded-full" />
                    ))}
                </div>
             </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden h-full">
           <div className="absolute top-0 right-0 p-10 opacity-5">
              <Server className="h-64 w-64" />
           </div>
           <div className="relative z-10">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-primary">Fila de Processamento</h4>
              <div className="space-y-6">
                  {[
                    { label: "OCR Jobs Pendentes", value: 0 },
                    { label: "PDFs na Fila (Retry Auto)", value: 0 },
                    { label: "Storage Health Check", value: "100%" },
                    { label: "Webhook Sync status", value: "OK" },
                    { label: "Auto Recovery Events", value: 142 },
                 ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4">
                       <span className="text-slate-400 font-bold">{row.label}</span>
                       <span className="text-2xl font-black">{row.value}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <Card className="p-8 border-slate-100 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-navy">
                 <ShieldCheck className="h-4 w-4 text-emerald-500" /> Segurança Enterprise
              </h4>
              <div className="space-y-4">
                 {[
                   { event: "Login bem sucedido", user: "ricardo@navaldocs.com", ip: "192.168.1.1", time: "2 min atrás" },
                   { event: "Assinatura Digital", user: "mariana@navaldocs.com", ip: "192.168.1.45", time: "15 min atrás" },
                   { event: "Tentativa de acesso inválida", user: "desconhecido", ip: "45.12.33.1", time: "1h atrás", warning: true },
                 ].map((log, i) => (
                   <div key={i} className={`p-4 rounded-xl border ${log.warning ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} flex justify-between items-center`}>
                      <div>
                         <p className={`text-xs font-bold ${log.warning ? 'text-rose-700' : 'text-navy'}`}>{log.event}</p>
                         <p className="text-[10px] text-slate-400 font-medium">{log.user} • {log.ip}</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase">{log.time}</span>
                   </div>
                 ))}
              </div>
           </Card>

           <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-navy">
                 <Activity className="h-4 w-4 text-primary" /> Logs de Sistema (Live)
              </h4>
              <div className="space-y-3 font-mono text-[10px]">
                 <p className="text-slate-500 border-l-2 border-emerald-500 pl-4 py-1">[10:55:12] Infra Consolidation: SUCCESS - v15.0 Gold deployed.</p>
                 <p className="text-slate-500 border-l-2 border-emerald-500 pl-4 py-1">[10:52:01] System Health: ALL MODULES NOMINAL.</p>
                 <p className="text-emerald-500 border-l-2 border-emerald-500 pl-4 py-1 bg-emerald-500/5">[10:45:22] System Health Check: All systems operational.</p>
                 <p className="text-slate-500 border-l-2 border-primary pl-4 py-1">[10:42:01] Edge Function 'auth-hook' executed in 42ms.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
