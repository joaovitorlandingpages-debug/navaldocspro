import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export const Route = createFileRoute("/configuracoes/funcionarios/$id")({
  validateSearch: (search: Record<string, unknown>): {
    returnTo?: string;
  } => ({
    ...(search.returnTo ? { returnTo: search.returnTo as string } : {}),
  }),
  component: EmployeeEditPage,
});

function EmployeeEditPage() {
  const { id } = Route.useParams();
  const { returnTo } = Route.useSearch();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EmployeeForm employeeId={id} returnTo={returnTo} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
