import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Gauge, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  CreditCard, 
  PlusCircle, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight,
  User,
  Check,
  Calculator,
  HelpCircle
} from "lucide-react";
import { useState, useMemo, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  getOfficialPlanUsage, 
  getConsumptionHistory, 
  checkActionQuota,
  recordResourceConsumption,
  PlanUsageSummary,
  ConsumptionHistoryEntry 
} from "@/services/billing/planUsageService";
import { OFFICIAL_NAVAL_PLANS } from "@/services/billing/plansConfig";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/uso-do-plano")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <UsoDoPlanoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type ActionType = "process_creation" | "ocr_read" | "reused_document" | "manual_entry";

export function UsoDoPlanoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, companyId: authCompanyId, user } = useAuth();
  const companyId = profile?.company_id || authCompanyId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeHistoryFilter, setActiveHistoryFilter] = useState<"all" | "processes" | "ocr" | "exempt">("all");
  
  // Simulador / Verificador prévio de consumo
  const [selectedAction, setSelectedAction] = useState<ActionType>("process_creation");

  // Modal de Adicional
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonType, setAddonType] = useState<"processes" | "ocr">("processes");
  const [addonQuantity, setAddonQuantity] = useState(10);
  const [isPurchasingAddon, setIsPurchasingAddon] = useState(false);

  // 1. Consulta Oficial de Limites e Consumo do Backend
  const { 
    data: usage, 
    isLoading: isLoadingUsage, 
    refetch: refetchUsage,
    error: usageError 
  } = useQuery({
    queryKey: ["official-plan-usage", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      return await getOfficialPlanUsage(companyId);
    },
    enabled: Boolean(companyId),
  });

  // 2. Consulta Oficial de Histórico Cronológico
  const { 
    data: history = [], 
    isLoading: isLoadingHistory, 
    refetch: refetchHistory 
  } = useQuery({
    queryKey: ["official-consumption-history", companyId, usage?.cycleStart, usage?.cycleEnd],
    queryFn: async () => {
      if (!companyId || !usage?.cycleStart || !usage?.cycleEnd) return [];
      return await getConsumptionHistory(companyId, usage.cycleStart, usage.cycleEnd);
    },
    enabled: Boolean(companyId && usage?.cycleStart && usage?.cycleEnd),
  });

  // Atualização sincronizada
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchUsage(), refetchHistory()]);
      toast.success("Dados de uso do plano atualizados com sucesso!");
    } catch (e) {
      toast.error("Erro ao sincronizar consumo do plano.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Simulação prévia de consumo para a ação selecionada
  const preCheck = useMemo(() => {
    if (!usage) return null;

    let processesToCreate = 0;
    let ocrToRead = 0;
    let isReusedDocument = false;
    let isManualEntry = false;
    let actionLabel = "";
    let explanation = "";

    switch (selectedAction) {
      case "process_creation":
        processesToCreate = 1;
        actionLabel = "Criar 1 novo processo";
        explanation = "Consome 1 unidade da franquia mensal de processos.";
        break;
      case "ocr_read":
        ocrToRead = 1;
        actionLabel = "Leitura automática de documento novo";
        explanation = "Consome 1 leitura da franquia para extrair dados de CNH ou comprovante de residência.";
        break;
      case "reused_document":
        isReusedDocument = true;
        actionLabel = "Reaproveitamento de documento já salvo";
        explanation = "ISENTO: Dados já salvos no cadastro do cliente ou da embarcação são reutilizados sem consumir franquia de leitura.";
        break;
      case "manual_entry":
        isManualEntry = true;
        actionLabel = "Preenchimento manual de dados";
        explanation = "ISENTO: Preencher campos manualmente não consome nenhuma cota de leitura de documentos.";
        break;
    }

    const ocrCost = isReusedDocument || isManualEntry ? 0 : ocrToRead;
    const procCost = processesToCreate;

    const canExecuteProcesses = usage.processes.available >= procCost;
    const canExecuteOcr = usage.ocr.available >= ocrCost;
    const canExecute = canExecuteProcesses && canExecuteOcr;

    return {
      actionLabel,
      explanation,
      processesCost: procCost,
      ocrCost: ocrCost,
      isExempt: isReusedDocument || isManualEntry,
      canExecute,
      remainingProcesses: Math.max(0, usage.processes.available - procCost),
      remainingOcr: Math.max(0, usage.ocr.available - ocrCost),
    };
  }, [usage, selectedAction]);

  // Histórico filtrado
  const filteredHistory = useMemo(() => {
    if (activeHistoryFilter === "all") return history;
    if (activeHistoryFilter === "processes") return history.filter(h => h.operationType === "process_creation");
    if (activeHistoryFilter === "ocr") return history.filter(h => h.operationType === "ocr_read");
    if (activeHistoryFilter === "exempt") return history.filter(h => h.isExempt);
    return history;
  }, [history, activeHistoryFilter]);

  // Contratação de adicional idempotente
  const handleConfirmAddon = async () => {
    if (!companyId) return;
    setIsPurchasingAddon(true);

    try {
      // Gera requestId único de idempotência
      const requestId = `addon-${companyId}-${addonType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const priceUnit = addonType === "processes" ? 5.0 : 0.5;
      const priceTotal = addonQuantity * priceUnit;

      // 1. Inserir no company_resource_addons
      const { error: addonError } = await supabase
        .from("company_resource_addons")
        .insert({
          company_id: companyId,
          resource_key: addonType,
          extra_monthly: addonQuantity,
          extra_daily: 0,
          source: "user_purchase",
          metadata: {
            request_id: requestId,
            price_total: priceTotal,
            purchased_by: profile?.name || user?.email || "Operador",
            purchased_at: new Date().toISOString(),
          }
        });

      if (addonError) {
        console.error("Erro ao registrar addon:", addonError);
        throw addonError;
      }

      toast.success(
        `Adicional contratado com sucesso! +${addonQuantity} ${addonType === "processes" ? "processos" : "leituras"} adicionados ao ciclo.`
      );
      setAddonModalOpen(false);
      await handleRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível contratar o adicional.");
    } finally {
      setIsPurchasingAddon(false);
    }
  };

  const isLimitExceeded = (usage?.processes.available ?? 1) <= 0 || (usage?.ocr.available ?? 1) <= 0;

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA TELA */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center">
              <Gauge className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Uso do plano
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Acompanhe o consumo real da assinatura da sua empresa e evite surpresas ao iniciar novos processos ou solicitar leituras automáticas de documentos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#075BFF]" : "text-slate-400"}`} />
          <span>Atualizar dados</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD TOPO: PLANO ATUAL E DATA DE RENOVAÇÃO */}
      {/* ========================================================================= */}
      {isLoadingUsage ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs animate-pulse">
          <div className="h-5 w-48 bg-slate-100 rounded mb-2" />
          <div className="h-4 w-32 bg-slate-50 rounded" />
        </div>
      ) : usage && usage.hasActivePlan ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Plano contratado
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#075BFF] border border-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{usage.planName}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                  {usage.billingCycle === "yearly" ? "Cobrança Anual" : "Cobrança Mensal"}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium capitalize">
                  {usage.subscriptionStatus === "active" ? "Assinatura ativa" : usage.subscriptionStatus}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    Próxima renovação da franquia: <strong>{usage.renewalDateFormatted}</strong>
                  </span>
                </div>

                {usage.isAnnualWithMonthlyQuota && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    <Info className="h-3 w-3" />
                    Franquia renovada mensalmente no plano anual
                  </span>
                )}
              </div>
            </div>

            <Link
              to="/minha-assinatura"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors shrink-0"
            >
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span>Gerenciar assinatura</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum plano ativo encontrado
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Para utilizar a franquia de novos processos e leituras com inteligência artificial, ative um plano oficial do NavalDocs Pro.
                </p>
              </div>
            </div>

            <Link
              to="/plans"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <span>Ver planos disponíveis</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DOIS INDICADORES SEPARADOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        
        {/* INDICADOR 1: PROCESSOS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                <FileText className="h-6 w-6" />
              </div>
              
              {usage && usage.processes.percent >= 100 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Limite esgotado
                </span>
              ) : usage && usage.processes.percent >= 80 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Atenção ({usage.processes.percent}%)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {usage?.processes.available ?? 0} disponíveis
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-[#0B1739] mt-4">
              Processos
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Quantidade de novos processos iniciados no período vigente.
            </p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1739]">
                {usage?.processes.used ?? 0}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {usage?.processes.limit ?? 0} limite no período
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  (usage?.processes.percent ?? 0) >= 100 
                    ? "bg-rose-500" 
                    : (usage?.processes.percent ?? 0) >= 80 
                      ? "bg-amber-500" 
                      : "bg-[#075BFF]"
                }`} 
                style={{ width: `${usage?.processes.percent ?? 0}%` }} 
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>{usage?.processes.percent ?? 0}% consumido</span>
              <span>
                <strong>{usage?.processes.available ?? 0}</strong> restantes no período
              </span>
            </div>

            {usage && usage.processes.extraAddons > 0 && (
              <p className="text-[11px] text-blue-600 font-medium">
                +{usage.processes.extraAddons} processos adicionais contratados ativos
              </p>
            )}
          </div>
        </div>

        {/* INDICADOR 2: DOCUMENTOS LIDOS AUTOMATICAMENTE */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Sparkles className="h-6 w-6" />
              </div>
              
              {usage && usage.ocr.percent >= 100 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Limite esgotado
                </span>
              ) : usage && usage.ocr.percent >= 80 ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Atenção ({usage.ocr.percent}%)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {usage?.ocr.available ?? 0} disponíveis
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-[#0B1739] mt-4">
              Documentos lidos automaticamente
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Extração inteligente de dados a partir de documentos de origem (ex: CNH, comprovante de endereço).
            </p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1739]">
                {usage?.ocr.used ?? 0}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {usage?.ocr.limit ?? 0} leituras no período
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  (usage?.ocr.percent ?? 0) >= 100 
                    ? "bg-rose-500" 
                    : (usage?.ocr.percent ?? 0) >= 80 
                      ? "bg-amber-500" 
                      : "bg-purple-600"
                }`} 
                style={{ width: `${usage?.ocr.percent ?? 0}%` }} 
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>{usage?.ocr.percent ?? 0}% consumido</span>
              <span>
                <strong>{usage?.ocr.available ?? 0}</strong> leituras restantes
              </span>
            </div>

            {usage && usage.ocr.extraAddons > 0 && (
              <p className="text-[11px] text-purple-600 font-medium">
                +{usage.ocr.extraAddons} leituras adicionais contratadas ativas
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. EXPLICAÇÃO DIDÁTICA: REAPROVEITAMENTO E DIGITAÇÃO MANUAL NÃO CONSOMEM */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#075BFF] flex items-center justify-center shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800">
            Como economizar sua franquia de leitura automática
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs text-slate-600 leading-relaxed">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Reaproveitamento de dados
            </p>
            <p>
              Dados já salvos no cadastro do cliente ou da embarcação podem ser reutilizados em novos processos <strong>sem consumir outra leitura</strong>.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Preenchimento manual
            </p>
            <p>
              O preenchimento manual de formulários e campos <strong>também não consome leitura</strong>. Você pode digitar sempre que preferir.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Geração do PDF final
            </p>
            <p>
              A leitura automática refere-se apenas à extração de documentos de origem. A geração do PDF final e emissão de laudos <strong>é outra operação</strong> e não desconta leitura.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. VERIFICADOR PRÉVIO DE CONSUMO ANTES DE INICIAR UMA AÇÃO */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-[#0B1739]">
              Consumo prévio de ações
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Saiba exatamente quanto cada operação consumirá antes de executar.
          </span>
        </div>

        {/* Seleção de ação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedAction("process_creation")}
            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedAction === "process_creation"
                ? "border-[#075BFF] bg-blue-50/70 text-[#075BFF] font-bold shadow-xs"
                : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Criar novo processo</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">1 processo</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Abertura de serviço náutico</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction("ocr_read")}
            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedAction === "ocr_read"
                ? "border-purple-600 bg-purple-50/70 text-purple-700 font-bold shadow-xs"
                : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Leitura de documento novo</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">1 leitura</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Envio de CNH / Comprovante novo</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction("reused_document")}
            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedAction === "reused_document"
                ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 font-bold shadow-xs"
                : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Reaproveitamento</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Grátis</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Documento já salvo no cadastro</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction("manual_entry")}
            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
              selectedAction === "manual_entry"
                ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 font-bold shadow-xs"
                : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Preenchimento manual</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Grátis</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">Digitação direta sem anexo</p>
          </button>
        </div>

        {/* Resultado do pré-check */}
        {preCheck && (
          <div className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            preCheck.canExecute ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {preCheck.canExecute ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className="font-bold text-slate-900">
                  {preCheck.actionLabel}: {preCheck.canExecute ? "Saldo suficiente" : "Limite insuficiente"}
                </span>
              </div>
              <p className="text-slate-600 pl-6 leading-relaxed">
                {preCheck.explanation}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="text-right">
                <span className="block text-[11px] text-slate-400">Consumirá</span>
                <span className="font-bold text-slate-800">
                  {preCheck.isExempt 
                    ? "0 (Isento)" 
                    : preCheck.processesCost > 0 
                      ? `${preCheck.processesCost} processo` 
                      : `${preCheck.ocrCost} leitura`}
                </span>
              </div>

              <div className="text-right">
                <span className="block text-[11px] text-slate-400">Saldo após ação</span>
                <span className="font-bold text-slate-800">
                  {preCheck.processesCost > 0 
                    ? `${preCheck.remainingProcesses} processos` 
                    : `${preCheck.remainingOcr} leituras`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. QUANDO O LIMITE ACABAR: CONTRATAR ADICIONAL OU MUDAR DE PLANO */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0B1739]">
            Precisa de mais processos ou leituras?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adquira cotas adicionais ou mude de plano. Todos os preços e produtos são oficiais do sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          
          {/* Card 1: Processos Adicionais */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-white hover:border-blue-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  R$ 5,00 / un
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                Processos adicionais
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Adicione lotes de novos processos ao mês vigente sem precisar alterar sua assinatura.
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-2">
                Lote com 10 processos: R$ 50,00
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAddonType("processes");
                setAddonQuantity(10);
                setAddonModalOpen(true);
              }}
              className="w-full text-xs font-semibold cursor-pointer border-blue-200 text-[#075BFF] hover:bg-blue-50"
            >
              Contratar processos
            </Button>
          </div>

          {/* Card 2: Leituras Adicionais */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-white hover:border-purple-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  R$ 0,50 / un
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                Leituras adicionais
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pacotes de páginas adicionais para extração automática de CNHs e comprovantes via IA.
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-2">
                Lote com 50 leituras: R$ 25,00
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAddonType("ocr");
                setAddonQuantity(50);
                setAddonModalOpen(true);
              }}
              className="w-full text-xs font-semibold cursor-pointer border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Contratar leituras
            </Button>
          </div>

          {/* Card 3: Mudar de Plano (Upgrade) */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#075BFF] flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Mais vantajoso
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Mudar de plano
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Evolua para planos com maiores franquias mensais de processos, leituras e mais operadores.
              </p>
              <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                <p>• <strong>Profissional:</strong> 60 proc / 600 leituras (R$ 299/mês)</p>
                <p>• <strong>Equipe:</strong> 150 proc / 1.500 leituras (R$ 599/mês)</p>
              </div>
            </div>

            <Link
              to="/plans"
              className="w-full py-2 px-3 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs text-center transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Ver planos disponíveis</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. HISTÓRICO SIMPLES DE CONSUMO */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1739]">
              Histórico de consumo do período
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registros detalhados com data, usuário, operação e processo relacionado.
            </p>
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveHistoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeHistoryFilter === "all" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryFilter("processes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeHistoryFilter === "processes" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Processos
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryFilter("ocr")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeHistoryFilter === "ocr" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Leituras
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryFilter("exempt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeHistoryFilter === "exempt" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Isentos (Grátis)
            </button>
          </div>
        </div>

        {/* TABELA DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3 px-2">Data e Hora</th>
                <th className="pb-3 px-2">Usuário</th>
                <th className="pb-3 px-2">Operação</th>
                <th className="pb-3 px-2">Processo Relacionado</th>
                <th className="pb-3 px-2 text-right">Consumo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Nenhum consumo registrado neste período</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      As novas operações aparecerão aqui assim que forem executadas.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                      {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{item.userName}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        {item.operationType === "process_creation" && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                        {item.operationType === "ocr_read" && <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                        {item.operationType === "reused_document" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {item.operationType === "manual_entry" && <Check className="h-3.5 w-3.5 text-slate-500" />}
                        <span>{item.operation}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 max-w-xs truncate">
                      {item.processId ? (
                        <Link 
                          to="/processes/$id" 
                          params={{ id: item.processId }}
                          className="text-[#075BFF] hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{item.processTitle || "Ver processo"}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      ) : (
                        <span>{item.processTitle || item.details || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {item.isExempt ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Isento (0)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800">
                          -{item.consumedAmount} {item.unitLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* LISTA EM CARDS MOBILE */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <Clock className="h-7 w-7 text-slate-200 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhum consumo no período</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nenhuma ação consumiu franquia até o momento.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="py-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    {item.operationType === "process_creation" && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                    {item.operationType === "ocr_read" && <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                    {item.operationType === "reused_document" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {item.operationType === "manual_entry" && <Check className="h-3.5 w-3.5 text-slate-500" />}
                    <span>{item.operation}</span>
                  </span>
                  {item.isExempt ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Isento
                    </span>
                  ) : (
                    <span className="font-bold text-slate-800">
                      -{item.consumedAmount} {item.unitLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Por: {item.userName}</span>
                  <span>{format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>

                {item.processTitle && (
                  <p className="text-slate-600 text-[11px] truncate">
                    Processo: {item.processTitle}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé informativo de idempotência */}
        <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Todas as operações de consumo utilizam chaves de idempotência oficiais. Atualizar a página ou reenviar formulários nunca desconta a mesma ação duas vezes.
          </span>
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 8. MODAL DE CONTRATAÇÃO DE ADICIONAL */}
      {/* ========================================================================= */}
      <Dialog open={addonModalOpen} onOpenChange={setAddonModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              Contratar {addonType === "processes" ? "Processos Adicionais" : "Leituras Adicionais"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O saldo contratado será creditado imediatamente na franquia da sua empresa para o ciclo atual.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Quantidade desejada
              </label>
              <div className="flex items-center gap-2">
                {[
                  addonType === "processes" ? 10 : 50,
                  addonType === "processes" ? 25 : 100,
                  addonType === "processes" ? 50 : 200,
                ].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setAddonQuantity(qty)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      addonQuantity === qty 
                        ? "border-[#075BFF] bg-blue-50 text-[#075BFF]" 
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    +{qty} {addonType === "processes" ? "proc" : "leituras"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Preço unitário oficial:</span>
                <span className="font-semibold text-slate-800">
                  {addonType === "processes" ? "R$ 5,00 por processo" : "R$ 0,50 por leitura"}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Total a pagar:</span>
                <span className="text-[#075BFF]">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    addonQuantity * (addonType === "processes" ? 5.0 : 0.5)
                  )}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Cobrança segura vinculada à fatura da sua empresa com garantia de não duplicação.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPurchasingAddon}
              onClick={() => setAddonModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPurchasingAddon}
              onClick={handleConfirmAddon}
              className="bg-[#075BFF] hover:bg-blue-600 text-white"
            >
              {isPurchasingAddon ? "Confirmando..." : "Confirmar contratação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
