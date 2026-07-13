import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { ArrowRight, Store } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/marketplace")({
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <div>
      <PageTitle title="Marketplace" description="Templates públicos disponíveis para todas as empresas" />
      <Card className="p-6 border-slate-100 flex items-center gap-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">Catálogo Marketplace</p>
          <p className="text-xs text-slate-500 mt-1">Acesse a experiência completa de marketplace com filtros, avaliações e download.</p>
        </div>
        <Link to={"/templates/marketplace" as any} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Abrir <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
