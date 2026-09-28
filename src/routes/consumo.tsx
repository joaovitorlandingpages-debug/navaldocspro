import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { UsoDoPlanoPage } from "@/routes/uso-do-plano";

export const Route = createFileRoute("/consumo")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <UsoDoPlanoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});
