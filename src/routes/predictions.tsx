import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertTriangle, TrendingDown, Shield, Brain } from "lucide-react";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Predição de Vencimentos — NavalDocs Pro" },
      { name: "description", content: "IA antecipa documentos a vencer e sugere ações." },
    ],
  }),
  component: PredictionsPage,
});

type Bucket = "critical" | "high" | "medium" | "low";
type Row = {
  id: string;
  type: string;
  expiry: string;
  days: number;
  bucket: Bucket;
  suggestion: string;
  processId: string | null;
};

function PredictionsPage() {
  useEffect(() => { console.log("PREDICTIONS_READY"); }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: async (): Promise<Row[]> => {
      const today = new Date();
      const { data } = await supabase
        .from("documents")
        .select("id, document_type, expiry_date, process_id")
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true })
        .limit(100);

      return (data || []).map((d: any) => {
        const days = Math.ceil((+new Date(d.expiry_date) - +today) / 86400000);
        const bucket: Bucket =
          days < 0 ? "critical" :
          days <= 7 ? "critical" :
          days <= 30 ? "high" :
          days <= 90 ? "medium" : "low";
        const suggestion =
          days < 0 ? "Documento vencido — protocolar renovação imediatamente" :
          days <= 7 ? "Iniciar renovação hoje" :
          days <= 30 ? "Agendar renovação esta semana" :
          days <= 90 ? "Programar próxima janela" : "Monitorar";
        return {
          id: d.id,
          type: d.document_type || "Documento",
          expiry: d.expiry_date,
          days,
          bucket,
          suggestion,
          processId: d.process_id,
        };
      });
    },
  });

  const summary = useMemo(() => ({
    critical: rows.filter(r => r.bucket === "critical").length,
    high: rows.filter(r => r.bucket === "high").length,
    medium: rows.filter(r => r.bucket === "medium").length,
    low: rows.filter(r => r.bucket === "low").length,
  }), [rows]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Predição de Vencimentos</h1>
          </div>
          <p className="text-slate-500 font-medium">IA classifica e prioriza documentos a vencer.</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-4 py-2">
          {rows.length} documentos monitorados
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Crítico (≤7d)", val: summary.critical, color: "bg-rose-50 text-rose-600 border-rose-100", icon: AlertTriangle },
          { label: "Alto (≤30d)", val: summary.high, color: "bg-amber-50 text-amber-600 border-amber-100", icon: TrendingDown },
          { label: "Médio (≤90d)", val: summary.medium, color: "bg-blue-50 text-blue-600 border-blue-100", icon: CalendarClock },
          { label: "Baixo (>90d)", val: summary.low, color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: Shield },
        ].map((s, i) => (
          <Card key={i} className={`p-6 border ${s.color}`}>
            <s.icon className="h-5 w-5 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.val}</p>
          </Card>
        ))}
      </div>

      <Card className="border-slate-100 shadow-sm overflow-hidden rounded-3xl">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-navy">Documentos & Ações Sugeridas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Vence em</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Ação Sugerida</th>
                <th className="px-6 py-4 text-right">Ir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Carregando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Nenhum documento com vencimento monitorado.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-navy">{r.type}</td>
                  <td className="px-6 py-4">
                    <span className={r.days < 0 ? "text-rose-600 font-black" : "text-slate-600"}>
                      {r.days < 0 ? `Vencido há ${-r.days}d` : `${r.days}d`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`border-none text-[9px] font-black uppercase ${
                      r.bucket === "critical" ? "bg-rose-100 text-rose-700" :
                      r.bucket === "high" ? "bg-amber-100 text-amber-700" :
                      r.bucket === "medium" ? "bg-blue-100 text-blue-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{r.bucket}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">{r.suggestion}</td>
                  <td className="px-6 py-4 text-right">
                    {r.processId && (
                      <Link to="/processes/$id" params={{ id: r.processId }}>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">Abrir</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
