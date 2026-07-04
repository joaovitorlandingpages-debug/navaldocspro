import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Onda 3B.1 — lazy load: System Report é rota admin pesada (queries + charts).
const SystemReport = lazy(() => import("@/pages/admin/SystemReportPage"));

export const Route = createFileRoute("/admin/system-report")({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SystemReport />
    </Suspense>
  ),
});
