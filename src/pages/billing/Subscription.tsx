import React from 'react';
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

const Subscription = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('company_id', user.user_metadata?.company_id)
          .maybeSingle();

        if (data) setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(null);
      }
    };

    fetchSubscription();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando assinatura...</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Gerenciar Assinatura</h1>

      {!subscription ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
            <h2 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h2>
            <p className="text-slate-600 mb-6">Você ainda não possui um plano contratado para sua empresa.</p>
            <Button onClick={() => navigate({ to: '/plans' })}>
              Ver Planos Disponíveis
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-2xl font-bold">{subscription.plans.name}</CardTitle>
                <p className="text-slate-500">Seu plano atual</p>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {subscription.status === 'active' ? 'Ativo' : subscription.status}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-slate-400" size={20} />
                    <div>
                      <p className="text-sm text-slate-500">Próxima cobrança</p>
                      <p className="font-medium">
                        {subscription.current_period_end 
                          ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-slate-400" size={20} />
                    <div>
                      <p className="text-sm text-slate-500">Valor mensal</p>
                      <p className="font-medium">R$ {subscription.plans.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Limite de Clientes</span>
                      <span className="font-medium">Usando 0 / {subscription.plans.customer_limit}</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">OCRs Realizados</span>
                      <span className="font-medium">Usando 0 / {subscription.plans.ocr_limit}</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t flex justify-between pt-4">
              <Button variant="outline" onClick={() => navigate({ to: '/plans' })}>
                Alterar Plano
              </Button>
              <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Cancelar Assinatura
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                Nenhum pagamento registrado ainda.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Subscription;
