import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Search, Plus, ArrowRight, User, Users, Ship, Loader2,
  Clock, Filter, AlertTriangle, ChevronDown, FileText,
  CheckCircle2, SlidersHorizontal, RefreshCw, X, FileSignature,
  ArrowUpDown, Archive, Trash2, Rocket, Sparkles, Upload, Star,
  HelpCircle, AlertCircle
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProcessActionsMenu } from "@/components/processes/ProcessActionsMenu";
import { ProcessEditSheet } from "@/components/processes/ProcessEditSheet";
import { translateTerm } from "@/lib/naval-terms";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { DashboardLayout } from "@/routes/dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { parseISO, isPast, isToday, differenceInDays } from "date-fns";

export const Route = createFileRoute("/processes/")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ProcessesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type SortKey = "recent" | "updated" | "due" | "priority";
type StatusFilter = "all" | "active" | "pending" | "waiting_signature" | "completed" | "late";
type PriorityFilter = "all" | "high" | "medium" | "low";
type DueFilter = "all" | "today" | "late" | "7days";

// Dados de exemplo para o modo preview (idênticos à referência)
const PREVIEW_CUSTOMERS = [
  {
    id: "prev-c1",
    name: "Marina Costa",
    vessels: [
      {
        id: "prev-v1",
        name: "Mar Azul",
        processes: [
          {
            id: "0247",
            code: "#0247",
            service: "Transferência",
            status: "review",
            statusLabel: "Em conferência",
            statusType: "conference",
            dueLabel: "Hoje",
            dueType: "today",
            nextAction: "Conferir documentos →",
          },
          {
            id: "0258",
            code: "#0258",
            service: "Alteração de motor",
            status: "pending",
            statusLabel: "Pendência",
            statusType: "pending",
            dueLabel: "Atrasado",
            dueType: "late",
            nextAction: "Resolver pendência →",
          },
        ],
      },
      {
        id: "prev-v2",
        name: "Vento Sul",
        processes: [
          {
            id: "0261",
            code: "#0261",
            service: "Renovação",
            status: "waiting_signature",
            statusLabel: "Aguardando assinatura",
            statusType: "signature",
            dueLabel: "— Sem prazo",
            dueType: "none",
            nextAction: "Ver documentos →",
          },
        ],
      },
    ],
    personalServices: [],
  },
  {
    id: "prev-c2",
    name: "Carlos Lima",
    vessels: [
      {
        id: "prev-v3",
        name: "Estrela do Mar",
        processes: [
          {
            id: "0194",
            code: "#0194",
            service: "Transferência",
            status: "in_progress",
            statusLabel: "Em andamento",
            statusType: "in_progress",
            dueLabel: "Em 5d",
            dueType: "upcoming",
            nextAction: "Ver andamento →",
          },
          {
            id: "0210",
            code: "#0210",
            service: "Inscrição TIE",
            status: "waiting_docs",
            statusLabel: "Em conferência",
            statusType: "conference",
            dueLabel: "— Sem prazo",
            dueType: "none",
            nextAction: "Conferir documentos →",
          },
        ],
      },
    ],
    personalServices: [],
  },
  {
    id: "prev-c3",
    name: "Ana Santos",
    vessels: [],
    personalServices: [
      {
        id: "0180",
        code: "#0180",
        service: "Habilitação náutica",
        serviceSubtitle: "Serviço pessoal",
        status: "in_progress",
        statusLabel: "Em conferência",
        statusType: "conference",
        dueLabel: "Em 3d",
        dueType: "upcoming",
        nextAction: "Conferir documentos →",
      },
    ],
  },
];

function ProcessesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { setIsNewProcessOpen, openWithContext } = useNewProcess();
  const { checkLimit } = usePlanLimits();
  const isPreview = typeof window !== "undefined" && window.location.search.includes("preview=true");

  // Alternância entre "Por cliente" e "Todos os processos"
  const [viewMode, setViewMode] = useState<"by_customer" | "all_processes">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_processes_view_mode");
      if (saved === "by_customer" || saved === "all_processes") return saved;
    }
    return "by_customer";
  });

  const handleViewModeChange = (mode: "by_customer" | "all_processes") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_processes_view_mode", mode);
    }
  };

  // Sub-visão operacional para "Todos os processos" (CRM, Kanban, Lista)
  const [operationalView, setOperationalView] = useState<"crm" | "kanban" | "list">("crm");

  // Estados de filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Paginação e dados
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Clientes expandidos no modo "Por cliente"
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  // Modal de upgrade
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; current: number; limit: number | null }>({
    isOpen: false,
    current: 0,
    limit: null,
  });

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDueFilter("all");
    setSort("recent");
    setPage(1);
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all";

  // Busca processos no Supabase
  const fetchProcesses = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("processes")
        .select(
          `*, 
           customers:customers!processes_customer_id_fkey(id, name, email, phone), 
           vessels:vessels!processes_vessel_id_fkey(id, name, vessel_type)`,
          { count: "exact" }
        )
        .eq("company_id", profile?.company_id || "")
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("trashed_at", null)
        .or("is_draft.is.null,is_draft.eq.false");

      // Filtro por texto
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`process_type.ilike.${term},title.ilike.${term},protocol_number.ilike.${term}`);
      }

      // Filtros de status
      if (statusFilter === "completed") query = query.eq("status", "completed");
      else if (statusFilter === "pending") query = query.in("status", ["pending", "waiting_docs", "review"]);
      else if (statusFilter === "waiting_signature") query = query.in("status", ["waiting_signature", "awaiting_signature"]);
      else if (statusFilter === "active") query = query.not("status", "in", "(completed,cancelled)");
      else if (statusFilter === "late") query = query.lt("due_date", new Date().toISOString().slice(0, 10)).not("status", "in", "(completed,cancelled)");

      // Filtro de prioridade
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);

      // Filtro de prazo
      if (dueFilter === "today") {
        const todayStr = new Date().toISOString().slice(0, 10);
        query = query.eq("due_date", todayStr);
      } else if (dueFilter === "late") {
        const todayStr = new Date().toISOString().slice(0, 10);
        query = query.lt("due_date", todayStr).not("status", "in", "(completed,cancelled)");
      }

      const orderColumn =
        sort === "updated" ? "updated_at" :
        sort === "due" ? "due_date" :
        sort === "priority" ? "priority_score" : "created_at";
      const orderAsc = sort === "due";

      // Para a visão "Por cliente", buscamos todos os processos da empresa para agrupar com fidelidade
      // Para "Todos os processos", paginamos normalmente
      const rangeLimit = viewMode === "by_customer" ? 200 : 24;
      const rangeOffset = viewMode === "by_customer" ? 0 : (page - 1) * 24;

      const { data, count, error } = await query
        .order(orderColumn, { ascending: orderAsc, nullsFirst: false })
        .range(rangeOffset, rangeOffset + rangeLimit - 1);

      if (error) {
        console.error("Erro ao buscar processos:", error);
      } else {
        setProcesses(data || []);
        if (count !== null) setTotalCount(count);
      }
    } catch (err) {
      console.error("Exceção na busca de processos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.company_id, isPreview, searchTerm, statusFilter, priorityFilter, dueFilter, sort, page, viewMode]);

  useEffect(() => {
    const timer = setTimeout(fetchProcesses, 300);
    return () => clearTimeout(timer);
  }, [fetchProcesses]);

  // Listener para atualizações em tempo real disparadas pelo app
  useEffect(() => {
    const handler = () => fetchProcesses();
    window.addEventListener("processes:changed", handler);
    return () => window.removeEventListener("processes:changed", handler);
  }, [fetchProcesses]);

  // AGRUPAMENTO DE PROCESSOS POR CLIENTE
  const groupedCustomers = useMemo(() => {
    // Modo preview com os dados de referência
    if ((isPreview || (processes.length === 0 && !isLoading && !hasActiveFilters && totalCount === 0))) {
      return PREVIEW_CUSTOMERS;
    }

    if (!processes.length) return [];

    const map = new Map<string, {
      id: string;
      name: string;
      vesselsMap: Map<string, { id: string; name: string; processes: any[] }>;
      personalServices: any[];
      unlinkedProcesses: any[];
    }>();

    for (const proc of processes) {
      const customerId = proc.customer_id || (proc.customers?.id) || "unassigned";
      const customerName = proc.customers?.name || (customerId === "unassigned" ? "Cliente não associado" : "Cliente");

      if (!map.has(customerId)) {
        map.set(customerId, {
          id: customerId,
          name: customerName,
          vesselsMap: new Map(),
          personalServices: [],
          unlinkedProcesses: [],
        });
      }

      const clientEntry = map.get(customerId)!;

      // Classificação do status e prazo do processo
      const dueDate = proc.due_date ? parseISO(proc.due_date) : null;
      const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;
      const isDueToday = dueDate ? isToday(dueDate) : false;

      let statusLabel = "Em andamento";
      let statusType: "conference" | "pending" | "signature" | "in_progress" | "completed" = "in_progress";
      let nextAction = "Ver andamento →";

      if (proc.status === "completed") {
        statusLabel = "Finalizado";
        statusType = "completed";
        nextAction = "Ver detalhes →";
      } else if (proc.status === "waiting_signature" || proc.status === "awaiting_signature") {
        statusLabel = "Aguardando assinatura";
        statusType = "signature";
        nextAction = "Ver documentos →";
      } else if (isOverdue || proc.status === "pending" || proc.priority === "urgent") {
        statusLabel = "Pendência";
        statusType = "pending";
        nextAction = "Resolver pendência →";
      } else if (isDueToday || proc.status === "waiting_docs" || proc.status === "review") {
        statusLabel = "Em conferência";
        statusType = "conference";
        nextAction = "Conferir documentos →";
      }

      let dueLabel = "— Sem prazo";
      let dueType: "today" | "late" | "upcoming" | "none" = "none";

      if (dueDate) {
        if (isDueToday) {
          dueLabel = "Hoje";
          dueType = "today";
        } else if (isOverdue) {
          dueLabel = "Atrasado";
          dueType = "late";
        } else {
          const days = differenceInDays(dueDate, new Date());
          dueLabel = days <= 0 ? "Hoje" : `Em ${days}d`;
          dueType = "upcoming";
        }
      }

      const formattedProc = {
        id: proc.id,
        code: proc.protocol_number ? `#${proc.protocol_number}` : `#${proc.id.substring(0, 4)}`,
        service: proc.title || translateTerm(proc.process_type) || "Serviço Naval",
        status: proc.status,
        statusLabel,
        statusType,
        dueLabel,
        dueType,
        nextAction,
        isOverdue,
        isDueToday,
      };

      if (proc.vessel_id && proc.vessels) {
        const vesselId = proc.vessel_id;
        const vesselName = proc.vessels.name || "Embarcação";
        if (!clientEntry.vesselsMap.has(vesselId)) {
          clientEntry.vesselsMap.set(vesselId, { id: vesselId, name: vesselName, processes: [] });
        }
        clientEntry.vesselsMap.get(vesselId)!.processes.push(formattedProc);
      } else if (!proc.vessel_id) {
        clientEntry.personalServices.push(formattedProc);
      } else {
        clientEntry.unlinkedProcesses.push(formattedProc);
      }
    }

    // Converte os clientes para array
    return Array.from(map.values()).map(c => ({
      id: c.id,
      name: c.name,
      vessels: Array.from(c.vesselsMap.values()),
      personalServices: c.personalServices,
      unlinkedProcesses: c.unlinkedProcesses,
    }));
  }, [processes, isPreview, isLoading, hasActiveFilters, totalCount]);

  // Inicializa o primeiro cliente expandido por padrão se nenhum estiver
  useEffect(() => {
    if (groupedCustomers.length > 0 && Object.keys(expandedCustomers).length === 0) {
      setExpandedCustomers({ [groupedCustomers[0].id]: true });
    }
  }, [groupedCustomers, expandedCustomers]);

  // Se o usuário estiver buscando, expande automaticamente os clientes com resultados
  useEffect(() => {
    if (searchTerm.trim().length > 1 && groupedCustomers.length > 0) {
      const autoExpanded: Record<string, boolean> = {};
      groupedCustomers.forEach(c => {
        autoExpanded[c.id] = true;
      });
      setExpandedCustomers(autoExpanded);
    }
  }, [searchTerm, groupedCustomers]);

  const toggleCustomer = (id: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleStartProcessWithContext = async (context: { customerId?: string; vesselId?: string }) => {
    const limit = await checkLimit("processes");
    if (limit.reached) {
      setUpgradeModal({ isOpen: true, current: limit.current, limit: limit.limit });
      return;
    }
    navigate({
      to: "/processes/novo-pedido",
      search: {
        customerId: context.customerId,
        vesselId: context.vesselId,
      },
    });
  };

  const handleGeneralNewProcess = async () => {
    const limit = await checkLimit("processes");
    if (limit.reached) {
      setUpgradeModal({ isOpen: true, current: limit.current, limit: limit.limit });
      return;
    }
    navigate({ to: "/processes/novo-pedido" });
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d36] tracking-tight">
            Processos
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-1 font-normal">
            Todos os serviços do cliente, organizados em um só lugar.
          </p>
        </div>

        {/* Botão Novo Processo Desktop */}
        <button
          type="button"
          onClick={handleGeneralNewProcess}
          className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Novo processo</span>
        </button>
      </div>

      {/* 2. TOGGLE DE VISUALIZAÇÕES ("Todos os processos" / "Por cliente") */}
      <div className="flex items-center">
        <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 flex w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleViewModeChange("all_processes")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === "all_processes"
                ? "bg-[#1868db] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Todos os processos</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange("by_customer")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === "by_customer"
                ? "bg-[#1868db] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <User className="h-4 w-4" />
            <span>Por cliente</span>
          </button>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1868db] transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar cliente, embarcação ou processo..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Botão de Filtros com Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-11 px-4 rounded-2xl border transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm cursor-pointer shadow-2xs",
                hasActiveFilters
                  ? "bg-blue-50 border-blue-200 text-[#1868db]"
                  : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-[#1868db]" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-80 p-5 rounded-2xl shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-[#0f1d36]">Filtros Operacionais</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-[#1868db] hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Situação */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Situação</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="all">Todas as situações</option>
                <option value="active">Em andamento</option>
                <option value="pending">Com pendência</option>
                <option value="waiting_signature">Aguardando assinatura</option>
                <option value="late">Atrasados</option>
                <option value="completed">Finalizados</option>
              </select>
            </div>

            {/* Prioridade */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Prioridade</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as PriorityFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="all">Todas as prioridades</option>
                <option value="high">Alta / Urgente</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>

            {/* Prazo */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Prazo de Vencimento</label>
              <select
                value={dueFilter}
                onChange={(e) => {
                  setDueFilter(e.target.value as DueFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="all">Qualquer prazo</option>
                <option value="today">Vencendo hoje</option>
                <option value="late">Já atrasados</option>
              </select>
            </div>

            <Button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="w-full bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs py-2 rounded-xl"
            >
              Aplicar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Informativo de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-[#1868db]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">Filtros aplicados:</span>
            {searchTerm && <Badge variant="secondary" className="bg-white text-slate-700 text-[10px]">Busca: {searchTerm}</Badge>}
            {statusFilter !== "all" && <Badge variant="secondary" className="bg-white text-slate-700 text-[10px]">Situação: {statusFilter}</Badge>}
            {priorityFilter !== "all" && <Badge variant="secondary" className="bg-white text-slate-700 text-[10px]">Prioridade: {priorityFilter}</Badge>}
            {dueFilter !== "all" && <Badge variant="secondary" className="bg-white text-slate-700 text-[10px]">Prazo: {dueFilter}</Badge>}
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-bold underline hover:opacity-80 shrink-0 cursor-pointer ml-2"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* 4. CONTEÚDO PRINCIPAL DE ACORDO COM A VISUALIZAÇÃO */}
      {viewMode === "by_customer" ? (
        <CustomerGroupedView
          customers={groupedCustomers}
          isLoading={isLoading}
          expandedCustomers={expandedCustomers}
          onToggleCustomer={toggleCustomer}
          onNewProcessWithContext={handleStartProcessWithContext}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          onGeneralNewProcess={handleGeneralNewProcess}
        />
      ) : (
        <AllProcessesOperationalView
          processes={processes}
          isLoading={isLoading}
          operationalView={operationalView}
          onOperationalViewChange={setOperationalView}
          onNewProcess={handleGeneralNewProcess}
          onChanged={fetchProcesses}
          totalCount={totalCount}
          page={page}
          setPage={setPage}
          sort={sort}
          setSort={setSort}
        />
      )}

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        resource="processes"
        limit={upgradeModal.limit}
        current={upgradeModal.current}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// VISÃO 1: AGRUPADA POR CLIENTE ("Por cliente")
// ----------------------------------------------------------------------
function CustomerGroupedView({
  customers,
  isLoading,
  expandedCustomers,
  onToggleCustomer,
  onNewProcessWithContext,
  hasActiveFilters,
  onClearFilters,
  onGeneralNewProcess,
}: {
  customers: any[];
  isLoading: boolean;
  expandedCustomers: Record<string, boolean>;
  onToggleCustomer: (id: string) => void;
  onNewProcessWithContext: (ctx: { customerId?: string; vesselId?: string }) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onGeneralNewProcess: () => void;
}) {
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1868db]" />
        <span className="text-xs font-semibold text-slate-500">Carregando processos dos clientes...</span>
      </div>
    );
  }

  if (customers.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f1d36]">Nenhum processo encontrado com esses filtros</h3>
            <p className="text-slate-500 text-xs mt-1">Tente ajustar a busca ou limpe os filtros para ver todos os registros.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="rounded-xl border-slate-300 text-xs font-semibold"
          >
            Limpar filtros
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 md:p-12 text-center shadow-2xs space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-blue-50 text-[#1868db] flex items-center justify-center mx-auto">
          <Rocket className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0f1d36]">Vamos começar seu primeiro processo?</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Organize embarcações, clientes e requerimentos náuticos em um só lugar.
          </p>
        </div>
        <Button
          type="button"
          onClick={onGeneralNewProcess}
          className="bg-[#1868db] hover:bg-[#1456b8] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo processo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => {
        const isExpanded = !!expandedCustomers[customer.id];

        // Cálculos de totais deste cliente
        let totalActiveProcesses = 0;
        let pendingCount = 0;
        const vesselIds = new Set<string>();

        // Percorre embarcações
        for (const vessel of customer.vessels || []) {
          vesselIds.add(vessel.id);
          for (const p of vessel.processes || []) {
            if (p.status !== "completed" && p.status !== "cancelled") {
              totalActiveProcesses++;
            }
            if (p.statusType === "pending" || p.dueType === "late") {
              pendingCount++;
            }
          }
        }

        // Percorre serviços pessoais
        for (const p of customer.personalServices || []) {
          if (p.status !== "completed" && p.status !== "cancelled") {
            totalActiveProcesses++;
          }
          if (p.statusType === "pending" || p.dueType === "late") {
            pendingCount++;
          }
        }

        const distinctVesselsCount = customer.vessels?.length || 0;
        const initials = customer.name
          .trim()
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "CL";

        const customerFirstName = customer.name.trim().split(" ")[0];

        return (
          <div
            key={customer.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all"
          >
            {/* CABEÇALHO DO CLIENTE */}
            <div
              onClick={() => onToggleCustomer(customer.id)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar com iniciais */}
                <div className="h-10 w-10 rounded-full bg-blue-100 text-[#1868db] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                  {initials}
                </div>

                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#0f1d36] truncate leading-tight">
                    {customer.name}
                  </h3>

                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {distinctVesselsCount > 0 ? (
                      <span>
                        {totalActiveProcesses} {totalActiveProcesses === 1 ? "processo ativo" : "processos ativos"} ·{" "}
                        {distinctVesselsCount} {distinctVesselsCount === 1 ? "embarcação" : "embarcações"}
                      </span>
                    ) : (
                      <div>
                        <span>
                          {totalActiveProcesses} {totalActiveProcesses === 1 ? "processo ativo" : "processos ativos"} · Serviço pessoal
                        </span>
                        {customer.personalServices?.[0]?.service && (
                          <span className="block text-slate-400 text-[11px]">
                            {customer.personalServices[0].service}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado direito: badge de pendência e chevron */}
              <div className="flex items-center gap-3 shrink-0">
                {pendingCount > 0 && (
                  <div className="bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-amber-500 flex items-center justify-center text-[9px] font-bold text-amber-600">!</span>
                    <span>{pendingCount} {pendingCount === 1 ? "pendência" : "pendências"}</span>
                  </div>
                )}

                <button
                  type="button"
                  aria-label={isExpanded ? "Recolher cliente" : "Expandir cliente"}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isExpanded ? "rotate-180" : ""
                    )}
                  />
                </button>
              </div>
            </div>

            {/* CONTEÚDO EXPANDIDO */}
            {isExpanded && (
              <div className="border-t border-slate-100 p-4 sm:p-6 bg-white space-y-6 animate-in fade-in-50 duration-200">
                {/* Botão contextual no Mobile: "+ Processo para [Nome]" */}
                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewProcessWithContext({ customerId: customer.id });
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-[#1868db] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Processo para {customerFirstName}</span>
                  </button>
                </div>

                {/* 1. GRUPOS DE EMBARCAÇÕES */}
                {customer.vessels && customer.vessels.length > 0 && (
                  <div className="space-y-6">
                    {customer.vessels.map((vessel: any) => (
                      <div key={vessel.id} className="space-y-3">
                        {/* Header da Embarcação */}
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2 text-[#0f1d36]">
                            <Ship className="h-5 w-5 text-[#0f1d36]" />
                            <h4 className="font-bold text-sm sm:text-base">
                              {vessel.name}
                            </h4>
                          </div>

                          {/* Botão Desktop "+ Novo processo" junto à embarcação */}
                          <button
                            type="button"
                            onClick={() =>
                              onNewProcessWithContext({
                                customerId: customer.id,
                                vesselId: vessel.id,
                              })
                            }
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#1868db] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Novo processo</span>
                          </button>
                        </div>

                        {/* Lista de processos desta embarcação */}
                        <div className="space-y-2">
                          {vessel.processes.map((proc: any) => (
                            <ProcessRowOrCard key={proc.id} process={proc} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. GRUPO SERVIÇOS PESSOAIS (SEM EMBARCAÇÃO) */}
                {customer.personalServices && customer.personalServices.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2 text-[#0f1d36]">
                        <User className="h-5 w-5 text-[#0f1d36]" />
                        <h4 className="font-bold text-sm sm:text-base">
                          Serviços pessoais
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onNewProcessWithContext({
                            customerId: customer.id,
                          })
                        }
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#1868db] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Novo serviço</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {customer.personalServices.map((proc: any) => (
                        <ProcessRowOrCard key={proc.id} process={proc} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. PROCESSOS COM PENDÊNCIA DE ASSOCIAÇÃO */}
                {customer.unlinkedProcesses && customer.unlinkedProcesses.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-800">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Estes processos precisam de vínculo com embarcação para organização completa.</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {customer.unlinkedProcesses.map((proc: any) => (
                        <ProcessRowOrCard key={proc.id} process={proc} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-center pt-2">
        <span className="text-[11px] text-slate-400 font-medium">Dados reais do espaço de trabalho ativo.</span>
      </div>
    </div>
  );
}

// Linha de processo (Desktop em linha, Mobile em card)
function ProcessRowOrCard({ process }: { process: any }) {
  const statusBadge = useMemo(() => {
    switch (process.statusType) {
      case "conference":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {process.statusLabel}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            {process.statusLabel}
          </span>
        );
      case "signature":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <FileSignature className="h-3.5 w-3.5 text-blue-600" />
            {process.statusLabel}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {process.statusLabel}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            {process.statusLabel}
          </span>
        );
    }
  }, [process.statusType, process.statusLabel]);

  const dueBadge = useMemo(() => {
    switch (process.dueType) {
      case "today":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Clock className="h-3.5 w-3.5" />
            {process.dueLabel}
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
            <Clock className="h-3.5 w-3.5" />
            {process.dueLabel}
          </span>
        );
      case "upcoming":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {process.dueLabel}
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-400">
            {process.dueLabel}
          </span>
        );
    }
  }, [process.dueType, process.dueLabel]);

  return (
    <>
      {/* DESKTOP ROW (tabela linear sem quebras) */}
      <div className="hidden md:flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
            {process.code}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-sm text-[#0f1d36] truncate">
            {process.service}
          </span>
        </div>

        <div className="w-1/4 flex justify-start">
          {statusBadge}
        </div>

        <div className="w-1/5 flex justify-start">
          {dueBadge}
        </div>

        <div className="w-1/5 flex justify-end">
          <Link
            to="/processes/$id"
            params={{ id: process.id }}
            className="text-xs font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{process.nextAction}</span>
          </Link>
        </div>
      </div>

      {/* MOBILE CARD (otimizado para toque) */}
      <div className="md:hidden bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0">
              {process.code}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-xs text-[#0f1d36] truncate">
              {process.service}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {statusBadge}
          {dueBadge}
        </div>

        <div className="pt-1 border-t border-slate-100 flex justify-end">
          <Link
            to="/processes/$id"
            params={{ id: process.id }}
            className="text-xs font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{process.nextAction}</span>
          </Link>
        </div>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------
// VISÃO 2: OPERACIONAL INDIVIDUAL ("Todos os processos")
// ----------------------------------------------------------------------
function AllProcessesOperationalView({
  processes,
  isLoading,
  operationalView,
  onOperationalViewChange,
  onNewProcess,
  onChanged,
  totalCount,
  page,
  setPage,
  sort,
  setSort,
}: {
  processes: any[];
  isLoading: boolean;
  operationalView: "crm" | "kanban" | "list";
  onOperationalViewChange: (v: "crm" | "kanban" | "list") => void;
  onNewProcess: () => void;
  onChanged?: () => void;
  totalCount: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  sort: SortKey;
  setSort: React.Dispatch<React.SetStateAction<SortKey>>;
}) {
  const [editing, setEditing] = useState<any>(null);
  const pageSize = 24;

  const columns = [
    { id: "pending", title: "Novo", color: "bg-red-500" },
    { id: "in_progress", title: "Em andamento", color: "bg-blue-500" },
    { id: "waiting_docs", title: "Aguardando documentos", color: "bg-amber-500" },
    { id: "review", title: "Em revisão", color: "bg-purple-500" },
    { id: "ready_to_generate", title: "Pronto para geração", color: "bg-indigo-500" },
    { id: "waiting_signature", title: "Aguardando assinatura", color: "bg-orange-500" },
    { id: "protocolado", title: "Protocolado", color: "bg-cyan-500" },
    { id: "completed", title: "Finalizado", color: "bg-green-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Barra secundária: Seleção de modo operacional e ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(["crm", "kanban", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onOperationalViewChange(v)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                operationalView === v
                  ? "bg-white text-[#0f1d36] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {v === "crm" ? "CRM" : v === "kanban" ? "Kanban" : "Tabela"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/processes/archived"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-[#1868db]"
          >
            <Archive className="h-3.5 w-3.5" /> Arquivados
          </Link>
          <Link
            to="/processes/trash"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> Lixeira
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1868db]" />
          <span className="text-xs font-semibold text-slate-500">Carregando lista de processos...</span>
        </div>
      ) : operationalView === "crm" ? (
        <CrmOperationalGrid
          processes={processes}
          isLoading={isLoading}
          columns={columns}
          onNewProcess={onNewProcess}
          onChanged={onChanged}
        />
      ) : operationalView === "kanban" ? (
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 min-h-[550px] custom-scrollbar">
          {columns.map((col) => {
            const columnProcesses = processes.filter((p) => p.status === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <h3 className="font-bold text-slate-700 text-xs">{col.title}</h3>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {columnProcesses.length}
                    </span>
                  </div>
                  <button
                    onClick={onNewProcess}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-grow bg-slate-50/80 rounded-2xl p-3 space-y-3 border border-slate-200/60 overflow-y-auto custom-scrollbar">
                  {columnProcesses.map((p) => (
                    <Link
                      key={p.id}
                      to="/processes/$id"
                      params={{ id: p.id }}
                      className="block bg-white p-4 rounded-xl border border-slate-200/70 shadow-2xs hover:shadow-sm hover:border-[#1868db]/40 transition-all cursor-pointer"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        PROC-{p.id.substring(0, 6)}
                      </span>
                      <h4 className="font-bold text-sm text-[#0f1d36] line-clamp-2 mt-1">
                        {p.title || p.process_type}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {p.customers?.name || "Cliente não informado"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABELA INDIVIDUAL */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Processo</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Embarcação</th>
                  <th className="px-5 py-3">Situação</th>
                  <th className="px-5 py-3">Prazo</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {processes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to="/processes/$id" params={{ id: p.id }} className="block">
                        <span className="font-bold text-[#0f1d36] block">{p.title || p.process_type}</span>
                        <span className="font-mono text-[10px] text-slate-400">PROC-{p.id.substring(0, 6)}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{p.customers?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.vessels?.name || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {translateTerm(p.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to="/processes/$id"
                        params={{ id: p.id }}
                        className="text-[#1868db] font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Abrir <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação */}
      {!isLoading && totalCount > pageSize && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {processes.length} de {totalCount} processos</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page >= Math.ceil(totalCount / pageSize)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <ProcessEditSheet
        process={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => onChanged?.()}
      />
    </div>
  );
}

// CRM Grid para a visualização operacional
function CrmOperationalGrid({
  processes,
  columns,
  onNewProcess,
  onChanged,
}: {
  processes: any[];
  isLoading: boolean;
  columns: any[];
  onNewProcess: () => void;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {processes.map((p) => {
        const found = columns.find((c) => c.id === p.status);
        const colColor = found?.color || "bg-slate-400";

        return (
          <div
            key={p.id}
            className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-[#1868db]/40 transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className={`h-1 w-full ${colColor}`} />
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  PROC-{p.id.substring(0, 6)}
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold text-slate-600">
                  {translateTerm(p.status)}
                </Badge>
              </div>

              <Link to="/processes/$id" params={{ id: p.id }} className="block group-hover:text-[#1868db] transition-colors">
                <h3 className="font-bold text-sm sm:text-base text-[#0f1d36] line-clamp-2">
                  {p.title || p.process_type}
                </h3>
              </Link>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{p.customers?.name || "Sem cliente"}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Ship className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{p.vessels?.name || "Sem embarcação"}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {p.due_date ? `Vence ${new Date(p.due_date).toLocaleDateString("pt-BR")}` : "Sem prazo"}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/processes/$id"
                  params={{ id: p.id }}
                  className="font-semibold text-[#1868db] hover:underline"
                >
                  Abrir →
                </Link>
                <ProcessActionsMenu process={p} onChanged={onChanged} onEdit={() => setEditing(p)} />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNewProcess}
        className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#1868db]/50 hover:bg-blue-50/20 transition-all min-h-[160px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#1868db] cursor-pointer"
      >
        <Plus className="h-6 w-6" />
        <span className="text-xs font-bold uppercase tracking-wider">Novo Processo</span>
      </button>

      <ProcessEditSheet
        process={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => onChanged?.()}
      />
    </div>
  );
}
