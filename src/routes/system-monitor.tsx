import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldCheck, Database, Zap, MonitorCheck, 
  AlertCircle, Activity, Globe, Server, 
  CreditCard, HardDrive, Cpu, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/system-monitor")({
  component: SystemMonitor,
});

function SystemMonitor() {
  const services = [
    { name: "Supabase Database", status: "online", latency: "24ms", icon: <Database /> },
    { name: "OCR Engine (Google Vision)", status: "online", latency: "145ms", icon: <Zap /> },
    { name: "Storage Service", status: "online", latency: "18ms", icon: <HardDrive /> },
    { name: "Mercado Pago Gateway", status: "online", latency: "210ms", icon: <CreditCard /> },
    { name: "PDF Generator Service", status: "online", latency: "450ms", icon: <Cpu /> },
    { name: "Edge Functions", status: "online", latency: "56ms", icon: <Globe /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latência</p>
                    <p className="text-xl font-mono font-bold text-navy">{service.latency}</p>
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

      <div className="bg-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <Server className="h-64 w-64" />
         </div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
               <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-primary">Fila de Processamento</h4>
               <div className="space-y-6">
                  {[
                     { label: "OCR Jobs Pendentes", value: 0 },
                     { label: "PDFs na Fila", value: 2 },
                     { label: "Notificações em Envio", value: 45 },
                  ].map((row, i) => (
                     <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-slate-400 font-bold">{row.label}</span>
                        <span className="text-2xl font-black">{row.value}</span>
                     </div>
                  ))}
               </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
               <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-400" /> Logs Críticos Recentes
               </h4>
               <div className="space-y-4 font-mono text-[10px]">
                  <p className="text-slate-400 border-l-2 border-emerald-500 pl-4 py-1">[10:45:22] System Health Check: All systems nominal.</p>
                  <p className="text-slate-400 border-l-2 border-primary pl-4 py-1">[10:42:01] Edge Function 'auth-hook' executed in 45ms.</p>
                  <p className="text-rose-400 border-l-2 border-rose-500 pl-4 py-1 bg-rose-500/5">[09:12:44] WARNING: Mercado Pago latency exceeded 500ms.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
