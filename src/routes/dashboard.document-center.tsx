import { createFileRoute } from "@tanstack/react-router";
import DocumentCenter from "@/pages/dashboard/DocumentCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/dashboard/document-center")({
  component: () => (
    <ProtectedRoute>
      <DocumentCenter />
    </ProtectedRoute>
  ),
});
