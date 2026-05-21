import { createFileRoute } from "@tanstack/react-router";
import AdminSaaSMetrics from "@/pages/admin/SaaSMetrics";

export const Route = createFileRoute("/admin/saas-metrics")({
  component: AdminSaaSMetrics,
});
