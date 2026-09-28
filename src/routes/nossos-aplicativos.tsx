import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { MeusAplicativosPage } from "@/routes/meus-aplicativos";

export const Route = createFileRoute("/nossos-aplicativos")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <MeusAplicativosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});
