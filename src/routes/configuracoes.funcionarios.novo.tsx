import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export const Route = createFileRoute("/configuracoes/funcionarios/novo")({
  validateSearch: (search: Record<string, unknown>): {
    returnTo?: string;
  } => ({
    ...(search.returnTo ? { returnTo: search.returnTo as string } : {}),
  }),
  component: NovoFuncionarioPage,
});

function NovoFuncionarioPage() {
  const { returnTo } = Route.useSearch();
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EmployeeForm returnTo={returnTo} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
