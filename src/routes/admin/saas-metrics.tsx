import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Onda 3B.1 — lazy load: SaaSMetrics é rota admin pesada (charts, KPIs).
const AdminSaaSMetrics = lazy(() => import("@/pages/admin/SaaSMetrics"));

export const Route = createFileRoute("/admin/saas-metrics")({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AdminSaaSMetrics />
    </Suspense>
  ),
});
