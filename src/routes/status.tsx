import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertTriangle, Activity, Database, Zap, HardDrive } from "lucide-react";

export const Route = createFileRoute("/status")({
  component: StatusPage,
});

function StatusPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["system_health"],
    queryFn: async () => {
      const { data } = await supabase.from("system_health").select("*");
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-black text-navy uppercase tracking-tight">Status do Sistema</h1>
          <p className="text-slate-500 font-medium">Monitoramento em tempo real da infraestrutura NavalDocs Pro.</p>
        </header>

        {isLoading ? (
          <div className="text-center py-20">Carregando status...</div>
        ) : (
          <div className="grid gap-4">
            {health?.map((module) => (
              <div key={module.module_name} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${module.status === 'operational' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {module.module_name === 'Database' && <Database className="h-6 w-6" />}
                    {module.module_name === 'Storage' && <HardDrive className="h-6 w-6" />}
                    {module.module_name === 'Mercado Pago' && <Zap className="h-6 w-6" />}
                    {module.module_name === 'OCR Engine' && <Activity className="h-6 w-6" />}
                    {module.module_name === 'Auth Service' && <ShieldCheck className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-navy">{module.module_name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{module.status}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-black text-navy">{module.uptime_percentage}%</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Uptime</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
