import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminRedirect,
});

/**
 * Redirecionamento da rota legada /super-admin para o painel oficial /admin.
 */
function SuperAdminRedirect() {
  return <Navigate to="/admin" replace />;
}
