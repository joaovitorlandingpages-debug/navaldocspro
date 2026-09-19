import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewDashboard } from "@/components/admin/AdminOverviewDashboard";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewDashboard,
});
