import { createFileRoute, redirect } from "@tanstack/react-router";

// Sprint 4D.2.d — Fatia B: redirect legado → rota canônica.
export const Route = createFileRoute("/admin/document-library")({
  beforeLoad: () => { throw redirect({ to: "/admin/templates", replace: true }); },
});
