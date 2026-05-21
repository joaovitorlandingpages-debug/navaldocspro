import { createFileRoute } from "@tanstack/react-router";
import SecurityCenter from "@/pages/dashboard/SecurityCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/dashboard/security")({
  component: () => (
    <ProtectedRoute>
      <SecurityCenter />
    </ProtectedRoute>
  ),
});
