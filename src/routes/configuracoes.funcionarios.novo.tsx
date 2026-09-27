import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

export const Route = createFileRoute("/configuracoes/funcionarios/novo")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <EmployeeForm />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});
