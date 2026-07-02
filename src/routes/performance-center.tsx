import { createFileRoute } from "@tanstack/react-router";
import { 
  Activity, Zap, Clock, FileText, Database, ShieldCheck, 
  BarChart3, Gauge, Layers, Cpu, Server, HardDrive
} from "lucide-react";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/performance-center")({
  component: PerformanceCenter,
});

function PerformanceCenter() {
  useEffect(() => {
    console.log("PERFORMANCE_CENTER_OK");
  }, []);

  const metrics = [
    { label: "Queries Lentas", value: "12", unit: "last 24h", icon: <Database />, status: "good" },
    { label: "Uploads Pesados", value: "45", unit: "last 24h", icon: <HardDrive />, status: "warning" },
    { label: "OCR Latency", value: "1.2s", unit: "average", icon: <Zap />, status: "good" },
    { label: "PDF Rendering", value: "4.5s", unit: "average", icon: <FileText />, status: "good" },
    { label: "Páginas Lentas", value: "2", unit: "detected", icon: <Activity />, status: "good" },
    { label: "CPU Usage", value: "18%", unit: "current", icon: <Cpu />, status: "good" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-semibold text-navy flex items-center gap-4">
             <Gauge className="text-primary h-10 w-10" /> Centro de Performance
          </h1>
          <p className="text-slate-500 font-medium italic">Monitoramento de latência e eficiência da infraestrutura.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, i) => (
          <Card key={i} className="p-8 border-slate-100 shadow-sm relative overflow-hidden group">
             <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    {metric.icon}
                </div>
                <Badge className={`${metric.status === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} border-none px-4 py-1 uppercase text-[10px] font-black`}>
                    {metric.status === 'good' ? 'Nominal' : 'Otimizar'}
                </Badge>
             </div>
             <h3 className="text-sm font-semibold text-slate-400">{metric.label}</h3>
             <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-navy">{metric.value}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{metric.unit}</span>
             </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-10 rounded-3xl border-slate-100 shadow-sm bg-navy text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <Server className="h-48 w-48" />
            </div>
            <div className="relative z-10">
               <h4 className="text-xs font-semibold tracking-[0.2em] mb-8 text-primary">Análise de Latência (ms)</h4>
               <div className="h-64 flex items-end gap-3 px-4">
                  {[45, 120, 85, 210, 56, 145, 32, 78, 92, 44, 65, 50].map((h, i) => (
                    <div key={i} className="flex-grow bg-white/10 rounded-t-lg relative group">
                       <div className="bg-primary w-full absolute bottom-0 rounded-t-lg transition-all group-hover:bg-white" style={{ height: `${(h/250)*100}%` }} />
                    </div>
                  ))}
               </div>
               <div className="flex justify-between mt-6 text-[10px] font-black uppercase text-slate-400">
                  <span>Edge Functions</span>
                  <span>Database Queries</span>
                  <span>API External</span>
               </div>
            </div>
        </Card>

        <Card className="p-10 rounded-3xl border-slate-100 shadow-sm">
           <h4 className="text-xs font-semibold tracking-[0.2em] text-navy mb-8 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Recursos Mais Pesados
           </h4>
           <div className="space-y-6">
              {[
                { name: "Relatório Consolidado.pdf", size: "12.4MB", time: "4.2s" },
                { name: "OCR Processamento Lote #44", count: "145 docs", time: "28.5s" },
                { name: "Busca Global de Documentos", latency: "high", time: "1.8s" },
                { name: "Sincronização de Storage", status: "syncing", time: "5.2s" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer">
                   <div>
                      <p className="font-bold text-navy text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.size || item.count || 'Sistema'}</p>
                   </div>
                   <Badge variant="outline" className="font-mono text-xs border-slate-200">{item.time}</Badge>
                </div>
              ))}
           </div>
        </Card>
      </div>
    </div>
  );
}
