import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  User, 
  FileText, 
  Loader2, 
  X, 
  AlertCircle,
  Info,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeString } from "@/utils/safe-string";
import { VesselEditModal } from "@/components/vessels/VesselEditModal";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { VesselDocumentUploadModal, ExtractedVesselData, UploadedVesselFile } from "@/components/vessels/VesselDocumentUploadModal";

export const Route = createFileRoute("/vessels/$id")({
  validateSearch: (search: Record<string, unknown>): {
    from?: string;
    customerId?: string;
    search?: string;
    page?: number;
    status?: string;
  } => ({
    from: (search.from as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    search: (search.search as string) || undefined,
    page: (search.page as number) || undefined,
    status: (search.status as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <VesselDetailsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone náutico estilizado oficial do NavalDocs Pro
function NauticalBoatIcon({ className = "w-8 h-8 text-[#0B1739]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Casco */}
      <path d="M4 22L11 28H37L44 22L41 18H7L4 22Z" />
      {/* Cabine / Superestrutura estilizada */}
      <path d="M14 18L18 10H30L34 18" />
      {/* Linha do convés / mastro */}
      <path d="M24 10V4" />
    </svg>
  );
}

function VesselDetailsPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais
  const [vessel, setVessel] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoadingVessel, setIsLoadingVessel] = useState(true);
  const [vesselError, setVesselError] = useState(false);

  // Painel expansível de todos os dados
  const [isAllDataExpanded, setIsAllDataExpanded] = useState(false);

  // Lista de Serviços / Processos vinculados
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal de edição e upload
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // 1. Carregar Embarcação e Cliente Vinculado
  const loadVesselData = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingVessel(true);
    setVesselError(false);

    try {
      const { data: vesselData, error: vError } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (vError || !vesselData) {
        setVesselError(true);
        setIsLoadingVessel(false);
        return;
      }

      setVessel(vesselData);

      // Buscar dados do cliente proprietário
      if (vesselData.customer_id) {
        const { data: custData } = await supabase
          .from("customers")
          .select("id, name, cpf_cnpj, email, phone")
          .eq("id", vesselData.customer_id)
          .eq("company_id", companyId)
          .maybeSingle();

        setCustomer(custData || null);
      } else {
        setCustomer(null);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da embarcação:", err);
      setVesselError(true);
    } finally {
      setIsLoadingVessel(false);
    }
  }, [companyId, id]);

  const handleVesselExtracted = async (extracted: ExtractedVesselData, files: UploadedVesselFile[]) => {
    if (!vessel?.id || !companyId) return;

    const updates: Record<string, any> = {};
    if (extracted.name && extracted.name !== vessel.name) updates.name = extracted.name;
    if (extracted.registration_number && extracted.registration_number !== vessel.registration_number) updates.registration_number = extracted.registration_number;
    if (extracted.vessel_type && extracted.vessel_type !== vessel.vessel_type) updates.vessel_type = extracted.vessel_type;
    if (extracted.category && extracted.category !== vessel.category) updates.category = extracted.category;
    if (extracted.construction_year && extracted.construction_year !== vessel.construction_year) updates.construction_year = extracted.construction_year;
    if (extracted.hull_material && extracted.hull_material !== vessel.material) updates.material = extracted.hull_material;
    if (extracted.length && extracted.length !== vessel.length) updates.length = extracted.length;
    if (extracted.boca && extracted.boca !== vessel.boca) updates.boca = extracted.boca;
    if (extracted.pontal && extracted.pontal !== vessel.pontal) updates.pontal = extracted.pontal;
    if (extracted.gross_tonnage && extracted.gross_tonnage !== vessel.gross_tonnage) updates.gross_tonnage = extracted.gross_tonnage;
    if (extracted.capacity && extracted.capacity !== vessel.capacity) updates.capacity = extracted.capacity;
    if (extracted.engine_power && extracted.engine_power !== vessel.engine_power) updates.engine_power = extracted.engine_power;
    if (extracted.engine_serial_number && extracted.engine_serial_number !== vessel.engine_serial_number) updates.engine_serial_number = extracted.engine_serial_number;

    try {
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("vessels")
          .update(updates)
          .eq("id", vessel.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast.success("Dados da embarcação atualizados com sucesso via documento!");
      } else {
        toast.info("Documento conferido. Nenhuma alteração cadastral necessária.");
      }

      if (files.length > 0 && customer?.id) {
        for (const f of files) {
          try {
            await supabase.from("customer_documents").insert({
              customer_id: customer.id,
              company_id: companyId,
              file_name: f.name,
              file_path: f.path || "",
              file_type: f.file?.type || "application/pdf",
              file_size: f.size || 0,
            });
          } catch (docErr) {
            console.warn("Erro ao vincular documento da embarcação:", docErr);
          }
        }
        toast.success("Documento anexado ao histórico do cliente/embarcação!");
      }

      await loadVesselData();
    } catch (err: any) {
      console.error("Erro ao aplicar dados do documento na embarcação:", err);
      toast.error("Erro ao atualizar embarcação: " + (err.message || "Erro desconhecido"));
    }
  };

  // 2. Carregar Processos / Serviços Vinculados a esta Embarcação
  const loadVesselProcesses = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingProcesses(true);

    try {
      let query = supabase
        .from("processes")
        .select(`
          id,
          title,
          process_type,
          status,
          protocol_number,
          customer_id,
          created_at,
          customers (
            id,
            name,
            fantasy_name
          )
        `)
        .eq("company_id", companyId)
        .eq("vessel_id", id);

      // Se a página foi aberta no contexto restrito de um cliente específico:
      if (searchParams.customerId) {
        query = query.eq("customer_id", searchParams.customerId);
      }

      query = query.order("created_at", { ascending: false });

      const { data: processData, error: pError } = await query;
      if (pError) throw pError;

      // Normalizar registros para a lista
      const list = (processData || []).map((p: any) => {
        const serviceName = p.title || p.process_type || "Serviço náutico";
        const protocolCode = p.protocol_number || `PROC-${String(p.id).slice(0, 4).toUpperCase()}`;

        // Normalização de situação/status
        let statusLabel = "Em andamento";
        let statusVariant = "blue";

        const rawStatus = (p.status || "").toLowerCase();
        if (rawStatus.includes("conclu") || rawStatus === "completed" || rawStatus === "finalizado") {
          statusLabel = "Concluído";
          statusVariant = "green";
        } else if (rawStatus.includes("cancela") || rawStatus === "cancelled" || rawStatus === "arquivado") {
          statusLabel = "Cancelado";
          statusVariant = "gray";
        } else if (rawStatus.includes("penden") || rawStatus === "draft" || rawStatus === "aguardando") {
          statusLabel = "Pendente";
          statusVariant = "amber";
        }

        return {
          id: p.id,
          serviceName,
          protocolCode,
          status: p.status,
          statusLabel,
          statusVariant,
          customerId: p.customer_id,
          customerName: p.customers?.fantasy_name || p.customers?.name || "Não informado",
          created_at: p.created_at,
        };
      });

      // Ordenar alfabeticamente pelo nome do serviço
      list.sort((a: any, b: any) => a.serviceName.localeCompare(b.serviceName));

      setProcesses(list);
    } catch (err) {
      console.error("Erro ao carregar serviços vinculados:", err);
    } finally {
      setIsLoadingProcesses(false);
    }
  }, [companyId, id, searchParams.customerId]);

  useEffect(() => {
    loadVesselData();
    loadVesselProcesses();
  }, [loadVesselData, loadVesselProcesses]);

  // Filtro em memória de serviços (busca de texto e dropdown de situação)
  const filteredProcesses = useMemo(() => {
    return processes.filter((item) => {
      // Filtro por situação
      if (statusFilter !== "all") {
        if (statusFilter === "concluido" && item.statusLabel !== "Concluído") return false;
        if (statusFilter === "em_andamento" && item.statusLabel !== "Em andamento") return false;
        if (statusFilter === "pendente" && item.statusLabel !== "Pendente") return false;
        if (statusFilter === "cancelado" && item.statusLabel !== "Cancelado") return false;
      }

      // Filtro por texto
      if (serviceSearch.trim()) {
        const term = serviceSearch.toLowerCase().trim();
        const sName = item.serviceName.toLowerCase();
        const pCode = item.protocolCode.toLowerCase();
        return sName.includes(term) || pCode.includes(term);
      }

      return true;
    });
  }, [processes, statusFilter, serviceSearch]);

  // Configuração do botão de retorno conforme a origem
  const backNavigation = useMemo(() => {
    if (searchParams.from === "customer" || searchParams.customerId || vessel?.customer_id) {
      const targetCustomerId = searchParams.customerId || vessel?.customer_id;
      if (targetCustomerId) {
        return {
          label: "Voltar para cliente",
          to: "/customers/$id",
          params: { id: targetCustomerId },
          search: {},
        };
      }
    }
    if (searchParams.from === "processes") {
      return {
        label: "Voltar para processos",
        to: "/processes",
        params: undefined,
        search: {},
      };
    }
    return {
      label: "Voltar para embarcações",
      to: "/vessels",
      params: undefined,
      search: {
        search: searchParams.search || undefined,
        page: searchParams.page || undefined,
      },
    };
  }, [searchParams, vessel?.customer_id]);

  // Iniciar Novo Serviço para esta Embarcação
  const handleStartService = () => {
    const targetCustomerId = vessel?.customer_id || customer?.id;
    if (!targetCustomerId) {
      toast.error("Esta embarcação não possui um cliente válido vinculado. Atualize o cadastro antes de iniciar um serviço.");
      return;
    }
    navigate({
      to: "/processes/novo-pedido",
      search: {
        customerId: targetCustomerId,
        vesselId: vessel.id,
      },
    });
  };

  // Estados de Carregamento e Erro
  if (isLoadingVessel) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-32 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (vesselError || !vessel) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Embarcação não encontrada</h2>
        <p className="text-sm text-slate-500">
          A embarcação solicitada não existe ou você não possui permissão para visualizá-la nesta empresa.
        </p>
        <div className="pt-2">
          <Link
            to="/vessels"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para embarcações</span>
          </Link>
        </div>
      </div>
    );
  }

  const customerDisplayName = customer?.fantasy_name || customer?.name || "Não informado";

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR + BREADCRUMBS */}
      <div className="space-y-1.5">
        <div>
          {backNavigation.params ? (
            <Link
              to={backNavigation.to}
              params={backNavigation.params}
              search={backNavigation.search}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backNavigation.label}</span>
            </Link>
          ) : (
            <Link
              to={backNavigation.to}
              search={backNavigation.search}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backNavigation.label}</span>
            </Link>
          )}
        </div>

        {/* Caminho de navegação (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Link to="/customers" search={{}} className="hover:text-slate-600 hover:underline">
            Clientes
          </Link>
          <span>/</span>
          {customer ? (
            <Link 
              to="/customers/$id" 
              params={{ id: customer.id }} 
              className="hover:text-slate-600 hover:underline truncate max-w-[200px]"
            >
              {customerDisplayName}
            </Link>
          ) : (
            <span>Sem cliente</span>
          )}
          <span>/</span>
          <span className="text-slate-600 font-semibold">{vessel.name}</span>
        </div>
      </div>

      {/* 2. CABEÇALHO DA EMBARCAÇÃO + BOTÃO EDITAR */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[#0B1739]">
            <NauticalBoatIcon className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              {vessel.name || "Embarcação sem nome"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {vessel.category || "Embarcação de esporte e recreio"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer self-start"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#075BFF]" />
            <span>Anexar doc / IA</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0B1739] text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all shrink-0 cursor-pointer self-start"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span>Editar embarcação</span>
          </button>
        </div>
      </div>

      {/* 3. RESUMO DA EMBARCAÇÃO (4 COLUNAS) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente Vinculado */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Cliente vinculado
            </p>
            {customer ? (
              <Link
                to="/customers/$id"
                params={{ id: customer.id }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#075BFF] hover:underline"
              >
                <User className="h-4 w-4 text-[#075BFF] shrink-0" />
                <span className="truncate">{customerDisplayName}</span>
              </Link>
            ) : (
              <span className="text-sm font-medium text-slate-500">Não informado</span>
            )}
          </div>

          {/* Tipo */}
          <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tipo
            </p>
            <p className="text-sm font-medium text-[#0B1739]">
              {vessel.vessel_type || "Não informado"}
            </p>
          </div>

          {/* Inscrição */}
          <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Inscrição
            </p>
            <p className="text-sm font-medium text-[#0B1739]">
              {vessel.registration_number || "Não informada"}
            </p>
          </div>

          {/* Comprimento */}
          <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Comprimento
            </p>
            <p className="text-sm font-medium text-[#0B1739]">
              {vessel.length ? `${vessel.length} m` : "Não informado"}
            </p>
          </div>
        </div>

        {/* Painel Expansível: Ver todos os dados */}
        {isAllDataExpanded && (
          <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Ano de construção</span>
              <span className="font-medium text-[#0B1739]">{vessel.construction_year || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Material do casco</span>
              <span className="font-medium text-[#0B1739]">{vessel.material || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Boca moldada</span>
              <span className="font-medium text-[#0B1739]">{vessel.boca ? `${vessel.boca} m` : "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Pontal moldado</span>
              <span className="font-medium text-[#0B1739]">{vessel.pontal ? `${vessel.pontal} m` : "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Área de navegação</span>
              <span className="font-medium text-[#0B1739]">{vessel.activity || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Motor / Propulsão</span>
              <span className="font-medium text-[#0B1739]">{vessel.engine || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Potência do motor</span>
              <span className="font-medium text-[#0B1739]">{vessel.engine_power || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Nº de série do motor</span>
              <span className="font-medium text-[#0B1739]">{vessel.engine_serial_number || "Não informado"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block font-semibold mb-0.5">Identificador do casco (HIN)</span>
              <span className="font-medium text-[#0B1739]">{vessel.hull_number || "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Lotação máxima</span>
              <span className="font-medium text-[#0B1739]">{vessel.capacity ? `${vessel.capacity} pessoas` : "Não informado"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Cor do casco</span>
              <span className="font-medium text-[#0B1739]">{vessel.hull_color || "Não informado"}</span>
            </div>
            {vessel.notes && (
              <div className="sm:col-span-4 pt-1">
                <span className="text-slate-400 block font-semibold mb-0.5">Observações</span>
                <span className="font-medium text-[#0B1739]">{vessel.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Rodapé do Resumo com Gatilho de Expansão */}
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsAllDataExpanded(!isAllDataExpanded)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
          >
            <span>{isAllDataExpanded ? "Ocultar dados complementares" : "Ver todos os dados"}</span>
            {isAllDataExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 4. SEÇÃO: SERVIÇOS VINCULADOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0B1739]">
              Serviços vinculados
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Consulte os documentos e protocolos de cada serviço.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartService}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Iniciar serviço</span>
          </button>
        </div>

        {/* Barra de Filtros dos Serviços */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Pesquisar serviço..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
            />
            {serviceSearch && (
              <button
                type="button"
                onClick={() => setServiceSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Situação */}
          <div className="relative shrink-0 sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer"
            >
              <option value="all">Todas as situações</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Indicador de Ordem Alfabética */}
        <div className="text-[11px] text-slate-400 font-medium pt-1">
          Ordem alfabética • A–Z
        </div>

        {/* Tabela de Serviços no Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-700">
                <th className="py-3 px-3 font-semibold">Serviço</th>
                <th className="py-3 px-3 font-semibold">Processo</th>
                <th className="py-3 px-3 font-semibold">Situação</th>
                <th className="py-3 px-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingProcesses ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-xs text-slate-400">
                    <Loader2 className="h-5 w-5 text-[#075BFF] animate-spin mx-auto mb-2" />
                    <span>Carregando serviços vinculados...</span>
                  </td>
                </tr>
              ) : filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      {processes.length === 0
                        ? "Nenhum serviço iniciado para esta embarcação"
                        : "Nenhum serviço encontrado com os filtros aplicados"}
                    </p>
                    {processes.length === 0 ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleStartService}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#075BFF] text-white text-xs font-medium hover:bg-blue-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Iniciar primeiro serviço</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setServiceSearch("");
                          setStatusFilter("all");
                        }}
                        className="text-xs text-[#075BFF] hover:underline font-medium"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => {
                  return (
                    <tr key={proc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Serviço */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-[#0B1739]">
                            {proc.serviceName}
                          </span>
                        </div>
                      </td>

                      {/* Processo */}
                      <td className="py-3.5 px-3 text-xs sm:text-sm text-[#075BFF] font-medium">
                        <Link
                          to="/processes/$id"
                          params={{ id: proc.id }}
                          className="hover:underline"
                        >
                          {proc.protocolCode}
                        </Link>
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            proc.statusVariant === "green"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : proc.statusVariant === "blue"
                              ? "bg-blue-50 text-[#075BFF] border-blue-200"
                              : proc.statusVariant === "amber"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {proc.statusLabel}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          to="/processes/$id"
                          params={{ id: proc.id }}
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                        >
                          <span>Abrir</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards de Serviços no Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoadingProcesses ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 text-[#075BFF] animate-spin" />
              <span>Carregando serviços...</span>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Nenhum serviço encontrado</p>
            </div>
          ) : (
            filteredProcesses.map((proc) => (
              <div key={proc.id} className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                    <p className="font-semibold text-xs text-[#0B1739] truncate">{proc.serviceName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                      proc.statusVariant === "green"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : proc.statusVariant === "blue"
                        ? "bg-blue-50 text-[#075BFF] border-blue-200"
                        : proc.statusVariant === "amber"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {proc.statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pl-6">
                  <span>Processo: <strong>{proc.protocolCode}</strong></span>
                  <Link
                    to="/processes/$id"
                    params={{ id: proc.id }}
                    className="font-semibold text-[#075BFF] flex items-center gap-0.5"
                  >
                    <span>Abrir</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé da Seção */}
        <div className="pt-2 text-xs text-slate-400">
          <span>
            {filteredProcesses.length}{" "}
            {filteredProcesses.length === 1 ? "serviço encontrado" : "serviços encontrados"}
          </span>
        </div>
      </div>

      {/* 5. MENSAGEM DE APOIO INFORMATIVA INFERIOR */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-2">
        <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
        <span>Ao abrir um serviço, acesse documentos gerados, protocolos realizados e documentos emitidos.</span>
      </div>

      {/* MODAL DE EDIÇÃO DA EMBARCAÇÃO */}
      {isEditModalOpen && vessel && (
        <VesselEditModal
          vessel={vessel}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updatedVessel) => {
            setVessel(updatedVessel);
            setIsEditModalOpen(false);
            toast.success("Embarcação atualizada com sucesso!");
          }}
        />
      )}

      {/* MODAL DE UPLOAD / LEITURA DE DOCUMENTO DA EMBARCAÇÃO */}
      {isUploadModalOpen && (
        <VesselDocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          companyId={companyId || null}
          userId={profile?.id}
          existingVessel={vessel}
          onDataExtracted={(data, files) => {
            handleVesselExtracted(data, files);
            setIsUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
