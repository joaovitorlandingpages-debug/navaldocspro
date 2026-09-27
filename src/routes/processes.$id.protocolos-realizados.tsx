import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ArrowRight, 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Info, 
  Eye, 
  Download, 
  X, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  User, 
  Paperclip,
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

export const Route = createFileRoute("/processes/$id/protocolos-realizados")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ProtocolosRealizadosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function ProtocolosRealizadosPage() {
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

  // Modais
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  // Busca na lista de protocolos
  const [protocolSearch, setProtocolSearch] = useState("");

  // Formulário de Anexar Protocolo
  const [formData, setFormData] = useState({
    title: "",
    protocolNumber: "",
    agency: "",
    protocolDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Contagem real de protocolos cadastrados
  const totalProtocolsCount = useMemo(() => {
    // Se há arquivos na categoria protocol, conte-os; caso contrário, se há protocol_number no processo, conte 1
    if (protocolList.length > 0) return protocolList.length;
    if (processData?.protocol_number) return 1;
    return 0;
  }, [protocolList, processData]);

  const protocolsCountLabel = useMemo(() => {
    if (totalProtocolsCount === 0) return "Nenhum protocolo cadastrado";
    if (totalProtocolsCount === 1) return "1 protocolo cadastrado";
    return `${totalProtocolsCount} protocolos cadastrados`;
  }, [totalProtocolsCount]);

  // Filtro de protocolos na listagem do modal
  const filteredProtocols = useMemo(() => {
    if (!protocolSearch.trim()) return protocolList;
    const term = protocolSearch.toLowerCase().trim();
    return protocolList.filter((p) => {
      const title = (p.metadata?.title || p.file_name || "").toLowerCase();
      const num = (p.metadata?.protocol_number || "").toLowerCase();
      const agency = (p.metadata?.agency || "").toLowerCase();
      return title.includes(term) || num.includes(term) || agency.includes(term);
    });
  }, [protocolList, protocolSearch]);

  // Validação do Formulário de Anexar Protocolo
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = "Título ou identificação é obrigatório.";
    }
    if (!selectedFile) {
      errors.file = "É obrigatório anexar o comprovante do protocolo.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submissão do Formulário
  const handleSubmitProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedFile || !companyId || !id) return;

    setIsSubmitting(true);
    try {
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/protocol_${Date.now()}_${cleanFileName}`;

      // 1. Upload do comprovante no Supabase Storage
      await uploadToBucket("process-attachments", storagePath, selectedFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      // 2. Salvar registro em uploaded_files
      const metadataPayload = {
        title: formData.title.trim(),
        protocol_number: formData.protocolNumber.trim() || null,
        agency: formData.agency.trim() || null,
        protocol_date: formData.protocolDate || null,
        notes: formData.notes.trim() || null,
        registered_by_name: profile?.name || "Usuário",
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
          category: "protocol",
          status: "uploaded",
          metadata: metadataPayload,
          uploaded_by: profile?.id || null,
        });

      if (insertError) throw insertError;

      // 3. Atualizar protocol_number do processo se foi informado
      if (formData.protocolNumber.trim()) {
        await supabase
          .from("processes")
          .update({
            protocol_number: formData.protocolNumber.trim(),
            protocol_at: formData.protocolDate ? new Date(formData.protocolDate).toISOString() : new Date().toISOString(),
          })
          .eq("id", id)
          .eq("company_id", companyId);
      }

      toast.success("Protocolo e comprovante anexados com sucesso!");
      setIsAttachModalOpen(false);
      setFormData({
        title: "",
        protocolNumber: "",
        agency: "",
        protocolDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedFile(null);
      setFormErrors({});
      loadProtocols();
      loadProcessDetails();
    } catch (err: any) {
      console.error("Erro ao salvar protocolo:", err);
      toast.error(err?.message || "Não foi possível salvar o protocolo.");
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
        <div className="h-64 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-60 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
          <div className="h-60 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
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

      {/* 2. CABEÇALHO DA PÁGINA */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Protocolos realizados
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Consulte os protocolos deste serviço ou anexe um comprovante.
        </p>
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

      {/* 4. DOIS GRANDES CARTÕES PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* CARTÃO 1 — Protocolos gerados */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B1739]">
                Protocolos gerados
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Consulte os registros e comprovantes vinculados a este serviço.
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              {protocolsCountLabel}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsListModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-[#075BFF] bg-white hover:bg-blue-50/40 text-[#075BFF] text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              <span>Ver protocolos</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* CARTÃO 2 — Anexar protocolos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B1739]">
                Anexar protocolos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Envie o comprovante e informe os dados do protocolo.
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsAttachModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Anexar protocolo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. MENSAGEM INFORMATIVA INFERIOR */}
      <div className="bg-[#EEF4FF]/70 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600">
        <Info className="h-5 w-5 text-[#075BFF] shrink-0" />
        <span>Anexar um comprovante não envia documentos ao órgão responsável.</span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LISTAGEM DOS PROTOCOLOS GERADOS / CADASTRADOS */}
      {/* ========================================================================= */}
      <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-[#0B1739]">
                    Protocolos cadastrados
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Registros e comprovantes de protocolo para {serviceTitle}.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={protocolSearch}
                onChange={(e) => setProtocolSearch(e.target.value)}
                placeholder="Pesquisar por número, título ou órgão..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
              />
              {protocolSearch && (
                <button
                  type="button"
                  onClick={() => setProtocolSearch("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Lista de Registros */}
            {isLoadingProtocols ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
                <span>Carregando protocolos...</span>
              </div>
            ) : filteredProtocols.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">
                  {protocolList.length === 0 
                    ? "Nenhum protocolo cadastrado neste serviço" 
                    : "Nenhum protocolo encontrado com os termos pesquisados"}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Envie o comprovante de protocolo para organizar o acompanhamento.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsListModalOpen(false);
                      setIsAttachModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Anexar protocolo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProtocols.map((proto) => {
                  const meta = proto.metadata || {};
                  const title = meta.title || proto.file_name || "Comprovante de Protocolo";
                  const protoNum = meta.protocol_number || processData?.protocol_number || "Não informado";
                  const agency = meta.agency || "Capitania dos Portos";
                  const date = meta.protocol_date ? new Date(meta.protocol_date).toLocaleDateString("pt-BR") : (proto.created_at ? new Date(proto.created_at).toLocaleDateString("pt-BR") : "Não informada");
                  const responsible = meta.registered_by_name || profile?.name || "Responsável";

                  return (
                    <div 
                      key={proto.id} 
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#075BFF]/40 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">{title}</p>
                            <p className="text-[11px] text-slate-400">Cadastrado por {responsible}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openStoredFile(proto)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#075BFF] hover:bg-blue-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(proto, proto.file_name)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Número do Protocolo:</span>
                          <span className="font-semibold text-[#0B1739]">{protoNum}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Órgão Responsável:</span>
                          <span className="font-medium">{agency}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Data do Protocolo:</span>
                          <span className="font-medium">{date}</span>
                        </div>
                      </div>

                      {meta.notes && (
                        <div className="pt-2 border-t border-slate-50 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">Observações: </span>
                          {meta.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: FORMULÁRIO DE ANEXAR PROTOCOLO */}
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
                  Anexar protocolo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Informe os dados e envie o comprovante de protocolo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitProtocol} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Contexto Fixo de Destino */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-[#0B1739]">Vínculo do serviço</p>
                <p>Cliente: <strong>{customerName}</strong> • Embarcação: <strong>{vesselName}</strong></p>
                <p>Serviço: <strong>{serviceTitle}</strong> ({protocolCode})</p>
              </div>

              {/* Título ou Identificação */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título ou identificação do protocolo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Protocolo Inicial Capitania dos Portos"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                    formErrors.title ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {formErrors.title && <p className="text-[11px] text-red-500 mt-1">{formErrors.title}</p>}
              </div>

              {/* Número do Protocolo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número do protocolo (opcional)
                </label>
                <input
                  type="text"
                  value={formData.protocolNumber}
                  onChange={(e) => setFormData({ ...formData, protocolNumber: e.target.value })}
                  placeholder="Ex: 38100.001234/2026-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              {/* Órgão Responsável e Data do Protocolo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Órgão responsável (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    placeholder="Ex: Capitania dos Portos de SP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do protocolo (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.protocolDate}
                    onChange={(e) => setFormData({ ...formData, protocolDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
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
                  placeholder="Detalhes ou anotações sobre este protocolo..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
                />
              </div>

              {/* Seleção do Arquivo de Comprovante */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Comprovante do protocolo (PDF, PNG ou JPG) *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                  className={`w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#075BFF] hover:file:bg-blue-100 file:cursor-pointer border rounded-xl p-1.5 ${
                    formErrors.file ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {formErrors.file && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.file}</p>}

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
                    <span>Salvar protocolo</span>
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
