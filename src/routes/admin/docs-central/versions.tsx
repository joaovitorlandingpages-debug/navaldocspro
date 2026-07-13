import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/versions")({
  component: VersionsPage,
});

function VersionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dc-versions"],
    queryFn: async () => {
      const [ver, tpl] = await Promise.all([
        supabase.from("template_versions").select("id,template_id,version_number,status,created_at,created_by,change_summary").order("created_at", { ascending: false }).limit(200),
        supabase.from("document_templates").select("id,name").limit(5000),
      ]);
      const tplName = new Map((tpl.data ?? []).map((t: any) => [t.id, t.name]));
      return (ver.data ?? []).map((v: any) => ({ ...v, template_name: tplName.get(v.template_id) || "—" }));
    },
  });

  return (
    <div>
      <PageTitle title="Versões" description="Histórico completo de publicações e alterações" />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {!isLoading && (data?.length ?? 0) === 0 && <Empty title="Nenhuma versão registrada" />}
      <Card className="border-slate-100 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {(data ?? []).map((v: any) => (
            <li key={v.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <GitBranch className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-navy truncate">{v.template_name}</p>
                  <Badge variant="outline" className="text-[10px]">v{v.version_number}</Badge>
                  <Badge variant="outline" className={
                    v.status === "published" ? "text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]" :
                    v.status === "draft" ? "text-amber-700 border-amber-200 bg-amber-50 text-[10px]" :
                    "text-slate-500 border-slate-200 text-[10px]"
                  }>{v.status}</Badge>
                </div>
                {v.change_summary && <p className="text-xs text-slate-500 mt-1">{v.change_summary}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{new Date(v.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <button disabled className="text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-not-allowed" title="Sprint futura">Rollback</button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
