import { createFileRoute } from "@tanstack/react-router";
import AdminRoadmap from "@/pages/admin/Roadmap";

export const Route = createFileRoute("/admin/roadmap")({
  component: AdminRoadmap,
});
