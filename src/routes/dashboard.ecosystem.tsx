import { createFileRoute } from "@tanstack/react-router";
import EcosystemPage from "@/pages/ecosystem/Ecosystem";

export const Route = createFileRoute("/dashboard/ecosystem")({
  component: EcosystemPage,
});
