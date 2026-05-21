import { createFileRoute } from "@tanstack/react-router";
import AdminSupport from "@/pages/admin/Support";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupport,
});
