import { createFileRoute } from "@tanstack/react-router";
import ExecutiveOverview from "@/pages/admin/ExecutiveOverview";

export const Route = createFileRoute("/admin/executive-overview")({
  component: ExecutiveOverview,
});
