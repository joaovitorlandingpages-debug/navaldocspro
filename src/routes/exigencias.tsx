import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { analyzeExigencia, type ExigenciaAnalysis } from "@/lib/exigencias.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileWarning, Loader2, Sparkles, Copy, Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/exigencias")({
  head: () => ({ meta: [{ title: "Auto-resposta a Exigências (IA) — NavalDocs Pro" }] }),
  component: ExigenciasPage,
});

function ExigenciasPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExigenciaAnalysis | null>(null);
  const analyze = useServerFn(analyzeExigencia);

  const mut = useMutation({
    mutationFn: async (t: string) => {
      console.log("EXIGENCIA_ANALYSIS_STARTED");
      return await analyze({ data: { exigenciaText: t } });
    },
    onSuccess: (r) => {
      setResult(r);
      console.log("EXIGENCIA_ANALYSIS_OK", r.category);
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6 md:p-8 pb-20">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-amber-500 rounded-2xl flex items-center justify-center">
            <FileWarning className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-navy">Auto-resposta a Exigências</h1>
          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest">IA</Badge>
        </div>
        <p className="text-slate-500 font-medium">Cole o texto da exigência da Capitania. IA classifica e sugere a resposta.</p>
      </div>

      <Card className="p-6 border-slate-100 shadow-sm rounded-3xl space-y-4">
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui o texto da exigência recebida..."
          className="font-medium text-sm"
        />
        <Button
          onClick={() => mut.mutate(text)}
          disabled={text.length < 10 || mut.isPending}
          className="bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-700"
        >
          {mut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar Exigência</>}
        </Button>
        {mut.error && <p className="text-rose-600 text-xs font-bold">{(mut.error as Error).message}</p>}
      </Card>

      {result && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 border-slate-100 shadow-sm rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Categoria</p>
            <p className="text-lg font-black text-navy">{result.category}</p>
            <Badge className={`mt-3 text-[9px] font-black uppercase border-none ${
              result.severity === "high" ? "bg-rose-100 text-rose-700" :
              result.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>{result.severity}</Badge>
          </Card>

          <Card className="p-6 border-slate-100 shadow-sm rounded-3xl">
            <Clock className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resolução estimada</p>
            <p className="text-3xl font-black text-navy">{result.estimated_resolution_days}<span className="text-sm text-slate-400"> dias</span></p>
          </Card>

          <Card className="p-6 border-slate-100 shadow-sm rounded-3xl">
            <ListChecks className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Docs necessários</p>
            <p className="text-2xl font-black text-navy">{result.required_documents?.length || 0}</p>
          </Card>

          <Card className="md:col-span-3 p-6 border-slate-100 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resposta Sugerida</p>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result.suggested_response); toast.success("Copiado!"); }}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {result.suggested_response}
            </div>
          </Card>

          {result.required_documents?.length > 0 && (
            <Card className="md:col-span-3 p-6 border-slate-100 shadow-sm rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Documentos a anexar</p>
              <ul className="space-y-2">
                {result.required_documents.map((d, i) => (
                  <li key={i} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-primary rounded-full" /> {d}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.next_actions?.length > 0 && (
            <Card className="md:col-span-3 p-6 bg-navy text-white border-none rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Próximas ações</p>
              <ol className="space-y-2">
                {result.next_actions.map((a, i) => (
                  <li key={i} className="text-sm font-medium flex items-start gap-3">
                    <span className="h-5 w-5 bg-primary text-white rounded-md flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
