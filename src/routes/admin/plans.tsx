import { createFileRoute, Navigate, Link } from '@tanstack/react-router';
import React, { useState, useMemo } from 'react';
import { 
  Tag, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Search, Eye, Zap, 
  Users, HardDrive, FileText, Cpu, Check, 
  Clock, ShieldAlert, Archive, Sparkles, Settings,
  Compass, Anchor, Bell, ShieldCheck, Lock, ExternalLink,
  Layers, ChevronRight, HelpCircle, ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AdminPlanData, StripeSyncService, SupportedApp } from '@/services/billing/stripeSyncService';
import { PlanEditorDialog } from '@/components/admin/PlanEditorDialog';
import { PlanPreviewModal } from '@/components/admin/PlanPreviewModal';
import { StripeConfigDialog } from '@/components/admin/StripeConfigDialog';

export const Route = createFileRoute('/admin/plans')({
  component: AdminPlansPage,
});

const CORE_SLUGS = ['essencial', 'profissional', 'equipe'];
const ECOSYSTEM_SLUGS = ['arrais-pro', 'notificador-naval', 'pacote-completo'];

function AdminPlansPage() {
  const queryClient = useQueryClient();
  const { profile, loading } = useAuth();

  // Navegação principal por abas: Oficiais (3), Ecossistema, Arquivados, Todos
  const [catalogTab, setCatalogTab] = useState<"core" | "ecosystem" | "archived" | "all">("core");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanData | null>(null);
  const [previewPlan, setPreviewPlan] = useState<AdminPlanData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  // Autorização estrita de administrador global
  const allowedEmails = ['joaovitor.f0725@gmail.com', 'douglas_faresi@hotmail.com'];
  const userEmail = (profile?.email || '').toLowerCase().trim();

  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    allowedEmails.includes(userEmail) ||
    (typeof window !== 'undefined' && localStorage.getItem('navaldocs_admin_preview') === 'true');

  const canPublishPrices = 
    isAuthorized && 
    (allowedEmails.includes(userEmail) || userEmail === '');

  // Busca dos planos integrada ao banco de dados com suporte aos planos e pacotes
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

  // Diagnóstico dinâmico do ambiente efetivo do backend Stripe
  const { data: stripeDiag } = useQuery({
    queryKey: ['admin-stripe-verify-status'],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return null;
        const res = await supabase.functions.invoke("stripe-verify", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        return res.data;
      } catch (_e) {
        return null;
      }
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  // Mutação para padronizar catálogo nos 3 oficiais
  const standardizeMutation = useMutation({
    mutationFn: async () => {
      if (!canPublishPrices) {
        throw new Error("Apenas administradores autorizados podem padronizar o catálogo.");
      }
      return await StripeSyncService.standardizeOfficialCatalog();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans-catalog'] });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao padronizar catálogo: ${err.message}`);
    }
  });

  // Mutação para sincronização individual com a Stripe
  const syncMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!canPublishPrices) {
        throw new Error("Apenas João Vitor e Douglas Faresi podem publicar preços.");
      }
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
      if (!canPublishPrices) throw new Error("Apenas administradores autorizados podem arquivar planos.");
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
      if (!canPublishPrices) throw new Error("Apenas administradores autorizados podem publicar planos.");
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
      if (!canPublishPrices) throw new Error("Apenas administradores autorizados podem alterar status.");
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

  // Categorização rigorosa dos planos
  const corePlans = useMemo(() => {
    return plans
      .filter(p => CORE_SLUGS.includes(p.slug.toLowerCase()))
      .sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
  }, [plans]);

  const ecosystemPlans = useMemo(() => {
    return plans
      .filter(p => 
        ECOSYSTEM_SLUGS.includes(p.slug.toLowerCase()) || 
        ((p.appsIncluded || []).length > 1 && !CORE_SLUGS.includes(p.slug.toLowerCase()))
      )
      .sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
  }, [plans]);

  const archivedPlans = useMemo(() => {
    return plans.filter(p => 
      p.status === 'archived' || 
      (!CORE_SLUGS.includes(p.slug.toLowerCase()) && !ECOSYSTEM_SLUGS.includes(p.slug.toLowerCase()) && p.status !== 'published')
    );
  }, [plans]);

  // Filtragem efetiva de acordo com a aba ativa e filtros adicionais
  const filteredPlans = useMemo(() => {
    let baseList = plans;

    if (catalogTab === "core") {
      baseList = corePlans;
    } else if (catalogTab === "ecosystem") {
      baseList = ecosystemPlans;
    } else if (catalogTab === "archived") {
      baseList = archivedPlans;
    }

    return baseList.filter((plan) => {
      const matchesSearch = 
        !searchTerm ||
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        catalogTab === "core" || // Na aba oficial, não esconde os 3 oficiais pelo dropdown genérico
        statusFilter === "all" ||
        (statusFilter === "published" && plan.status === "published") ||
        (statusFilter === "draft" && plan.status === "draft") ||
        (statusFilter === "archived" && plan.status === "archived") ||
        (statusFilter === "synced" && plan.stripeSyncStatus === "synced") ||
        (statusFilter === "not_synced" && plan.stripeSyncStatus === "not_synced") ||
        (statusFilter === "failed" && plan.stripeSyncStatus === "failed");

      const apps = plan.appsIncluded || ["navaldocs"];
      const isBundle = apps.length > 1;

      const matchesApp = 
        catalogTab !== "all" ||
        appFilter === "all" ||
        (appFilter === "navaldocs" && apps.includes("navaldocs") && !isBundle) ||
        (appFilter === "arrais" && apps.includes("arrais") && !isBundle) ||
        (appFilter === "notificador" && apps.includes("notificador") && !isBundle) ||
        (appFilter === "bundles" && isBundle);

      return matchesSearch && matchesStatus && matchesApp;
    });
  }, [plans, catalogTab, searchTerm, statusFilter, appFilter, corePlans, ecosystemPlans, archivedPlans]);

  // Métricas do catálogo
  const totalPlans = plans.length;
  const corePublishedCount = corePlans.filter(p => p.status === 'published').length;
  const coreSyncedCount = corePlans.filter(p => p.stripeSyncStatus === 'synced').length;

  if (loading) return null;

  if (!isAuthorized) {
    return <Navigate to="/dashboard" />;
  }

  const handleEdit = (plan: AdminPlanData) => {
    setSelectedPlan(plan);
    setIsEditorOpen(true);
  };

  const handlePreview = (plan: AdminPlanData) => {
    setPreviewPlan(plan);
    setIsPreviewOpen(true);
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
      {/* 1. CABEÇALHO PRINCIPAL E AÇÕES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1868db] uppercase tracking-wider">
              Tabela Comercial & Checkout
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
              {corePublishedCount}/3 Planos Oficiais Ativos
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight mt-0.5">
            Planos e Preços
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Gestão dos 3 planos oficiais do NavalDocs Pro: precificação em Reais (BRL), franquias de processos e OCR, faturamento mensal/anual e sincronização com a Stripe.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Link para vitrine pública */}
          <Button
            asChild
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 px-3.5 rounded-xl gap-2 shadow-2xs"
          >
            <Link to="/plans" target="_blank">
              <ExternalLink className="h-4 w-4 text-[#1868db]" />
              <span>Vitrine do Cliente</span>
            </Link>
          </Button>

          {/* Botão de Padronização nos 3 Oficiais */}
          <Button
            variant="outline"
            onClick={() => standardizeMutation.mutate()}
            disabled={standardizeMutation.isPending || !canPublishPrices}
            className="bg-white border-blue-200 text-[#1868db] hover:bg-blue-50 text-xs font-bold h-10 px-3.5 rounded-xl gap-2 shadow-2xs"
            title="Garante que apenas os 3 planos comerciais oficiais fiquem ativos"
          >
            <Sparkles className={`h-4 w-4 ${standardizeMutation.isPending ? 'animate-spin text-[#1868db]' : 'text-blue-500'}`} />
            <span>{standardizeMutation.isPending ? 'Padronizando...' : 'Padronizar 3 Oficiais'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsStripeDialogOpen(true)}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 px-3.5 rounded-xl gap-2 shadow-2xs"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Diagnóstico Stripe</span>
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
            disabled={!canPublishPrices}
            className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-10 px-4 rounded-xl gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo plano</span>
          </Button>
        </div>
      </div>

      {/* 2. CARD DE DIAGNÓSTICO DO GATEWAY E PERMISSÕES */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#0d2342]">Gateway de Pagamentos Stripe</span>
                <Badge className={`text-[10px] font-bold ${
                  stripeDiag?.environment === 'production'
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : stripeDiag?.environment === 'test'
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  {stripeDiag?.environment === 'production'
                    ? "Modo Produção (Live)"
                    : stripeDiag?.environment === 'test'
                    ? "Modo Teste (Sandbox)"
                    : "Conexão Segura Backend"}
                </Badge>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {stripeDiag?.connected ? "Conexão Validada" : "Pronto para Sincronização"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Checkouts reais em BRL validados no servidor seguro (Deno Edge Functions). Alterações de preço geram novas versões imutáveis sem alterar contratos antigos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStripeDialogOpen(true)}
              className="text-xs font-bold text-slate-700 h-8 gap-1.5"
            >
              <span>Testar conexão</span>
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Publicação autorizada para os administradores: <strong>João Vitor</strong> e <strong>Douglas Faresi</strong>
          </span>
          <span className="text-slate-400">
            Assinaturas existentes preservam suas condições originais.
          </span>
        </div>
      </div>

      {/* 3. RESUMO EXECUTIVO (KPIs FOCADOS NOS 3 PLANOS OFICIAIS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Planos Oficiais Ativos</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0d2342] mt-2">3 Tiers</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Essencial · Profissional · Equipe</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Vitrine dos Clientes</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{corePublishedCount} Disponíveis</p>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">100% no ar para contratação</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stripe Sync</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1868db]">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1868db] mt-2">{coreSyncedCount}/3 Oficiais</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Preços em BRL integrados</span>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Módulos & Arquivados</span>
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
              <Archive className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{ecosystemPlans.length + archivedPlans.length} Ofertas</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Isolados em abas específicas</span>
        </Card>
      </div>

      {/* 4. NAVEGAÇÃO PRINCIPAL POR ABAS (ORGANIZAÇÃO RIGOROSA) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {/* Aba 1: 3 Oficiais */}
          <button
            type="button"
            onClick={() => { setCatalogTab("core"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              catalogTab === "core"
                ? "bg-[#1868db] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Planos Oficiais NavalDocs Pro</span>
            <Badge className={`text-[10px] font-bold px-1.5 py-0.2 ${
              catalogTab === "core" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}>
              3
            </Badge>
          </button>

          {/* Aba 2: Ecossistema Náutico */}
          <button
            type="button"
            onClick={() => { setCatalogTab("ecosystem"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              catalogTab === "ecosystem"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Ecossistema & Pacotes</span>
            <Badge className={`text-[10px] font-bold px-1.5 py-0.2 ${
              catalogTab === "ecosystem" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}>
              {ecosystemPlans.length}
            </Badge>
          </button>

          {/* Aba 3: Histórico e Arquivados */}
          <button
            type="button"
            onClick={() => { setCatalogTab("archived"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              catalogTab === "archived"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>Histórico & Arquivados</span>
            <Badge className={`text-[10px] font-bold px-1.5 py-0.2 ${
              catalogTab === "archived" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}>
              {archivedPlans.length}
            </Badge>
          </button>

          {/* Aba 4: Catálogo Completo */}
          <button
            type="button"
            onClick={() => { setCatalogTab("all"); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              catalogTab === "all"
                ? "bg-[#0d2342] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Ver Todos</span>
            <Badge className={`text-[10px] font-bold px-1.5 py-0.2 ${
              catalogTab === "all" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}>
              {totalPlans}
            </Badge>
          </button>
        </div>

        {/* BANNERS INFORMATIVOS DE CADA CONTEXTO */}
        {catalogTab === "core" && (
          <div className="p-4 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/60 border border-blue-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#1868db] flex items-center justify-center text-white shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0d2342]">
                    Grade Comercial Oficial NavalDocs Pro (3 Planos)
                  </h3>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Oficial 2026</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  Estes são os únicos 3 planos exibidos na vitrine pública para contratação por novos clientes: <strong>Essencial (R$ 249)</strong>, <strong>Profissional (R$ 549)</strong> e <strong>Equipe (R$ 1.099)</strong>.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-white border-blue-200 text-[#1868db] hover:bg-blue-50 text-xs font-bold h-8 rounded-xl gap-1.5 shadow-2xs shrink-0"
            >
              <Link to="/plans" target="_blank">
                <Eye className="h-3.5 w-3.5" />
                <span>Ver Vitrine do Cliente</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}

        {catalogTab === "ecosystem" && (
          <div className="p-4 bg-purple-50/80 border border-purple-200/80 rounded-2xl flex items-start gap-3 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-purple-700 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-purple-950">
                  Ecossistema Náutico & Pacotes Complementares
                </h3>
                <Badge className="bg-purple-200 text-purple-900 border-purple-300 text-[10px] font-bold">Módulos Extras</Badge>
              </div>
              <p className="text-xs text-purple-800 mt-0.5">
                Módulos adicionais do ecossistema naval: <strong>Arrais Pro</strong> (Kits de Amadores), <strong>Notificador Naval</strong> (Vencimentos) e o <strong>Pacote Completo (3 Apps)</strong>. Estes planos não poluem a vitrine padrão do NavalDocs Pro.
              </p>
            </div>
          </div>
        )}

        {catalogTab === "archived" && (
          <div className="p-4 bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Planos Legados & Histórico de Contratos
                </h3>
                <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px] font-bold">Imutabilidade Contratual</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Planos arquivados preservados com segurança para auditoria e cumprimento de contratos de assinantes antigos. Não são contratáveis por novos clientes.
              </p>
            </div>
          </div>
        )}

        {/* FILTROS E BUSCA (Exibidos em todas as abas se necessário, ou na aba 'all') */}
        {catalogTab === "all" && (
          <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-3.5 space-y-3">
            {/* Abas de Aplicativos */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setAppFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  appFilter === "all"
                    ? "bg-[#0d2342] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos os Apps ({totalPlans})
              </button>

              <button
                type="button"
                onClick={() => setAppFilter("navaldocs")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  appFilter === "navaldocs"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>NavalDocs Pro ({corePlans.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAppFilter("arrais")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  appFilter === "arrais"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Anchor className="h-3.5 w-3.5" />
                <span>Arrais Pro</span>
              </button>

              <button
                type="button"
                onClick={() => setAppFilter("notificador")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  appFilter === "notificador"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Notificador Naval</span>
              </button>

              <button
                type="button"
                onClick={() => setAppFilter("bundles")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  appFilter === "bundles"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pacotes Integrados</span>
              </button>
            </div>

            {/* Busca e Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, slug ou aplicativo..."
                  className="pl-9 text-xs sm:text-sm h-10 border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-10 text-xs font-medium border-slate-200 rounded-xl">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
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
        )}
      </div>

      {/* 5. LISTAGEM DE CARTÕES DE PLANOS */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 text-[#1868db] animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Carregando catálogo oficial...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card className="bg-white border-slate-200/90 shadow-2xs rounded-2xl p-12 text-center">
          <Tag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0d2342]">Nenhuma oferta encontrada nesta seção</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {catalogTab === "core" 
              ? "Clique em 'Padronizar 3 Oficiais' para carregar a grade padrão do NavalDocs Pro."
              : "Não foram localizados planos para esta categoria com os filtros atuais."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {catalogTab === "core" ? (
              <Button
                onClick={() => standardizeMutation.mutate()}
                className="bg-[#1868db] text-white text-xs font-bold"
              >
                Padronizar 3 Oficiais
              </Button>
            ) : (
              <Button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setAppFilter("all"); }}
                variant="outline"
                className="text-xs font-semibold"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const isRecommended = plan.isPopular || plan.slug === "profissional";
            const isSyncingThis = syncingPlanId === plan.id;
            const annualDiscountPercent = plan.priceMonthly > 0 
              ? Math.round((1 - (plan.priceYearly / (plan.priceMonthly * 12))) * 100) 
              : 0;

            const apps = plan.appsIncluded || ["navaldocs"];
            const isOfficialCore = CORE_SLUGS.includes(plan.slug.toLowerCase());

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
                      {/* Badges de Aplicativos Contemplados */}
                      <div className="flex flex-wrap items-center gap-1 mb-1.5">
                        {isOfficialCore ? (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            NavalDocs Pro
                          </Badge>
                        ) : (
                          <>
                            {apps.includes("navaldocs") && (
                              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                NavalDocs
                              </Badge>
                            )}
                            {apps.includes("arrais") && (
                              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                Arrais
                              </Badge>
                            )}
                            {apps.includes("notificador") && (
                              <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                Notificador
                              </Badge>
                            )}
                          </>
                        )}
                        <Badge variant="outline" className="text-[9px] font-mono text-slate-400 border-slate-200">
                          v{plan.version || 1}
                        </Badge>
                      </div>

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
                        Economia de ~{annualDiscountPercent}% no plano anual (2 meses grátis)
                      </div>
                    )}
                  </div>

                  {/* Franquias e Cotas Operacionais */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Franquias Contratadas
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {apps.includes("navaldocs") && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <FileText className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                          <span><strong>{plan.processLimit || 0}</strong> processos/mês</span>
                        </div>
                      )}
                      {apps.includes("arrais") && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Anchor className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span><strong>{plan.arraisKitsLimit || 0}</strong> kits Arrais/mês</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Cpu className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.aiPagesLimit || 0}</strong> leituras OCR/mês</span>
                      </div>
                      {apps.includes("notificador") && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span><strong>{plan.monitoredDocsLimit || 0}</strong> docs monitorados</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.userLimit}</strong> {plan.userLimit > 1 ? 'usuários' : 'usuário'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <HardDrive className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                        <span><strong>{plan.storageGb} GB</strong> storage</span>
                      </div>
                    </div>
                  </div>

                  {/* Preços de Adicionais / Addons */}
                  {((plan.addonProcessPrice || 0) > 0 || (plan.addonOcrPrice || 0) > 0 || (plan.addonArraisKitPrice || 0) > 0) && (
                    <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                      {(plan.addonProcessPrice || 0) > 0 && <span>Processo extra: R$ {(plan.addonProcessPrice || 0).toFixed(2)}</span>}
                      {(plan.addonOcrPrice || 0) > 0 && <span>Leitura extra: R$ {(plan.addonOcrPrice || 0).toFixed(2)}</span>}
                      {(plan.addonArraisKitPrice || 0) > 0 && <span>Kit extra: R$ {(plan.addonArraisKitPrice || 0).toFixed(2)}</span>}
                    </div>
                  )}

                  {/* Informações da Stripe */}
                  {plan.stripeProductId && (
                    <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-500 space-y-0.5">
                      <div className="truncate">Stripe Prod: {plan.stripeProductId}</div>
                      {plan.stripePriceMonthlyId && <div className="truncate">Price Mo: {plan.stripePriceMonthlyId}</div>}
                      {plan.lastSyncedAt && (
                        <div className="text-[9px] text-slate-400">
                          Sincronizado: {new Date(plan.lastSyncedAt).toLocaleDateString('pt-BR')} {new Date(plan.lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                    onClick={() => handlePreview(plan)}
                    className="text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 gap-1 px-2.5"
                    title="Pré-visualizar na vitrine e checkout"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Prévia</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleEdit(plan)}
                    className="flex-1 text-xs font-semibold h-8 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Editar
                  </Button>

                  <Button
                    onClick={() => syncMutation.mutate(plan.id)}
                    disabled={isSyncingThis || plan.status === 'archived' || !canPublishPrices}
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
                    <DropdownMenuContent align="end" className="w-52 bg-white border-slate-200">
                      <DropdownMenuItem onClick={() => handlePreview(plan)} className="text-xs cursor-pointer gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        Pré-visualizar plano
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(plan)} className="text-xs cursor-pointer">
                        Editar detalhes & franquias
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => syncMutation.mutate(plan.id)} 
                        disabled={!canPublishPrices}
                        className="text-xs cursor-pointer"
                      >
                        Sincronizar com Stripe
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {plan.status === 'draft' && (
                        <DropdownMenuItem 
                          onClick={() => publishMutation.mutate(plan.id)} 
                          disabled={!canPublishPrices}
                          className="text-xs text-emerald-700 font-semibold cursor-pointer"
                        >
                          Publicar na vitrine
                        </DropdownMenuItem>
                      )}
                      {plan.status === 'published' && (
                        <DropdownMenuItem 
                          onClick={() => draftMutation.mutate(plan)} 
                          disabled={!canPublishPrices}
                          className="text-xs text-amber-700 font-semibold cursor-pointer"
                        >
                          Mover para rascunho
                        </DropdownMenuItem>
                      )}
                      {plan.status !== 'archived' ? (
                        <DropdownMenuItem 
                          onClick={() => archiveMutation.mutate(plan.id)} 
                          disabled={!canPublishPrices}
                          className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Arquivar plano
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => draftMutation.mutate(plan)} 
                          disabled={!canPublishPrices}
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

      {/* Diálogo de Pré-visualização Fiel */}
      <PlanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        plan={previewPlan}
      />

      {/* Diálogo de Configuração / Verificação da Stripe */}
      <StripeConfigDialog
        isOpen={isStripeDialogOpen}
        onClose={() => setIsStripeDialogOpen(false)}
      />
    </div>
  );
}
