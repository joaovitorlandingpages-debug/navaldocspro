import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronDown, 
  Eye, 
  Download, 
  MoreVertical, 
  Paperclip, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  FileCheck, 
  Upload, 
  Clock, 
  History, 
  X,
  CheckCircle2,
  FileText
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/documentos-gerados")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
    selectedDocId: (search.selectedDocId as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <DocumentosGeradosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone oficial estilizado do PDF (com badge vermelho)
function PdfBadgeIcon() {
  return (
    <div className="w-8 h-9 rounded-lg bg-red-500 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none">
      <span className="text-[9px] font-black tracking-tighter leading-none mt-0.5">PDF</span>
    </div>
  );
}

// Ícone de caneta de assinatura GOV.BR conforme a referência visual da Tela 08
function GovBrPenIcon({ className = "w-8 h-8 text-[#075BFF]" }: { className?: string }) {
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
      {/* Corpo da caneta inclinada */}
      <path d="M12 28L25 15L29 19L16 32L10 34L12 28Z" />
      {/* Ponta e linha de assinatura */}
      <path d="M22 18L26 22" />
      <path d="M6 34C10 32 12 36 18 34" />
    </svg>
  );
}

function DocumentosGeradosPage() {
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

  // Documentos Gerados
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Busca e Filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSigned, setFilterSigned] = useState<"all" | "signed" | "unsigned">("all");

  // Documento selecionado para exibição do anexo assinado
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Modal de Anexar Versão Assinada
  const [docToAttach, setDocToAttach] = useState<any | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);

  // Modal de Consulta de Versões Anteriores
  const [docForHistory, setDocForHistory] = useState<any | null>(null);

  // Modal de Gerar Documento
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string>(profile?.id || "");
  const [companyProfiles, setCompanyProfiles] = useState<any[]>([]);

  // 1. Carregar Ocorrência do Processo / Serviço
  const loadProcessData = useCallback(async () => {
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
      console.error("Erro ao carregar processo:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  // 2. Carregar Documentos Gerados
  const loadGeneratedDocuments = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingDocs(true);

    try {
      const { data: docsData, error: docsError } = await supabase
        .from("generated_documents")
        .select(`
          *
        `)
        .eq("company_id", companyId)
        .eq("process_id", id)
        .order("name", { ascending: true });

      if (docsError) throw docsError;

      const list = docsData || [];
      setDocuments(list);

      // Se houver algum documento com versão assinada, selecione-o por padrão
      if (list.length > 0) {
        const withSigned = list.find((d) => d.signed_file_url || d.signature_status === "Anexada" || d.signature_status === "signed");
        setSelectedDoc(withSigned || list[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos gerados:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [companyId, id]);

  // 3. Carregar Perfis da Empresa (para seleção de funcionário responsável)
  const loadCompanyProfiles = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("company_id", companyId);
      setCompanyProfiles(data || []);
    } catch (err) {
      console.warn("Erro ao buscar perfis da empresa:", err);
    }
  }, [companyId]);

  useEffect(() => {
    loadProcessData();
    loadGeneratedDocuments();
    loadCompanyProfiles();
  }, [loadProcessData, loadGeneratedDocuments, loadCompanyProfiles]);

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

  // Filtro de Documentos (Pesquisa por nome + filtro de versão assinada)
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const isSigned = !!doc.signed_file_url || doc.signature_status === "Anexada" || doc.signature_status === "signed";
      
      if (filterSigned === "signed" && !isSigned) return false;
      if (filterSigned === "unsigned" && isSigned) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const docName = (doc.name || "").toLowerCase();
        return docName.includes(term);
      }

      return true;
    });
  }, [documents, filterSigned, searchTerm]);

  // Handler para Upload de Versão Assinada
  const handleUploadSignedVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToAttach || !signedFile || !companyId) return;

    setIsUploadingSigned(true);
    try {
      const ext = signedFile.name.split(".").pop() || "pdf";
      const cleanFileName = signedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/signed_${Date.now()}_${cleanFileName}`;

      // 1. Upload seguro para o bucket generated-documents
      await uploadToBucket("generated-documents", storagePath, signedFile, {
        allowedExtensions: [".pdf"],
      });

      // 2. Atualizar registro em generated_documents
      const updatedMetadata = {
        ...(docToAttach.metadata || {}),
        signed_at: new Date().toISOString(),
        signed_by_id: profile?.id,
        signed_by_name: profile?.name || "Usuário",
        original_file_name: docToAttach.name,
      };

      const { error: updateError } = await supabase
        .from("generated_documents")
        .update({
          signed_file_url: storagePath,
          signature_status: "Anexada",
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docToAttach.id)
        .eq("company_id", companyId);

      if (updateError) throw updateError;

      toast.success(`Versão assinada vinculada a ${docToAttach.name} com sucesso!`);
      setDocToAttach(null);
      setSignedFile(null);
      loadGeneratedDocuments();
    } catch (err: any) {
      console.error("Erro ao vincular versão assinada:", err);
      toast.error(err?.message || "Não foi possível anexar a versão assinada.");
    } finally {
      setIsUploadingSigned(false);
    }
  };

  // Handler para Abrir Fluxo de Gerar Documento
  const handleOpenGenerateModal = async () => {
    setIsGenerateModalOpen(true);
    setIsLoadingTemplates(true);
    try {
      // Buscar modelos ativos
      const { data: tData } = await supabase
        .from("document_templates")
        .select("id, title, category, description, is_active")
        .eq("is_active", true)
        .order("title", { ascending: true });

      setAvailableTemplates(tData || []);
    } catch (err) {
      console.error("Erro ao buscar modelos:", err);
    } finally {
      setIsLoadingTemplates(false);
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
        <div className="h-64 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
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
            to="/processes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </Link>
        </div>

        {/* Caminho de navegação (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
          {customer ? (
            <Link to="/customers/$id" params={{ id: customer.id }} className="hover:text-slate-600 hover:underline truncate max-w-[160px]">
              {customerName}
            </Link>
          ) : (
            <span>{customerName}</span>
          )}
          <span>/</span>
          {vessel ? (
            <Link to="/vessels/$id" params={{ id: vessel.id }} className="hover:text-slate-600 hover:underline truncate max-w-[160px] font-bold text-slate-700">
              {vesselName}
            </Link>
          ) : (
            <span className="font-bold text-slate-700">{vesselName}</span>
          )}
          <span>/</span>
          <Link to="/processes/$id" params={{ id }} className="hover:text-slate-600 hover:underline">
            {serviceTitle}
          </Link>
        </div>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA + BOTÃO GERAR DOCUMENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Documentos gerados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Visualize, baixe e organize os documentos deste serviço.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenGenerateModal}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Gerar documento</span>
        </button>
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

      {/* 4. BANNER DE ASSINATURA GOV.BR */}
      <div className="bg-[#EEF4FF]/70 border border-blue-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <GovBrPenIcon className="w-7 h-7 text-[#075BFF]" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#0B1739]">
              Assinatura pelo GOV.BR
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Baixe o PDF, assine no portal GOV.BR e anexe a versão assinada.
            </p>
          </div>
        </div>

        <a
          href="https://assinador.iti.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#075BFF] text-xs font-semibold shadow-2xs transition-all shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Abrir GOV.BR</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* 5. TABELA DE DOCUMENTOS GERADOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Barra de Busca e Filtro */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar documento..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Versão Assinada */}
          <div className="relative shrink-0 sm:w-56">
            <select
              value={filterSigned}
              onChange={(e) => setFilterSigned(e.target.value as any)}
              className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer"
            >
              <option value="all">Todos os documentos</option>
              <option value="signed">Com versão assinada</option>
              <option value="unsigned">Sem versão assinada</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabela de Documentos Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-700">
                <th className="py-3 px-3 font-semibold">Documento</th>
                <th className="py-3 px-3 font-semibold">Responsável</th>
                <th className="py-3 px-3 font-semibold">Gerado em</th>
                <th className="py-3 px-3 font-semibold">Versão assinada</th>
                <th className="py-3 px-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                    <Loader2 className="h-5 w-5 text-[#075BFF] animate-spin mx-auto mb-2" />
                    <span>Carregando documentos gerados...</span>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      {documents.length === 0 
                        ? "Nenhum documento gerado para este serviço" 
                        : "Nenhum documento encontrado com os filtros aplicados"}
                    </p>
                    {documents.length === 0 ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleOpenGenerateModal}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#075BFF] text-white text-xs font-medium hover:bg-blue-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Gerar primeiro documento</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterSigned("all");
                        }}
                        className="text-xs text-[#075BFF] hover:underline font-medium"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSigned = !!doc.signed_file_url || doc.signature_status === "Anexada" || doc.signature_status === "signed";
                  const responsibleName = doc.metadata?.responsible_name || profile?.name || "João Vitor";
                  const formattedDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "27/09/2026";
                  const versionNum = doc.version || 1;

                  return (
                    <tr 
                      key={doc.id} 
                      onClick={() => setSelectedDoc(doc)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        selectedDoc?.id === doc.id ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Documento */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <PdfBadgeIcon />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#0B1739]">
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Versão {versionNum} • PDF
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Responsável */}
                      <td className="py-3.5 px-3 text-xs sm:text-sm text-slate-700 font-medium">
                        {responsibleName}
                      </td>

                      {/* Gerado em */}
                      <td className="py-3.5 px-3 text-xs sm:text-sm text-slate-600">
                        {formattedDate}
                      </td>

                      {/* Versão assinada */}
                      <td className="py-3.5 px-3">
                        {isSigned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Anexada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Não anexada
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          {/* Visualizar */}
                          <button
                            type="button"
                            onClick={() => openStoredFile(doc)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                            title="Visualizar PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Visualizar</span>
                          </button>

                          {/* Baixar PDF */}
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(doc, doc.name)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                            title="Baixar PDF original"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Baixar PDF</span>
                          </button>

                          {/* Menu com Opções Extras */}
                          <button
                            type="button"
                            onClick={() => setDocToAttach(doc)}
                            className="p-1 text-slate-400 hover:text-[#075BFF] hover:bg-blue-50 rounded cursor-pointer"
                            title="Anexar versão assinada"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards de Documentos no Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoadingDocs ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 text-[#075BFF] animate-spin" />
              <span>Carregando documentos...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-700">Nenhum documento encontrado</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isSigned = !!doc.signed_file_url || doc.signature_status === "Anexada" || doc.signature_status === "signed";
              const responsibleName = doc.metadata?.responsible_name || profile?.name || "João Vitor";
              const formattedDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "27/09/2026";

              return (
                <div 
                  key={doc.id} 
                  onClick={() => setSelectedDoc(doc)}
                  className="py-3.5 space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PdfBadgeIcon />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#0B1739] truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">Versão {doc.version || 1} • PDF</p>
                      </div>
                    </div>
                    <div>
                      {isSigned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Anexada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Não anexada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pl-10">
                    <span>Responsável: <strong>{responsibleName}</strong></span>
                    <span>{formattedDate}</span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openStoredFile(doc)}
                      className="text-xs font-semibold text-[#075BFF] flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadStoredFile(doc, doc.name)}
                      className="text-xs font-semibold text-[#075BFF] flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Baixar PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocToAttach(doc)}
                      className="text-xs font-semibold text-[#075BFF] flex items-center gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Anexar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. SUB-CARD DE VERSÃO ASSINADA VINCULADA */}
      {selectedDoc && (selectedDoc.signed_file_url || selectedDoc.signature_status === "Anexada" || selectedDoc.signature_status === "signed") && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Paperclip className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">
                  {selectedDoc.name} — versão assinada.pdf
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => openStoredFile({ file_url: selectedDoc.signed_file_url, category: "generated-documents" })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Visualizar</span>
              </button>

              <button
                type="button"
                onClick={() => downloadStoredFile({ file_url: selectedDoc.signed_file_url, category: "generated-documents" }, `${selectedDoc.name} - Versao Assinada.pdf`)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pl-11">
            O arquivo original é preservado ao anexar uma versão assinada.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANEXAR VERSÃO ASSINADA */}
      {/* ========================================================================= */}
      {docToAttach && (
        <Dialog open={!!docToAttach} onOpenChange={(open) => !open && setDocToAttach(null)}>
          <DialogContent className="max-w-lg rounded-2xl bg-white border border-slate-200 p-0 overflow-hidden">
            <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                    Anexar versão assinada
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Vincule o arquivo assinado pelo GOV.BR ao documento original.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleUploadSignedVersion} className="p-5 sm:p-6 space-y-4">
              {/* Documento Original Identificado */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Documento Original
                </p>
                <p className="text-xs sm:text-sm font-bold text-[#0B1739]">
                  {docToAttach.name} (Versão {docToAttach.version || 1})
                </p>
              </div>

              {/* Seletor de Arquivo PDF */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Selecione o PDF assinado *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSignedFile(f);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#075BFF] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
                />
              </div>

              {/* Alerta explicativo */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-600">
                <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                <span>
                  O arquivo original será preservado. O sistema registrará a data do envio ({new Date().toLocaleDateString("pt-BR")}) e o usuário responsável ({profile?.name || "Usuário"}).
                </span>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocToAttach(null);
                    setSignedFile(null);
                  }}
                  disabled={isUploadingSigned}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!signedFile || isUploadingSigned}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingSigned ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Anexando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Confirmar e anexar</span>
                    </>
                  )}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GERAR DOCUMENTO */}
      {/* ========================================================================= */}
      {isGenerateModalOpen && (
        <Dialog open={isGenerateModalOpen} onOpenChange={(open) => !open && setIsGenerateModalOpen(false)}>
          <DialogContent className="max-w-xl rounded-2xl bg-white border border-slate-200 p-0 overflow-hidden">
            <DialogHeader className="p-5 sm:p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                    Gerar documento oficial
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Gere formulários náuticos aprovados para {serviceTitle}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Seleção do Funcionário Responsável */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Funcionário responsável pelo documento
                </label>
                <div className="relative">
                  <select
                    value={selectedResponsibleId}
                    onChange={(e) => setSelectedResponsibleId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer pr-10"
                  >
                    {companyProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Modelos Disponíveis */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Modelos disponíveis para este serviço
                </label>

                {isLoadingTemplates ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
                    <span>Carregando modelos aprovados...</span>
                  </div>
                ) : availableTemplates.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1">
                    <AlertCircle className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      Nenhum modelo disponível para este serviço
                    </p>
                    <p className="text-[11px] text-slate-400">
                      O catálogo de formulários náuticos está em fase de preparação para esta categoria.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    {availableTemplates.map((tpl) => (
                      <div key={tpl.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-semibold text-xs text-[#0B1739]">{tpl.title}</p>
                          <p className="text-[11px] text-slate-400">{tpl.category || "Oficial"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            toast.info(`Iniciando geração de ${tpl.title}...`);
                            setIsGenerateModalOpen(false);
                            navigate({
                              to: "/processes/arquivos-gerados",
                              search: { orderId: id, customerId: customer?.id, vesselId: vessel?.id },
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
                        >
                          Gerar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-100 flex-row items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
