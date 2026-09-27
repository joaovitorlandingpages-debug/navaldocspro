import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle, 
  X, 
  Check, 
  Calendar, 
  ImageIcon, 
  ChevronDown
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/anexar-documento-emitido")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <AnexarDocumentoEmitidoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function AnexarDocumentoEmitidoPage() {
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

  // Estados do Formulário
  const [documentName, setDocumentName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuingAgency, setIssuingAgency] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validityType, setValidityType] = useState<"nao_informada" | "com_vencimento" | "sem_vencimento">("nao_informada");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");

  // Arquivo Selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Validação, Submissão e Cancelamento
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  useEffect(() => {
    loadProcessDetails();
  }, [loadProcessDetails]);

  // Normalização de Contexto
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

  // Identificar se há alterações não salvas
  const hasUnsavedChanges = useMemo(() => {
    return (
      documentName.trim() !== "" ||
      documentNumber.trim() !== "" ||
      issuingAgency.trim() !== "" ||
      issueDate !== "" ||
      validityType !== "nao_informada" ||
      expirationDate !== "" ||
      notes.trim() !== "" ||
      selectedFile !== null
    );
  }, [documentName, documentNumber, issuingAgency, issueDate, validityType, expirationDate, notes, selectedFile]);

  // Manipulação de Arquivo (Upload / Drag & Drop)
  const handleFileChange = (file: File | undefined | null) => {
    if (!file) return;

    // Validar tipo do arquivo
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExts = [".pdf", ".png", ".jpg", ".jpeg"];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setErrors((prev) => ({
        ...prev,
        file: "Formato inválido. Selecione um arquivo PDF, JPG ou PNG.",
      }));
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        file: "Arquivo muito grande. O limite máximo é de 10MB.",
      }));
      return;
    }

    setSelectedFile(file);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
  };

  // Formatação de tamanho legível
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validação Geral do Formulário
  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!selectedFile) {
      errs.file = "Anexe o arquivo do documento emitido.";
    }

    if (!documentName.trim()) {
      errs.documentName = "Nome do documento é obrigatório.";
    }

    if (validityType === "com_vencimento") {
      if (!expirationDate) {
        errs.expirationDate = "Data de vencimento é obrigatória quando 'Com vencimento' está selecionado.";
      } else if (issueDate && expirationDate < issueDate) {
        errs.expirationDate = "A data de vencimento não pode ser anterior à data de emissão.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Cancelamento Seguro
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      navigate({
        to: "/processes/$id/documentos-emitidos",
        params: { id },
      });
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedFile || !companyId || !id) return;

    setIsSubmitting(true);
    try {
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/issued_${Date.now()}_${cleanFileName}`;

      // 1. Upload do arquivo no Supabase Storage
      await uploadToBucket("process-attachments", storagePath, selectedFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      // 2. Salvar registro na tabela uploaded_files
      const metadataPayload = {
        document_name: documentName.trim(),
        document_number: documentNumber.trim() || null,
        issuing_agency: issuingAgency.trim() || null,
        issue_date: issueDate || null,
        validity_type: validityType,
        expiration_date: validityType === "com_vencimento" ? expirationDate : null,
        notes: notes.trim() || null,
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

      toast.success("Documento emitido cadastrado com sucesso!");
      navigate({
        to: "/processes/$id/documentos-emitidos",
        params: { id },
      });
    } catch (err: any) {
      console.error("Erro ao salvar documento emitido:", err);
      toast.error(err?.message || "Erro ao salvar documento emitido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estados de Carregamento e Erro Inicial
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-44 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-28 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-96 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
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
    <div className="max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR */}
      <div>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar aos documentos emitidos</span>
        </button>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Anexar documento emitido
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Cadastre o documento recebido e informe sua validade, quando houver.
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

      {/* 4. FORMULÁRIO PRINCIPAL */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 shadow-xs space-y-8">
        {/* SEÇÃO A: ARQUIVO DO DOCUMENTO */}
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
            Arquivo do documento <span className="text-red-500">*</span>
          </h2>

          {/* Área de Upload Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              handleFileChange(file);
            }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
              isDragging 
                ? "border-[#075BFF] bg-blue-50/50 scale-[0.99]" 
                : errors.file
                ? "border-red-300 bg-red-50/20"
                : "border-blue-200/90 bg-[#EEF4FF]/30 hover:bg-[#EEF4FF]/50"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#075BFF] flex items-center justify-center shadow-2xs border border-blue-100">
                <Upload className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-[#0B1739]">
                  Arraste o arquivo aqui ou <span className="text-[#075BFF]">selecione no computador</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  PDF, JPG ou PNG (máx. 10MB)
                </p>
              </div>

              <div>
                <label className="inline-flex items-center justify-center px-5 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#075BFF] text-xs font-bold shadow-2xs transition-all cursor-pointer">
                  <span>Selecionar arquivo</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {errors.file && (
            <p className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors.file}</span>
            </p>
          )}

          {/* Arquivo Selecionado */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                  {selectedFile.type.includes("pdf") ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Remover arquivo selecionado"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO B: DADOS DO DOCUMENTO */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
            Dados do documento
          </h2>

          <div className="space-y-4">
            {/* Nome do Documento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ex.: Documento de inscrição"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                  errors.documentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.documentName && (
                <p className="text-[11px] text-red-500 mt-1">{errors.documentName}</p>
              )}
            </div>

            {/* Número do Documento & Órgão Emissor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número do documento
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Informe, se disponível"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Órgão emissor
                </label>
                <input
                  type="text"
                  value={issuingAgency}
                  onChange={(e) => setIssuingAgency(e.target.value)}
                  placeholder="Informe o órgão"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>
            </div>

            {/* Data de Emissão & Validade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de emissão
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Validade
                </label>
                <select
                  value={validityType}
                  onChange={(e) => {
                    const val = e.target.value as "nao_informada" | "com_vencimento" | "sem_vencimento";
                    setValidityType(val);
                    if (val !== "com_vencimento") {
                      setExpirationDate("");
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                >
                  <option value="nao_informada">Não informada</option>
                  <option value="com_vencimento">Com vencimento</option>
                  <option value="sem_vencimento">Sem vencimento</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {validityType === "com_vencimento" 
                    ? "Informe a data de vencimento abaixo." 
                    : 'Selecione "Com vencimento" para informar a data.'}
                </p>
              </div>
            </div>

            {/* Campo Condicional: Data de Vencimento */}
            {validityType === "com_vencimento" && (
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                    errors.expirationDate ? "border-red-400 bg-red-50/20" : "border-slate-200 bg-white"
                  }`}
                />
                {errors.expirationDate && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.expirationDate}</p>
                )}
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais, se necessário"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* RODAPÉ DO FORMULÁRIO */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5 text-xs text-slate-400">
            <p>Cadastrado por {profile?.name || "João Vitor"}</p>
            <p>* Campos obrigatórios</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando documento...</span>
                </>
              ) : (
                <span>Salvar documento</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmação de Cancelamento com Alterações Não Salvas */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Descartar alterações?"
        description="Você preencheu dados ou selecionou um arquivo para o documento emitido. Deseja realmente sair sem salvar?"
        confirmLabel="Descartar alterações"
        cancelLabel="Continuar preenchendo"
        variant="danger"
        onConfirm={() => {
          setShowCancelConfirm(false);
          navigate({
            to: "/processes/$id/documentos-emitidos",
            params: { id },
          });
        }}
      />
    </div>
  );
}
