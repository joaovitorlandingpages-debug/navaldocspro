import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gauge, ShoppingCart, RefreshCw, AlertTriangle } from "lucide-react";
import { useResourceStatus } from "@/hooks/useLimits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/navigation/PageHeader";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/consumo")({
  component: ConsumoPage,
});

function fmt(used: number, limit: number | null, unit: string) {
  if (limit === null) return `${used} / ∞ ${unit === "request" ? "" : unit}`.trim();
  return `${used} / ${limit} ${unit === "request" ? "" : unit}`.trim();
}

function statusColor(p: number) {
  if (p >= 100) return "bg-rose-500";
  if (p >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function ConsumoPage() {
  const { data, isLoading, refetch, isFetching } = useResourceStatus();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <PageHeader
        title="Consumo da Empresa"
        description="Acompanhe em tempo real o uso de cada recurso do NavalDocs Pro."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        }
      />

      {isLoading && <Card className="p-6 text-sm text-muted-foreground">Carregando consumo...</Card>}

      {!isLoading && (!data || data.length === 0) && (
        <Card className="p-10 text-center text-muted-foreground">
          <Gauge className="h-8 w-8 mx-auto mb-3 opacity-50" />
          Nenhum recurso configurado para o plano atual.
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((r) => {
          const dayPct = Math.min(100, r.percent_day);
          const monPct = Math.min(100, r.percent_month);
          const critical = r.percent_month >= 100 || r.percent_day >= 100;
          const warning = !critical && (r.percent_month >= 80 || r.percent_day >= 80);
          return (
            <Card key={r.resource_key} className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base">{r.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renova {formatDistanceToNow(new Date(r.renews_at), { locale: ptBR, addSuffix: true })}
                    {" · "}{format(new Date(r.renews_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                {critical && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Esgotado</Badge>}
                {warning && <Badge className="bg-amber-500 hover:bg-amber-500/90 gap-1"><AlertTriangle className="h-3 w-3" /> Atenção</Badge>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Hoje</span>
                  <span className="font-medium tabular-nums">{fmt(r.daily_used, r.daily_limit, r.unit)}</span>
                </div>
                <Progress value={dayPct} className={`h-2 [&>div]:${statusColor(r.percent_day)}`} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Mês</span>
                  <span className="font-medium tabular-nums">{fmt(r.monthly_used, r.monthly_limit, r.unit)}</span>
                </div>
                <Progress value={monPct} className="h-2" indicatorClassName={statusColor(r.percent_month)} />
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.percent_month.toFixed(1)}% do limite mensal</span>
                <Button size="sm" variant="outline" disabled className="gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" /> Pacote adicional <Badge variant="secondary" className="ml-1 text-[10px]">em breve</Badge>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 text-xs text-muted-foreground">
        Limites são consultados em tempo real pelo <strong>Limits Engine</strong> antes de cada operação (OCR, geração de PDF, dossiê, assinatura, upload). Para aumentar a capacidade sem trocar de plano, contrate um pacote adicional quando disponível.
      </Card>
    </div>
  );
}
