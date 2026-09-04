import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";

export const Route = createFileRoute("/orcamentos")({
  component: OrcamentosRoute,
});

function OrcamentosRoute() {
  return (
    <SubscriptionGuard>
      <Navigate to="/document-generator" />
    </SubscriptionGuard>
  );
}
