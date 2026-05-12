import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardView } from "../admin";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardView,
});
