import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { PrimeirosPassosPage } from "@/routes/getting-started";

export const Route = createFileRoute("/primeiros-passos")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <PrimeirosPassosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
  head: () => ({
    meta: [
      { title: "Primeiros passos — NavalDocs Pro" },
      { name: "description", content: "Guia passo a passo para emitir seu primeiro documento náutico oficial." }
    ]
  })
});
