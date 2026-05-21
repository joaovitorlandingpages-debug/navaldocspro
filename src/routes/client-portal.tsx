import { createFileRoute } from "@tanstack/react-router";
import ClientPortal from "@/pages/ClientPortal";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/client-portal")({
  component: () => (
    <ProtectedRoute>
      <ClientPortal />
    </ProtectedRoute>
  ),
});
