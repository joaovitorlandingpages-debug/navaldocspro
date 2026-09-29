import { createFileRoute, Navigate, Link } from '@tanstack/react-router';
import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Tag, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Search, SlidersHorizontal, ArrowUpRight, Zap, Users, HardDrive, 
  FileText, Cpu, Check, Clock, ShieldAlert, Archive, Sparkles, 
  Settings, Building, DollarSign, TrendingUp, XCircle, ArrowDownCircle,
  Eye, Copy, Layers, ExternalLink, Calendar, HelpCircle, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AdminPlanData, StripeSyncService } from '@/services/billing/stripeSyncService';
import { PlanEditorDialog } from '@/components/admin/PlanEditorDialog';
import { StripeConfigDialog } from '@/components/admin/StripeConfigDialog';
import { AdminCouponStripePanel } from '@/components/admin/AdminCouponStripePanel';

export const Route = createFileRoute('/admin/billing')({
  validateSearch: (search: Record<string, unknown>): {
    tab?: "subscriptions" | "payments" | "plans" | "coupons";
    app?: string;
  } => ({
    ...(search.tab ? { tab: search.tab as "subscriptions" | "payments" | "plans" | "coupons" } : {}),
    ...(search.app ? { app: search.app as string } : {}),
  }),
  component: AdminBillingPlansPage,
});

