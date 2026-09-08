import { createFileRoute } from "@tanstack/react-router";
import { AdminTestHub } from "@/components/admin/AdminTestHub";
import { PageHeader } from "@/components/navigation/PageHeader";

export const Route = createFileRoute("/admin/tests")({
  component: AdminTestsPage,
});

function AdminTestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Testes de Botões e Funções"
        description="Ambiente de diagnóstico e estresse funcional para validação exaustiva de cada ação e botão do sistema."
      />
      <AdminTestHub />
    </div>
  );
}
