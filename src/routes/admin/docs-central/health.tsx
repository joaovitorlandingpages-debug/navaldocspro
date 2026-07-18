import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageTitle, StatCard, Empty } from "@/components/docs-central/shared";
import { HealthScore } from "@/components/docs-central/HealthScore";
import { IssuePanel } from "@/components/docs-central/IssuePanel";
import { useDocumentationCoverage } from "@/hooks/useDocumentationCoverage";
import { buildDiagnostic } from "@/services/documentation/diagnostics";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/health")({
  component: HealthPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <p className="text-sm text-rose-600 mb-3">Erro ao carregar saúde: {error.message}</p>
      <Button size="sm" onClick={reset}>Tentar novamente</Button>
    </div>
  ),
  notFoundComponent: () => <Empty title="Página não encontrada" />,
});

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function HealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useDocumentationCoverage();
  const diagnostic = useMemo(() => (data ? buildDiagnostic(data) : ""), [data]);

  if (isLoading) {
    return (
      <div>
        <PageTitle title="Saúde da Documentação" description="Enterprise Documentation Central v2.0" />
        <Skeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageTitle title="Saúde da Documentação" />
        <Empty title="Não foi possível carregar" hint={error?.message ?? "Tente novamente"} />
        <div className="mt-4"><Button size="sm" onClick={() => refetch()}>Tentar novamente</Button></div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Saúde da Documentação"
        description="Visão executiva da conformidade documental"
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <div className="mb-6">
        <HealthScore score={data.healthScore} coverage={data.coverage} diagnostic={diagnostic} />
      </div>

      <section className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Indicadores</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Publicados" value={data.publishedDocuments.length} tone="ok" />
          <StatCard label="Rascunhos" value={data.draftDocuments.length} tone="warn" />
          <StatCard label="Arquivados" value={data.archivedDocuments.length} />
          <StatCard label="Nunca utilizados" value={data.unusedTemplates.length} />
          <StatCard label="Placeholders inválidos" value={data.invalidPlaceholders.length} tone={data.invalidPlaceholders.length ? "danger" : "default"} />
          <StatCard label="Mapeamentos quebrados" value={data.brokenMappings.length} tone={data.brokenMappings.length ? "danger" : "default"} />
          <StatCard label="Duplicados" value={data.duplicatedTemplates.length} tone={data.duplicatedTemplates.length ? "warn" : "default"} />
          <StatCard label="Versões desatualizadas" value={data.outdatedVersions.length} tone={data.outdatedVersions.length ? "warn" : "default"} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Problemas</h3>
        <IssuePanel issues={[...data.issues, ...data.warnings]} />
      </section>
    </div>
  );
}
