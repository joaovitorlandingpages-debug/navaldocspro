import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/models")({
  component: ModelsPage,
});

const CATEGORY_ORDER = ["Requerimentos", "Declarações", "Contratos", "Memoriais", "GRU", "Certificados", "Laudos", "Outros"];

function categorize(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("requerimento")) return "Requerimentos";
  if (n.includes("declara")) return "Declarações";
  if (n.includes("contrato")) return "Contratos";
  if (n.includes("memorial")) return "Memoriais";
  if (n.includes("gru") || n.includes("guia")) return "GRU";
  if (n.includes("certificado") || n.includes("tie")) return "Certificados";
  if (n.includes("laudo") || n.includes("vistoria")) return "Laudos";
  return "Outros";
}

function ModelsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["dc-models"],
    queryFn: async () => {
      const [tpl, ver] = await Promise.all([
        supabase.from("document_templates").select("id,name,is_active,category,company_id,updated_at").limit(5000),
        supabase.from("template_versions").select("template_id,status,version_number").limit(5000),
      ]);
      const versions = ver.data ?? [];
      return (tpl.data ?? []).map((t: any) => {
        const vs = versions.filter((v: any) => v.template_id === t.id);
        const published = vs.find((v: any) => v.status === "published");
        return {
          ...t,
          bucket: categorize(t.name || ""),
          status: published ? "published" : vs.find((v: any) => v.status === "draft") ? "draft" : vs.find((v: any) => v.status === "archived") ? "archived" : "no-version",
          version: published?.version_number ?? Math.max(0, ...vs.map((v: any) => v.version_number || 0)),
          scope: t.company_id ? "Empresa" : "Global",
        };
      });
    },
  });

  const grouped = useMemo(() => {
    const rows = (data ?? []).filter((r: any) => !q || r.name?.toLowerCase().includes(q.toLowerCase()));
    const map: Record<string, any[]> = {};
    for (const r of rows) (map[r.bucket] ??= []).push(r);
    return map;
  }, [data, q]);

  return (
    <div>
      <PageTitle title="Modelos" description="Enterprise Documentation Central v2.0" />
      <div className="mb-6 relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo..." className="pl-9" />
      </div>
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {!isLoading && Object.keys(grouped).length === 0 && <Empty title="Nenhum modelo encontrado" />}
      <div className="space-y-8">
        {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
          <section key={cat}>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-bold text-navy">{cat}</h3>
              <span className="text-xs text-slate-500">{grouped[cat].length} modelo(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[cat].map((t: any) => (
                <Link key={t.id} to={"/admin/templates/$id" as any} params={{ id: t.id } as any}>
                  <Card className="p-4 border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy truncate">{t.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">v{t.version || "—"} · {t.scope}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        t.status === "published" ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
                        t.status === "draft" ? "text-amber-700 border-amber-200 bg-amber-50" :
                        t.status === "archived" ? "text-slate-500 border-slate-200" :
                        "text-rose-700 border-rose-200 bg-rose-50"
                      }>
                        {t.status === "published" ? "Publicado" : t.status === "draft" ? "Rascunho" : t.status === "archived" ? "Arquivado" : "Sem versão"}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
