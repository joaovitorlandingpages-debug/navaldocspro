import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Camera, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Ship, 
  User, 
  X,
  FileCheck,
  ShieldCheck,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { validateUpload, MAX_ATTACHMENT_BYTES } from "@/lib/storage";
import { processDocumentForReview } from "@/services/ocr/smartDocumentService";
import { saveReviewSession } from "@/services/ocr/reviewSessionStorage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/documentos/anexar")({
  validateSearch: (search: Record<string, unknown>): {
    tipo?: "cliente" | "embarcacao";
    target?: "customer" | "vessel";
    modo?: "novo" | "editar";
    id?: string;
    returnTo?: string;
  } => ({
    tipo: (search.tipo as "cliente" | "embarcacao") || (search.target === "vessel" ? "embarcacao" : "cliente"),
    target: (search.target as "customer" | "vessel") || (search.tipo === "embarcacao" ? "vessel" : "customer"),
    modo: (search.modo as "novo" | "editar") || "novo",
    id: (search.id as string) || undefined,
    returnTo: (search.returnTo as string) || undefined,
  }),
  component: DocumentosAnexarPage,
});

function DocumentosAnexarPage() {
  const search = useSearch({ from: "/documentos/anexar" });
  const navigate = useNavigate();
  const { companyId, profile } = useAuth();

  const isVessel = search.tipo === "embarcacao" || search.target === "vessel";
  const targetEntity: "customer" | "vessel" = isVessel ? "vessel" : "customer";
  const isEditing = search.modo === "editar";
  const entityId = search.id;

  const defaultReturnUrl = useMemo(() => {
    if (search.returnTo) return search.returnTo;
    if (isVessel) {
      return isEditing && entityId ? `/vessels/${entityId}` : "/vessels/novo";
    }
    return isEditing && entityId ? `/customers/${entityId}` : "/customers/novo";
  }, [search.returnTo, isVessel, isEditing, entityId]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [activePreviewFile, setActivePreviewFile] = useState<{ file: File; url: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Gera pré-visualizações de imagens locais
  useEffect(() => {
    const urls: Record<number, string> = {};
    selectedFiles.forEach((file, index) => {
      if (file.type.startsWith("image/")) {
        urls[index] = URL.createObjectURL(file);
      }
    });
    setFilePreviews(urls);

    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [selectedFiles]);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const validList: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateUpload(file, {
        maxSize: MAX_ATTACHMENT_BYTES,
        allowedExtensions: ["pdf", "png", "jpg", "jpeg"],
      });

      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error || "Arquivo não suportado."}`);
      } else {
        validList.push(file);
      }
    }

    if (validList.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validList]);
      toast.success(`${validList.length} documento(s) adicionado(s).`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Voltar ao cadastro sem perder rascunho
  const handleBack = () => {
    if (isProcessing) {
      if (!confirm("A leitura está em andamento. Deseja realmente cancelar e voltar ao cadastro?")) {
        return;
      }
    }
    navigate({ to: defaultReturnUrl as any });
  };

  // Preencher manualmente sem leitura (mantém o arquivo anexado)
  const handleFillManually = async () => {
    if (selectedFiles.length === 0) {
      navigate({ to: defaultReturnUrl as any });
      return;
    }

    const primaryFile = selectedFiles[0];
    let uploadedPath = "";
    let uploadedId = crypto.randomUUID();

    try {
      if (companyId) {
        const fileExt = primaryFile.name.split(".").pop()?.toLowerCase() || "pdf";
        const folder = isVessel ? "vessel-docs" : "customer-docs";
        const storagePath = `${companyId}/${folder}/${uploadedId}.${fileExt}`;
        const bucket = isVessel ? "vessel-documents" : "customer-documents";

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, primaryFile, { contentType: primaryFile.type, upsert: false });

        if (!uploadError) {
          uploadedPath = storagePath;
        }
      }
    } catch (e) {
      console.warn("Upload rápido para anexo manual falhou, prosseguindo com dados locais:", e);
    }

    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(
        "ndp_review_result",
        JSON.stringify({
          manual: true,
          targetEntity: targetEntity,
          file: {
            id: uploadedId,
            name: primaryFile.name,
            path: uploadedPath,
            size: primaryFile.size,
          },
        })
      );
    }

    toast.info("Documento mantido em anexo. Preencha os campos restantes.");
    navigate({ to: defaultReturnUrl as any });
  };

  // Iniciar Leitura Automática com IA
  const handleStartOcr = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um documento para realizar a leitura.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não identificada. Por favor, recarregue a página.");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Iniciando leitura inteligente de documentos...");

    try {
      const primaryFile = selectedFiles[0];

      // Recupera dados existentes de rascunho se houver
      let draftData: any = null;
      if (typeof window !== "undefined" && window.sessionStorage) {
        const draftKey = isVessel ? "ndp_vessel_form_draft" : "ndp_customer_form_draft";
        const rawDraft = window.sessionStorage.getItem(draftKey);
        if (rawDraft) {
          try {
            draftData = JSON.parse(rawDraft);
          } catch (e) {
            console.warn("Erro ao ler rascunho existente:", e);
          }
        }
      }

      const review = await processDocumentForReview({
        file: primaryFile,
        companyId,
        userId: profile?.id,
        targetEntity: targetEntity,
        existingData: draftData?.formData || null,
        onProgress: (stage) => setProcessingStage(stage),
      });

      const sessionId = review.fileId || review.jobId || crypto.randomUUID();

      // Salva a sessão com garantia de autorização da empresa
      saveReviewSession(sessionId, {
        review,
        originUrl: defaultReturnUrl,
        targetEntity: targetEntity,
        draftData: draftData,
        companyId: companyId,
      });

      toast.success("Documento lido com sucesso! Abrindo tela de conferência...");
      navigate({ to: `/documentos/revisar/${sessionId}` as any });
    } catch (err: any) {
      console.error("Erro na leitura de documento:", err);
      setIsProcessing(false);
      toast.error(err?.message || "Erro ao processar documento. Tente novamente ou preencha manualmente.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col w-full text-slate-900">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shrink-0 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              id="btn-voltar-cadastro"
              onClick={handleBack}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Voltar ao cadastro sem perder informações"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao cadastro</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-sm sm:text-lg text-[#0B1739] leading-tight truncate">
                  Anexar Documentos e Leitura Automática
                </h1>
                <Badge
                  className={
                    isVessel
                      ? "bg-sky-50 text-sky-800 border-sky-200 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0"
                      : "bg-blue-50 text-blue-800 border-blue-200 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0"
                  }
                >
                  {isVessel ? "Embarcação" : "Cliente / Proprietário"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                {isEditing ? "Atualização cadastral via documento" : "Preenchimento automático do formulário com IA"}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Isolamento por Empresa
            </span>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL (ROLAGEM NATURAL) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-32">
        {/* Banner de Orientação */}
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-[#075BFF] shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-[#0B1739]">
                {isVessel ? "Documentos náuticos aceitos" : "Documentos de identificação aceitos"}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isVessel
                  ? "Envie foto ou PDF de TIE, TIEM, TIE Digital, Termo de Entrega ou Ficha Náutica. Nossa IA identifica e extrai automaticamente os dados da embarcação para você conferir antes de salvar."
                  : "Envie foto ou PDF de CNH, RG, CPF, Cartão CNPJ ou Contrato Social. Todos os campos extraídos poderão ser conferidos e editados na próxima etapa."}
              </p>
            </div>
          </div>
        </div>

        {/* Inputs de Arquivo Ocultos */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            handleFilesAdded(e.target.files);
            e.target.value = "";
          }}
        />

        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFilesAdded(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Área de Seleção / Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesAdded(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-[#075BFF] bg-white rounded-2xl p-6 sm:p-8 text-center transition-all shadow-2xs space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto shadow-2xs">
            <Upload className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-[#0B1739]">
              Selecione ou arraste os documentos aqui
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Suporta arquivos em formato <strong>PDF, PNG, JPG ou JPEG</strong> de até <strong>20 MB</strong> por arquivo.
            </p>
          </div>

          {/* Botões de Ação para Adicionar Documentos */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              id="btn-escolher-arquivos"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Escolher arquivos do dispositivo</span>
            </Button>

            <Button
              type="button"
              id="btn-tirar-foto"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
              className="w-full sm:w-auto border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="h-4 w-4 text-[#075BFF]" />
              <span>Tirar foto do documento</span>
            </Button>
          </div>
        </div>

        {/* Lista de Arquivos Selecionados */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#0B1739] flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span>Documentos selecionados ({selectedFiles.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                disabled={isProcessing}
                className="text-[11px] text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
              >
                Remover todos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedFiles.map((file, idx) => {
                const isImage = file.type.startsWith("image/");
                const previewUrl = filePreviews[idx];

                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isImage && previewUrl ? (
                        <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100 relative group">
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatFileSize(file.size)} • {isImage ? "Imagem" : "Documento PDF"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isImage && previewUrl && (
                        <button
                          type="button"
                          onClick={() => setActivePreviewFile({ file, url: previewUrl })}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#075BFF] transition-colors cursor-pointer"
                          title="Visualizar documento"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remover documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Andamento da Leitura na Própria Página */}
        {isProcessing && (
          <div className="bg-white border-2 border-blue-300 rounded-2xl p-6 shadow-md text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0B1739]">
                Processando leitura inteligente com IA...
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-[#075BFF]">
                {processingStage || "Extraindo campos cadastrais do documento..."}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto pt-1">
                Aguarde alguns segundos. A tela de conferência abrirá automaticamente assim que os dados forem extraídos.
              </p>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-md mx-auto">
              <div className="bg-gradient-to-r from-blue-500 to-[#075BFF] h-full w-4/5 animate-pulse rounded-full" />
            </div>
          </div>
        )}
      </main>

      {/* 3. RODAPÉ DE AÇÕES FIXO (SAFE-AREA) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3.5 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isProcessing}
              className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer"
            >
              Cancelar e voltar
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleFillManually}
              disabled={isProcessing}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-100 rounded-xl px-3 py-2.5 cursor-pointer"
            >
              Preencher manualmente
            </Button>
          </div>

          <div className="w-full sm:w-auto">
            <Button
              type="button"
              id="btn-iniciar-leitura"
              onClick={handleStartOcr}
              disabled={selectedFiles.length === 0 || isProcessing}
              className="w-full sm:w-auto bg-[#075BFF] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando leitura...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Iniciar leitura com IA ({selectedFiles.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>

      {/* Modal de Prévia Rápida de Imagem */}
      {activePreviewFile && (
        <Dialog open={Boolean(activePreviewFile)} onOpenChange={() => setActivePreviewFile(null)}>
          <DialogContent className="max-w-2xl bg-white p-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 truncate">
                {activePreviewFile.file.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Visualização do documento selecionado
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={activePreviewFile.url}
                alt={activePreviewFile.file.name}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