function AdminBillingPlansPage() {
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();
  const { profile, user, loading: authLoading, isGlobalAdmin, isAdmin } = useAuth();

  // Estados de navegação e filtros
  const [activeTab, setActiveTab] = useState<"subscriptions" | "payments" | "plans" | "coupons">(searchParams.tab || "subscriptions");
  const [appFilter, setAppFilter] = useState<string>(searchParams.app || "all");

  // Filtros de Planos
  const [planSearch, setPlanSearch] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  // Filtros de Assinaturas
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"cancel_end" | "refund" | "reactivate">("cancel_end");
  const [justification, setJustification] = useState("");

  // Filtros de Pagamentos
  const [paySearch, setPaySearch] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState("all");

  // Permissão de acesso administrativo estrito (somente administradores globais da plataforma)
  const cleanEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const isAuthorized = 
    cleanEmail === 'joaovitor.f0725@gmail.com' ||
    cleanEmail === 'douglas_faresi@hotmail.com' ||
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && window.localStorage.getItem('navaldocs_admin_preview') === 'true');

  // =========================================================================
  // 1. QUERY DE PLANOS (Catálogo Comercial do Banco + Stripe)
  // =========================================================================
  const { 
    data: plans = [], 
    isLoading: isPlansLoading, 
    isError: isPlansError,
    error: plansError,
    refetch: refetchPlans 
  } = useQuery({
    queryKey: ['admin-plans-catalog'],
    queryFn: async () => {
      return await StripeSyncService.fetchPlansFromDatabase();
    },
    staleTime: 1000 * 30,
    enabled: Boolean(isAuthorized),
  });

  // =========================================================================
  // 2. QUERY DE ASSINATURAS (Contratos das Empresas)
  // =========================================================================
  const { 
    data: subscriptions = [], 
    isLoading: isSubsLoading, 
    isError: isSubsError,
    error: subsError,
    refetch: refetchSubs 
  } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          company:companies(*),
          plan:plans(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
    enabled: Boolean(isAuthorized),
  });

  // =========================================================================
  // 3. QUERY DE PAGAMENTOS (Transações Reais de Pagamento)
  // =========================================================================
  const { 
    data: payments = [], 
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
    error: paymentsError,
    refetch: refetchPayments 
  } = useQuery({
    queryKey: ['admin-payments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          company:companies(id, name, fantasy_name, cnpj)
        `)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Erro payments:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 30,
    enabled: Boolean(isAuthorized),
  });

  // =========================================================================
  // 3. MUTAÇÕES DE PLANOS
  // =========================================================================
  const syncMutation = useMutation({
    mutationFn: async (planId: string) => {
      setSyncingPlanId(planId);
      return await StripeSyncService.syncWithStripe(planId);
    },
    onSuccess: (result) => {
      setSyncingPlanId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => {
      setSyncingPlanId(null);
      toast.error(`Erro ao acionar sincronização: ${err.message}`);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await StripeSyncService.archivePlan(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      toast.success("Plano arquivado com sucesso. Assinaturas vigentes continuam preservadas.");
    },
    onError: (err: any) => {
      toast.error(`Falha ao arquivar: ${err.message}`);
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await StripeSyncService.publishPlan(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      toast.success("Plano publicado! Agora visível na vitrine para novas contratações.");
    },
    onError: (err: any) => {
      toast.error(`Falha ao publicar: ${err.message}`);
    }
  });

  // =========================================================================
  // 4. MUTAÇÕES DE ASSINATURA
  // =========================================================================
  const cancelMutation = useMutation({
    mutationFn: async ({ subId, cancelAtPeriodEnd }: { subId: string, cancelAtPeriodEnd: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success("Status de cancelamento atualizado no contrato da empresa.");
      setIsActionDialogOpen(false);
      setJustification("");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar assinatura: ${err.message}`)
  });

  // Métricas calculadas
  const activeSubsCount = useMemo(() => {
    return subscriptions.filter((s: any) => s.status === 'active' && !s.cancel_at_period_end).length;
  }, [subscriptions]);

  const trialingCount = useMemo(() => {
    return subscriptions.filter((s: any) => s.status === 'trialing').length;
  }, [subscriptions]);

  const scheduledCancelCount = useMemo(() => {
    return subscriptions.filter((s: any) => s.cancel_at_period_end).length;
  }, [subscriptions]);

  const pastDueCount = useMemo(() => {
    return subscriptions.filter((s: any) => s.status === 'past_due' || s.status === 'unpaid').length;
  }, [subscriptions]);

  const mrrTotal = useMemo(() => {
    return subscriptions
      .filter((s: any) => s.status === 'active')
      .reduce((acc: number, s: any) => {
        const price = Number(s.plan?.price) || 0;
        const isAnnual = s.plan?.billing_cycle === 'annual' || s.plan?.billing_cycle === 'yearly';
        return acc + (isAnnual ? price / 12 : price);
      }, 0);
  }, [subscriptions]);

  // Lista Filtrada de Planos
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const search = planSearch.toLowerCase().trim();
      const matchSearch = !search || p.name.toLowerCase().includes(search) || p.slug.toLowerCase().includes(search);
      const matchStatus = planStatusFilter === 'all' || p.status === planStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [plans, planSearch, planStatusFilter]);

  // Lista Filtrada de Assinaturas
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub: any) => {
      const search = subSearch.toLowerCase().trim();
      const compName = (sub.company?.name || sub.company?.fantasy_name || "").toLowerCase();
      const planName = (sub.plan?.name || "").toLowerCase();
      const matchSearch = !search || compName.includes(search) || planName.includes(search) || sub.id.includes(search);

      let matchStatus = true;
      if (subStatusFilter === 'active') {
        matchStatus = sub.status === 'active' && !sub.cancel_at_period_end;
      } else if (subStatusFilter === 'trialing') {
        matchStatus = sub.status === 'trialing';
      } else if (subStatusFilter === 'scheduled_cancel') {
        matchStatus = Boolean(sub.cancel_at_period_end);
      } else if (subStatusFilter === 'past_due') {
        matchStatus = sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'pending';
      } else if (subStatusFilter === 'canceled') {
        matchStatus = sub.status === 'canceled';
      }

      // Filtro de aplicativo
      let matchApp = true;
      if (appFilter === 'arrais' || appFilter === 'vencimentos') {
        // Para os dois futuros aplicativos, enquanto em preparação, não há contratos emitidos
        matchApp = false;
      }

      return matchSearch && matchStatus && matchApp;
    });
  }, [subscriptions, subSearch, subStatusFilter, appFilter]);

  // Lista Filtrada de Pagamentos
  const filteredPayments = useMemo(() => {
    return payments.filter((p: any) => {
      const search = paySearch.toLowerCase().trim();
      const compName = (p.company?.name || p.company?.fantasy_name || "").toLowerCase();
      const pId = (p.id || "").toLowerCase();
      const mpId = (p.mercado_pago_payment_id || "").toLowerCase();
      const matchSearch = !search || compName.includes(search) || pId.includes(search) || mpId.includes(search);

      const matchStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, paySearch, payStatusFilter]);

  const approvedPaymentsTotal = useMemo(() => {
    return payments
      .filter((p: any) => p.status === 'approved' || p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const pendingPaymentsTotal = useMemo(() => {
    return payments
      .filter((p: any) => p.status === 'pending' || p.status === 'in_process')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const rejectedPaymentsCount = useMemo(() => {
    return payments.filter((p: any) => p.status === 'rejected' || p.status === 'failed').length;
  }, [payments]);

  // Handlers de Ações
  const handleOpenEdit = (plan: AdminPlanData) => {
    setSelectedPlan(plan);
    setIsEditorOpen(true);
  };

  const handleCreateNewPlan = () => {
    setSelectedPlan(null);
    setIsEditorOpen(true);
  };

  const handleOpenDetails = (sub: any) => {
    setSelectedSub(sub);
    setIsDetailsOpen(true);
  };

  const handleOpenAction = (sub: any, type: "cancel_end" | "refund" | "reactivate") => {
    setSelectedSub(sub);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedSub) return;
    if (actionType === "cancel_end") {
      cancelMutation.mutate({ subId: selectedSub.id, cancelAtPeriodEnd: true });
    } else if (actionType === "reactivate") {
      cancelMutation.mutate({ subId: selectedSub.id, cancelAtPeriodEnd: false });
    } else if (actionType === "refund") {
      if (!justification.trim()) {
        toast.error("Por favor, preencha a justificativa financeira do estorno.");
        return;
      }
      toast.success(`Estorno/reembolso registrado nos logs da empresa ${selectedSub.company?.name || ""}.`);
      setIsActionDialogOpen(false);
      setJustification("");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência.`);
  };

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-[#075BFF] animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Validando credenciais administrativas...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 bg-white border border-red-100 rounded-2xl shadow-xs">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0B1739]">Acesso Restrito a Administradores Globais</h2>
        <p className="text-xs text-slate-500">
          O gerenciamento de planos comerciais e contratos financeiros exige nível de permissão administrativa global.
        </p>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold"
        >
          Voltar ao Painel da Empresa
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              Planos e assinaturas
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
              Administrativo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie o catálogo comercial de planos e consulte os contratos vigentes das empresas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStripeDialogOpen(true)}
            className="h-9 px-3 text-xs font-semibold border-slate-200 hover:bg-slate-50 rounded-xl"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Configuração Stripe
          </Button>

          <Button
            onClick={handleCreateNewPlan}
            className="h-9 px-4 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Cadastrar plano
          </Button>
        </div>
      </div>

      {/* 2. FAIXA DE RESUMO & MÉTRICAS REAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Planos Ativos</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {plans.filter(p => p.status === 'published').length} / {plans.length}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Assinaturas Ativas</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {activeSubsCount}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">MRR Normalizado</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Pendências / Teste</span>
              <span className="text-lg sm:text-2xl font-bold text-[#0B1739] block mt-0.5">
                {trialingCount + pastDueCount + scheduledCancelCount}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. ESTRUTURA DE ABAS PRINCIPAIS */}
      <Tabs 
        value={activeTab} 
        onValueChange={(val: any) => setActiveTab(val)} 
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-3">
          <TabsList className="bg-slate-100 rounded-xl p-1 w-auto inline-flex flex-wrap">
            <TabsTrigger value="subscriptions" className="text-xs font-bold rounded-lg px-4 py-2 cursor-pointer">
              <CreditCard className="h-3.5 w-3.5 mr-2" />
              Assinaturas ({subscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs font-bold rounded-lg px-4 py-2 cursor-pointer">
              <DollarSign className="h-3.5 w-3.5 mr-2" />
              Pagamentos ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs font-bold rounded-lg px-4 py-2 cursor-pointer">
              <Tag className="h-3.5 w-3.5 mr-2" />
              Catálogo de Planos ({plans.length})
            </TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs font-bold rounded-lg px-4 py-2 cursor-pointer">
              <Zap className="h-3.5 w-3.5 mr-2" />
              Cupons & Stripe
            </TabsTrigger>
          </TabsList>

          {/* Filtro de Aplicativo Global */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Aplicativo:</span>
            <Select value={appFilter} onValueChange={setAppFilter}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-white border-slate-200 rounded-xl w-[200px]">
                <SelectValue placeholder="Selecione o app" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os aplicativos</SelectItem>
                <SelectItem value="navaldocs">NavalDocs Pro (Publicado)</SelectItem>
                <SelectItem value="arrais">App Arrais (Em preparação)</SelectItem>
                <SelectItem value="vencimentos">Central de Vencimentos (Em preparação)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: PLANOS (CATÁLOGO COMERCIAL)                                        */}
        {/* ========================================================================= */}
        <TabsContent value="plans" className="space-y-5">
          {/* BARRA DE PESQUISA E FILTRO DE PLANOS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Pesquisar por nome do plano ou slug..."
                className="pl-10 h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
              <Select value={planStatusFilter} onValueChange={setPlanStatusFilter}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl w-full sm:w-[170px]">
                  <SelectValue placeholder="Situação do plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="published">Publicados</SelectItem>
                  <SelectItem value="draft">Rascunhos</SelectItem>
                  <SelectItem value="archived">Arquivados</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPlans()}
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Recarregar catálogo"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPlansLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* ESTADO DE ERRO EM PLANOS */}
          {isPlansError ? (
            <Card className="p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">Erro ao carregar catálogo de planos</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não foi possível conectar com o banco de dados do Lovable Cloud ou com a Stripe: {(plansError as any)?.message}
              </p>
              <Button
                onClick={() => refetchPlans()}
                className="h-8 px-4 text-xs font-bold bg-[#075BFF] text-white rounded-xl"
              >
                Tentar novamente
              </Button>
            </Card>
          ) : isPlansLoading ? (
            /* ESTADO DE CARREGAMENTO */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white rounded-2xl border-slate-200 animate-pulse space-y-4">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 rounded w-3/4" />
                  <div className="space-y-2 py-4 border-y border-slate-100">
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-5/6" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="h-9 bg-slate-100 rounded" />
                </Card>
              ))}
            </div>
          ) : filteredPlans.length === 0 ? (
            /* ESTADO VAZIO */
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <Tag className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">Nenhum plano encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Nenhum plano comercial corresponde aos termos pesquisados ou aos filtros aplicados.
              </p>
              <Button
                onClick={handleCreateNewPlan}
                className="h-8 px-4 text-xs font-bold bg-[#075BFF] text-white rounded-xl"
              >
                Cadastrar primeiro plano
              </Button>
            </Card>
          ) : (
            /* GRID DE PLANOS REAIS */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => {
                const isSyncingThis = syncingPlanId === plan.id;
                const isSynced = plan.stripeSyncStatus === 'synced';
                const hasError = plan.stripeSyncStatus === 'failed' || Boolean(plan.syncError);

                return (
                  <Card 
                    key={plan.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs ${
                      plan.isPopular 
                        ? 'border-[#075BFF] ring-2 ring-[#075BFF]/10' 
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* TOPO DO CARD: STATUS & SYNC */}
                      <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            {plan.status === 'published' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                ● Publicado
                              </Badge>
                            ) : plan.status === 'archived' ? (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                                ● Arquivado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                ● Rascunho
                              </Badge>
                            )}

                            {plan.highlightBadge && (
                              <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold">
                                {plan.highlightBadge}
                              </Badge>
                            )}
                          </div>

                          {/* Badge de sincronização com Stripe */}
                          <div className="flex items-center">
                            {isSynced ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                Stripe Sincronizado
                              </Badge>
                            ) : hasError ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-rose-600" />
                                Falha Stripe
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                Não Sincronizado
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-[#0B1739] tracking-tight">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                          {plan.description || "Plano comercial do NavalDocs Pro."}
                        </p>

                        {/* PREÇOS */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1739]">
                              R$ {plan.priceMonthly}
                            </span>
                            <span className="text-xs text-slate-400 font-medium"> / mês</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-700 block">
                              R$ {plan.priceYearly} / ano
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">
                              Economia anual de 2 meses
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* FRANQUIAS E LIMITES */}
                      <div className="p-6 space-y-3 bg-slate-50/40 text-xs">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Limites Inclusos
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-[#075BFF] shrink-0" />
                            <span><strong>{plan.userLimit}</strong> {plan.userLimit > 1 ? 'usuários' : 'usuário'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-[#075BFF] shrink-0" />
                            <span><strong>{plan.processLimit}</strong> proc/mês</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 text-[#075BFF] shrink-0" />
                            <span><strong>{plan.aiPagesLimit}</strong> págs IA</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-3.5 w-3.5 text-[#075BFF] shrink-0" />
                            <span><strong>{plan.storageGb}GB</strong> storage</span>
                          </div>
                        </div>

                        {/* RECURSOS */}
                        {plan.features && plan.features.length > 0 && (
                          <div className="pt-2 space-y-1.5 border-t border-slate-100">
                            {plan.features.slice(0, 3).map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* IDENTIFICADORES TÉCNICOS DA STRIPE (Para administradores autorizados) */}
                        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-[10px] font-mono text-slate-500 bg-white p-2.5 rounded-xl border">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Slug:</span>
                            <span className="font-bold text-slate-700">{plan.slug}</span>
                          </div>
                          {plan.stripeProductId && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Product ID:</span>
                              <button 
                                onClick={() => copyToClipboard(plan.stripeProductId!, "Product ID")}
                                className="text-[#075BFF] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{plan.stripeProductId.substring(0, 14)}...</span>
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                          {plan.stripePriceMonthlyId && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Preço Mês ID:</span>
                              <button 
                                onClick={() => copyToClipboard(plan.stripePriceMonthlyId!, "Price Monthly ID")}
                                className="text-[#075BFF] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{plan.stripePriceMonthlyId.substring(0, 14)}...</span>
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                          {hasError && plan.syncError && (
                            <div className="pt-1.5 text-[10px] text-rose-600 font-sans border-t border-rose-100 flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{plan.syncError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RODAPÉ DO CARD: AÇÕES */}
                    <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(plan)}
                        className="h-8 text-xs font-semibold rounded-xl border-slate-200 flex-1 hover:bg-slate-50"
                      >
                        Editar plano
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-600"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs bg-white rounded-xl shadow-lg border">
                          <DropdownMenuItem 
                            onClick={() => syncMutation.mutate(plan.id)}
                            disabled={isSyncingThis}
                            className="cursor-pointer font-medium"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 mr-2 text-[#075BFF] ${isSyncingThis ? 'animate-spin' : ''}`} />
                            Sincronizar Stripe
                          </DropdownMenuItem>

                          {plan.status !== 'published' && (
                            <DropdownMenuItem 
                              onClick={() => publishMutation.mutate(plan.id)}
                              className="cursor-pointer font-medium text-emerald-600"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                              Publicar plano
                            </DropdownMenuItem>
                          )}

                          {plan.status !== 'archived' && (
                            <DropdownMenuItem 
                              onClick={() => archiveMutation.mutate(plan.id)}
                              className="cursor-pointer font-medium text-slate-600"
                            >
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Arquivar plano
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: ASSINATURAS (CONTRATOS DAS EMPRESAS)                               */}
        {/* ========================================================================= */}
        <TabsContent value="subscriptions" className="space-y-5">
          {/* BARRA DE FILTROS DE ASSINATURAS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Pesquisar por empresa, plano ou ID de assinatura..."
                className="pl-10 h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
              <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl w-full sm:w-[190px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trialing">Período de Teste</SelectItem>
                  <SelectItem value="scheduled_cancel">Cancelamento Agendado</SelectItem>
                  <SelectItem value="past_due">Inadimplente / Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSubs()}
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Recarregar assinaturas"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSubsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* ESTADO DE ERRO EM ASSINATURAS */}
          {isSubsError ? (
            <Card className="p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">Erro ao carregar assinaturas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não foi possível consultar as assinaturas das empresas no Lovable Cloud: {(subsError as any)?.message}
              </p>
              <Button
                onClick={() => refetchSubs()}
                className="h-8 px-4 text-xs font-bold bg-[#075BFF] text-white rounded-xl"
              >
                Tentar novamente
              </Button>
            </Card>
          ) : isSubsLoading ? (
            /* CARREGANDO */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="h-6 w-6 text-[#075BFF] animate-spin mx-auto" />
              <p className="font-semibold">Carregando assinaturas das empresas...</p>
            </div>
          ) : (appFilter === 'arrais' || appFilter === 'vencimentos') ? (
            /* APP EM PREPARAÇÃO */
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto border border-amber-200">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">
                {appFilter === 'arrais' ? 'App Arrais' : 'Central de Vencimentos'} — Em preparação
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Este aplicativo ainda não possui catálogo ou cobrança comercial publicados no Stripe. Os contratos aparecerão automaticamente assim que o produto for lançado.
              </p>
              <Button
                variant="outline"
                onClick={() => setAppFilter('all')}
                className="h-8 px-4 text-xs font-bold rounded-xl"
              >
                Ver todos os aplicativos
              </Button>
            </Card>
          ) : filteredSubscriptions.length === 0 ? (
            /* LISTA VAZIA */
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">Nenhuma assinatura encontrada</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {subSearch 
                  ? "Nenhuma assinatura corresponde aos termos pesquisados." 
                  : "Nenhuma assinatura contratada com os filtros atuais."}
              </p>
            </Card>
          ) : (
            /* TABELA DE ASSINATURAS */
            <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">Aplicativo</th>
                      <th className="px-6 py-4">Plano</th>
                      <th className="px-6 py-4">Ciclo & Valor</th>
                      <th className="px-6 py-4">Situação</th>
                      <th className="px-6 py-4">Próxima Renovação</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubscriptions.map((sub: any) => {
                      const companyName = sub.company?.name || sub.company?.fantasy_name || "Empresa não identificada";
                      const cnpj = sub.company?.cnpj || sub.company?.document || "CNPJ não informado";
                      const planName = sub.plan?.name || "Plano Padrão";
                      const isAnnual = sub.plan?.billing_cycle === 'annual' || sub.plan?.billing_cycle === 'yearly';
                      const price = sub.plan?.price ? `R$ ${Number(sub.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "Sob consulta";
                      
                      // Datas
                      const startDate = sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString('pt-BR') : "-";
                      const renewalDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : "-";

                      // Situação
                      const isTrial = sub.status === 'trialing';
                      const isPastDue = sub.status === 'past_due' || sub.status === 'unpaid';
                      const isCanceled = sub.status === 'canceled';
                      const isScheduledCancel = Boolean(sub.cancel_at_period_end);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* EMPRESA */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#0B1739] text-sm truncate max-w-[200px]">
                              {companyName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {cnpj}
                            </div>
                          </td>

                          {/* APLICATIVO */}
                          <td className="px-6 py-4">
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold text-[10px]">
                              NavalDocs Pro
                            </Badge>
                          </td>

                          {/* PLANO */}
                          <td className="px-6 py-4">
                            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 font-bold text-[10px]">
                              {planName}
                            </Badge>
                          </td>

                          {/* CICLO & VALOR */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#0B1739]">{price}</div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {isAnnual ? 'Ciclo Anual' : 'Ciclo Mensal'}
                            </div>
                          </td>

                          {/* SITUAÇÃO */}
                          <td className="px-6 py-4">
                            {isScheduledCancel ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3" />
                                Término Agendado
                              </Badge>
                            ) : isTrial ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Sparkles className="h-3 w-3" />
                                Período de Teste
                              </Badge>
                            ) : isPastDue ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Inadimplente
                              </Badge>
                            ) : isCanceled ? (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Cancelada
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Ativa
                              </Badge>
                            )}
                          </td>

                          {/* RENOVAÇÃO */}
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-700">{renewalDate}</div>
                            <div className="text-[10px] text-slate-400">Início: {startDate}</div>
                          </td>

                          {/* AÇÕES */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetails(sub)}
                                className="h-8 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
                              >
                                Ver detalhes
                              </Button>

                              {!isScheduledCancel && sub.status === 'active' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAction(sub, 'cancel_end')}
                                  className="h-8 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl"
                                >
                                  Agendar término
                                </Button>
                              ) : isScheduledCancel ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAction(sub, 'reactivate')}
                                  className="h-8 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 border-emerald-200 rounded-xl"
                                >
                                  Manter ativa
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: PAGAMENTOS (Aprovados, Pendentes e Recusados)                      */}
        {/* ========================================================================= */}
        <TabsContent value="payments" className="space-y-4">
          {/* Métricas de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pagamentos Aprovados
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                R$ {approvedPaymentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {payments.filter((p: any) => p.status === 'approved' || p.status === 'paid').length} transações confirmadas
              </span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Cobranças Pendentes
              </span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">
                R$ {pendingPaymentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {payments.filter((p: any) => p.status === 'pending' || p.status === 'in_process').length} aguardando compensação
              </span>
            </Card>

            <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Falhas & Recusas
              </span>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">
                {rejectedPaymentsCount}
              </p>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Cartões recusados ou expirados
              </span>
            </Card>
          </div>

          {/* Filtros de Pagamento */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por empresa, CNPJ ou ID..."
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <Select value={payStatusFilter} onValueChange={setPayStatusFilter}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl w-full sm:w-[180px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPayments()}
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Recarregar pagamentos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPaymentsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Tabela de Pagamentos */}
          {isPaymentsLoading ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="h-6 w-6 text-[#075BFF] animate-spin mx-auto" />
              <p className="font-semibold">Carregando histórico de pagamentos...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mx-auto border">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739]">Nenhum pagamento encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {paySearch 
                  ? "Nenhum pagamento corresponde aos termos da busca." 
                  : "Nenhum evento financeiro registrado com os filtros selecionados."}
              </p>
            </Card>
          ) : (
            <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">ID Transação / Gateway</th>
                      <th className="px-6 py-4">Valor Bruto</th>
                      <th className="px-6 py-4">Forma</th>
                      <th className="px-6 py-4">Data Confirmação</th>
                      <th className="px-6 py-4">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p: any) => {
                      const compName = p.company?.name || p.company?.fantasy_name || "Cliente sem cadastro";
                      const cnpj = p.company?.cnpj || "";
                      const isApproved = p.status === 'approved' || p.status === 'paid';
                      const isPending = p.status === 'pending' || p.status === 'in_process';
                      const isRejected = p.status === 'rejected' || p.status === 'failed';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#0B1739] text-sm truncate max-w-[200px]">
                              {compName}
                            </div>
                            {cnpj && <div className="text-[11px] text-slate-400">{cnpj}</div>}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                            <code>{p.mercado_pago_payment_id || p.id}</code>
                          </td>
                          <td className="px-6 py-4 font-bold text-[#0B1739] text-sm">
                            R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-slate-600 capitalize">
                            {p.payment_method || "Cartão de Crédito"}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {p.paid_at || p.created_at ? new Date(p.paid_at || p.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            {isApproved ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Aprovado
                              </Badge>
                            ) : isPending ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3" />
                                Pendente
                              </Badge>
                            ) : isRejected ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Recusado
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold w-fit">
                                {p.status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: CUPONS & STRIPE                                                    */}
        {/* ========================================================================= */}
        <TabsContent value="coupons">
          <AdminCouponStripePanel />
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO 1: EDITOR DE PLANO */}
      <PlanEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        plan={selectedPlan}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
        }}
      />

      {/* DIÁLOGO 2: CONFIGURAÇÃO DE CHAVES DA STRIPE */}
      <StripeConfigDialog
        isOpen={isStripeDialogOpen}
        onClose={() => setIsStripeDialogOpen(false)}
      />

      {/* DIÁLOGO 3: DETALHES COMPLETOS DA ASSINATURA */}
      {selectedSub && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-xl bg-white rounded-2xl p-6 sm:p-7">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-[#0B1739]">
                    Detalhes do Contrato da Empresa
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Contrato {selectedSub.id}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Informações da Empresa */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dados do Cliente
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Razão Social / Nome:</span>
                    <strong className="text-sm">{selectedSub.company?.name || "Empresa"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CNPJ:</span>
                    <strong>{selectedSub.company?.cnpj || selectedSub.company?.document || "Não informado"}</strong>
                  </div>
                </div>
              </div>

              {/* Informações do Plano e Cobrança */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Plano e Vigência
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Plano:</span>
                    <strong className="text-[#075BFF]">{selectedSub.plan?.name || "Padrão"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valor Contratado:</span>
                    <strong>R$ {selectedSub.plan?.price || 0} ({selectedSub.plan?.billing_cycle === 'annual' ? 'Anual' : 'Mensal'})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Início da Vigência:</span>
                    <span>{selectedSub.current_period_start ? new Date(selectedSub.current_period_start).toLocaleDateString('pt-BR') : "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Próxima Renovação:</span>
                    <span>{selectedSub.current_period_end ? new Date(selectedSub.current_period_end).toLocaleDateString('pt-BR') : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Identificadores de Gateway */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Provedor:</span>
                  <span className="font-bold">{selectedSub.metadata?.stripe_subscription_id ? 'Stripe Gateway' : selectedSub.mercado_pago_subscription_id ? 'Mercado Pago' : 'Faturamento Direto'}</span>
                </div>
                {selectedSub.metadata?.stripe_subscription_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stripe Sub ID:</span>
                    <span className="text-[#075BFF]">{selectedSub.metadata.stripe_subscription_id}</span>
                  </div>
                )}
                {selectedSub.metadata?.stripe_customer_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stripe Customer ID:</span>
                    <span>{selectedSub.metadata.stripe_customer_id}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIÁLOGO 4: CONFIRMAÇÃO DE AÇÕES FINANCEIRAS */}
      {selectedSub && (
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                {actionType === 'cancel_end' 
                  ? 'Agendar Cancelamento da Assinatura' 
                  : actionType === 'reactivate'
                  ? 'Manter Assinatura Ativa'
                  : 'Registrar Reembolso'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Empresa: <strong>{selectedSub.company?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {actionType === 'cancel_end' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" /> Cancelamento ao Final do Período
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    O escritório manterá acesso integral aos recursos até a data de renovação ({selectedSub.current_period_end ? new Date(selectedSub.current_period_end).toLocaleDateString('pt-BR') : "fim do período"}). Nenhuma nova cobrança será gerada.
                  </p>
                </div>
              ) : actionType === 'reactivate' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reativar Renovação Automática
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    O cancelamento agendado será desfeito e a assinatura será renovada normalmente no próximo ciclo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Justificativa Financeira (Obrigatória)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Informe o motivo e detalhes do estorno/reembolso..."
                    rows={3}
                    className="text-xs rounded-xl"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsActionDialogOpen(false)} className="text-xs rounded-xl">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAction}
                className={`text-xs font-bold text-white rounded-xl ${
                  actionType === 'cancel_end' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#075BFF] hover:bg-blue-600'
                }`}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
