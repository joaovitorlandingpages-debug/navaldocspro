import { createFileRoute, redirect } from "@tanstack/react-router";

// Sprint 4D.2.d — Fatia B: redirect legado → rota canônica.
// Observação: gestão de tipos de processo (Modelos de Processo) será
// reincorporada como aba interna em /admin/templates numa fatia futura.
export const Route = createFileRoute("/admin/modelos-processo")({
  beforeLoad: () => { throw redirect({ to: "/admin/templates", replace: true }); },
});
