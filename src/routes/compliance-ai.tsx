import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateProcessCompliance, type ComplianceReport } from "@/lib/compliance.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Info, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/compliance-ai")({
  head: () => ({ meta: [{ title: "Validador NORMAM (IA) — NavalDocs Pro" }] }),
  component: ComplianceAIPage,
});

function ComplianceAIPage() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const validate = useServerFn(validateProcessCompliance);

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("id, process_type, status").limit(50);
      return data || [];
    },
  });

  const mut = useMutation({
    mutationFn: async (id: string) => {
      console.log("COMPLIANCE_AI_VALIDATION_STARTED", id);
      return await validate({ data: { processId: id } });
    },
    onSuccess: (r) => {
      setReport(r);
      console.log("COMPLIANCE_AI_VALIDATION_OK", r.score);
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6 md:p-8 pb-20">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Validador NORMAM</h1>
          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest">IA</Badge>
        </div>
        <p className="text-slate-500 font-medium">IA cruza seu processo com normas NORMAM-01/02/03 da Marinha.</p>
      </div>

      <Card className="p-6 border-slate-100 shadow-sm rounded-3xl space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecione o processo</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium"
        >
          <option value="">— Escolher processo —</option>
          {processes.map((p: any) => (
            <option key={p.id} value={p.id}>{p.process_type} ({p.status})</option>
          ))}
        </select>
        <Button
          onClick={() => selectedId && mut.mutate(selectedId)}
          disabled={!selectedId || mut.isPending}
          className="bg-primary text-white font-black text-[10px] uppercase tracking-widest"
        >
          {mut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Validar Compliance</>}
        </Button>
        {mut.error && <p className="text-rose-600 text-xs font-bold">{(mut.error as Error).message}</p>}
      </Card>

      {report && (
        <Card className="p-8 border-slate-100 shadow-sm rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score de Compliance</p>
              <p className={`text-5xl font-black ${report.score >= 80 ? "text-emerald-500" : report.score >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                {report.score}<span className="text-2xl text-slate-300">/100</span>
              </p>
            </div>
            <Badge className={`text-[10px] font-black uppercase border-none px-4 py-2 ${report.approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {report.approved ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" /> Aprovado</> : "Reprovado"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{report.summary}</p>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Achados ({report.findings?.length || 0})</p>
            {report.findings?.map((f, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${
                f.severity === "critical" ? "bg-rose-50 border-rose-100" :
                f.severity === "warning" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
              }`}>
                <div className="flex items-start gap-3">
                  {f.severity === "critical" ? <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" /> : <Info className="h-4 w-4 text-amber-600 mt-0.5" />}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/60 text-navy border-none text-[9px] font-black uppercase">{f.norma}</Badge>
                      <span className="text-[10px] font-black uppercase text-slate-500">{f.severity}</span>
                    </div>
                    <p className="text-sm font-bold text-navy">{f.issue}</p>
                    <p className="text-xs text-slate-600">➜ {f.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
