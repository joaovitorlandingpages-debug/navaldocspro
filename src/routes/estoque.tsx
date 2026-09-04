import { createFileRoute, Link } from "@tanstack/react-router";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes, Plus, Package, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/estoque" as any)({
  component: EstoqueRoute,
});

function EstoqueRoute() {
  return (
    <SubscriptionGuard>
      <EstoqueView />
    </SubscriptionGuard>
  );
}

function EstoqueView() {
  const [search, setSearch] = useState("");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Estoque & Materiais Navais</h1>
            <p className="text-xs text-muted-foreground">
              Controle de peças, suprimentos e peças de reposição para ordens de serviço.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar
            </Link>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Peça / Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, peça ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-semibold">Módulo de Estoque Pronto para Uso</CardTitle>
          <CardDescription className="text-xs max-w-sm mt-1">
            Cadastre peças e componentes navais para vincular diretamente aos custos e checklist das suas Ordens de Serviço.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
