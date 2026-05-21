import { createFileRoute } from "@tanstack/react-router";
import DeadlineCenter from "@/pages/dashboard/DeadlineCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/dashboard/deadlines")({
  component: () => (
    <ProtectedRoute>
      <DeadlineCenter />
    </ProtectedRoute>
  ),
});
