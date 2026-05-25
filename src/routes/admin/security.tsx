import { createFileRoute } from "@tanstack/react-router";
import SecurityDashboard from "@/pages/admin/Security";

export const Route = createFileRoute("/admin/security")({
  component: SecurityDashboard,
});
