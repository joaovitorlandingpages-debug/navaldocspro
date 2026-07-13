import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/docs-central/review")({
  component: ReviewPage,
});

function ReviewPage() {
  return (
    <div>
      <PageTitle title="Revisão" description="Aprovação e comentários por versão" />
      <Card className="p-5 border-amber-200 bg-amber-50/40 mb-6">
        <p className="text-sm font-semibold text-amber-900">Fluxo em preparação</p>
        <p className="text-xs text-amber-700 mt-1">
          O pipeline de revisão colaborativa (aprovar / rejeitar / solicitar alteração / comentar) será ativado numa próxima sprint.
          Nesta versão a lista abaixo mostra o que estará disponível.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {["Aprovar versão", "Rejeitar versão", "Solicitar alteração", "Comentar"].map((a) => (
          <Card key={a} className="p-4 border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-700">{a}</span>
            <Button size="sm" variant="outline" disabled>Em breve</Button>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Empty title="Nenhuma revisão pendente" hint="Quando houver versões em estado 'review', elas aparecerão aqui." />
      </div>
    </div>
  );
}
