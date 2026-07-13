import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, StatCard, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/docs-central/fields")({
  component: FieldsPage,
});

function FieldsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["dc-fields"],
    queryFn: async () => {
      const [fields, tpl] = await Promise.all([
        supabase.from("document_template_fields").select("id,template_id,field_key,field_label,field_type,is_required").limit(5000),
        supabase.from("document_templates").select("id,name").limit(5000),
      ]);
      const tplName = new Map((tpl.data ?? []).map((t: any) => [t.id, t.name]));
      const rows = (fields.data ?? []).map((f: any) => ({ ...f, template_name: tplName.get(f.template_id) || "—" }));
      const byKey: Record<string, number> = {};
      for (const r of rows) byKey[r.field_key] = (byKey[r.field_key] || 0) + 1;
      const duplicates = Object.entries(byKey).filter(([, c]) => c > 1).length;
      const required = rows.filter((r) => r.is_required).length;
      const tplWithFields = new Set(rows.map((r) => r.template_id));
      const tplWithoutFields = (tpl.data ?? []).filter((t: any) => !tplWithFields.has(t.id)).length;
      return { rows, duplicates, required, tplWithoutFields, distinct: Object.keys(byKey).length };
    },
  });

  const filtered = useMemo(
    () => (data?.rows ?? []).filter((r: any) => !q || `${r.field_key} ${r.field_label} ${r.template_name}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <div>
      <PageTitle title="Campos" description="Placeholders e variáveis usadas nos modelos" />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Campos distintos" value={data.distinct} />
            <StatCard label="Obrigatórios" value={data.required} />
            <StatCard label="Duplicados" value={data.duplicates} tone={data.duplicates ? "warn" : "default"} />
            <StatCard label="Templates sem campos" value={data.tplWithoutFields} tone="danger" />
          </div>
          <Input placeholder="Buscar campo..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md mb-4" />
          {filtered.length === 0 ? (
            <Empty title="Nenhum campo encontrado" />
          ) : (
            <Card className="border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">Chave</th>
                    <th className="text-left px-4 py-3">Rótulo</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Template</th>
                    <th className="text-left px-4 py-3">Obrig.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.slice(0, 200).map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-navy">{r.field_key}</td>
                      <td className="px-4 py-2.5 text-slate-700">{r.field_label}</td>
                      <td className="px-4 py-2.5 text-slate-500">{r.field_type}</td>
                      <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{r.template_name}</td>
                      <td className="px-4 py-2.5">{r.is_required ? "Sim" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 200 && <p className="p-3 text-xs text-slate-400 text-center">Exibindo 200 de {filtered.length}</p>}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
