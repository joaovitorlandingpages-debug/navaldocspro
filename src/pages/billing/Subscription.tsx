import { createFileRoute } from "@tanstack/react-router";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Ship, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/billing/subscription")({
  component: SubscriptionUsage,
});

export default function SubscriptionUsage() {
  console.log("BILLING_PAGE_OK");
  console.log("BILLING_STABLE");

  const { subscription, checkLimit, isLoading } = usePlanLimits();

  const { data: usageData } = useQuery({
    queryKey: ["subscription-usage"],
    queryFn: async () => {
      const resources = ['customers', 'vessels', 'processes', 'documents', 'ocr', 'users'] as const;
      const results = await Promise.all(resources.map(r => checkLimit(r)));
      return resources.reduce((acc, resource, index) => {
        acc[resource] = results[index];
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!subscription
  });

  const resourceMetadata = {
    customers: { label: "Clientes", icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
    vessels: { label: "Embarcações", icon: <Ship className="h-4 w-4" />, color: "text-cyan-500" },
    processes: { label: "Processos", icon: <TrendingUp className="h-4 w-4" />, color: "text-amber-500" },
    documents: { label: "Documentos", icon: <FileText className="h-4 w-4" />, color: "text-indigo-500" },
    ocr: { label: "Leituras OCR", icon: <Zap className="h-4 w-4" />, color: "text-purple-500" },
    users: { label: "Usuários", icon: <Users className="h-4 w-4" />, color: "text-emerald-500" }
  };

  if (isLoading) {
    return <div className="p-8 text-center italic text-slate-400">Carregando dados de uso...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> Uso do Plano
          </h1>
          <p className="text-slate-500 font-medium italic">Acompanhamento de cotas e limites da empresa</p>
        </div>
        
        {subscription?.plan && (
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 bg-navy rounded-xl flex items-center justify-center text-white font-black text-xs">
                    {subscription.plan.name.charAt(0)}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</p>
                    <p className="text-sm font-black text-navy uppercase">{subscription.plan.name}</p>
                </div>
                <Link to="/billing/plans">
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary">Alterar</Button>
                </Link>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(resourceMetadata).map(([key, meta]) => {
          const usage = usageData?.[key];
          const percentage = usage?.limit ? (usage.current / usage.limit) * 100 : 0;
          const isWarning = percentage >= 80;
          const isCritical = percentage >= 100;

          return (
            <Card key={key} className="p-6 border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-2.5 rounded-xl bg-slate-50 ${meta.color} group-hover:scale-110 transition-transform`}>
                  {meta.icon}
                </div>
                {isCritical ? (
                    <Badge className="bg-rose-100 text-rose-600 border-none text-[9px] font-black uppercase tracking-widest">Esgotado</Badge>
                ) : isWarning ? (
                    <Badge className="bg-amber-100 text-amber-600 border-none text-[9px] font-black uppercase tracking-widest">Crítico</Badge>
                ) : (
                    <Badge className="bg-emerald-100 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest">Normal</Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <h3 className="text-xs font-black text-navy uppercase tracking-widest">{meta.label}</h3>
                    <p className="text-xl font-black text-navy">{usage?.current || 0} <span className="text-slate-300 text-sm">/ {usage?.limit || '∞'}</span></p>
                </div>
                <Progress 
                    value={percentage} 
                    className={`h-2 ${isCritical ? 'bg-rose-100' : isWarning ? 'bg-amber-100' : 'bg-slate-100'}`}
                />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {isCritical ? "Faça upgrade para adicionar mais" : `${Math.round(100 - percentage)}% de cota disponível`}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-8 border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-navy uppercase tracking-widest text-xs flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Histórico da Assinatura
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-50 text-sm">
                <span className="text-slate-500 font-medium">Status</span>
                <Badge className={`${
                    subscription?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                } text-white font-black uppercase text-[10px]`}>
                    {subscription?.status || 'Pendente'}
                </Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-50 text-sm">
                <span className="text-slate-500 font-medium">Próximo Vencimento</span>
                <span className="font-bold text-navy">
                    {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '---'}
                </span>
            </div>
            <div className="flex justify-between items-center py-3 text-sm">
                <span className="text-slate-500 font-medium">Renovação Automática</span>
                <span className="font-bold text-navy">{subscription?.cancel_at_period_end ? 'Inativa' : 'Ativa'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-8 border-slate-100 shadow-sm space-y-6 bg-navy text-white relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
             <TrendingUp className="h-48 w-48" />
          </div>
          <div className="relative z-10 space-y-6">
            <div>
                <h3 className="font-black uppercase tracking-widest text-xs text-primary mb-2">Potencialize sua empresa</h3>
                <h4 className="text-2xl font-black leading-tight">Precisa de mais limites ou recursos exclusivos?</h4>
            </div>
            <p className="text-white/60 text-sm leading-relaxed font-medium">
                Nossos planos Professional e Enterprise oferecem cotas maiores, suporte dedicado e ferramentas avançadas de automação.
            </p>
            <div className="pt-4 flex gap-4">
                <Link to="/billing/plans" className="flex-1">
                    <Button className="w-full h-12 bg-white text-navy hover:bg-slate-100 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                        <ArrowUpCircle className="h-4 w-4" /> Ver Planos
                    </Button>
                </Link>
                <Button variant="outline" className="flex-1 h-12 border-white/20 text-white hover:bg-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                    Suporte
                </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4">
        <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
            <p className="text-xs font-black text-navy uppercase tracking-tight">Sincronização em Tempo Real</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Seu uso é atualizado instantaneamente conforme você utiliza a plataforma.</p>
        </div>
      </div>
    </div>
  );
}
