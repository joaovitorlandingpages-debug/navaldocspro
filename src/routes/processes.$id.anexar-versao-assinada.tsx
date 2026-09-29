import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Ship, 
  Folder, 
  Cog, 
  Building2, 
  FileCheck2, 
  Loader2, 
  PenTool, 
  Check, 
  X, 
  Info,
  ShieldCheck,
  FileCheck,
  Eye,
  Trash2
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { downloadStoredFile, openStoredFile } from "@/utils/file-preview";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/anexar-versao-assinada")({
  validateSearch: (search: Record<string, unknown>): {
    docId?: string;
    from?: string;
  } => ({
    ...(search.docId ? { docId: search.docId as string } : {}),
    ...(search.from ? { from: search.from as string } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <AnexarVersaoAssinadaPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function AnexarVersaoAssinadaPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;
  const currentCompany = profile?.companies;

  // Estados principais
  const [document, setDocument] = useState<any | null>(null);
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Upload do Arquivo Assinado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [uploadedSignedUrl, setUploadedSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregamento dos dados do Documento e Processo
  useEffect(() => {
    async function loadData() {
      if (!companyId || !id) return;
      setIsLoading(true);

      try {
        // 1. Processo e Relacionamentos
        const { data: proc } = await supabase
          .from("processes")
          .select(`
            *,
            customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone),
            vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
          `)
          .eq("id", id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (proc) {
          setProcessData(proc);
          setCustomer(proc.customer || null);
          setVessel(proc.vessel || null);
        }

        // 2. Documento Gerado
        let query = supabase
          .from("generated_documents")
          .select("*")
          .eq("company_id", companyId)
          .eq("process_id", id);

        if (searchParams.docId) {
          query = query.eq("id", searchParams.docId);
        } else {
          query = query.order("created_at", { ascending: false }).limit(1);
        }

        const { data: docData } = await query.maybeSingle();
        if (docData) {
          setDocument(docData);
        } else {
          setDocument({
            id: searchParams.docId || "doc-fallback",
            title: "Requerimento Padrão do Interessado",
            document_type: "REQ-001",
            version: 1,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [companyId, id, searchParams.docId]);

  // Manipulação de Arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Por favor, selecione um arquivo PDF.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error("O arquivo excede o limite máximo permitido de 15MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Por favor, selecione um arquivo PDF.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error("O arquivo excede o limite de 15MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Download do PDF Original
  const handleDownloadOriginal = () => {
    if (document) {
      downloadStoredFile(document, document.title || document.name || "documento_original.pdf");
      toast.success("Download do PDF original iniciado!");
    }
  };

  // Envio e Persistência da Versão Assinada
  const handleSubmitSignedVersion = async () => {
    if (!selectedFile || !isConfirmed || !companyId || !id || !document?.id) return;

    setIsUploading(true);
    try {
      const now = new Date().toISOString();
      const userName = profile?.full_name || user?.email?.split("@")[0] || "Operador";

      // 1. Upload do Arquivo no Bucket
      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${companyId}/${id}/signed/${Date.now()}_${safeFileName}`;
      const uploadRes = await uploadToBucket(
        "signed-documents",
        storagePath,
        selectedFile,
        { upsert: true }
      );

      const fileUrl = uploadRes.path;
      setUploadedSignedUrl(fileUrl);

      // 2. Atualizar o Documento na Tabela generated_documents
      const updatedMetadata = {
        ...(document.metadata || {}),
        signed_file_name: selectedFile.name,
        signed_file_size: selectedFile.size,
        signed_uploaded_at: now,
        signed_uploaded_by: userName,
        signature_source: "GOV.BR (Externo)",
      };

      const { error: updateError } = await supabase
        .from("generated_documents")
        .update({
          signed_file_url: fileUrl,
          signature_status: "Anexada",
          is_signed: true,
          metadata: updatedMetadata,
          updated_at: now,
        } as any)
        .eq("id", document.id)
        .eq("company_id", companyId);

      if (updateError) {
        throw new Error(updateError.message || "Erro ao atualizar registro do documento.");
      }

      // 3. Registrar Evento no Histórico do Processo
      const existingHistory = processData?.metadata?.history || [];
      const historyEntry = {
        event: "signed_version_attached",
        description: `Versão assinada anexada para "${document.title || document.name || "Documento"}"`,
        user: userName,
        date: now,
        file_name: selectedFile.name,
      };

      await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData?.metadata || {}),
            history: [historyEntry, ...existingHistory],
          },
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      toast.success("Versão assinada anexada com sucesso!");
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Erro ao anexar versão assinada:", err);
      toast.error(err?.message || "Falha ao enviar arquivo assinado. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  // Formatação de Tamanho de Arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processCode = useMemo(() => {
    if (!processData) return "Processo";
    return processData.protocol_number || `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`;
  }, [processData]);

  const documentTitle = useMemo(() => {
    return document?.title || document?.name || "Requerimento Padrão do Interessado";
  }, [document]);

  const versionNumber = useMemo(() => {
    return document?.version ? `v${document.version}.0` : "v1.0";
  }, [document]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando dados do documento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => navigate({ 
              to: "/processes/$id/revisar-documento", 
              params: { id },
              search: { docId: document?.id }
            })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao documento</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Anexar versão assinada
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Envie o arquivo depois de realizar a assinatura no portal GOV.BR.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* RESUMO DO CONTEXTO (5 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="pt-2 sm:pt-0 sm:pr-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {customer?.fantasy_name || customer?.name || "Cliente não informado"}
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              {customer?.cpf_cnpj || customer?.document || "Sem documento"}
            </span>
          </div>

          {/* Embarcação */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {vessel?.name || "Embarcação não informada"}
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              {vessel?.registration_number || "Sem inscrição"}
            </span>
          </div>

          {/* Serviço */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Serviço</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {processData?.title || "Renovação do TIE"}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono">
              {processCode}
            </span>
          </div>

          {/* Documento Original */}
          <div className="pt-3 sm:pt-0 sm:px-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Documento Original</span>
            <span className="text-sm font-bold text-[#0B1739] truncate block">
              {documentTitle}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Código: {document?.document_type || "REQ-001"}
            </span>
          </div>

          {/* Versão Original */}
          <div className="pt-3 sm:pt-0 sm:pl-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Versão Original</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#075BFF] border border-blue-200 mt-0.5">
              <FileCheck2 className="h-3 w-3" />
              <span>{versionNumber}</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Original preservado
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL: 2 COLUNAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): PASSOS + ÁREA DE UPLOAD */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SEÇÃO 2: ORIENTAÇÃO DO FLUXO (3 PASSOS) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Como assinar via GOV.BR
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Passo 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="w-5 h-5 rounded-full bg-[#075BFF] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    <p className="text-xs font-bold text-[#0B1739]">Baixe o PDF</p>
                    <p className="text-[11px] text-slate-500 leading-snug">Obtenha o arquivo original gerado pelo sistema.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadOriginal}
                    className="w-full py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="h-3 w-3" />
                    <span>Baixar PDF</span>
                  </button>
                </div>

                {/* Passo 2 */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    <p className="text-xs font-bold text-[#0B1739]">Assine no GOV.BR</p>
                    <p className="text-[11px] text-slate-500 leading-snug">Acesse o assinador digital oficial do governo.</p>
                  </div>
                  <a
                    href="https://assinador.iti.br"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Abrir GOV.BR</span>
                  </a>
                </div>

                {/* Passo 3 */}
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <p className="text-xs font-bold text-[#0B1739]">Envie o arquivo</p>
                    <p className="text-[11px] text-slate-500 leading-snug">Anexe o PDF assinado retornado pelo GOV.BR.</p>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Etapa atual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: UPLOAD DO ARQUIVO ASSINADO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Arquivo assinado
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formato PDF • Limite máximo de 15MB
                  </p>
                </div>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#075BFF] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      Arraste e solte o PDF assinado aqui
                    </p>
                    <p className="text-[11px] text-slate-400">
                      ou clique para selecionar do seu computador
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    O arquivo deve corresponder ao documento original selecionado.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1739] truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatFileSize(selectedFile.size)} • Pronto para envio
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    <span>Selecionado</span>
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): CONFIRMAÇÃO + PERSISTÊNCIA */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 4: CONFIRMAÇÃO E AUDITORIA */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Confirmação de envio
              </h2>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Documento:</span>
                  <span className="font-bold text-[#0B1739] truncate max-w-[170px] text-right">
                    {documentTitle}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Usuário emissor:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[170px] text-right">
                    {profile?.full_name || user?.email || "João Vitor"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Status gerado:</span>
                  <span className="font-semibold text-emerald-600">Anexada</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Original:</span>
                  <span className="text-slate-600">Permanecerá intacto</span>
                </div>
              </div>

              {/* Checkbox Obrigatório */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#075BFF] focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-relaxed select-none">
                  Confirmo que este arquivo corresponde ao documento gerado selecionado e foi assinado fora do NavalDocs.
                </span>
              </label>

              {/* Alerta de Transparência */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Arquivo recebido. A plataforma armazena e preserva a versão assinada exatamente como recebida, sem validação criptográfica automática.
                </span>
              </div>

              {/* Botão Anexar Versão Assinada */}
              <button
                type="button"
                disabled={!selectedFile || !isConfirmed || isUploading}
                onClick={handleSubmitSignedVersion}
                className="w-full py-3 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Armazenando versão assinada...</span>
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4" />
                    <span>Anexar versão assinada</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: SUCESSO E CONFERÊNCIA PÓS-ENVIO */}
      {/* ========================================================================= */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Versão assinada recebida
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  O documento assinado foi vinculado ao processo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              O arquivo <strong>{selectedFile?.name}</strong> foi armazenado com sucesso no repositório seguro da empresa.
            </p>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
              <p className="font-semibold">Situação do Documento: Anexada</p>
              <p className="text-emerald-700/80">Arquivo recebido. A plataforma não valida automaticamente a assinatura digital.</p>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate({
                  to: "/processes/$id/revisar-documento",
                  params: { id },
                  search: { docId: document?.id },
                });
              }}
              className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Visualizar documento
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate({
                  to: "/processes/$id/documentos-gerados",
                  params: { id },
                });
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
            >
              Ir para documentos gerados
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
