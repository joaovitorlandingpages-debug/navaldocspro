import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";

export const Route = createFileRoute("/ordens")({
  component: OrdensRoute,
});

function OrdensRoute() {
  return (
    <SubscriptionGuard>
      <Navigate to="/processes" />
    </SubscriptionGuard>
  );
}
