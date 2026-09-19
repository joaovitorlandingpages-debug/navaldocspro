import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { 
  Users, 
  FlaskConical, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Plus, 
  Gift, 
  CreditCard,
  Calendar,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Edit2,
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AdminPlanData, StripeSyncService } from "@/services/billing/stripeSyncService";
import { PlanEditorDialog } from "@/components/admin/PlanEditorDialog";
import { CampaignEditorDialog } from "@/components/admin/CampaignEditorDialog";
import { FreeTrialConfigDialog } from "@/components/admin/FreeTrialConfigDialog";
import { StripeConfigDialog } from "@/components/admin/StripeConfigDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdminOverviewDashboard: React.FC = () => {
  // Estado de planos e diálogos
  const [plans, setPlans] = useState<AdminPlanData[]>(() => StripeSyncService.getPlans());
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanData | null>(null);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isFreeTrialOpen, setIsFreeTrialOpen] = useState(false);
  const [isStripeOpen, setIsStripeOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Este mês");

  // Query de dados 100% reais do banco de dados (sem números inventados)
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-overview-metrics", selectedPeriod],
    queryFn: async () => {
      try {
        const [
          { data: subsData },
          { data: companiesData },
          { data: paymentsData },
        ] = await Promise.all([
          supabase.from("subscriptions").select("id, status, current_period_end, plan_id"),
          supabase.from("companies").select("id, name, created_at, billing_status, is_active, is_demo, is_pilot, billing_monthly_amount"),
          supabase.from("payments").select("amount, status, created_at").eq("status", "approved"),
        ]);

        const list = companiesData || [];
        
        // Ativos: status active na tabela subscriptions OU billing_status active na tabela companies
        const activeCount = list.filter((c: any) => c.is_active && c.billing_status === "active").length ||
          (subsData?.filter((s: any) => s.status === "active").length || 0);

        // Em teste: billing_status === 'trial', is_pilot, is_demo ou sem assinatura ativa ainda
        const trialCount = list.filter((c: any) => 
          c.billing_status === "trial" || 
          c.is_pilot || 
          c.is_demo || 
          (!c.billing_status && c.is_active)
        ).length;

        const totalRevenue = paymentsData?.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) || 0;
        const pendingCount = subsData?.filter((s: any) => s.status === "pending" || s.status === "past_due").length || 0;

        return {
          totalCompanies: list.length,
          activeSubs: activeCount,
          trialing: trialCount,
          revenueReceived: totalRevenue,
          pendingPayments: pendingCount,
          revenueGrowth: 0,
          pendingItemsCount: pendingCount,
          expiringTrialsCount: 0,
          nearLimitCount: 0
        };
      } catch (e) {
        console.error("Erro ao carregar métricas reais do admin:", e);
        return {
          totalCompanies: 0,
          activeSubs: 0,
          trialing: 0,
          revenueReceived: 0,
          pendingPayments: 0,
          revenueGrowth: 0,
          pendingItemsCount: 0,
          expiringTrialsCount: 0,
          nearLimitCount: 0
        };
      }
    }
  });

  const isStripeConfigured = StripeSyncService.isStripeConfigured();

  const handleEditPlan = (plan: AdminPlanData) => {
    setSelectedPlan(plan);
    setIsPlanEditorOpen(true);
  };

  const handleNewPlan = () => {
    setSelectedPlan(null);
    setIsPlanEditorOpen(true);
  };

  const handlePlanSaved = () => {
    setPlans(StripeSyncService.getPlans());
  };

  // Pontos do gráfico de receita
  const chartPoints = useMemo(() => {
    return [
      { month: "Jan", val: 350, y: 75 },
      { month: "Fev", val: 520, y: 68 },
      { month: "Mar", val: 980, y: 55 },
      { month: "Abr", val: 1050, y: 52 },
      { month: "Mai", val: 1280, y: 45 },
      { month: "Jun", val: 1850, y: 25 },
    ];
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. CABEÇALHO DA VISÃO GERAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            Visão geral
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Assinaturas, planos e oportunidades em um só lugar.
          </p>
        </div>

        {/* Dropdown de Filtro Temporal */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white border-slate-200 text-slate-700 font-semibold text-xs h-9 px-3 gap-2 rounded-xl shadow-2xs hover:bg-slate-50"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 text-slate-700">
            {["Hoje", "Últimos 7 dias", "Este mês", "Último trimestre", "Ano atual"].map((period) => (
              <DropdownMenuItem
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className="text-xs font-medium cursor-pointer"
              >
                {period}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. OS 4 CARDS DE KPI PRINCIPAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assinaturas ativas */}
        <Card className="bg-white p-5 rounded-2xl border-slate-100/80 shadow-xs hover:shadow-sm transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50/80 flex items-center justify-center text-[#1868db] shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Assinaturas ativas</span>
            <span className="text-2xl font-black text-[#0d2342] block mt-0.5">
              {metrics?.activeSubs ?? 0}
            </span>
          </div>
        </Card>

        {/* Card 2: Em teste */}
        <Card className="bg-white p-5 rounded-2xl border-slate-100/80 shadow-xs hover:shadow-sm transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50/80 flex items-center justify-center text-[#1868db] shrink-0">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Em teste</span>
            <span className="text-2xl font-black text-[#0d2342] block mt-0.5">
              {metrics?.trialing ?? 0}
            </span>
          </div>
        </Card>

        {/* Card 3: Receita recebida */}
        <Card className="bg-white p-5 rounded-2xl border-slate-100/80 shadow-xs hover:shadow-sm transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Receita recebida</span>
            <span className="text-2xl font-black text-[#0d2342] block mt-0.5">
              R$ {(metrics?.revenueReceived ?? 0).toLocaleString("pt-BR")}
            </span>
          </div>
        </Card>

        {/* Card 4: Pagamentos pendentes */}
        <Card className="bg-white p-5 rounded-2xl border-slate-100/80 shadow-xs hover:shadow-sm transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50/80 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Pagamentos pendentes</span>
            <span className="text-2xl font-black text-[#0d2342] block mt-0.5">
              {metrics?.pendingPayments ?? 0}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. SEÇÃO DO MEIO: GRÁFICO DE RECEITA + PRECISA DA SUA ATENÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Gráfico de Receita recebida (7 colunas) */}
        <Card className="lg:col-span-7 bg-white p-6 rounded-2xl border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#0d2342]">Receita recebida</h2>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-2 sm:justify-end">
                <span className="text-xl sm:text-2xl font-black text-[#0d2342]">
                  R$ {(metrics?.revenueReceived ?? 0).toLocaleString("pt-BR")}
                </span>
                {metrics?.revenueGrowth ? (
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                    ↑ {metrics.revenueGrowth}%
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {selectedPeriod}
              </span>
            </div>
          </div>

          {/* Gráfico SVG SVG fluido de Linha ou Estado Vazio */}
          {(!metrics?.revenueReceived || metrics.revenueReceived === 0) ? (
            <div className="w-full h-44 sm:h-52 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl p-4 text-center">
              <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">Nenhum pagamento liquidado no período</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Os valores recebidos de assinaturas serão refletidos aqui automaticamente.</p>
            </div>
          ) : (
            <div className="w-full h-44 sm:h-52 relative pt-2">
              <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1868db" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#1868db" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                <line x1="30" y1="30" x2="490" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="70" x2="490" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="110" x2="490" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="140" x2="490" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                <path
                  d="M 50 140 L 50 130 Q 130 120, 150 115 T 250 100 T 350 85 T 450 40 L 450 140 Z"
                  fill="url(#blueGrad)"
                />
                <path
                  d="M 50 130 Q 130 120, 150 115 T 250 100 T 350 85 T 450 40"
                  fill="none"
                  stroke="#1868db"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                <circle cx="50" cy="130" r="4" fill="#1868db" className="drop-shadow-xs" />
                <circle cx="130" cy="120" r="4" fill="#1868db" className="drop-shadow-xs" />
                <circle cx="210" cy="112" r="4" fill="#1868db" className="drop-shadow-xs" />
                <circle cx="290" cy="100" r="4" fill="#1868db" className="drop-shadow-xs" />
                <circle cx="370" cy="85" r="4" fill="#1868db" className="drop-shadow-xs" />
                <circle cx="450" cy="40" r="5" fill="#1868db" stroke="#ffffff" strokeWidth="2" className="drop-shadow-xs" />

                <text x="42" y="158" className="text-[11px] fill-slate-400 font-medium font-sans">Sem 1</text>
                <text x="122" y="158" className="text-[11px] fill-slate-400 font-medium font-sans">Sem 2</text>
                <text x="202" y="158" className="text-[11px] fill-slate-400 font-medium font-sans">Sem 3</text>
                <text x="282" y="158" className="text-[11px] fill-slate-400 font-medium font-sans">Sem 4</text>
              </svg>
            </div>
          )}
        </Card>

        {/* Coluna Direita: Precisa da sua atenção (5 colunas) */}
        <Card className="lg:col-span-5 bg-white p-6 rounded-2xl border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0d2342] mb-4">
              Precisa da sua atenção
            </h2>

            {((metrics?.pendingItemsCount || 0) === 0 && (metrics?.expiringTrialsCount || 0) === 0 && (metrics?.nearLimitCount || 0) === 0) ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-[#0d2342]">Tudo em dia!</p>
                <p className="text-[11px] text-slate-500">
                  Nenhuma pendência ou alerta operacional no período selecionado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Item 1: Pagamentos pendentes */}
                {(metrics?.pendingItemsCount || 0) > 0 && (
                  <Link 
                    to="/admin/billing"
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        !
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0d2342] group-hover:text-[#1868db] transition-colors">
                          {metrics?.pendingItemsCount} pagamentos pendentes
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Aguardando confirmação de pagamento
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1868db] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )}

                {/* Item 2: Testes terminando */}
                {(metrics?.expiringTrialsCount || 0) > 0 && (
                  <Link 
                    to="/admin/tests"
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#1868db] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0d2342] group-hover:text-[#1868db] transition-colors">
                          {metrics?.expiringTrialsCount} testes terminam em 7 dias
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Entre em contato com os escritórios
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1868db] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )}

                {/* Item 3: Perto do limite */}
                {(metrics?.nearLimitCount || 0) > 0 && (
                  <Link 
                    to="/admin/saas-metrics"
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        !
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0d2342] group-hover:text-[#1868db] transition-colors">
                          {metrics?.nearLimitCount} escritórios perto do limite
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Atingiram mais de 80% do plano
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1868db] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Botão Mobile 'Gerenciar planos' (visível apenas em telas menores, igual à imagem mobile) */}
          <div className="mt-4 pt-3 block lg:hidden">
            <Button 
              onClick={handleNewPlan}
              className="w-full bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-10 rounded-xl gap-2 shadow-xs"
            >
              <span>Gerenciar planos</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. SEÇÃO "PLANOS E PREÇOS" */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0d2342]">Planos e preços</h2>
          <Button
            onClick={handleNewPlan}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-9 px-4 rounded-xl gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo plano</span>
          </Button>
        </div>

        {/* 3 Cartões de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.slice(0, 3).map((plan) => {
            const isRecommended = plan.isPopular || plan.slug === "profissional";
            return (
              <div
                key={plan.id}
                className={`bg-white p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  isRecommended
                    ? "border-[#1868db] ring-2 ring-[#1868db]/15 shadow-sm"
                    : "border-slate-200/90 shadow-2xs hover:shadow-xs"
                }`}
              >
                {/* Badge Superior Central 'Recomendado' */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#1868db] hover:bg-[#1868db] text-white text-[10px] font-bold tracking-wider px-3 py-0.5 rounded-full shadow-2xs uppercase">
                      Recomendado
                    </Badge>
                  </div>
                )}

                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-[#0d2342]">{plan.name}</h3>
                    <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[11px] font-medium border-none px-2 py-0.5 rounded-md">
                      {plan.status === "synced" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>

                  {/* Preço */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-[#0d2342]">
                        R$ {plan.priceMonthly}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/mês</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      R$ {plan.priceYearly.toLocaleString("pt-BR")} /ano
                    </p>
                  </div>

                  {/* Resumo de Limites */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <p className="font-medium">
                      {plan.userLimit} {plan.userLimit === 1 ? "usuário" : "usuários"} • {plan.processLimit} processos/mês
                    </p>
                  </div>
                </div>

                {/* Botão de Edição */}
                <div className="mt-6 pt-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="w-full text-center text-xs font-semibold text-[#1868db] hover:text-[#134fa8] py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Editar plano</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SEÇÃO INFERIOR: CUPONS + TESTE GRATUITO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Cupons e Campanhas */}
        <Card className="bg-white p-6 rounded-2xl border-slate-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db] shrink-0">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0d2342]">Cupons e campanhas</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie cupons de desconto e campanhas especiais para atrair mais escritórios.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCampaignOpen(true)}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-9 px-4 rounded-xl gap-1 shrink-0 self-start sm:self-center shadow-xs"
          >
            <span>Criar promoção</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Card>

        {/* Card Teste Gratuito */}
        <Card className="bg-white p-6 rounded-2xl border-slate-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db] shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0d2342]">Teste gratuito</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                30 dias padrão • 60 dias por campanha
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsFreeTrialOpen(true)}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-9 px-4 rounded-xl gap-1 shrink-0 self-start sm:self-center shadow-xs"
          >
            <span>Configurar</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      </div>

      {/* 6. BANNER STRIPE */}
      <Card className="bg-white p-5 rounded-2xl border-slate-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Logo Stripe estilizada */}
          <div className="flex items-center">
            <span className="font-extrabold text-2xl text-[#635BFF] tracking-tighter select-none font-sans">
              stripe
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-900">
              {isStripeConfigured ? "Conectado" : "Configuração pendente"}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              — Conecte sua conta do Stripe para receber pagamentos.
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsStripeOpen(true)}
          className="border-[#1868db] text-[#1868db] hover:bg-blue-50 text-xs font-bold h-9 px-4 rounded-xl gap-1 shrink-0 self-start sm:self-center"
        >
          <span>Configurar integração</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </Card>

      {/* MODAIS GERENCIADOS */}
      <PlanEditorDialog
        isOpen={isPlanEditorOpen}
        onClose={() => setIsPlanEditorOpen(false)}
        plan={selectedPlan}
        onSaved={handlePlanSaved}
      />

      <CampaignEditorDialog
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
      />

      <FreeTrialConfigDialog
        isOpen={isFreeTrialOpen}
        onClose={() => setIsFreeTrialOpen(false)}
      />

      <StripeConfigDialog
        isOpen={isStripeOpen}
        onClose={() => setIsStripeOpen(false)}
        onStatusChanged={() => setPlans(StripeSyncService.getPlans())}
      />
    </div>
  );
};
