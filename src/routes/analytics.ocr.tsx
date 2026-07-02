import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Zap, BarChart3, PieChart, Activity, 
  ArrowUpRight, Target, Clock, Filter, 
  Cpu, FileText, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/analytics/ocr")({
  component: AnalyticsOCR,
});

function AnalyticsOCR() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight uppercase">Analytics de OCR</h1>
          <p className="text-slate-500 font-medium italic">Performance e precisão do motor de inteligência artificial.</p>
        </div>
        <div className="flex gap-2">
            <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 shadow-lg shadow-primary/20">
                Recarregar Dados
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Documentos Processados", value: "1,245", trend: "+12%", icon: <FileText /> },
          { label: "Confiança Média", value: "98.4%", trend: "+0.2%", icon: <Target /> },
          { label: "Taxa de Sucesso", value: "99.1%", trend: "+0.5%", icon: <Zap /> },
          { label: "Custo Estimado", value: "R$ 142,00", trend: "-5%", icon: <BarChart3 /> },
        ].map((stat, i) => (
          <Card key={i} className="p-8 rounded-3xl border-slate-100 shadow-sm">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-xl text-primary">{stat.icon}</div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
             </div>
             <h3 className="text-3xl font-black text-navy">{stat.value}</h3>
             <p className="text-[10px] font-black mt-2 text-emerald-600">
                {stat.trend} vs período anterior
             </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-10 rounded-3xl border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy mb-8">Volume Diário de Processamento</h4>
            <div className="h-64 flex items-end gap-2">
                {[45, 60, 55, 80, 70, 90, 85, 100, 95, 110, 105, 120].map((v, i) => (
                    <div key={i} className="flex-grow bg-slate-50 rounded-t-lg group relative">
                        <div className="bg-primary w-full absolute bottom-0 rounded-t-lg transition-all group-hover:bg-navy" style={{ height: `${(v/120)*100}%` }} />
                    </div>
                ))}
            </div>
        </Card>
        <Card className="p-10 rounded-3xl border-slate-100 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-navy mb-8">Falhas por Tipo</h4>
            <div className="space-y-6">
                {[
                    { type: "Imagem Ilegível", value: 65, color: "bg-rose-400" },
                    { type: "Formato Não Suportado", value: 20, color: "bg-amber-400" },
                    { type: "Erro de Conexão", value: 15, color: "bg-slate-300" },
                ].map((item, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span>{item.type}</span>
                            <span>{item.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
}
