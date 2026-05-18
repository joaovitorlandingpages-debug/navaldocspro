import { createFileRoute } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';

export const Route = createFileRoute('/admin/billing')({
  component: AdminBilling,
});

function AdminBilling() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Gestão Financeira</h1>
        <p className="text-muted-foreground font-medium">Monitoramento de receitas e assinaturas globais.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">+0% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">0</div>
            <p className="text-xs text-muted-foreground">Empresas pagantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Churn</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">0%</div>
            <p className="text-xs text-muted-foreground">Cancelamentos este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Médio</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Por assinatura</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Aguardando primeiros pagamentos reais via Mercado Pago.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
