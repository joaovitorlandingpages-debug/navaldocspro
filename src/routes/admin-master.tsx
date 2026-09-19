import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin-master")({
  component: AdminMasterRedirect,
});

/**
 * Redirecionamento canônico e transparente da rota legada /admin-master para o novo painel oficial /admin.
 * Garante que qualquer acesso, link salvo ou visualização no Lovable abra imediatamente o novo painel.
 */
function AdminMasterRedirect() {
  return <Navigate to="/admin" replace />;
}
