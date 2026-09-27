import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  ClipboardCheck,
  Award,
  Download,
  Eye,
  Upload,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileUploader } from "@/components/FileUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    tab: (search.tab as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ServiceDetailsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone náutico estilizado do NavalDocs Pro
function NauticalBoatIcon({ className = "w-4 h-4 text-[#075BFF]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22L11 28H37L44 22L41 18H7L4 22Z" />
      <path d="M14 18L18 10H30L34 18" />
      <path d="M24 10V4" />
    </svg>
  );
}

// Ícone de prancheta de serviço conforme a imagem de referência da Tela 07
function ServiceClipboardIcon({ className = "w-10 h-10 text-[#0B1739]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Corpo da Prancheta */}
      <rect x="7" y="9" width="26" height="27" rx="4" />
      {/* Grampo superior */}
      <path d="M15 9V6C15 4.89543 15.8954 4 17 4H23C24.1046 4 25 4.89543 25 6V9" />
      {/* Linhas internas do serviço */}
      <path d="M13 17H27" />
      <path d="M13 23H27" />
      <path d="M13 29H21" />
    </svg>
  );
}

function ServiceDetailsPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Contagens e Registros Reais dos 3 Cards
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [protocolFiles, setProtocolFiles] = useState<any[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<any[]>([]);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Modais de Consulta dos Cards
  const [activeModal, setActiveModal] = useState<"generated" | "protocols" | "issued" | null>(
    (searchParams.tab as any) || null
  );

  // 1. Carregar Ocorrência Real do Processo/Serviço e seus Vínculos
  const loadServiceDetails = useCallback(async () => {
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

  // 2. Carregar Contagens e Arquivos de Cada Categoria
  const loadCategoryFiles = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingCounts(true);

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

      // 2.3 Documentos Emitidos (Finalizados pela Capitania / Órgão)
      const { data: issDocs } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .in("category", ["issued", "issued_doc", "documento_emitido", "final_document"])
        .order("created_at", { ascending: false });

      setIssuedDocs(issDocs || []);
    } catch (err) {
      console.error("Erro ao carregar arquivos das categorias:", err);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadServiceDetails();
    loadCategoryFiles();
  }, [loadServiceDetails, loadCategoryFiles]);

  // Normalização do Título do Serviço
  const serviceTitle = useMemo(() => {
    if (!processData) return "Serviço náutico";
    return processData.title || processData.process_type || "Serviço náutico";
  }, [processData]);

  // Código do Processo
  const protocolCode = useMemo(() => {
    if (!processData) return "PROC";
    return processData.protocol_number || `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`;
  }, [processData]);

  // Situação / Status do Processo
  const statusInfo = useMemo(() => {
    if (!processData) return { label: "Em andamento", variant: "blue" };
    const raw = (processData.status || "").toLowerCase();
    if (raw.includes("conclu") || raw === "completed" || raw === "finalizado") {
      return { label: "Concluído", variant: "green" };
    }
    if (raw.includes("cancela") || raw === "cancelled" || raw === "arquivado") {
      return { label: "Cancelado", variant: "gray" };
    }
    if (raw.includes("penden") || raw === "draft" || raw === "aguardando") {
      return { label: "Pendente", variant: "amber" };
    }
    return { label: "Em andamento", variant: "blue" };
  }, [processData]);

  // Contagens formatadas
  const generatedCount = generatedDocs.length;
  const protocolCount = (protocolFiles.length > 0 || processData?.protocol_number) ? Math.max(protocolFiles.length, 1) : 0;
  const issuedCount = issuedDocs.length;

  const generatedCountLabel = generatedCount === 0 
    ? "Nenhum documento ainda" 
    : `${generatedCount} ${generatedCount === 1 ? "documento" : "documentos"}`;

  const protocolCountLabel = protocolCount === 0 
    ? "Nenhum protocolo ainda" 
    : `${protocolCount} ${protocolCount === 1 ? "protocolo" : "protocolos"}`;

  const issuedCountLabel = issuedCount === 0 
    ? "Nenhum documento ainda" 
    : `${issuedCount} ${issuedCount === 1 ? "documento emitido" : "documentos emitidos"}`;

  // Botão de Retorno Superior
  const backNavigation = useMemo(() => {
    if (vessel?.id) {
      return {
        label: "Voltar para embarcação",
        to: "/vessels/$id",
        params: { id: vessel.id },
        search: { from: "service", customerId: customer?.id },
      };
    }
    if (customer?.id) {
      return {
        label: "Voltar para cliente",
        to: "/customers/$id",
        params: { id: customer.id },
        search: {},
      };
    }
    return {
      label: "Voltar para processos",
      to: "/processes",
      params: undefined,
      search: {},
    };
  }, [vessel?.id, customer?.id]);

  // Estados de Carregamento e Erro
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-40 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-72 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-52 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-28 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-48 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-44 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
          <div className="h-44 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
          <div className="h-44 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        </div>
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

  const customerDisplayName = customer?.fantasy_name || customer?.name || "Não informado";
  const vesselDisplayName = vessel?.name || "Não informada";

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
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
          <Link to="/customers" className="hover:text-slate-600 hover:underline">
            Clientes
          </Link>
          <span>/</span>
          {customer ? (
            <Link 
              to="/customers/$id" 
              params={{ id: customer.id }} 
              className="hover:text-slate-600 hover:underline truncate max-w-[160px]"
            >
              {customerDisplayName}
            </Link>
          ) : (
            <span>Sem cliente</span>
          )}
          <span>/</span>
          {vessel ? (
            <Link 
              to="/vessels/$id" 
              params={{ id: vessel.id }} 
              className="hover:text-slate-600 hover:underline truncate max-w-[160px]"
            >
              {vesselDisplayName}
            </Link>
          ) : (
            <span>Sem embarcação</span>
          )}
          <span>/</span>
          <span className="text-slate-600 font-semibold">{serviceTitle}</span>
        </div>
      </div>

      {/* 2. CABEÇALHO DO SERVIÇO */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[#0B1739]">
          <ServiceClipboardIcon className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            {serviceTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Organize os documentos e acompanhe este serviço.
          </p>
        </div>
      </div>

      {/* 3. RESUMO DO CONTEXTO (4 COLUNAS) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Cliente */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cliente
          </p>
          {customer ? (
            <Link
              to="/customers/$id"
              params={{ id: customer.id }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#075BFF] hover:underline truncate"
            >
              <User className="h-4 w-4 text-[#075BFF] shrink-0" />
              <span className="truncate">{customerDisplayName}</span>
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-500">Não informado</span>
          )}
        </div>

        {/* Embarcação */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Embarcação
          </p>
          {vessel ? (
            <Link
              to="/vessels/$id"
              params={{ id: vessel.id }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#075BFF] hover:underline truncate"
            >
              <NauticalBoatIcon className="w-4 h-4 text-[#075BFF] shrink-0" />
              <span className="truncate">{vesselDisplayName}</span>
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-500">Não informada</span>
          )}
        </div>

        {/* Processo */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Processo
          </p>
          <p className="text-sm font-semibold text-[#0B1739]">
            {protocolCode}
          </p>
        </div>

        {/* Situação */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Situação
          </p>
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                statusInfo.variant === "green"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : statusInfo.variant === "blue"
                  ? "bg-blue-50 text-[#075BFF] border-blue-200"
                  : statusInfo.variant === "amber"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO PRINCIPAL: TRÊS CARDS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-[#0B1739] tracking-tight">
          O que você deseja consultar?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1 — Documentos gerados */}
          <div
            onClick={() => {
              navigate({
                to: "/processes/$id/documentos-gerados",
                params: { id },
              });
            }}
            className="group flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-[#075BFF]/60 transition-all cursor-pointer shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                Documentos gerados
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Arquivos preparados no NavalDocs Pro para este serviço.
              </p>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#075BFF]">
              <span>{generatedCountLabel}</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 2 — Protocolos realizados */}
          <div
            onClick={() => setActiveModal("protocols")}
            className="group flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-[#075BFF]/60 transition-all cursor-pointer shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                Protocolos realizados
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consulte os protocolos ou anexe novos comprovantes.
              </p>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#075BFF]">
              <span>{protocolCountLabel}</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 3 — Documentos emitidos */}
          <div
            onClick={() => setActiveModal("issued")}
            className="group flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-[#075BFF]/60 transition-all cursor-pointer shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                Documentos emitidos
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Documentos finais recebidos do órgão responsável.
              </p>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#075BFF]">
              <span>{issuedCountLabel}</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. MENSAGEM DE APOIO INFERIOR */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3">
        <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
        <span>Todos os arquivos ficam vinculados a este cliente, embarcação e serviço.</span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DOCUMENTOS GERADOS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "generated"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0B1739]">
                  Documentos gerados
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Arquivos oficiais gerados pelo NavalDocs Pro para {serviceTitle}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {generatedDocs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FileText className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">Nenhum documento gerado ainda</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Os formulários, procurações e termos deste serviço podem ser gerados através do fluxo de geração.
                </p>
                <div className="pt-2">
                  <Link
                    to="/processes/arquivos-gerados"
                    search={{ orderId: id, customerId: customer?.id, vesselId: vessel?.id }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Acessar gerador de documentos</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                {generatedDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileCheck className="h-5 w-5 text-[#075BFF] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-[#0B1739] truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "Data não informada"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openStoredFile(doc)}
                        className="p-2 text-[#075BFF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Visualizar documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadStoredFile(doc, doc.name)}
                        className="p-2 text-[#075BFF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Baixar documento"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: PROTOCOLOS REALIZADOS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "protocols"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 shrink-0">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0B1739]">
                  Protocolos realizados
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Consulte os registros de protocolo e anexe novos comprovantes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Registro de Protocolo Atual */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identificador do Protocolo</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#075BFF] border border-blue-100">
                  {protocolCode}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Data do registro: <strong>{processData.protocol_at ? new Date(processData.protocol_at).toLocaleDateString("pt-BR") : "Registrado no sistema"}</strong>
              </p>
            </div>

            {/* Lista de Comprovantes Anexados */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Comprovantes anexados</h4>
              {protocolFiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum comprovante de protocolo anexado ainda.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                  {protocolFiles.map((file) => (
                    <div key={file.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                        <span className="text-xs font-semibold text-[#0B1739] truncate">{file.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openStoredFile(file)}
                          className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStoredFile(file, file.file_name)}
                          className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anexar Novo Comprovante */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Anexar novo comprovante</h4>
              <FileUploader
                customerId={customer?.id}
                vesselId={vessel?.id}
                processId={id}
                category="protocol"
                bucket="process-attachments"
                onUploadComplete={() => {
                  loadCategoryFiles();
                  toast.success("Comprovante de protocolo anexado com sucesso!");
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: DOCUMENTOS EMITIDOS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "issued"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0B1739]">
                  Documentos emitidos
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Documentos finais emitidos pela Capitania dos Portos / Órgão responsável.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Lista de Documentos Emitidos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Documentos finais recebidos</h4>
              {issuedDocs.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Award className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Nenhum documento final emitido ainda</p>
                  <p className="text-[11px] text-slate-400">
                    Quando o órgão concluir o processo e emitir o TIE/TIEM ou certidão, anexe o documento abaixo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                  {issuedDocs.map((file) => (
                    <div key={file.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Award className="h-4 w-4 text-[#075BFF] shrink-0" />
                        <span className="text-xs font-semibold text-[#0B1739] truncate">{file.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openStoredFile(file)}
                          className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStoredFile(file, file.file_name)}
                          className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anexar Novo Documento Emitido */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Anexar documento emitido</h4>
              <FileUploader
                customerId={customer?.id}
                vesselId={vessel?.id}
                processId={id}
                category="issued"
                bucket="process-attachments"
                onUploadComplete={() => {
                  loadCategoryFiles();
                  toast.success("Documento emitido anexado com sucesso!");
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
