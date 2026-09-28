import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Gauge, 
  FileText, 
  Sparkles, 
  HardDrive, 
  RefreshCw, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  CreditCard, 
  PlusCircle, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/consumo")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ConsumoEFranquiasPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type HistoryTab = "all" | "processes" | "ocr" | "addons";

interface ConsumptionHistoryItem {
  id: string;
  type: "process" | "ocr" | "addon";
  action: string;
  detail: string;
  date: string;
  amount: number;
  unit: string;
}

function ConsumoEFranquiasPage() {
  const navigate = useNavigate();
  const { profile, companyId: authCompanyId, isGlobalAdmin, loading: authLoading } = useAuth();
  const companyId = profile?.company_id || authCompanyId;

  const { subscription, isLoading: isLoadingSub, refetch: refetchSub } = useSubscription();

  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Identificação do ciclo atual (início e fim)
  const cycleDates = useMemo(() => {
    if (subscription?.current_period_start && subscription?.current_period_end) {
      return {
        start: new Date(subscription.current_period_start),
        end: new Date(subscription.current_period_end),
        hasPlan: true,
      };
    }
    // Fallback: ciclo do mês corrente
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      start,
      end,
      hasPlan: Boolean(subscription?.plan),
    };
  }, [subscription]);

  const cycleStartIso = cycleDates.start.toISOString();
  const cycleEndIso = cycleDates.end.toISOString();

  // 2. Consulta de Processos do Ciclo
  const { 
    data: processesData = [], 
    isLoading: isLoadingProcesses, 
    refetch: refetchProcesses 
  } = useQuery({
    queryKey: ["consumption-processes", companyId, cycleStartIso],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("processes")
        .select("id, title, process_type, customer_id, created_at, customer:customers!processes_customer_id_fkey(name)")
        .eq("company_id", companyId)
        .gte("created_at", cycleStartIso)
        .lte("created_at", cycleEndIso)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao consultar processos:", error);
        return [];
      }
      return data || [];
    },
    enabled: Boolean(companyId),
  });

  // 3. Consulta de Leituras de Anexos (OCR e Ledger de Consumo)
  const { 
    data: ocrConsumption = [], 
    isLoading: isLoadingOcr, 
    refetch: refetchOcr 
  } = useQuery({
    queryKey: ["consumption-ocr", companyId, cycleStartIso],
    queryFn: async () => {
      if (!companyId) return [];

      // Consulta no ledger oficial de consumo
      const { data: ledger, error: ledgerError } = await supabase
        .from("resource_consumption")
        .select("id, resource_key, amount, metadata, created_at")
        .eq("company_id", companyId)
        .eq("resource_key", "ocr")
        .gte("created_at", cycleStartIso)
        .lte("created_at", cycleEndIso)
        .order("created_at", { ascending: false });

      if (!ledgerError && ledger && ledger.length > 0) {
        return ledger;
      }

      // Fallback em jobs de OCR se ledger ainda não tiver histórico populado
      const { data: ocrJobs, error: ocrError } = await supabase
        .from("ocr_jobs")
        .select("id, document_type, file_name, created_at, status")
        .eq("company_id", companyId)
        .gte("created_at", cycleStartIso)
        .lte("created_at", cycleEndIso)
        .order("created_at", { ascending: false });

      if (ocrError) {
        console.error("Erro ao consultar leituras OCR:", ocrError);
        return [];
      }

      return (ocrJobs || []).map((j: any) => ({
        id: j.id,
        resource_key: "ocr",
        amount: 1,
        metadata: { file_name: j.file_name, doc_type: j.document_type },
        created_at: j.created_at,
      }));
    },
    enabled: Boolean(companyId),
  });

  // 4. Consulta de Armazenamento Real Utilizado
  const { 
    data: filesData = [], 
    isLoading: isLoadingFiles, 
    refetch: refetchFiles 
  } = useQuery({
    queryKey: ["consumption-files-storage", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("uploaded_files")
        .select("id, file_size, file_name, created_at")
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao consultar arquivos armazenados:", error);
        return [];
      }
      return data || [];
    },
    enabled: Boolean(companyId),
  });

  // 5. Consulta de Pacotes Extras Adquiridos
  const { 
    data: addonsData = [], 
    isLoading: isLoadingAddons, 
    refetch: refetchAddons 
  } = useQuery({
    queryKey: ["consumption-addons", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_resource_addons")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao consultar addons:", error);
        return [];
      }
      return data || [];
    },
    enabled: Boolean(companyId),
  });

  // Recarga manual sincronizada
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSub(),
        refetchProcesses(),
        refetchOcr(),
        refetchFiles(),
        refetchAddons(),
      ]);
      toast.success("Dados de consumo atualizados com sucesso!");
    } catch (e) {
      toast.error("Não foi possível atualizar todos os dados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cálculos de Franquias e Limites
  const planInfo = subscription?.plan;
  const hasActivePlan = Boolean(planInfo && (subscription?.status === "active" || subscription?.status === "trialing" || subscription?.status === "past_due" || subscription?.status === "lifetime"));

  // Extras somados
  const extraProcesses = useMemo(() => {
    return addonsData
      .filter((a: any) => a.resource_key === "processes" || a.resource_key === "process")
      .reduce((sum: number, a: any) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);
  }, [addonsData]);

  const extraOcr = useMemo(() => {
    return addonsData
      .filter((a: any) => a.resource_key === "ocr")
      .reduce((sum: number, a: any) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);
  }, [addonsData]);

  // 1. Processos
  const limitProcesses = planInfo ? (planInfo.process_limit || (planInfo as any).processLimit || 20) + extraProcesses : 0;
  const usedProcesses = processesData.length;
  const availableProcesses = Math.max(0, limitProcesses - usedProcesses);
  const percentProcesses = limitProcesses > 0 ? Math.min(100, Math.round((usedProcesses / limitProcesses) * 100)) : 0;

  // 2. Leituras OCR
  const limitOcr = planInfo ? (planInfo.ocr_limit || (planInfo as any).ocrLimit || 200) + extraOcr : 0;
  const usedOcr = ocrConsumption.reduce((acc: number, item: any) => acc + (Number(item.amount) || 1), 0);
  const availableOcr = Math.max(0, limitOcr - usedOcr);
  const percentOcr = limitOcr > 0 ? Math.min(100, Math.round((usedOcr / limitOcr) * 100)) : 0;

  // 3. Armazenamento
  const limitStorageGb = planInfo ? (planInfo.storage_gb || (planInfo as any).storageGb || 5) : 1;
  const totalSizeBytes = filesData.reduce((acc: number, f: any) => acc + (Number(f.file_size) || 0), 0);
  const usedStorageGb = totalSizeBytes / (1024 * 1024 * 1024);
  const usedStorageMb = totalSizeBytes / (1024 * 1024);
  const percentStorage = limitStorageGb > 0 ? Math.min(100, Math.round((usedStorageGb / limitStorageGb) * 100)) : 0;
  const availableStorageGb = Math.max(0, limitStorageGb - usedStorageGb);

  // Formatação amigável de armazenamento
  const formattedUsedStorage = usedStorageGb >= 1 
    ? `${usedStorageGb.toFixed(2).replace(".", ",")} GB` 
    : `${usedStorageMb.toFixed(1).replace(".", ",")} MB`;

  const formattedRemainingStorage = availableStorageGb >= 1 
    ? `${availableStorageGb.toFixed(2).replace(".", ",")} GB` 
    : `${(availableStorageGb * 1024).toFixed(0)} MB`;

  // Histórico consolidado do ciclo atual
  const historyList = useMemo<ConsumptionHistoryItem[]>(() => {
    const list: ConsumptionHistoryItem[] = [];

    // Processos
    for (const p of processesData) {
      const custName = (p as any).customer?.name || "Cliente não vinculado";
      list.push({
        id: `proc-${p.id}`,
        type: "process",
        action: "Processo aberto",
        detail: `Processo: ${p.title} (${custName})`,
        date: p.created_at,
        amount: 1,
        unit: "processo",
      });
    }

    // Leituras de anexos
    for (const item of ocrConsumption) {
      const fileName = item.metadata?.file_name || (item.metadata?.doc_type ? `Doc: ${item.metadata.doc_type}` : "Anexo analisado");
      list.push({
        id: `ocr-${item.id}`,
        type: "ocr",
        action: "Leitura automática de documento",
        detail: fileName,
        date: item.created_at,
        amount: item.amount || 1,
        unit: (item.amount || 1) === 1 ? "leitura" : "leituras",
      });
    }

    // Extras
    for (const addon of addonsData) {
      const resName = addon.resource_key === "ocr" ? "Leituras automáticas" : addon.resource_key === "processes" ? "Processos" : "Armazenamento";
      const qty = addon.extra_monthly || addon.extra_daily || 0;
      list.push({
        id: `addon-${addon.id}`,
        type: "addon",
        action: `Pacote adicional contratado (${resName})`,
        detail: `Crédito de franquia adicionado ao ciclo`,
        date: addon.created_at,
        amount: qty,
        unit: "cota extra",
      });
    }

    // Ordenar por data decrescente
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processesData, ocrConsumption, addonsData]);

  // Filtragem das abas
  const filteredHistory = useMemo(() => {
    if (activeTab === "all") return historyList;
    if (activeTab === "processes") return historyList.filter((item) => item.type === "process");
    if (activeTab === "ocr") return historyList.filter((item) => item.type === "ocr");
    if (activeTab === "addons") return historyList.filter((item) => item.type === "addon");
    return historyList;
  }, [historyList, activeTab]);

  const cycleDaysLeft = useMemo(() => {
    const now = Date.now();
    const end = cycleDates.end.getTime();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [cycleDates.end]);

  const cycleBillingLabel = useMemo(() => {
    const cycle = planInfo?.billing_cycle || (planInfo as any)?.billingCycle;
    if (cycle === "yearly" || cycle === "annual") return "Cobrança anual";
    return "Cobrança mensal";
  }, [planInfo]);

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA PÁGINA */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Consumo e franquias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o uso dos recursos do seu plano no ciclo atual e gerencie suas franquias.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#075BFF]" : "text-slate-400"}`} />
          <span>Atualizar dados</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD DO TOPO: PLANO CONTRATADO E CICLO ATUAL */}
      {/* ========================================================================= */}
      {isLoadingSub ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs animate-pulse">
          <div className="h-5 w-48 bg-slate-100 rounded mb-2" />
          <div className="h-4 w-32 bg-slate-50 rounded" />
        </div>
      ) : hasActivePlan ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Plano contratado
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#075BFF] border border-blue-100">
                  <ShieldCheck className="h-3 w-3" />
                  <span>{planInfo?.name || "Plano Ativo"}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                  {cycleBillingLabel}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    Ciclo atual: <strong>{format(cycleDates.start, "dd/MM/yyyy", { locale: ptBR })}</strong> até <strong>{format(cycleDates.end, "dd/MM/yyyy", { locale: ptBR })}</strong>
                  </span>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-500 font-medium">
                  {cycleDaysLeft === 1 ? "1 dia restante" : `${cycleDaysLeft} dias restantes`}
                </span>
              </div>
            </div>

            <Link
              to="/assinaturas"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors shrink-0"
            >
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span>Ver assinatura</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Estado sem plano contratado */
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum plano contratado
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Sua empresa ainda não possui uma assinatura ativa. Contrate um plano oficial do NavalDocs Pro para ter franquias mensais completas de processos e leituras com inteligência artificial.
                </p>
              </div>
            </div>

            <Link
              to="/assinaturas"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <span>Escolher um plano</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TRÊS INDICADORES PRINCIPAIS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* INDICADOR 1: PROCESSOS NOVOS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                <FileText className="h-5 w-5" />
              </div>
              {percentProcesses >= 100 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Esgotado
                </span>
              ) : percentProcesses >= 80 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  80% utilizado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {availableProcesses} disponíveis
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-[#0B1739] mt-3">
              Processos novos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Criados no ciclo vigente do mês
            </p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                {usedProcesses}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {limitProcesses} utilizados
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  percentProcesses >= 100 
                    ? "bg-rose-500" 
                    : percentProcesses >= 80 
                      ? "bg-amber-500" 
                      : "bg-[#075BFF]"
                }`} 
                style={{ width: `${percentProcesses}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{percentProcesses}% da cota mensal</span>
              <span><strong>{availableProcesses}</strong> restantes</span>
            </div>
          </div>
        </div>

        {/* INDICADOR 2: LEITURAS DE ANEXOS (COM EXPLICAÇÃO REQUISITADA) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Sparkles className="h-5 w-5" />
              </div>
              {percentOcr >= 100 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Esgotado
                </span>
              ) : percentOcr >= 80 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  80% utilizado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {availableOcr} disponíveis
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-[#0B1739] mt-3">
              Documentos anexados lidos automaticamente
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Extração e leitura inteligente via IA
            </p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                {usedOcr}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {limitOcr} leituras
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  percentOcr >= 100 
                    ? "bg-rose-500" 
                    : percentOcr >= 80 
                      ? "bg-amber-500" 
                      : "bg-purple-600"
                }`} 
                style={{ width: `${percentOcr}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{percentOcr}% da cota mensal</span>
              <span><strong>{availableOcr}</strong> restantes</span>
            </div>
          </div>
        </div>

        {/* INDICADOR 3: ARMAZENAMENTO */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <HardDrive className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {formattedRemainingStorage} livres
              </span>
            </div>

            <h3 className="text-sm font-bold text-[#0B1739] mt-3">
              Armazenamento em nuvem
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Espaço utilizado por documentos e anexos
            </p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                {formattedUsedStorage}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {limitStorageGb} GB contratados
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300" 
                style={{ width: `${percentStorage}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{percentStorage}% do limite total</span>
              <span><strong>{filesData.length}</strong> arquivos</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. EXPLICAÇÃO OBRIGATÓRIA SOBRE CONSUMO DE LEITURAS */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800">
            Como funciona o consumo das leituras de anexos?
          </p>
          <p>
            Ler uma CNH com frente e verso consome 1 leitura. Um anexo de até 2 páginas consome 1 leitura; de 3 a 4 páginas, 2 leituras. Digitação manual e reutilização de dados já salvos não consomem leituras. A geração e o download dos documentos finais são automáticos e não gastam leituras.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. AVISO DE PRESERVAÇÃO DE ACESSO AO ATINGIR O LIMITE */}
      {/* ========================================================================= */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-emerald-900">
            Acesso aos dados garantido sem interrupções
          </p>
          <p>
            Ao atingir um limite, o NavalDocs Pro <strong>não bloqueia</strong> o acesso aos clientes, processos e documentos já existentes. Você pode visualizá-los, editá-los e baixá-los livremente. Apenas a abertura de um novo processo ou uma nova leitura automática fica temporariamente restrita. Quando as leituras automáticas esgotarem, você pode continuar preenchendo todos os dados manualmente sem custos adicionais.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. HISTÓRICO DO CICLO ATUAL */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1739]">
              Histórico do ciclo atual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consumos detalhados vinculados exclusivamente à sua empresa no ciclo vigente.
            </p>
          </div>

          {/* Abas / Filtros */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "all" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({historyList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("processes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "processes" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Processos ({processesData.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ocr")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "ocr" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Leituras ({ocrConsumption.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("addons")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === "addons" ? "bg-white text-[#0B1739] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Extras ({addonsData.length})
            </button>
          </div>
        </div>

        {/* TABELA DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3 px-2">Data e Hora</th>
                <th className="pb-3 px-2">Ação</th>
                <th className="pb-3 px-2">Cliente ou Processo Relacionado</th>
                <th className="pb-3 px-2 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Não houve movimentação nesta categoria durante o ciclo atual.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                      {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        {item.type === "process" && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                        {item.type === "ocr" && <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                        {item.type === "addon" && <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />}
                        <span>{item.action}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 max-w-md truncate" title={item.detail}>
                      {item.detail}
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {item.type === "addon" ? (
                        <span className="font-bold text-emerald-600">
                          +{item.amount} {item.unit}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800">
                          -{item.amount} {item.unit}
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
              <p className="font-semibold text-slate-700">Nenhum registro encontrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Não houve movimentação nesta categoria durante o ciclo atual.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="py-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                    {item.type === "process" && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                    {item.type === "ocr" && <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                    {item.type === "addon" && <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />}
                    <span>{item.action}</span>
                  </span>
                  {item.type === "addon" ? (
                    <span className="font-bold text-emerald-600">
                      +{item.amount} {item.unit}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-800">
                      -{item.amount} {item.unit}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px] line-clamp-1">
                  {item.detail}
                </p>
                <p className="text-slate-400 text-[10px]">
                  {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. SEÇÃO: PRECISA DE MAIS CAPACIDADE? */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0B1739]">
            Precisa de mais capacidade?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adquira cotas avulsas ou faça upgrade do seu plano para expandir suas franquias de forma imediata.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Card 1: Processos adicionais */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-slate-50/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                  Disponível em breve
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                Processos adicionais
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Adicione lotes de novos processos ao mês vigente sem precisar migrar de plano.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
            >
              Comprar processos
            </button>
          </div>

          {/* Card 2: Leituras adicionais */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-slate-50/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                  Disponível em breve
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                Leituras adicionais
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pacotes de páginas extras para leitura de CNHs, termos e documentos por IA.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
            >
              Comprar leituras
            </button>
          </div>

          {/* Card 3: Mudar de plano */}
          <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#075BFF] flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                  Imediato
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                Mudar de plano
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Faça upgrade para planos com maiores franquias de processos, leituras e mais operadores.
              </p>
            </div>

            <Link
              to="/assinaturas"
              className="w-full py-2 px-3 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs text-center transition-colors flex items-center justify-center gap-1"
            >
              <span>Ver planos disponíveis</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
