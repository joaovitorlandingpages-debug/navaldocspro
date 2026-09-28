import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, Plan, Subscription } from "@/hooks/useSubscription";
import { StripeSyncService, AdminPlanData } from "@/services/billing/stripeSyncService";
import { stripeCheckoutService } from "@/services/billing/stripeCheckoutService";
import { 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  Cpu, 
  HardDrive, 
  Users, 
  Ship, 
  Bell, 
  Package, 
  PlusCircle, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Download, 
  Info, 
  Lock,
  ArrowUpRight,
  Gauge
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SubscriptionPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.company_id || (user as any)?.user_metadata?.company_id;

  // Permissões de Faturamento no Cliente (gestor financeiro autorizado)
  const isBillingAdmin = useMemo(() => {
    const role = profile?.role;
    const email = (user?.email || profile?.email || "").toLowerCase().trim();
    const isGlobalAdmin = email === "joaovitor.f0725@gmail.com" || email === "douglas_faresi@hotmail.com";
    return (
      isGlobalAdmin ||
      role === "admin" ||
      role === "owner" ||
      role === "manager" ||
      role === "admin_master" ||
      role === "admin_master_global"
    );
  }, [profile, user]);

  // Hook da Assinatura Vigente
  const { 
    subscription, 
    isLoading: isLoadingSub, 
    refetchSubscription 
  } = useSubscription();

  // 1. Catálogo Oficial Publicado no Banco
  const { data: catalogPlans = [] } = useQuery<AdminPlanData[]>({
    queryKey: ["public-plans-catalog"],
    queryFn: async () => {
      const dbPlans = await StripeSyncService.fetchPlansFromDatabase();
      return dbPlans.filter(p => p.status === "published");
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Histórico de Pagamentos e Compras da Própria Empresa
  const { 
    data: payments = [], 
    isLoading: isLoadingPayments, 
    refetch: refetchPayments 
  } = useQuery({
    queryKey: ["company-payments", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar pagamentos da empresa:", error);
        return [];
      }
      return data || [];
    },
    enabled: Boolean(companyId),
  });

  // 3. Consulta de Capacidades Adicionais Contratadas (company_resource_addons)
  const { 
    data: addons = [], 
    refetch: refetchAddons 
  } = useQuery({
    queryKey: ["company-addons", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_resource_addons")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: Boolean(companyId),
  });

  // Estados dos Modais
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAddonType, setSelectedAddonType] = useState<"processes" | "arrais_kits" | "ocr" | "monitored_docs" | null>(null);
  const [addonQuantity, setAddonQuantity] = useState(10);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<AdminPlanData | null>(null);

  // Monitora retornos de checkout da Stripe via query string
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("addon_success") === "true") {
      toast.success("Pagamento avulso aprovado! A capacidade adicional foi concedida à sua empresa.");
      refetchAddons();
      refetchPayments();
      // Limpa query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("addon_canceled") === "true") {
      toast.info("A compra de capacidade adicional foi cancelada sem cobrança.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refetchAddons, refetchPayments]);

  // Recarregar tudo
  const handleRefresh = async () => {
    toast.info("Atualizando dados da assinatura...");
    await Promise.all([
      refetchSubscription(),
      refetchPayments(),
      refetchAddons(),
    ]);
    toast.success("Dados sincronizados com o servidor.");
  };

  // Abrir Portal da Stripe para Atualizar Cartão / Método de Pagamento
  const handleOpenPaymentMethodPortal = async () => {
    if (!isBillingAdmin) {
      toast.error("Apenas gestores financeiros autorizados podem alterar dados de pagamento.");
      return;
    }
    try {
      setIsProcessingCheckout(true);
      toast.info("Conectando ao portal seguro da Stripe para atualizar forma de pagamento...");
      const res = await stripeCheckoutService.openCustomerPortal(companyId, window.location.href);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.message || "Não foi possível abrir o portal da Stripe.");
      }
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Abrir Portal da Stripe para Cancelamento ou Mudança de Plano
  const handleOpenStripePortal = async () => {
    if (!isBillingAdmin) {
      toast.error("Apenas gestores financeiros autorizados podem gerenciar a assinatura.");
      return;
    }
    try {
      setIsProcessingCheckout(true);
      toast.info("Abrindo portal de faturamento seguro da Stripe...");
      const res = await stripeCheckoutService.openCustomerPortal(companyId, window.location.href);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.message || "Não foi possível abrir o portal de faturamento.");
      }
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Executar Compra de Capacidade Adicional (Stripe Mode Payment)
  const handleBuyAddon = async () => {
    if (!selectedAddonType) return;
    if (!isBillingAdmin) {
      toast.error("Apenas gestores financeiros autorizados podem contratar capacidade adicional.");
      return;
    }

    try {
      setIsProcessingCheckout(true);
      toast.info("Iniciando checkout seguro de pagamento avulso...");

      const res = await stripeCheckoutService.createAddonCheckoutSession({
        addonType: selectedAddonType,
        quantity: addonQuantity,
        companyId,
      });

      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.message || "Não foi possível iniciar o checkout.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão ao processar compra adicional.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Identificação do aplicativo contratado
  const appInfo = useMemo(() => {
    const rawApps = (subscription as any)?.metadata?.apps_included;
    const planSlug = subscription?.plan?.slug || (subscription as any)?.metadata?.plan_slug || "";

    if (rawApps && typeof rawApps === "string" && rawApps.includes("arrais") && rawApps.includes("notificador")) {
      return {
        name: "Pacote Completo (Combo 3 em 1)",
        badge: "NavalDocs + Arrais + Notificador",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Package,
      };
    }
    if (planSlug === "pacote-completo" || planSlug === "pacote-completo-3em1") {
      return {
        name: "Pacote Completo (Combo 3 em 1)",
        badge: "NavalDocs + Arrais + Notificador",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Package,
      };
    }
    if (planSlug.includes("arrais")) {
      return {
        name: "Arrais Pro",
        badge: "Escolas Náuticas",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Ship,
      };
    }
    if (planSlug.includes("notificador")) {
      return {
        name: "Notificador Naval",
        badge: "Alertas Automáticos",
        color: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Bell,
      };
    }
    return {
      name: "NavalDocs Pro",
      badge: "Documentação Náutica",
      color: "bg-blue-50 text-[#1868db] border-blue-200",
      icon: FileText,
    };
  }, [subscription]);

  // Formatação de Datas e Valores
  const nextBillingDateFormatted = useMemo(() => {
    if (!subscription?.current_period_end) return "Não agendada";
    try {
      return format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "Data a confirmar";
    }
  }, [subscription?.current_period_end]);

  const priceFormatted = useMemo(() => {
    if (!subscription?.plan?.price && subscription?.plan?.price !== 0) return "---";
    const cycle = subscription.plan.billing_cycle === "yearly" || subscription.plan.billing_cycle === "annual" 
      ? "/ano" 
      : "/mês";
    return `R$ ${Number(subscription.plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${cycle}`;
  }, [subscription?.plan]);

  // Estado Real da Assinatura
  const statusDetails = useMemo(() => {
    const rawStatus = subscription?.status;
    const isCancelScheduled = Boolean(subscription?.cancel_at_period_end);

    if (isCancelScheduled) {
      return {
        label: "Cancelamento Agendado",
        color: "bg-amber-100 text-amber-900 border-amber-300",
        icon: Clock,
        description: `Seu acesso continuará disponível até ${nextBillingDateFormatted}. Ao fim deste período, não haverá nova cobrança.`,
      };
    }
    switch (rawStatus) {
      case "active":
        return {
          label: "Assinatura Ativa",
          color: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CheckCircle2,
          description: "Cobrança automática ativa na Stripe. Franquias renovam todo mês.",
        };
      case "trialing":
        return {
          label: "Período de Teste",
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: Clock,
          description: "Aproveite todas as franquias de homologação até o fim do período de teste.",
        };
      case "past_due":
        return {
          label: "Pagamento Pendente / Atrasado",
          color: "bg-rose-100 text-rose-800 border-rose-300",
          icon: AlertTriangle,
          description: "A última tentativa de pagamento falhou. Atualize sua forma de pagamento para evitar suspensão.",
        };
      case "canceled":
        return {
          label: "Assinatura Cancelada",
          color: "bg-slate-100 text-slate-700 border-slate-300",
          icon: AlertTriangle,
          description: "Esta assinatura foi encerrada. Contrate um plano para reativar suas franquias.",
        };
      case "lifetime":
        return {
          label: "Licença Vitalícia / Admin",
          color: "bg-purple-100 text-purple-800 border-purple-300",
          icon: ShieldCheck,
          description: "Acesso permanente irrestrito de administração do sistema.",
        };
      default:
        return {
          label: "Sem Plano Ativo",
          color: "bg-slate-100 text-slate-600 border-slate-200",
          icon: Info,
          description: "Nenhuma assinatura ativa vinculada à sua empresa.",
        };
    }
  }, [subscription, nextBillingDateFormatted]);

  // Preços dos Addons extraídos do plano ou padrão
  const addonPrices = useMemo(() => {
    const plan = subscription?.plan as any;
    return {
      processes: Number(plan?.addon_process_price) || 5.0,
      arrais_kits: Number(plan?.addon_arrais_kit_price) || 4.0,
      ocr: Number(plan?.addon_ocr_price) || 0.5,
      monitored_docs: Number(plan?.addon_monitored_doc_price) || 1.5,
    };
  }, [subscription?.plan]);

  if (isLoadingSub) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <RefreshCw className="h-8 w-8 text-[#1868db] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Carregando detalhes da assinatura e faturamento...</p>
      </div>
    );
  }

  const hasSubscription = Boolean(subscription && subscription.status !== "canceled" && subscription.plan);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Faturamento & Contratos</span>
            <span>•</span>
            <span className="text-[#1868db]">Área da Empresa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-[#1868db]" />
            <span>Minha Assinatura</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Acompanhe o estado real do seu contrato na Stripe, gerencie formas de pagamento e compre capacidade adicional sob demanda.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-2 h-10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
          
          <Link
            to="/consumo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors h-10"
          >
            <Gauge className="h-4 w-4 text-[#1868db]" />
            <span>Consumo e Franquias</span>
          </Link>
        </div>
      </div>

      {/* AVISO DE PERMISSÃO PARA COLABORADORES SEM PODER FINANCEIRO */}
      {!isBillingAdmin && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Visualização Operacional</span>
            <span>
              Você está visualizando as informações da assinatura da empresa. Alterações de plano, dados bancários e cancelamentos são restritos ao responsável financeiro da conta.
            </span>
          </div>
        </div>
      )}

      {/* ALERTA DE CANCELAMENTO AGENDADO */}
      {subscription?.cancel_at_period_end && (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">
                Cancelamento agendado para o final do ciclo
              </h3>
              <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                {statusDetails.description} Você não perderá o acesso antes dessa data.
              </p>
            </div>
          </div>

          {isBillingAdmin && (
            <Button
              onClick={handleOpenStripePortal}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
            >
              Reativar Assinatura
            </Button>
          )}
        </div>
      )}

      {/* 2. CARD PRINCIPAL DA ASSINATURA */}
      {hasSubscription ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            
            {/* Informações do Plano e App */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-[#1868db] flex items-center justify-center shrink-0 shadow-xs">
                <appInfo.icon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${appInfo.color}`}>
                    {appInfo.name}
                  </span>
                  <Badge variant="outline" className={`text-[11px] font-extrabold border ${statusDetails.color} gap-1.5`}>
                    <statusDetails.icon className="h-3 w-3" />
                    <span>{statusDetails.label}</span>
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#0d2342] tracking-tight">
                  {subscription?.plan?.name || "Plano Contratado"}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ciclo {subscription?.plan?.billing_cycle === "yearly" || subscription?.plan?.billing_cycle === "annual" ? "Anual (12 Meses)" : "Mensal Recorrente"}
                </p>
              </div>
            </div>

            {/* Valor Contratado e Próxima Cobrança */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Contratado
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#0d2342]">
                  {priceFormatted}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {subscription?.plan?.billing_cycle === "yearly" || subscription?.plan?.billing_cycle === "annual" ? "Cobrado anualmente" : "Cobrado mensalmente"}
                </span>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Próxima Cobrança
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#0d2342] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#1868db]" />
                  <span>{nextBillingDateFormatted}</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {subscription?.cancel_at_period_end ? "Encerramento do acesso" : "Renovação automática"}
                </span>
              </div>
            </div>

          </div>

          {/* Resumo das Franquias do Ciclo */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Franquias do Ciclo Atual
              </span>
              <Link
                to="/consumo"
                className="text-xs font-bold text-[#1868db] hover:underline flex items-center gap-1"
              >
                <span>Ver consumo em tempo real</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#1868db] shrink-0" />
                <div>
                  <span className="text-base font-black text-[#0d2342] block">
                    {subscription?.plan?.process_limit ?? "Ilimitado"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Processos/mês</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Cpu className="h-5 w-5 text-[#1868db] shrink-0" />
                <div>
                  <span className="text-base font-black text-[#0d2342] block">
                    {subscription?.plan?.ocr_limit ?? "Ilimitado"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Leituras OCR/mês</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-[#1868db] shrink-0" />
                <div>
                  <span className="text-base font-black text-[#0d2342] block">
                    {subscription?.plan?.storage_gb ?? 5} GB
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Armazenamento</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Users className="h-5 w-5 text-[#1868db] shrink-0" />
                <div>
                  <span className="text-base font-black text-[#0d2342] block">
                    {subscription?.plan?.user_limit ?? 1}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Operadores inclusos</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. AÇÕES PRINCIPAIS (ALTERAR, ATUALIZAR PAGAMENTO, CANCELAR) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                disabled={!isBillingAdmin || isProcessingCheckout}
                onClick={() => setIsChangePlanOpen(true)}
                className="rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold h-10 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#1868db]" />
                <span>Alterar Plano</span>
              </Button>

              <Button
                variant="outline"
                disabled={!isBillingAdmin || isProcessingCheckout}
                onClick={handleOpenPaymentMethodPortal}
                className="rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold h-10 gap-1.5"
              >
                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                <span>Atualizar Forma de Pagamento</span>
              </Button>
            </div>

            {!subscription?.cancel_at_period_end && (
              <Button
                variant="ghost"
                disabled={!isBillingAdmin || isProcessingCheckout}
                onClick={() => setIsCancelModalOpen(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl h-10"
              >
                Cancelar Assinatura
              </Button>
            )}
          </div>

        </div>
      ) : (
        /* ESTADO SEM ASSINATURA ATIVA */
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <Badge className="bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider mb-1">
              Catálogo Oficial Disponível
            </Badge>
            <h2 className="text-2xl font-black text-[#0d2342]">
              Sua empresa ainda não possui uma assinatura ativa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Contrate um plano do NavalDocs Pro para ter franquias mensais completas de processos, emissão de documentos oficiais e leitura inteligente de anexos com IA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              onClick={() => navigate({ to: "/plans" })}
              className="w-full sm:w-auto h-12 px-6 bg-[#1868db] hover:bg-[#1557b8] text-white font-bold rounded-xl shadow-md gap-2"
            >
              <span>Conhecer Planos Disponíveis</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 4. SEÇÃO: COMPRAR CAPACIDADE ADICIONAL */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#0d2342] tracking-tight flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-[#1868db]" />
            <span>Comprar Capacidade Adicional</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adquira créditos avulsos sem alterar o seu plano. O valor é cobrado de forma única e o extra é liberado imediatamente após confirmação da Stripe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Addon 1: Processos NavalDocs */}
          <Card className="rounded-2xl border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between p-5 bg-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1868db] flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2342]">Processos Navais</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Cota extra de novos processos na capitania / DPC para o mês vigente.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400 block font-semibold">Preço unitário</span>
                <span className="text-lg font-black text-[#0d2342]">
                  R$ {addonPrices.processes.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ processo</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Válido durante o ciclo atual
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              disabled={!isBillingAdmin}
              onClick={() => {
                setSelectedAddonType("processes");
                setAddonQuantity(10);
              }}
              className="w-full mt-4 rounded-xl border-slate-200 hover:bg-blue-50 hover:text-[#1868db] hover:border-blue-200 text-xs font-bold"
            >
              Comprar Processos
            </Button>
          </Card>

          {/* Addon 2: Kits Arrais */}
          <Card className="rounded-2xl border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between p-5 bg-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Ship className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2342]">Kits Arrais Amador</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Kits completos de documentação e atestados para escolas náuticas.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400 block font-semibold">Preço unitário</span>
                <span className="text-lg font-black text-[#0d2342]">
                  R$ {addonPrices.arrais_kits.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ kit</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Válido durante o ciclo atual
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              disabled={!isBillingAdmin}
              onClick={() => {
                setSelectedAddonType("arrais_kits");
                setAddonQuantity(10);
              }}
              className="w-full mt-4 rounded-xl border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-bold"
            >
              Comprar Kits
            </Button>
          </Card>

          {/* Addon 3: Leituras de Anexos (OCR) */}
          <Card className="rounded-2xl border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between p-5 bg-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2342]">Leituras OCR (Anexos)</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Leitura automática com extração inteligente de dados em CNHs e comprovantes.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400 block font-semibold">Preço unitário</span>
                <span className="text-lg font-black text-[#0d2342]">
                  R$ {addonPrices.ocr.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ leitura</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Digitação manual não consome leitura
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              disabled={!isBillingAdmin}
              onClick={() => {
                setSelectedAddonType("ocr");
                setAddonQuantity(50);
              }}
              className="w-full mt-4 rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-xs font-bold"
            >
              Comprar Leituras
            </Button>
          </Card>

          {/* Addon 4: Documentos Monitorados */}
          <Card className="rounded-2xl border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between p-5 bg-white">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0d2342]">Docs Monitorados</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Monitoramento contínuo de vencimentos de carteiras e embarcações.
                </p>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400 block font-semibold">Preço unitário</span>
                <span className="text-lg font-black text-[#0d2342]">
                  R$ {addonPrices.monitored_docs.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ doc</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Válido durante o ciclo atual
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              disabled={!isBillingAdmin}
              onClick={() => {
                setSelectedAddonType("monitored_docs");
                setAddonQuantity(20);
              }}
              className="w-full mt-4 rounded-xl border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-xs font-bold"
            >
              Comprar Monitorados
            </Button>
          </Card>

        </div>
      </div>

      {/* 5. HISTÓRICO DE COBRANÇAS E FATURAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0d2342] tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1868db]" />
              <span>Histórico de Cobranças e Recibos</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Faturas de assinaturas e compras adicionais processadas pela operadora Stripe.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchPayments()}
            className="text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
          >
            Recarregar Histórico
          </Button>
        </div>

        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Recibo / Fatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingPayments ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Carregando faturas...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Nenhum pagamento ou compra registrado para esta empresa.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment: any) => {
                    const isApproved = payment.status === "approved" || payment.status === "paid";
                    const isRejected = payment.status === "rejected" || payment.status === "failed";
                    const isAddon = payment.metadata?.type === "addon_purchase";
                    const receiptUrl = payment.metadata?.hosted_invoice_url || payment.metadata?.invoice_pdf;

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {payment.paid_at 
                            ? format(new Date(payment.paid_at), "dd/MM/yyyy HH:mm")
                            : format(new Date(payment.created_at), "dd/MM/yyyy")}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0d2342]">
                          {payment.metadata?.description || (isAddon ? "Compra de Capacidade Adicional" : "Fatura de Assinatura")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {isAddon ? "Avulso" : "Recorrente"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#0d2342]">
                          R$ {Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          {isApproved ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                              Pago
                            </Badge>
                          ) : isRejected ? (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                              Recusado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {receiptUrl ? (
                            <a
                              href={receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1868db] hover:underline"
                            >
                              <span>Ver Fatura</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Stripe</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ALTERAR PLANO                                                   */}
      {/* ========================================================================= */}
      <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#0d2342]">
              Alterar Plano da Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Escolha uma nova oferta para seu escritório. O novo valor e os cálculos proporcionais serão processados com máxima segurança pela Stripe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Como funciona a cobrança proporcional?</span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  O valor correspondente aos dias não utilizados do seu plano atual é automaticamente creditado pela Stripe e abatido do valor do novo plano no momento da alteração.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Selecione o novo plano:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {catalogPlans.map((plan) => {
                  const isCurrent = plan.slug === subscription?.plan?.slug;
                  const isSelected = selectedNewPlan?.id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isCurrent && setSelectedNewPlan(plan)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "border-[#1868db] bg-blue-50/40 ring-2 ring-[#1868db]/20 cursor-pointer"
                            : "border-slate-200 hover:border-slate-300 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#0d2342]">{plan.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Atual</span>
                        )}
                      </div>
                      <div className="text-sm font-black text-[#1868db]">
                        R$ {plan.priceMonthly.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/mês</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{plan.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedNewPlan && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-[#0d2342]">
                  <span>Novo Plano Selecionado:</span>
                  <span>{selectedNewPlan.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Novo Preço Mensal:</span>
                  <span>R$ {selectedNewPlan.priceMonthly.toFixed(2)}/mês</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Quando começará a valer:</span>
                  <span className="font-bold text-emerald-600">Imediatamente</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsChangePlanOpen(false)}
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenStripePortal}
              disabled={isProcessingCheckout}
              className="bg-[#1868db] hover:bg-[#1557b8] text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
            >
              <span>Confirmar no Portal Stripe</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: CANCELAR ASSINATURA                                             */}
      {/* ========================================================================= */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#0d2342] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Cancelar Assinatura</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confira os termos de cancelamento da sua assinatura antes de prosseguir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs leading-relaxed text-slate-600">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
              <span className="font-bold block">Seu acesso continuará até o fim do ciclo:</span>
              <p className="text-[11px] leading-relaxed">
                Ao cancelar, sua assinatura NÃO será encerrada imediatamente. Você e sua equipe terão acesso total e garantido a todas as franquias até <strong>{nextBillingDateFormatted}</strong>.
              </p>
            </div>

            <ul className="space-y-1.5 text-slate-600 text-[11px] list-disc list-inside">
              <li>Nenhuma nova cobrança será efetuada no seu cartão após essa data.</li>
              <li>Seus documentos e processos já gerados continuarão preservados.</li>
              <li>Você poderá reativar seu plano a qualquer momento pelo portal.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              Manter Assinatura
            </Button>
            <Button
              onClick={() => {
                setIsCancelModalOpen(false);
                handleOpenStripePortal();
              }}
              disabled={isProcessingCheckout}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Prosseguir no Portal Seguro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: COMPRA DE CAPACIDADE ADICIONAL                                  */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(selectedAddonType)} onOpenChange={(open) => !open && setSelectedAddonType(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#0d2342] flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#1868db]" />
              <span>Comprar Capacidade Adicional</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pagamento único via Stripe Checkout com liberação imediata após confirmação.
            </DialogDescription>
          </DialogHeader>

          {selectedAddonType && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Item selecionado
                </span>
                <span className="text-sm font-extrabold text-[#0d2342] block">
                  {selectedAddonType === "processes" && "Processos Navais Extras"}
                  {selectedAddonType === "arrais_kits" && "Kits de Alunos Arrais Extras"}
                  {selectedAddonType === "ocr" && "Leituras Automáticas de Anexos (OCR)"}
                  {selectedAddonType === "monitored_docs" && "Documentos Monitorados Extras"}
                </span>
                <span className="text-xs text-slate-500">
                  Preço unitário: R$ {addonPrices[selectedAddonType].toFixed(2)}
                </span>
              </div>

              {/* Seletor de Quantidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Selecione a quantidade de créditos extras:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setAddonQuantity(qty)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        addonQuantity === qty
                          ? "bg-[#1868db] text-white border-[#1868db] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {qty} un
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Quantidade:</span>
                  <span className="font-bold text-[#0d2342]">{addonQuantity} unidades</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Validade:</span>
                  <span className="font-bold text-slate-800">Ciclo Atual</span>
                </div>
                <div className="border-t border-blue-200/60 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">Total a pagar agora:</span>
                  <span className="text-lg font-black text-[#1868db]">
                    R$ {(addonPrices[selectedAddonType] * addonQuantity).toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                💡 O adicional será liberado no momento da confirmação bancária. Caso você cancele o pagamento na Stripe, nenhuma cobrança será efetuada.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSelectedAddonType(null)}
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              Voltar
            </Button>
            <Button
              onClick={handleBuyAddon}
              disabled={isProcessingCheckout}
              className="bg-[#1868db] hover:bg-[#1557b8] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Comprar com Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
