import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, StatCard, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["docs-central-dashboard"],
    queryFn: async () => {
      const [tpl, ver, fields, mappings, used, processes] = await Promise.all([
        supabase.from("document_templates").select("id,is_active,category").limit(5000),
        supabase.from("template_versions").select("id,status,template_id").limit(5000),
        supabase.from("document_template_fields").select("id,template_id").limit(5000),
        supabase.from("process_document_template_mappings").select("id,is_active,template_id").limit(5000),
        supabase.from("generated_documents").select("id,template_id").limit(5000),
        supabase.from("processes").select("id").limit(5000),
      ]);
      const templates = tpl.data ?? [];
      const versions = ver.data ?? [];
      const fieldsRows = fields.data ?? [];
      const usedRows = used.data ?? [];
      const publishedTplIds = new Set(versions.filter((v: any) => v.status === "published").map((v: any) => v.template_id));
      const draftTplIds = new Set(versions.filter((v: any) => v.status === "draft").map((v: any) => v.template_id));
      const archivedTplIds = new Set(versions.filter((v: any) => v.status === "archived").map((v: any) => v.template_id));
      const reviewTplIds = new Set(versions.filter((v: any) => v.status === "review" || v.status === "pending_review").map((v: any) => v.template_id));
      const withFields = new Set(fieldsRows.map((f: any) => f.template_id));
      const usedTpl = new Set(usedRows.map((u: any) => u.template_id).filter(Boolean));
      const noPublished = templates.filter((t: any) => !publishedTplIds.has(t.id)).length;
      const noFields = templates.filter((t: any) => !withFields.has(t.id)).length;
      const neverUsed = templates.filter((t: any) => !usedTpl.has(t.id)).length;
      return {
        total: templates.length,
        published: publishedTplIds.size,
        drafts: draftTplIds.size,
        archived: archivedTplIds.size,
        review: reviewTplIds.size,
        noPublished,
        noFields,
        neverUsed,
        used: usedTpl.size,
        mappingsActive: (mappings.data ?? []).filter((m: any) => m.is_active).length,
        processesTotal: (processes.data ?? []).length,
      };
    },
  });

  if (isLoading) return <div className="text-sm text-slate-500">Carregando métricas...</div>;
  if (!data) return <Empty title="Sem dados disponíveis" />;

  const alerts = data.noPublished + data.noFields;

  return (
    <div>
      <PageTitle title="Dashboard" description="Enterprise Documentation Central v2.0" />

      <section className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Modelos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={data.total} />
          <StatCard label="Publicados" value={data.published} tone="ok" />
          <StatCard label="Rascunhos" value={data.drafts} />
          <StatCard label="Em revisão" value={data.review} tone="warn" />
          <StatCard label="Arquivados" value={data.archived} />
          <StatCard label="Utilizados" value={data.used} />
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Problemas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Sem versão publicada" value={data.noPublished} tone="danger" />
          <StatCard label="Sem campos" value={data.noFields} tone="warn" />
          <StatCard label="Nunca utilizados" value={data.neverUsed} tone="warn" />
          <StatCard label="Mapeamentos ativos" value={data.mappingsActive} tone="ok" />
        </div>
      </section>

      {alerts > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/50 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{alerts} alerta(s) requerem atenção</p>
            <p className="text-xs text-amber-700 mt-1">Existem templates sem versão publicada ou sem campos configurados. Revise em Modelos.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
