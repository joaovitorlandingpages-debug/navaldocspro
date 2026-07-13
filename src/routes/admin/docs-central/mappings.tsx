import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/mappings")({
  component: MappingsPage,
});

function MappingsPage() {
  return (
    <div>
      <PageTitle title="Mapeamentos" description="Vinculação Serviço → Documento → Modelo → Versão → Escopo → Status" />
      <Card className="p-6 border-slate-100">
        <p className="text-sm text-slate-600 mb-4">
          A matriz completa de mapeamentos do Processo Guiado está disponível na tela dedicada,
          com edição por linha, indicação de escopo (Empresa/Global) e ativação segura (apenas templates publicados).
        </p>
        <Link to={"/admin/templates/pfw" as any} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Abrir matriz de mapeamentos <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
