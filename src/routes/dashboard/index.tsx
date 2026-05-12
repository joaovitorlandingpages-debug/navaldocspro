import { createFileRoute } from "@tanstack/react-router";
import { DashboardContent } from "../dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardContent,
});
