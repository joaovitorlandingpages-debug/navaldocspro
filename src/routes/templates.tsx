import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Sparkles, Gift, Store, FolderHeart } from "lucide-react";

export const Route = createFileRoute("/templates")({
  component: () => (
    <ProtectedRoute>
      <TemplatesLayout />
    </ProtectedRoute>
  ),
});

function TemplatesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/templates/gratuitos", label: "Gratuitos", icon: Gift },
    { to: "/templates/marketplace", label: "Marketplace", icon: Store },
    { to: "/templates/meus", label: "Meus Templates", icon: FolderHeart },
  ] as const;
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Templates" subtitle="Catálogo premium de documentos navais" icon={Sparkles} />
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
