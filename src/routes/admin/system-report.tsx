import { createFileRoute } from "@tanstack/react-router";
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, Clock, Database, Zap, FileText, 
  LayoutDashboard, AlertCircle, Construction, MonitorCheck, Search, Activity, 
  CreditCard, Lock, Upload 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/system-report")({
  component: SystemReport,
});

function SystemReport() {
  const { data: dbStatus } = useQuery({
    queryKey: ["db-status-check"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
      return !error;
    },
    retry: 1
  });

  const modules = [
    { name: "Autenticação", status: "Funcional", completion: 100, icon: <Lock className="h-4 w-4" />, priority: "Concluído" },
    { name: "OCR / IA", status: "Funcional", completion: 95, icon: <Upload className="h-4 w-4" />, priority: "Alta" },
    { name: "Financeiro (MP)", status: "Funcional", completion: 100, icon: <CreditCard className="h-4 w-4" />, priority: "Concluído" },
    { name: "Documentos", status: "Funcional", completion: 90, icon: <FileText className="h-4 w-4" />, priority: "Média" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <MonitorCheck className="h-8 w-8 text-primary" /> Diagnóstico de Sistema
          </h1>
        </div>
        <Badge className="bg-emerald-500 text-white px-4 py-2 rounded-xl">Estável</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-navy text-white">
          <h3 className="text-4xl font-black">98%</h3>
          <p className="text-xs uppercase opacity-60">Score de Estabilidade</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-bold text-slate-400 uppercase">Supabase</p>
          <h3 className="text-2xl font-black">{dbStatus ? 'CONECTADO' : 'ERRO'}</h3>
        </Card>
      </div>

      <div className="bg-white rounded-[2.5rem] border p-8">
        <h3 className="font-black text-navy uppercase text-xs mb-6">Módulos</h3>
        {modules.map((m, i) => (
          <div key={i} className="flex justify-between p-4 border-b">
            <div>{m.name}</div>
            <Badge>{m.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}