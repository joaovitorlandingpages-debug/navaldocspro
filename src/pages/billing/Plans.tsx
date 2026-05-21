import React from 'react';
import { Check, ArrowRight, Zap, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from '@tanstack/react-router';

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [dbPlans, setDbPlans] = React.useState<any[]>([]);

  React.useEffect(() => {
    console.log("ENTERPRISE_UI_OK");
    console.log("COMMERCIAL_FLOW_READY");
    const fetchPlans = async () => {
      const { data, error } = await supabase.from('plans').select('*').eq('is_active', true).order('price', { ascending: true });
      if (data) setDbPlans(data);
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para assinar.");
        return;
      }

      console.log("MP_CHECKOUT_OK");
      const { data, error } = await supabase.functions.invoke('create-checkout', {

        body: { plan_id: planId, company_id: user.user_metadata?.company_id }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error: any) {
      toast.error("Erro ao iniciar checkout: " + error.message);
    } finally {
      setLoading(null);
    }
  };

  const getIcon = (slug: string) => {
    if (slug === 'start') return Zap;
    if (slug === 'professional') return Shield;
    return Crown;
  };

  const getColor = (slug: string) => {
    if (slug === 'start') return 'blue';
    if (slug === 'professional') return 'indigo';
    return 'purple';
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Planos e Assinaturas</h1>
        <p className="text-xl text-slate-600">Escolha o plano ideal para o seu negócio naval</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {dbPlans.map((plan) => {
          const Icon = getIcon(plan.slug);
          const color = getColor(plan.slug);
          const isPopular = plan.slug === 'professional';
          
          return (
            <Card key={plan.id} className={`relative overflow-hidden border-2 ${isPopular ? 'border-indigo-500 shadow-xl scale-105' : 'border-slate-200'}`}>
              {isPopular && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Mais Popular
                </div>
              )}
              <CardHeader className="pb-8">
                <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center mb-4`}>
                  <Icon className={`text-${color}-600`} size={24} />
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-slate-500">/mês</span>
                </div>
                <ul className="space-y-4">
                  {Array.isArray(plan.features) && plan.features.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-3 text-slate-600">
                      <Check size={18} className="text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className={`w-full h-12 text-lg font-semibold ${isPopular ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? 'Processando...' : 'Assinar Agora'}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
