import { createFileRoute, Link, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { 
  ArrowLeft,
  Search, 
  Plus, 
  ChevronRight, 
  User, 
  FileText, 
  Loader2, 
  X, 
  AlertCircle,
  Info,
  Award,
  Download,
  Eye,
  Upload,
  CheckCircle2,
  FileCheck,
  Ship,
  Folder,
  Cog,
  Clock,
  Check,
  History,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Layers,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Ban,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id")({
  validateSearch: (search: Record<string, unknown>): {
    from?: string;
    customerId?: string;
    vesselId?: string;
    tab?: string;
    preview?: string | boolean;
    sub?: string;
  } => ({
    ...(search.from ? { from: search.from as string } : {}),
    ...(search.customerId ? { customerId: search.customerId as string } : {}),
    ...(search.vesselId ? { vesselId: search.vesselId as string } : {}),
    ...(search.tab ? { tab: search.tab as string } : {}),
    ...(search.preview !== undefined ? { preview: search.preview as string | boolean } : {}),
    ...(search.sub ? { sub: search.sub as string } : {}),
  }),
  component: ProcessRouteComponent,
});

function ProcessRouteComponent() {
  const matchRoute = useMatchRoute();
  const isExactProcess = matchRoute({ to: "/processes/$id", fuzzy: false });

  if (isExactProcess) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <ProcessDetailsPage />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return <Outlet />;
}

// Catálogo de serviços para normalização
const SERVICE_CATALOG: Record<string, { title: string; categoryLabel: string }> = {
  "inscricao-inicial": { title: "Inscrição inicial", categoryLabel: "Esporte e recreio" },
  "renovacao-tie": { title: "Renovação do TIE", categoryLabel: "Esporte e recreio" },
  "segunda-via-tie": { title: "Segunda via do TIE", categoryLabel: "Esporte e recreio" },
  "transferencia-propriedade": { title: "Transferência de propriedade", categoryLabel: "Esporte e recreio" },
  "transferencia-jurisdicao": { title: "Transferência de jurisdição", categoryLabel: "Esporte e recreio" },
  "transferencia-ambas": { title: "Transferência de propriedade e jurisdição", categoryLabel: "Esporte e recreio" },
  "comunicacao-venda": { title: "Comunicação de venda", categoryLabel: "Esporte e recreio" },
  "inscricao-comercial": { title: "Inscrição comercial inicial", categoryLabel: "Embarcações profissionais" },
  "renovacao-tie-prof": { title: "Renovação de TIE profissional", categoryLabel: "Embarcações profissionais" },
  "segunda-via-tie-prof": { title: "Segunda via de TIE profissional", categoryLabel: "Embarcações profissionais" },
  "transferencia-prof": { title: "Transferência de propriedade profissional", categoryLabel: "Embarcações profissionais" },
  "transferencia-jurisdicao-prof": { title: "Transferência de jurisdição profissional", categoryLabel: "Embarcações profissionais" },
};

