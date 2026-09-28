import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { AjudaESugestoesPage } from "@/routes/sugestoes";

export const Route = createFileRoute("/support")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <AjudaESugestoesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});
