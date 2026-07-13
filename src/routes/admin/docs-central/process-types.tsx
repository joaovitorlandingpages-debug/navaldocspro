import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, ProgressBar, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/process-types")({
  component: ProcessTypesPage,
});

function ProcessTypesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dc-process-types"],
    queryFn: async () => {
      const [pt, req, map, tv] = await Promise.all([
        supabase.from("process_types").select("id,name,description").limit(500),
        supabase.from("process_type_requirements").select("process_type_id,document_label,is_required").limit(2000),
        supabase.from("process_document_template_mappings").select("process_type_id,document_label,template_id,is_active").limit(2000),
        supabase.from("template_versions").select("template_id,status").limit(5000),
      ]);
      const published = new Set((tv.data ?? []).filter((v: any) => v.status === "published").map((v: any) => v.template_id));
      return (pt.data ?? []).map((p: any) => {
        const reqs = (req.data ?? []).filter((r: any) => r.process_type_id === p.id);
        const docs = reqs.map((r: any) => {
          const m = (map.data ?? []).find((mm: any) => mm.process_type_id === p.id && mm.document_label === r.document_label);
          const configured = !!(m?.is_active && m?.template_id && published.has(m.template_id));
          return { label: r.document_label, required: r.is_required, configured };
        });
        const total = docs.length || 1;
        const done = docs.filter((d: any) => d.configured).length;
        return { ...p, docs, percent: Math.round((done / total) * 100) };
      });
    },
  });

  return (
    <div>
      <PageTitle title="Tipos de Processo" description="Cobertura documental por tipo de serviço" />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {!isLoading && (data?.length ?? 0) === 0 && <Empty title="Nenhum tipo de processo cadastrado" />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(data ?? []).map((p: any) => (
          <Card key={p.id} className="p-5 border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-navy">{p.name}</p>
                {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
              </div>
              <span className="text-xs font-bold text-navy">{p.percent}%</span>
            </div>
            <ProgressBar value={p.percent} />
            <ul className="mt-4 space-y-1.5">
              {p.docs.length === 0 && <li className="text-xs text-slate-400">Sem documentos requeridos.</li>}
              {p.docs.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {d.configured ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-rose-500" />}
                  <span className={d.configured ? "text-slate-700" : "text-slate-500"}>{d.label}</span>
                  {d.required && <span className="text-[9px] font-bold text-amber-600 uppercase">obrigatório</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
