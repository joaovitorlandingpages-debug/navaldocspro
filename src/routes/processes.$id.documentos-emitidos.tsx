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
  ImageIcon,
  Award,
  Upload,
  Check
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

export const Route = createFileRoute("/processes/$id/documentos-emitidos")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <DocumentosEmitidosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function DocumentosEmitidosPage() {
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

  // Lista de Documentos Emitidos
  const [issuedList, setIssuedList] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Conjunto de IDs expandidos
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal de Anexar Documento Emitido
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    documentName: "",
    documentNumber: "",
    issuingAgency: "",
    issueDate: "",
    validityType: "nao_informada" as "nao_informada" | "com_vencimento" | "sem_vencimento",
    expirationDate: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
          customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone),
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

  // 2. Carregar Registros de Documentos Emitidos
  const loadIssuedDocuments = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingDocs(true);

    try {
      const { data: filesData, error: fError } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .eq("category", "issued")
        .order("created_at", { ascending: false });

      if (fError) throw fError;

      const docs = filesData || [];
      // Ordenação inicial alfabética por nome do documento
      docs.sort((a, b) => {
        const nameA = (a.metadata?.document_name || a.file_name || "").toLowerCase();
        const nameB = (b.metadata?.document_name || b.file_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setIssuedList(docs);

      // Se houver apenas 1 documento, expande-o automaticamente
      if (docs.length === 1) {
        setExpandedIds(new Set([docs[0].id]));
      }
    } catch (err) {
      console.error("Erro ao carregar documentos emitidos:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadProcessDetails();
    loadIssuedDocuments();
  }, [loadProcessDetails, loadIssuedDocuments]);

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

  // Filtragem de Documentos por nome, número ou órgão emissor
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return issuedList;
    const term = searchTerm.toLowerCase().trim();
    return issuedList.filter((doc) => {
      const name = (doc.metadata?.document_name || doc.file_name || "").toLowerCase();
      const num = (doc.metadata?.document_number || "").toLowerCase();
      const agency = (doc.metadata?.issuing_agency || "").toLowerCase();
      return name.includes(term) || num.includes(term) || agency.includes(term);
    });
  }, [issuedList, searchTerm]);

  // Contagem formatada de documentos
  const countLabel = useMemo(() => {
    const total = filteredDocuments.length;
    if (total === 1) return "1 documento";
    return `${total} documentos`;
  }, [filteredDocuments]);

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

  // Manipulação de Arquivo Selecionado
  const handleFileChange = (file: File | undefined | null) => {
    if (!file) return;

    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExts = [".pdf", ".png", ".jpg", ".jpeg"];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setFormErrors((prev) => ({
        ...prev,
        file: "Formato inválido. Selecione um arquivo PDF, JPG ou PNG.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        file: "Arquivo muito grande. O limite máximo é de 10MB.",
      }));
      return;
    }

    setSelectedFile(file);
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
  };

  // Validação do Formulário de Anexar Documento Emitido
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.documentName.trim()) {
      errors.documentName = "Nome do documento é obrigatório.";
    }
    if (formData.validityType === "com_vencimento" && !formData.expirationDate) {
      errors.expirationDate = "Data de vencimento é obrigatória quando 'Com vencimento' está selecionado.";
    }
    if (!selectedFile) {
      errors.file = "É obrigatório anexar o arquivo do documento emitido.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submissão do Formulário
  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedFile || !companyId || !id) return;

    setIsSubmitting(true);
    try {
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/issued_${Date.now()}_${cleanFileName}`;

      // 1. Upload no Supabase Storage
      await uploadToBucket("process-attachments", storagePath, selectedFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      // 2. Salvar registro em uploaded_files
      const metadataPayload = {
        document_name: formData.documentName.trim(),
        document_number: formData.documentNumber.trim() || null,
        issuing_agency: formData.issuingAgency.trim() || null,
        issue_date: formData.issueDate || null,
        validity_type: formData.validityType,
        expiration_date: formData.validityType === "com_vencimento" ? formData.expirationDate : null,
        notes: formData.notes.trim() || null,
        registered_by_name: profile?.name || "Usuário",
        registered_by_id: profile?.id,
        registered_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("uploaded_files")
        .insert({
          company_id: companyId,
          process_id: id,
          customer_id: customer?.id || null,
          vessel_id: vessel?.id || null,
          file_name: selectedFile.name,
          file_url: storagePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          category: "issued",
          status: "uploaded",
          metadata: metadataPayload,
          uploaded_by: profile?.id || null,
        });

      if (insertError) throw insertError;

      toast.success("Documento emitido anexado com sucesso!");
      setIsAttachModalOpen(false);
      setFormData({
        documentName: "",
        documentNumber: "",
        issuingAgency: "",
        issueDate: "",
        validityType: "nao_informada",
        expirationDate: "",
        notes: "",
      });
      setSelectedFile(null);
      setFormErrors({});
      loadIssuedDocuments();
    } catch (err: any) {
      console.error("Erro ao salvar documento emitido:", err);
      toast.error(err?.message || "Não foi possível salvar o documento emitido.");
    } finally {
      setIsSubmitting(false);
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
            to="/processes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </Link>
        </div>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA + BOTÃO DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Documentos emitidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize os documentos finais recebidos do órgão responsável.
          </p>
        </div>

        <div>
          <Link
            to="/processes/$id/anexar-documento-emitido"
            params={{ id }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Anexar documento</span>
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
            placeholder="Pesquisar documento..."
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

      {/* 5. LISTAGEM PRINCIPAL DE DOCUMENTOS EMITIDOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Cabeçalho da Tabela (Visível em Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">Documento</div>
          <div className="col-span-2">Emissão</div>
          <div className="col-span-3">Validade</div>
          <div className="col-span-2">Arquivos</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Conteúdo da Tabela */}
        {isLoadingDocs ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#075BFF]" />
            <span>Carregando documentos emitidos...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
              <Award className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              {issuedList.length === 0 
                ? "Nenhum documento emitido cadastrado neste serviço" 
                : "Nenhum documento encontrado com os termos pesquisados"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Quando o órgão responsável emitir o documento final (ex: TIE, TIEM, certidão), anexe-o aqui.
            </p>
            <div className="pt-2">
              <Link
                to="/processes/$id/anexar-documento-emitido"
                params={{ id }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Anexar documento</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((doc) => {
              const meta = doc.metadata || {};
              const docName = meta.document_name || doc.file_name || "Documento emitido";
              const agency = meta.issuing_agency || "Órgão emissor não informado";
              const issueDate = formatDateSafe(meta.issue_date);
              
              let validityDisplay = "Não informada";
              if (meta.validity_type === "sem_vencimento") {
                validityDisplay = "Sem vencimento";
              } else if (meta.validity_type === "com_vencimento" && meta.expiration_date) {
                validityDisplay = formatDateSafe(meta.expiration_date);
              }

              const isExpanded = expandedIds.has(doc.id);
              const registeredBy = meta.registered_by_name || profile?.name || "Usuário";
              const registeredDate = formatDateSafe(meta.registered_at || doc.created_at);

              return (
                <div key={doc.id} className="transition-colors hover:bg-slate-50/40">
                  {/* Linha Principal */}
                  <div className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                    {/* Coluna 1: Documento (Nome e Órgão Emissor) */}
                    <div className="md:col-span-4 min-w-0">
                      <p className="text-sm font-bold text-[#0B1739] truncate">
                        {docName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {agency}
                      </p>
                    </div>

                    {/* Coluna 2: Emissão */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Emissão:</span>
                      <span>{issueDate}</span>
                    </div>

                    {/* Coluna 3: Validade */}
                    <div className="md:col-span-3 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Validade:</span>
                      <span>{validityDisplay}</span>
                    </div>

                    {/* Coluna 4: Arquivos */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Arquivos:</span>
                      <span className="font-medium">1 arquivo</span>
                    </div>

                    {/* Coluna 5: Ação Ver Detalhes */}
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpand(doc.id)}
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
                        Arquivo anexado
                      </p>

                      {/* Card do Arquivo Anexado */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                            {doc.file_type?.includes("image") ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "Arquivo digital"}
                            </p>
                          </div>
                        </div>

                        {/* Ações Visualizar e Baixar */}
                        <div className="flex items-center gap-4 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => openStoredFile(doc)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Visualizar</span>
                          </button>
                          <div className="h-4 w-px bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(doc, doc.file_name)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>

                      {/* Rodapé de Informações de Anexo */}
                      <p className="text-[11px] text-slate-400">
                        Anexado por {registeredBy} em {registeredDate}.
                      </p>

                      {/* Observações */}
                      {meta.notes && (
                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1">
                          <p className="font-bold text-slate-700">Observações</p>
                          <p className="text-slate-600 leading-relaxed">{meta.notes}</p>
                        </div>
                      )}
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
        <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
        <span>Os arquivos anexados ficam vinculados a este serviço e à embarcação.</span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ANEXAR DOCUMENTO EMITIDO */}
      {/* ========================================================================= */}
      <Dialog open={isAttachModalOpen} onOpenChange={setIsAttachModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Anexar documento emitido
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Informe os dados e envie o documento final emitido pelo órgão.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitDocument} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Contexto Fixo */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-[#0B1739]">Vínculo do serviço</p>
                <p>Cliente: <strong>{customerName}</strong> • Embarcação: <strong>{vesselName}</strong></p>
                <p>Serviço: <strong>{serviceTitle}</strong> ({protocolCode})</p>
              </div>

              {/* Nome do Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.documentName}
                  onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                  placeholder="Ex: Documento de inscrição (TIE)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                    formErrors.documentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {formErrors.documentName && (
                  <p className="text-[11px] text-red-500 mt-1">{formErrors.documentName}</p>
                )}
              </div>

              {/* Número & Órgão Emissor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="Ex: 381-001234/2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Órgão emissor (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.issuingAgency}
                    onChange={(e) => setFormData({ ...formData, issuingAgency: e.target.value })}
                    placeholder="Ex: Capitania dos Portos de SP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Data de Emissão & Validade */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de emissão (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Validade do documento
                    </label>
                    <select
                      value={formData.validityType}
                      onChange={(e) => setFormData({ ...formData, validityType: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                    >
                      <option value="nao_informada">Não informada</option>
                      <option value="com_vencimento">Com vencimento</option>
                      <option value="sem_vencimento">Sem vencimento</option>
                    </select>
                  </div>
                </div>

                {formData.validityType === "com_vencimento" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de vencimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                        formErrors.expirationDate ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {formErrors.expirationDate && (
                      <p className="text-[11px] text-red-500 mt-1">{formErrors.expirationDate}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Documento recebido após a conclusão da análise."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
                />
              </div>

              {/* Seleção do Arquivo */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Arquivo do documento emitido (PDF, PNG ou JPG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className={`w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#075BFF] hover:file:bg-blue-100 file:cursor-pointer border rounded-xl p-1.5 ${
                    formErrors.file ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {formErrors.file && (
                  <p className="text-[11px] text-red-500 mt-0.5">{formErrors.file}</p>
                )}

                {selectedFile && (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                    <span className="font-semibold text-[#0B1739] truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar documento</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
