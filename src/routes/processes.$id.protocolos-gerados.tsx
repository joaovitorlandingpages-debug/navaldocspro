import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Eye, 
  Download, 
  X, 
  Info,
  Calendar,
  Building2,
  Paperclip,
  ImageIcon
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/protocolos-gerados")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ProtocolosGeradosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function ProtocolosGeradosPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Lista de Protocolos
  const [protocolList, setProtocolList] = useState<any[]>([]);
  const [isLoadingProtocols, setIsLoadingProtocols] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Conjunto de IDs expandidos
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 1. Carregar Ocorrência do Processo / Serviço
  const loadProcessDetails = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj, email, phone),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
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
      setCustomer(proc.customer || null);
      setVessel(proc.vessel || null);
    } catch (err) {
      console.error("Erro ao carregar detalhes do serviço:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  // 2. Carregar Registros de Protocolo
  const loadProtocols = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingProtocols(true);

    try {
      const { data: filesData, error: fError } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .eq("category", "protocol")
        .order("created_at", { ascending: false });

      if (fError) throw fError;

      setProtocolList(filesData || []);

      // Se houver apenas 1 protocolo, expande-o automaticamente
      if (filesData && filesData.length === 1) {
        setExpandedIds(new Set([filesData[0].id]));
      }
    } catch (err) {
      console.error("Erro ao carregar protocolos:", err);
    } finally {
      setIsLoadingProtocols(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadProcessDetails();
    loadProtocols();
  }, [loadProcessDetails, loadProtocols]);

  // Normalização do Título e Código do Processo
  const serviceTitle = useMemo(() => {
    return processData?.title || processData?.process_type || "Transferência de propriedade";
  }, [processData]);

  const protocolCode = useMemo(() => {
    return processData?.protocol_number || `PROC-${String(processData?.id || id).slice(0, 4).toUpperCase()}`;
  }, [processData, id]);

  const customerName = useMemo(() => {
    return customer?.fantasy_name || customer?.name || "Ana Oliveira";
  }, [customer]);

  const vesselName = useMemo(() => {
    return vessel?.name || "Aurora";
  }, [vessel]);

  // Toggle de expansão de detalhes
  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Filtragem de Protocolos por título, número e órgão
  const filteredProtocols = useMemo(() => {
    if (!searchTerm.trim()) return protocolList;
    const term = searchTerm.toLowerCase().trim();
    return protocolList.filter((p) => {
      const title = (p.metadata?.title || p.file_name || "").toLowerCase();
      const num = (p.metadata?.protocol_number || "").toLowerCase();
      const agency = (p.metadata?.agency || "").toLowerCase();
      return title.includes(term) || num.includes(term) || agency.includes(term);
    });
  }, [protocolList, searchTerm]);

  // Contagem formatada de protocolos
  const countLabel = useMemo(() => {
    const total = filteredProtocols.length;
    if (total === 1) return "1 protocolo";
    return `${total} protocolos`;
  }, [filteredProtocols]);

  // Formatador de data local seguro sem deslocamento
  const formatDateSafe = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Não informada";
    try {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  // Estados de Carregamento e Erro
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-28 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-80 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !processData) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Serviço não encontrado</h2>
        <p className="text-sm text-slate-500">
          A ocorrência deste serviço não existe ou você não possui permissão para visualizá-la nesta empresa.
        </p>
        <div className="pt-2">
          <Link
            to="/processes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para processos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR + BREADCRUMBS */}
      <div className="space-y-1.5">
        <div>
          <Link
            to="/processes/$id/protocolos-realizados"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar aos protocolos</span>
          </Link>
        </div>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA + BOTÃO DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Protocolos gerados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulte os registros e comprovantes deste serviço.
          </p>
        </div>

        <div>
          <Link
            to="/processes/$id/anexar-protocolo"
            params={{ id }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Anexar protocolo</span>
          </Link>
        </div>
      </div>

      {/* 3. RESUMO DO CONTEXTO (4 COLUNAS) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Cliente */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cliente
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {customerName}
          </p>
        </div>

        {/* Embarcação */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Embarcação
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {vesselName}
          </p>
        </div>

        {/* Serviço */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Serviço
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {serviceTitle}
          </p>
        </div>

        {/* Processo */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Processo
          </p>
          <p className="text-sm font-bold text-[#0B1739]">
            {protocolCode}
          </p>
        </div>
      </div>

      {/* 4. BARRA DE PESQUISA & CONTAGEM */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, número ou órgão..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="shrink-0 text-xs font-semibold text-slate-400 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
          {countLabel}
        </div>
      </div>

      {/* 5. LISTAGEM PRINCIPAL DE PROTOCOLOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Cabeçalho da Tabela (Visível em Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">Protocolo</div>
          <div className="col-span-3">Órgão</div>
          <div className="col-span-2">Data do protocolo</div>
          <div className="col-span-2">Comprovantes</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Conteúdo da Tabela */}
        {isLoadingProtocols ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#075BFF]" />
            <span>Carregando protocolos gerados...</span>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              {protocolList.length === 0 
                ? "Nenhum protocolo cadastrado neste serviço" 
                : "Nenhum protocolo encontrado com os termos pesquisados"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Adicione os comprovantes e registros de protocolo para manter o histórico organizado.
            </p>
            <div className="pt-2">
              <Link
                to="/processes/$id/anexar-protocolo"
                params={{ id }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Anexar protocolo</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProtocols.map((proto) => {
              const meta = proto.metadata || {};
              const title = meta.title || proto.file_name || "Protocolo de serviço";
              const protoNumber = meta.protocol_number ? `Número: ${meta.protocol_number}` : "Número não informado";
              const agency = meta.agency || "Não informado";
              const protocolDate = formatDateSafe(meta.protocol_date);
              const isExpanded = expandedIds.has(proto.id);
              const registeredBy = meta.registered_by_name || profile?.name || "Usuário";
              const registeredDate = formatDateSafe(meta.registered_at || proto.created_at);

              return (
                <div key={proto.id} className="transition-colors hover:bg-slate-50/40">
                  {/* Linha Principal */}
                  <div className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                    {/* Coluna 1: Protocolo (Título e Número) */}
                    <div className="md:col-span-4 min-w-0">
                      <p className="text-sm font-bold text-[#0B1739] truncate">
                        {title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {protoNumber}
                      </p>
                    </div>

                    {/* Coluna 2: Órgão */}
                    <div className="md:col-span-3 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Órgão:</span>
                      <span className="truncate block font-medium">{agency}</span>
                    </div>

                    {/* Coluna 3: Data do Protocolo */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Data:</span>
                      <span>{protocolDate}</span>
                    </div>

                    {/* Coluna 4: Comprovantes */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Comprovantes:</span>
                      <span className="font-medium">1 arquivo</span>
                    </div>

                    {/* Coluna 5: Ação Ver Detalhes */}
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpand(proto.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/60 text-[#075BFF] text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>Ver detalhes</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Painel de Detalhes Expansível */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-1 bg-[#F9FBFF] border-t border-slate-100/90 space-y-3">
                      {/* Título da Seção */}
                      <p className="text-xs font-bold text-[#0B1739] pt-2">
                        Comprovante anexado
                      </p>

                      {/* Card do Arquivo Anexado */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                            {proto.file_type?.includes("image") ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">
                              {proto.file_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {proto.file_size ? `${(proto.file_size / 1024).toFixed(0)} KB` : "Arquivo digital"}
                            </p>
                          </div>
                        </div>

                        {/* Ações Visualizar e Baixar */}
                        <div className="flex items-center gap-4 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => openStoredFile(proto)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Visualizar</span>
                          </button>
                          <div className="h-4 w-px bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(proto, proto.file_name)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>

                      {/* Observações, se existirem */}
                      {meta.notes && (
                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-0.5">
                          <span className="font-bold text-slate-700">Observações:</span>
                          <p className="text-slate-600 leading-relaxed">{meta.notes}</p>
                        </div>
                      )}

                      {/* Rodapé dos Detalhes */}
                      <p className="text-[11px] text-slate-400">
                        Cadastrado por {registeredBy} em {registeredDate}.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. MENSAGEM INFORMATIVA INFERIOR */}
      <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
        <Info className="h-4 w-4 text-slate-400 shrink-0" />
        <span>Os dados do protocolo são informados no cadastro.</span>
      </div>
    </div>
  );
}
