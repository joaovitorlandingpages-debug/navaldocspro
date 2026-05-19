import { createFileRoute } from "@tanstack/react-router";
import ComplianceCenter from "@/pages/dashboard/ComplianceCenter";

export const Route = createFileRoute("/dashboard/compliance-center")({
  component: ComplianceCenter,
});
