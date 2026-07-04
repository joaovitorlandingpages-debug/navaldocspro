import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Onda 3B.1 — lazy load: Biblioteca Documental é rota admin pesada.
const DocumentLibraryPage = lazy(() => import("@/pages/admin/DocumentLibraryPage"));

export const Route = createFileRoute("/admin/document-library")({
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <DocumentLibraryPage />
      </Suspense>
    </ProtectedRoute>
  ),
});
