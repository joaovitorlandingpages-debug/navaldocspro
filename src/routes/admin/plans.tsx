import { createFileRoute, Navigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { 
  Tag, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Search, SlidersHorizontal, ArrowUpRight, Zap, 
  Users, HardDrive, FileText, Cpu, Check, 
  Clock, ShieldAlert, Archive, Sparkles, Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AdminPlanData, StripeSyncService } from '@/services/billing/stripeSyncService';
import { PlanEditorDialog } from '@/components/admin/PlanEditorDialog';
import { StripeConfigDialog } from '@/components/admin/StripeConfigDialog';

export const Route = createFileRoute('/admin/plans')({
  component: AdminPlansPage,
});

function AdminPlansPage() {
  const queryClient = useQueryClient();
  const { profile, loading } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  // Autorização estrita de administrador no client e no layout
  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && localStorage.getItem('navaldocs_admin_preview') === 'true');

  // Busca dos planos integrada ao banco de dados com suporte aos planos previstos
  const { 
    data: plans = [], 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['admin-plans-catalog'],
    queryFn: async () => {
      return await StripeSyncService.fetchPlansFromDatabase();
    },
    staleTime: 1000 * 30, // 30 segundos
  });

  // Mutação para sincronização individual com a Stripe
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

  // Mutação para arquivar plano
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

  // Mutação para publicar plano
  const publishMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await StripeSyncService.publishPlan(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      toast.success("Plano publicado! Agora visível na vitrine para clientes.");
    },
    onError: (err: any) => {
      toast.error(`Falha ao publicar: ${err.message}`);
    }
  });

  // Mutação para reverter para rascunho
  const draftMutation = useMutation({
    mutationFn: async (plan: AdminPlanData) => {
      return StripeSyncService.saveDraft({ ...plan, status: 'draft' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      toast.success("Plano revertido para rascunho (não contratável).");
    },
    onError: (err: any) => {
      toast.error(`Falha ao alterar status: ${err.message}`);
    }
  });

  if (loading) return null;

  if (!isAuthorized) {
    return <Navigate to="/dashboard" />;
  }

  // Filtragem de planos
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "published" && plan.status === "published") ||
      (statusFilter === "draft" && plan.status === "draft") ||
      (statusFilter === "archived" && plan.status === "archived") ||
      (statusFilter === "synced" && plan.stripeSyncStatus === "synced") ||
      (statusFilter === "not_synced" && plan.stripeSyncStatus === "not_synced") ||
      (statusFilter === "failed" && plan.stripeSyncStatus === "failed");

    return matchesSearch && matchesStatus;
  });

  // Métricas do catálogo
  const totalPlans = plans.length;
  const publishedPlans = plans.filter(p => p.status === 'published').length;
  const draftPlans = plans.filter(p => p.status === 'draft').length;
  const syncedPlans = plans.filter(p => p.stripeSyncStatus === 'synced').length;
  const failedPlans = plans.filter(p => p.stripeSyncStatus === 'failed').length;

  const handleEdit = (plan: AdminPlanData) => {
    setSelectedPlan(plan);
    setIsEditorOpen(true);
  };

  const handleNew = () => {
    setSelectedPlan(null);
    setIsEditorOpen(true);
  };

  const handlePlanSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased px-3 sm:px-0">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1868db] uppercase tracking-wider">
              Catálogo Comercial
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200">
              {totalPlans} planos
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight mt-0.5">
            Planos e preços
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Gestão de planos recorrentes, precificação mensal e anual, franquias de processos e IA, e sincronização oficial com a Stripe.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsStripeDialogOpen(true)}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 px-3.5 rounded-xl gap-2 shadow-2xs"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Configurar Stripe</span>
          </Button>

          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 px-3.5 rounded-xl gap-2 shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            onClick={handleNew}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-10 px-4 rounded-xl gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo plano</span>
          </Button>
        </div>
      </div>

      {/* 2. CARDS DE RESUMO (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total de Planos</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0d2342] mt-2">{totalPlans}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Cadastrados no catálogo</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Publicados na Vitrine</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{publishedPlans}</p>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Visíveis para novos clientes</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Rascunhos Internos</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{draftPlans}</p>
          <span className="text-[11px] text-amber-600/80 mt-0.5 block">Não contratáveis</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sincronizados Stripe</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1868db] mt-2">{syncedPlans}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{failedPlans > 0 ? `${failedPlans} com pendência` : 'Gateway integrado'}</span>
        </Card>
      </div>

      {/* 3. BARRA DE PESQUISA E FILTROS */}
      <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, slug ou descrição..."
              className="pl-9 text-xs sm:text-sm h-10 border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56 h-10 text-xs font-medium border-slate-200 rounded-xl">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-xs">Todos os planos</SelectItem>
                <SelectItem value="published" className="text-xs font-semibold text-emerald-700">● Publicados (Vitrine)</SelectItem>
                <SelectItem value="draft" className="text-xs font-semibold text-amber-700">● Rascunhos</SelectItem>
                <SelectItem value="archived" className="text-xs text-slate-500">● Arquivados</SelectItem>
                <SelectItem value="synced" className="text-xs font-semibold text-blue-700">⚡ Stripe: Sincronizados</SelectItem>
                <SelectItem value="not_synced" className="text-xs text-slate-500">⚪ Stripe: Não sincronizados</SelectItem>
                <SelectItem value="failed" className="text-xs font-semibold text-rose-700">⚠️ Stripe: Com falha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 4. LISTAGEM DE CARTÕES DE PLANOS */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 text-[#1868db] animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Carregando catálogo de planos...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-12 text-center">
          <Tag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0d2342]">Nenhum plano encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Não foram localizados planos que atendam aos filtros selecionados. Tente alterar os termos da busca.
          </p>
          <Button
            onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
            variant="outline"
            className="mt-4 text-xs font-semibold"
          >
            Limpar filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const isRecommended = plan.isPopular || plan.slug === "profissional";
            const isSyncingThis = syncingPlanId === plan.id;
            const annualDiscountPercent = plan.priceMonthly > 0 
              ? Math.round((1 - (plan.priceYearly / (plan.priceMonthly * 12))) * 100) 
              : 0;

            return (
              <div
                key={plan.id}
                className={`bg-white p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
                  isRecommended
                    ? "border-[#1868db] shadow-md ring-1 ring-[#1868db]"
                    : plan.status === 'archived'
                    ? "border-slate-200 bg-slate-50/60 opacity-75"
                    : "border-slate-200/90 shadow-2xs hover:shadow-xs"
                }`}
              >
                {/* Badge Superior Central 'Recomendado' */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#1868db] hover:bg-[#1868db] text-white text-[10px] font-bold tracking-wider px-3 py-0.5 rounded-full shadow-2xs uppercase">
                      {plan.highlightBadge || "Recomendado"}
                    </Badge>
                  </div>
                )}

                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[#0d2342] tracking-tight">{plan.name}</h3>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        slug: {plan.slug}
                      </span>
                    </div>

                    {/* Status Badges: Publicação + Stripe */}
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Badge 1: Publicação Comercial */}
                      {plan.status === 'published' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold border border-emerald-200 px-2 py-0.5 rounded-md">
                          ● Publicado
                        </Badge>
                      ) : plan.status === 'archived' ? (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px] font-bold border border-slate-200 px-2 py-0.5 rounded-md">
                          ● Arquivado
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px] font-bold border border-amber-200 px-2 py-0.5 rounded-md">
                          ● Rascunho
                        </Badge>
                      )}

                      {/* Badge 2: Integração Stripe */}
                      {plan.stripeSyncStatus === 'synced' ? (
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-[9px] font-semibold border border-blue-200 px-1.5 py-0.5 rounded-md gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5 text-blue-600" /> Stripe Ativo
                        </Badge>
                      ) : plan.stripeSyncStatus === 'failed' ? (
                        <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 text-[9px] font-semibold border border-rose-200 px-1.5 py-0.5 rounded-md gap-1">
                          <AlertCircle className="h-2.5 w-2.5 text-rose-600" /> Falha Stripe
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-50 text-slate-500 hover:bg-slate-50 text-[9px] font-semibold border border-slate-200 px-1.5 py-0.5 rounded-md">
                          Stripe Pendente
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                    {plan.description || "Sem descrição comercial informada."}
                  </p>

                  {/* Bloco de Preços */}
                  <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Mensal: </span>
                        <span className="text-xl font-extrabold text-[#0d2342]">
                          R$ {plan.priceMonthly.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[11px] text-slate-500">/mês</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">Anual: </span>
                        <span className="text-sm font-bold text-slate-700">
                          R$ {plan.priceYearly.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ano</span>
                      </div>
                    </div>

                    {annualDiscountPercent > 0 && (
                      <div className="mt-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Economia de ~{annualDiscountPercent}% no faturamento anual
                      </div>
                    )}
                  </div>

                  {/* Franquias e Cotas Operacionais */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Limites do Plano
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.userLimit}</strong> {plan.userLimit > 1 ? 'usuários' : 'usuário'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileText className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.processLimit}</strong> processos/mês</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Cpu className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.aiPagesLimit}</strong> páginas IA/mês</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <HardDrive className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.storageGb} GB</strong> storage</span>
                      </div>
                    </div>
                  </div>

                  {/* Informações da Stripe */}
                  {plan.stripeProductId && (
                    <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-500 space-y-0.5">
                      <div className="truncate">Stripe Prod: {plan.stripeProductId}</div>
                      {plan.lastSyncedAt && (
                        <div className="text-[9px] text-slate-400">
                          Sincronizado em: {new Date(plan.lastSyncedAt).toLocaleDateString('pt-BR')} {new Date(plan.lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensagem de Erro se houver */}
                  {plan.syncError && (
                    <div className="mt-2.5 p-2 bg-rose-50/80 border border-rose-200/60 rounded-lg text-[11px] text-rose-700 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{plan.syncError}</span>
                    </div>
                  )}
                </div>

                {/* Rodapé e Ações do Card */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(plan)}
                    className="flex-1 text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Editar
                  </Button>

                  <Button
                    onClick={() => syncMutation.mutate(plan.id)}
                    disabled={isSyncingThis || plan.status === 'archived'}
                    className={`flex-1 text-xs font-bold h-8 rounded-lg gap-1.5 shadow-2xs ${
                      plan.stripeSyncStatus === 'synced'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#1868db] hover:bg-[#1557b8] text-white'
                    }`}
                  >
                    {isSyncingThis ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Sincronizando</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>{plan.stripeSyncStatus === 'synced' ? 'Ressincronizar' : 'Publicar Stripe'}</span>
                      </>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Opções</span>
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                      <DropdownMenuItem onClick={() => handleEdit(plan)} className="text-xs cursor-pointer">
                        Editar detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => syncMutation.mutate(plan.id)} className="text-xs cursor-pointer">
                        Sincronizar com Stripe
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {plan.status === 'draft' && (
                        <DropdownMenuItem 
                          onClick={() => publishMutation.mutate(plan.id)} 
                          className="text-xs text-emerald-700 font-semibold cursor-pointer"
                        >
                          Publicar na vitrine
                        </DropdownMenuItem>
                      )}
                      {plan.status === 'published' && (
                        <DropdownMenuItem 
                          onClick={() => draftMutation.mutate(plan)} 
                          className="text-xs text-amber-700 font-semibold cursor-pointer"
                        >
                          Mover para rascunho
                        </DropdownMenuItem>
                      )}
                      {plan.status !== 'archived' ? (
                        <DropdownMenuItem 
                          onClick={() => archiveMutation.mutate(plan.id)} 
                          className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Arquivar plano
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => draftMutation.mutate(plan)} 
                          className="text-xs text-slate-700 cursor-pointer"
                        >
                          Restaurar como rascunho
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diálogo de Edição / Criação de Plano */}
      <PlanEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        plan={selectedPlan}
        onSaved={handlePlanSaved}
      />

      {/* Diálogo de Configuração / Verificação da Stripe */}
      <StripeConfigDialog
        isOpen={isStripeDialogOpen}
        onClose={() => setIsStripeDialogOpen(false)}
      />
    </div>
  );
}
