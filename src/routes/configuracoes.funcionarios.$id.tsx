import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export const Route = createFileRoute("/configuracoes/funcionarios/$id")({
  component: EmployeeEditPage,
});

function EmployeeEditPage() {
  const { id } = Route.useParams();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EmployeeForm employeeId={id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
