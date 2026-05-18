import React from 'react';
import { Check, ArrowRight, Zap, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Plans = () => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);

  const plans = [
    {
      id: 'start-id', // Would be fetched from DB
      name: 'Start',
      price: '149,90',
      description: 'Ideal para quem está começando',
      icon: Zap,
      features: ['1 Usuário', 'Até 10 Clientes', '50 Documentos/mês', '20 OCRs/mês'],
      color: 'blue'
    },
    {
      id: 'professional-id',
      name: 'Professional',
      price: '299,90',
      description: 'Para empresas em crescimento',
      icon: Shield,
      features: ['5 Usuários', 'Até 50 Clientes', '250 Documentos/mês', '100 OCRs/mês', 'Suporte Prioritário'],
      color: 'indigo',
      popular: true
    },
    {
      id: 'enterprise-id',
      name: 'Enterprise',
      price: '899,90',
      description: 'Escalabilidade máxima',
      icon: Crown,
      features: ['20 Usuários', 'Até 500 Clientes', '2000 Documentos/mês', '1000 OCRs/mês', 'Gerente de Conta'],
      color: 'purple'
    }
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para assinar.",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to create checkout
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan_id: planId, company_id: user.user_metadata?.company_id }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Planos e Assinaturas</h1>
        <p className="text-xl text-slate-600">Escolha o plano ideal para o seu negócio naval</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative overflow-hidden border-2 ${plan.popular ? 'border-indigo-500 shadow-xl scale-105' : 'border-slate-200'}`}>
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                Mais Popular
              </div>
            )}
            <CardHeader className="pb-8">
              <div className={`w-12 h-12 rounded-lg bg-${plan.color}-100 flex items-center justify-center mb-4`}>
                <plan.icon className={`text-${plan.color}-600`} size={24} />
              </div>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ {plan.price}</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-600">
                    <Check size={18} className="text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full h-12 text-lg font-semibold ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
              >
                {loading === plan.id ? 'Processando...' : 'Assinar Agora'}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Plans;
