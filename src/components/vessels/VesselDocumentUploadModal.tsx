import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2, Sparkles, FileUp, Info, Ship } from "lucide-react";
import { toast } from "sonner";
import { validateUpload, MAX_ATTACHMENT_BYTES } from "@/lib/storage";
import { processDocumentForReview } from "@/services/ocr/smartDocumentService";
import { DocumentReviewSplitModal } from "@/components/documents/DocumentReviewSplitModal";
import { ExtractedDocumentReview } from "@/services/ocr/documentOcrTypes";

export interface ExtractedVesselData {
  name?: string;
  registration_number?: string;
  vessel_type?: string;
  category?: string;
  construction_year?: string;
  hull_material?: string;
  length?: string;
  boca?: string;
  pontal?: string;
  hull_identifier?: string;
  gross_tonnage?: string;
  manufacturer?: string;
  model?: string;
  engine_power?: string;
  engine_serial_number?: string;
  engine_brand?: string;
  engine_count?: string;
  capacity?: string;
  port_registration?: string;
  navigation_area?: string;
  identified_owner_name?: string;
  identified_owner_doc?: string;
  rawText?: string;
}

export interface UploadedVesselFile {
  file: File;
  id?: string;
  path?: string;
  name: string;
  size: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | null;
  userId?: string;
  existingVessel?: Record<string, any> | null;
  onDataExtracted: (data: ExtractedVesselData, files: UploadedVesselFile[]) => void;
}

export function VesselDocumentUploadModal({ 
  isOpen, 
  onClose, 
  companyId, 
  userId,
  existingVessel,
  onDataExtracted 
}: Props) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [reviewData, setReviewData] = useState<ExtractedDocumentReview | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleProcessDocuments = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um documento para leitura.");
      return;
    }

    if (!companyId) {
      toast.error("Empresa não identificada. Recarregue a página.");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Iniciando leitura inteligente de documento náutico...");

    try {
      const primaryFile = selectedFiles[0];

      const review = await processDocumentForReview({
        file: primaryFile,
        companyId,
        userId,
        targetEntity: "vessel",
        existingData: existingVessel,
        onProgress: (stage) => setProcessingStage(stage),
      });

      setIsProcessing(false);
      setReviewData(review);
      setIsReviewOpen(true);
    } catch (err: any) {
      setIsProcessing(false);
      console.error("[VesselUpload] Erro OCR:", err);
      const errorMsg = err?.message || "Não foi possível concluir a leitura automática do documento náutico.";
      toast.error(`Falha na leitura automática: ${errorMsg}`, { duration: 7000 });
    }
  };

  const handleReviewConfirmed = (confirmedFields: Record<string, string>, review: ExtractedDocumentReview) => {
    const extracted: ExtractedVesselData = {
      name: confirmedFields.name,
      registration_number: confirmedFields.registration_number,
      vessel_type: confirmedFields.vessel_type,
      hull_material: confirmedFields.hull_material,
      construction_year: confirmedFields.construction_year,
      length: confirmedFields.length,
      boca: confirmedFields.boca,
      pontal: confirmedFields.pontal,
      capacity: confirmedFields.capacity,
      gross_tonnage: confirmedFields.gross_tonnage,
      navigation_area: confirmedFields.navigation_area,
      engine_brand: confirmedFields.engine_brand,
      engine_power: confirmedFields.engine_power,
      engine_serial_number: confirmedFields.engine_serial_number,
      identified_owner_name: confirmedFields.identified_owner_name,
      identified_owner_doc: confirmedFields.identified_owner_doc,
      rawText: review.rawText,
    };

    const uploadedRecords: UploadedVesselFile[] = selectedFiles.map((f, i) => ({
      file: f,
      id: review.fileId || crypto.randomUUID(),
      path: review.fileUrl,
      name: f.name,
      size: f.size,
    }));

    onDataExtracted(extracted, uploadedRecords);
    setSelectedFiles([]);
    setIsReviewOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !isReviewOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
        <DialogContent className="w-full max-w-xl max-h-[100dvh] bg-white rounded-none sm:rounded-2xl p-4 sm:p-6 shadow-xl border-0 sm:border border-slate-200 overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Ship className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-[#0B1739]">
                Leitura Automática de Documentos Náuticos
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Anexe TIE, TIEM, Provisório/BSADE ou Recibo de Compra e Venda (PDF, PNG, JPG até 20MB). A IA sugerirá os dados náuticos para você conferir antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {/* Área de Dropzone */}
          <div className="space-y-4 py-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFilesAdded(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-200 hover:border-sky-500 hover:bg-sky-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
              <div className="h-12 w-12 rounded-xl bg-slate-100 group-hover:bg-sky-100 text-slate-500 group-hover:text-sky-600 flex items-center justify-center mx-auto transition-colors">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0B1739]">
                  Clique para selecionar ou arraste o arquivo do barco aqui
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Suporta TIE, TIEM, Provisório, Termo de Entrega ou NF (PDF, JPG, PNG até 20MB)
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Documentos Selecionados ({selectedFiles.length})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                        <span className="font-medium text-slate-700 truncate" title={f.name}>
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({formatFileSize(f.size)})
                        </span>
                      </div>
                      {!isProcessing && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progresso de Processamento */}
            {isProcessing && (
              <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-sky-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-[#0B1739] block">
                    Processando documento náutico...
                  </span>
                  <span className="text-[11px] text-slate-600 block truncate">
                    {processingStage}
                  </span>
                </div>
              </div>
            )}

            {/* Aviso Informativo */}
            <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Info className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
              <span>
                Você poderá conferir cada dado sugerido lado a lado com a imagem do documento antes de salvar. Preenchimento manual permanece 100% disponível.
              </span>
            </div>
          </div>

          {/* Rodapé de Ações */}
          <div 
            className="border-t border-slate-100 pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={onClose}
              onPointerDown={() => {
                (document.activeElement as HTMLElement)?.blur?.();
              }}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
            >
              Preencher tudo manualmente
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={selectedFiles.length === 0 || isProcessing}
              onClick={handleProcessDocuments}
              onPointerDown={() => {
                (document.activeElement as HTMLElement)?.blur?.();
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white gap-2 shadow-sm cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Iniciar Leitura Automática</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TELA DE CONFERÊNCIA OBRIGATÓRIA LADO A LADO */}
      <DocumentReviewSplitModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        review={reviewData}
        onConfirm={handleReviewConfirmed}
      />
    </>
  );
}