// Estados suportados pelo sistema
const PROCESS_STATUS_LIST = [
  { value: "draft", label: "Rascunho", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "preparing", label: "Em preparação", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "pending_docs", label: "Documentação pendente", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "ready_for_protocol", label: "Pronto para protocolo", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "in_progress", label: "Em andamento", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "completed", label: "Concluído", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
];

function ProcessDetailsPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais de dados
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Contagens Reais de Arquivos
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [protocolFiles, setProtocolFiles] = useState<any[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // Status Modal e Edição
  const [currentStatus, setCurrentStatus] = useState<string>("in_progress");
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<any | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  // 1. Carregar Processo e Relacionamentos
  const loadProcessDetails = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length)
        `)
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (pError || !proc) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      setProcessData(proc);
      setCurrentStatus(proc.status || "in_progress");
      setCustomer(proc.customer || null);
      setVessel(proc.vessel || null);
    } catch (err) {
      console.error("Erro ao carregar detalhes do processo:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  // 2. Carregar Arquivos Reais (Documentos Gerados, Protocolos e Documentos Emitidos)
  const loadProcessFiles = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingFiles(true);

    try {
      // 2.1 Documentos Gerados
      const { data: genDocs } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .order("created_at", { ascending: false });

      setGeneratedDocs(genDocs || []);

      // 2.2 Protocolos Realizados
      const { data: protoFiles } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .eq("category", "protocol")
        .order("created_at", { ascending: false });

      setProtocolFiles(protoFiles || []);

      // 2.3 Documentos Emitidos
      const { data: issDocs } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .in("category", ["issued", "issued_doc", "documento_emitido", "final_document"])
        .order("created_at", { ascending: false });

      setIssuedDocs(issDocs || []);
    } catch (err) {
      console.error("Erro ao carregar arquivos do processo:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadProcessDetails();
    loadProcessFiles();
  }, [loadProcessDetails, loadProcessFiles]);

  // Alterar Status do Processo com Registro de Histórico
  const handleStatusChange = async (newStatus: string) => {
    if (!companyId || !id || newStatus === currentStatus) return;
    setIsStatusChanging(true);

    try {
      const now = new Date().toISOString();
      const statusLabel = PROCESS_STATUS_LIST.find((s) => s.value === newStatus)?.label || newStatus;
      const historyEntry = {
        event: "status_changed",
        description: `Situação alterada para "${statusLabel}"`,
        user: profile?.full_name || user?.email || "Operador",
        date: now,
      };

      const existingHistory = (processData?.draft_data as any)?.history || [];
      const updatedDraftData = {
        ...((processData?.draft_data as any) || {}),
        history: [historyEntry, ...existingHistory],
      };

      const { error } = await supabase
        .from("processes")
        .update({
          status: newStatus,
          draft_data: updatedDraftData,
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      setCurrentStatus(newStatus);
      setProcessData((prev: any) => ({
        ...prev,
        status: newStatus,
        draft_data: updatedDraftData,
      }));

      toast.success(`Situação alterada para "${statusLabel}"`);
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      toast.error("Erro ao atualizar situação do processo.");
    } finally {
      setIsStatusChanging(false);
    }
  };

  // Cancelar Processo
  const handleCancelProcess = async () => {
    if (!companyId || !id) return;
    try {
      const now = new Date().toISOString();
      const historyEntry = {
        event: "process_cancelled",
        description: `Processo cancelado. Motivo: ${cancelReason || "Não informado"}`,
        user: profile?.full_name || user?.email || "Operador",
        date: now,
      };

      const existingHistory = (processData?.draft_data as any)?.history || [];
      const updatedDraftData = {
        ...((processData?.draft_data as any) || {}),
        history: [historyEntry, ...existingHistory],
        cancel_reason: cancelReason,
      };

      await supabase
        .from("processes")
        .update({
          status: "cancelled",
          draft_data: updatedDraftData,
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      setCurrentStatus("cancelled");
      setIsCancelModalOpen(false);
      toast.success("Processo cancelado.");
      loadProcessDetails();
    } catch (err) {
      toast.error("Erro ao cancelar processo.");
    }
  };

  // Identificador Formatado do Processo
  const processCode = useMemo(() => {
    if (!processData) return "Processo";
    if (processData.protocol_number) return processData.protocol_number;
    return `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`;
  }, [processData]);

  // Data de Criação Formatada
  const creationDateFormatted = useMemo(() => {
    if (!processData?.created_at) return "27/09/2026";
    const d = new Date(processData.created_at);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }, [processData]);

  // Nome da Categoria
  const categoryDisplayName = useMemo(() => {
    const metaCat = processData?.metadata?.category_label || processData?.metadata?.category;
    if (metaCat) return metaCat;
    if (vessel?.category) return vessel.category;
    return "Embarcações de esporte e recreio";
  }, [processData, vessel]);

  // Serviços deste processo
  const processServices = useMemo(() => {
    if (processData?.metadata?.parsed_services && Array.isArray(processData.metadata.parsed_services)) {
      return processData.metadata.parsed_services;
    }
    if (processData?.metadata?.services && Array.isArray(processData.metadata.services)) {
      return processData.metadata.services.map((key: string) => {
        const def = SERVICE_CATALOG[key] || { title: key, categoryLabel: categoryDisplayName };
        return {
          key,
          title: def.title,
          categoryLabel: def.categoryLabel,
          status: "Em andamento",
        };
      });
    }

    const singleKey = processData?.process_type || "renovacao-tie";
    const singleDef = SERVICE_CATALOG[singleKey] || { title: processData?.title || "Serviço náutico", categoryLabel: categoryDisplayName };
    return [{
      key: singleKey,
      title: singleDef.title,
      categoryLabel: singleDef.categoryLabel,
      status: "Em andamento",
    }];
  }, [processData, categoryDisplayName]);

  // Histórico Consolidado de Eventos Reais
  const historyEvents = useMemo(() => {
    const events: Array<{ id: string; event: string; description: string; user: string; date: string }> = [];

    // Eventos customizados do metadata
    if (processData?.metadata?.history && Array.isArray(processData.metadata.history)) {
      processData.metadata.history.forEach((h: any, idx: number) => {
        events.push({
          id: `meta-${idx}`,
          event: h.event || "action",
          description: h.description || "Ação realizada no processo",
          user: h.user || "Operador",
          date: h.date,
        });
      });
    }

    // Eventos de Documentos Gerados
    generatedDocs.forEach((doc) => {
      events.push({
        id: `gen-${doc.id}`,
        event: "doc_generated",
        description: `Documento gerado: "${doc.title || doc.document_type || "Formulário"}"`,
        user: "Sistema / Operador",
        date: doc.created_at,
      });
    });

    // Eventos de Protocolos Realizados
    protocolFiles.forEach((file) => {
      events.push({
        id: `proto-${file.id}`,
        event: "protocol_registered",
        description: `Protocolo registrado: "${file.file_name || "Comprovante de protocolo"}"`,
        user: "Operador",
        date: file.created_at,
      });
    });

    // Eventos de Documentos Emitidos
    issuedDocs.forEach((file) => {
      events.push({
        id: `iss-${file.id}`,
        event: "issued_doc_attached",
        description: `Documento emitido anexado: "${file.file_name || "TIE / Certificado"}"`,
        user: "Operador",
        date: file.created_at,
      });
    });

    // Evento de Criação do Processo
    if (processData?.created_at) {
      events.push({
        id: "created",
        event: "process_created",
        description: `Processo criado (${processCode})`,
        user: processData.metadata?.created_by_email || profile?.full_name || "Operador",
        date: processData.created_at,
      });
    }

    // Ordenar por data mais recente primeiro
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processData, generatedDocs, protocolFiles, issuedDocs, processCode, profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando detalhes do processo...</p>
      </div>
    );
  }

  if (isError || !processData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0B1739]">Processo não encontrado</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          O processo solicitado não existe ou você não possui permissão para acessá-lo.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/processes" })}
          className="mt-4 px-5 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 cursor-pointer"
        >
          Voltar para Processos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate({ to: "/processes" })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar aos processos</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                Processo de {customer?.fantasy_name || customer?.name || "Cliente"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#075BFF] border border-blue-100 text-xs font-bold font-mono">
                {processCode}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Criado em {creationDateFormatted}</span>
            </p>
          </div>

          {/* Seletor de Situação Rápida e Acesso a Pendências */}
          <div className="flex items-center gap-2">
            <Link
              to="/processes/$id/pendencias"
              params={{ id }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Pendências</span>
            </Link>

            <span className="text-xs font-semibold text-slate-500 ml-1">Situação:</span>
            <select
              value={currentStatus}
              disabled={isStatusChanging}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B1739] shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {PROCESS_STATUS_LIST.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FAIXA DE CONTEXTO (5 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="pt-2 sm:pt-0 sm:pr-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
            {customer?.id ? (
              <Link
                to="/customers/$id"
                params={{ id: customer.id }}
                className="text-sm font-bold text-[#075BFF] hover:underline truncate block"
              >
                {customer.fantasy_name || customer.name}
              </Link>
            ) : (
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {customer?.name || "Não informado"}
              </span>
            )}
            <span className="text-[11px] text-slate-400 block truncate">
              {customer?.cpf_cnpj || customer?.document || "Sem documento"}
            </span>
          </div>

          {/* Embarcação */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
            {vessel?.id ? (
              <Link
                to="/vessels/$id"
                params={{ id: vessel.id }}
                className="text-sm font-bold text-[#075BFF] hover:underline truncate block"
              >
                {vessel.name}
              </Link>
            ) : (
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {vessel?.name || "Não informada"}
              </span>
            )}
            <span className="text-[11px] text-slate-400 block truncate">
              {vessel?.registration_number || "Sem inscrição"}
            </span>
          </div>

          {/* Categoria */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Categoria</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {categoryDisplayName}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {vessel?.vessel_type || "Embarcação"}
            </span>
          </div>

          {/* Responsável */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Responsável</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {profile?.full_name || user?.email || "Operador"}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Equipe NavalDocs
            </span>
          </div>

          {/* Situação */}
          <div className="pt-3 sm:pt-0 sm:pl-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Situação</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1 ${
              PROCESS_STATUS_LIST.find((s) => s.value === currentStatus)?.color || "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {PROCESS_STATUS_LIST.find((s) => s.value === currentStatus)?.label || currentStatus}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DOCUMENTOS E PROTOCOLOS (HUB DE 3 CARDS PRINCIPAIS) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Documentos Gerados */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#075BFF] border border-blue-100">
                  {generatedDocs.length} {generatedDocs.length === 1 ? "gerado" : "gerados"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0B1739]">Documentos gerados</h3>
              <p className="text-xs text-slate-500">
                Requerimentos, procurações e minutas preenchidas automaticamente.
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/processes/$id/documentos-gerados"
                params={{ id }}
                className="text-xs font-bold text-[#075BFF] hover:underline inline-flex items-center gap-1"
              >
                <span>Ver documentos</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/processes/$id/gerar-documento"
                params={{ id }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-[11px] font-semibold transition-colors"
              >
                Gerar
              </Link>
            </div>
          </div>

          {/* Card 2: Protocolos Realizados */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {protocolFiles.length} {protocolFiles.length === 1 ? "registro" : "registros"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0B1739]">Protocolos realizados</h3>
              <p className="text-xs text-slate-500">
                Comprovantes e números de protocolo da Capitania dos Portos.
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/processes/$id/protocolos-realizados"
                params={{ id }}
                className="text-xs font-bold text-[#075BFF] hover:underline inline-flex items-center gap-1"
              >
                <span>Ver protocolos</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/processes/$id/anexar-protocolo"
                params={{ id }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors"
              >
                Anexar
              </Link>
            </div>
          </div>

          {/* Card 3: Documentos Emitidos */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {issuedDocs.length} {issuedDocs.length === 1 ? "emitido" : "emitidos"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0B1739]">Documentos emitidos</h3>
              <p className="text-xs text-slate-500">
                TIE, TIEM, certificados e títulos oficiais emitidos pelo órgão marítimo.
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/processes/$id/documentos-emitidos"
                params={{ id }}
                className="text-xs font-bold text-[#075BFF] hover:underline inline-flex items-center gap-1"
              >
                <span>Ver emitidos</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/processes/$id/anexar-documento-emitido"
                params={{ id }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition-colors"
              >
                Anexar
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. GRID PRINCIPAL (2 COLUNAS: SERVIÇOS À ESQUERDA + HISTÓRICO & AÇÕES À DIREITA) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA (7 COLUNAS): SERVIÇOS DO PROCESSO */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SERVIÇOS DESTE PROCESSO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Serviços deste processo
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ocorrências de serviços vinculadas a este processo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/servicos/selecionar",
                      search: {
                        category: processData?.metadata?.category || "esporte_recreio",
                        customerId: customer?.id || "",
                        vesselId: vessel?.id || "",
                      },
                    });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar serviço</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {processServices.map((srv: any, idx: number) => (
                  <div key={srv.key + idx} className="py-4 first:pt-2 last:pb-2 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 mt-0.5">
                          <Cog className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#0B1739] truncate">
                            {srv.title}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {srv.categoryLabel}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                        {srv.status || "Em andamento"}
                      </span>
                    </div>

                    {/* Métricas do Serviço */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Gerados</span>
                        <span className="font-bold text-slate-700">{generatedDocs.length}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Protocolos</span>
                        <span className="font-bold text-slate-700">{protocolFiles.length}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Emitidos</span>
                        <span className="font-bold text-slate-700">{issuedDocs.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        to="/processes/$id/pendencias"
                        params={{ id }}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Ver pendências</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceForModal(srv);
                          setIsServiceModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Abrir serviço
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AÇÕES RÁPIDAS DO PROCESSO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Ações do processo
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/processes/$id/pendencias",
                      params: { id },
                    });
                  }}
                  className="p-3 rounded-xl border border-amber-200 hover:border-amber-400 bg-amber-50/20 hover:bg-amber-50/50 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-amber-900 group-hover:text-amber-800 flex items-center justify-between">
                    <span>Pendências do serviço</span>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">
                    Conferir dados, documentos a enviar e ações
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/servicos/documentos",
                      search: {
                        category: processData?.metadata?.category || "esporte_recreio",
                        customerId: customer?.id || "",
                        vesselId: vessel?.id || "",
                        services: processServices.map((s: any) => s.key).join(","),
                      },
                    });
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                    Continuar preparação
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Organizar formulários e arquivos do checklist
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/processes/$id/anexar-protocolo",
                      params: { id },
                    });
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                    Registrar protocolo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Adicionar comprovante e código de protocolo
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/processes/$id/gerar-documento",
                      params: { id },
                    });
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                    Gerar documento
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Emitir requerimentos e procurações em PDF
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: "/processes/$id/anexar-documento-emitido",
                      params: { id },
                    });
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#0B1739] group-hover:text-[#075BFF]">
                    Anexar documento emitido
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cadastrar TIE ou documento recebido do órgão
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="p-3 rounded-xl border border-red-100 hover:border-red-300 hover:bg-red-50/30 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-red-600">
                    Cancelar processo
                  </p>
                  <p className="text-[11px] text-red-400 mt-0.5">
                    Interromper andamento deste processo
                  </p>
                </button>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA (5 COLUNAS): HISTÓRICO DO PROCESSO */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#075BFF]" />
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Histórico do processo
                  </h2>
                </div>
                <Link
                  to="/processes/$id/historico"
                  params={{ id }}
                  className="text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  Ver histórico completo
                </Link>
              </div>

              {historyEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Nenhum evento registrado ainda.
                </p>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {historyEvents.map((evt) => {
                    const evtDate = new Date(evt.date);
                    const formattedDate = isNaN(evtDate.getTime()) 
                      ? evt.date 
                      : new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(evtDate);

                    return (
                      <div key={evt.id} className="relative flex items-start gap-3.5 pl-1.5">
                        <div className="w-4 h-4 rounded-full bg-blue-50 border-2 border-[#075BFF] flex items-center justify-center shrink-0 mt-1 z-10" />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold text-[#0B1739] leading-snug">
                            {evt.description}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Por {evt.user} • {formattedDate}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DO SERVIÇO */}
      {/* ========================================================================= */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Cog className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  {selectedServiceForModal?.title || "Detalhes do serviço"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {selectedServiceForModal?.categoryLabel}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Processo vinculado:</span>
              <span className="font-bold text-[#0B1739]">{processCode}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Documentos gerados:</span>
              <span className="font-semibold text-slate-800">{generatedDocs.length}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Protocolos cadastrados:</span>
              <span className="font-semibold text-slate-800">{protocolFiles.length}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Documentos emitidos:</span>
              <span className="font-semibold text-slate-800">{issuedDocs.length}</span>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CANCELAR PROCESSO */}
      {/* ========================================================================= */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Cancelar processo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Informe o motivo do cancelamento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3">
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento deste processo..."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleCancelProcess}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              Confirmar cancelamento
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
