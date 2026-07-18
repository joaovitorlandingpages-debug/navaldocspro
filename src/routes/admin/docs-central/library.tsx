import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { ArrowRight, Library } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/library")({
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <div>
      <PageTitle title="Biblioteca Nacional" description="Enterprise Documentation Central v2.0" />
      <Card className="p-6 border-slate-100 flex items-center gap-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Library className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">Biblioteca oficial</p>
          <p className="text-xs text-slate-500 mt-1">Modelos padronizados nacionais para importação e uso corporativo.</p>
        </div>
        <Link to={"/documentos/biblioteca" as any} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Abrir <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
