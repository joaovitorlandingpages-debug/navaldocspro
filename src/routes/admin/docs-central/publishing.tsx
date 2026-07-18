import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/docs-central/publishing")({
  component: PublishingPage,
});

const COLUMNS = [
  { key: "draft", label: "Rascunhos", tone: "bg-slate-100 text-slate-700" },
  { key: "review", label: "Aguardando revisão", tone: "bg-amber-100 text-amber-700" },
  { key: "ready", label: "Prontos", tone: "bg-blue-100 text-blue-700" },
  { key: "published", label: "Publicados", tone: "bg-emerald-100 text-emerald-700" },
  { key: "archived", label: "Arquivados", tone: "bg-slate-100 text-slate-500" },
];

function PublishingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dc-publishing"],
    queryFn: async () => {
      const [ver, tpl] = await Promise.all([
        supabase.from("template_versions").select("id,template_id,version_number,status,updated_at").limit(2000),
        supabase.from("document_templates").select("id,name").limit(5000),
      ]);
      const tplName = new Map((tpl.data ?? []).map((t: any) => [t.id, t.name]));
      return (ver.data ?? []).map((v: any) => ({ ...v, template_name: tplName.get(v.template_id) || "—" }));
    },
  });

  const byStatus = (key: string) => (data ?? []).filter((v: any) => v.status === key);

  return (
    <div>
      <PageTitle title="Publicações" description="Enterprise Documentation Central v2.0" />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((c) => {
          const items = byStatus(c.key);
          return (
            <div key={c.key}>
              <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-md mb-2 ${c.tone}`}>
                {c.label} · {items.length}
              </div>
              <div className="space-y-2">
                {items.length === 0 && <Empty title="Vazio" />}
                {items.slice(0, 25).map((v: any) => (
                  <Card key={v.id} className="p-3 border-slate-100">
                    <p className="text-xs font-semibold text-navy truncate">{v.template_name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">v{v.version_number}</p>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
