import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2, Sparkles, FileUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateUpload, MAX_ATTACHMENT_BYTES } from "@/lib/storage";

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
  onDataExtracted: (data: ExtractedVesselData, files: UploadedVesselFile[]) => void;
}

export function VesselDocumentUploadModal({ isOpen, onClose, companyId, onDataExtracted }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
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

    setIsProcessing(true);
    setProcessingStage("Enviando arquivos...");

    const uploadedRecords: UploadedVesselFile[] = [];
    const extracted: ExtractedVesselData = {};

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingStage(`Enviando ${file.name} (${i + 1}/${selectedFiles.length})...`);

        const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const randomId = crypto.randomUUID();
        const filePath = `${companyId || "general"}/vessel-docs/${randomId}.${fileExt}`;

        // 1. Upload para o bucket
        const { error: uploadErr } = await supabase.storage
          .from("customer-documents")
          .upload(filePath, file, { contentType: file.type });

        if (uploadErr) {
          console.warn("Storage upload warn:", uploadErr);
        }

        uploadedRecords.push({
          file,
          id: randomId,
          path: filePath,
          name: file.name,
          size: file.size,
        });

        // 2. OCR Trigger
        if (companyId) {
          setProcessingStage(`Analisando ${file.name} com OCR náutico...`);
          try {
            const { data: fileData } = await supabase
              .from("uploaded_files")
              .insert({
                company_id: companyId,
                file_name: file.name,
                file_url: filePath,
                category: "vessel_documents",
                file_type: file.type,
                file_size: file.size,
                status: "pending",
              })
              .select()
              .single();

            if (fileData?.id) {
              const { data: jobData } = await supabase
                .from("ocr_jobs")
                .insert({
                  company_id: companyId,
                  file_id: fileData.id,
                  status: "pending",
                })
                .select()
                .single();

              if (jobData?.id) {
                await supabase.functions.invoke("process-ocr", {
                  body: { jobId: jobData.id },
                });

                // Polling com timeout
                for (let attempt = 0; attempt < 4; attempt++) {
                  await new Promise((r) => setTimeout(r, 1500));
                  const { data: job } = await supabase
                    .from("ocr_jobs")
                    .select("*")
                    .eq("id", jobData.id)
                    .single();

                  if (job?.status === "completed" && job.extracted_data) {
                    const v = job.extracted_data.vessel || job.extracted_data;
                    if (v.nome || v.name) extracted.name = v.nome || v.name;
                    if (v.numero_inscricao || v.inscricao || v.tie_number) {
                      extracted.registration_number = v.numero_inscricao || v.inscricao || v.tie_number;
                    }
                    if (v.tipo || v.vessel_type) extracted.vessel_type = v.tipo || v.vessel_type;
                    if (v.categoria || v.category) extracted.category = v.categoria || v.category;
                    if (v.ano_construcao || v.year) extracted.construction_year = String(v.ano_construcao || v.year);
                    if (v.material || v.material_casco) extracted.hull_material = v.material || v.material_casco;
                    if (v.comprimento || v.length) extracted.length = String(v.comprimento || v.length);
                    if (v.boca) extracted.boca = String(v.boca);
                    if (v.pontal) extracted.pontal = String(v.pontal);
                    if (v.chassi || v.hin || v.hull_id) extracted.hull_identifier = v.chassi || v.hin || v.hull_id;
                    if (v.potencia_motor || v.engine_power) extracted.engine_power = String(v.potencia_motor || v.engine_power);
                    if (v.serie_motor || v.engine_serial) extracted.engine_serial_number = v.serie_motor || v.engine_serial;
                    if (v.capacidade || v.lotacao) extracted.capacity = String(v.capacidade || v.lotacao);
                    if (v.area_navegacao) extracted.navigation_area = v.area_navegacao;
                    if (v.proprietario || v.owner_name) extracted.identified_owner_name = v.proprietario || v.owner_name;
                    if (v.cpf_proprietario || v.cnpj_proprietario || v.owner_doc) {
                      extracted.identified_owner_doc = v.cpf_proprietario || v.cnpj_proprietario || v.owner_doc;
                    }
                    break;
                  }
                }
              }
            }
          } catch (ocrErr) {
            console.warn("OCR non-blocking error:", ocrErr);
          }
        }
      }

      setProcessingStage("Finalizando preenchimento...");
      toast.success(
        Object.keys(extracted).length > 0
          ? "Dados da embarcação extraídos com sucesso! Revise os campos."
          : "Documentos anexados com sucesso. Preencha os dados complementares manualmente."
      );

      onDataExtracted(extracted, uploadedRecords);
      setSelectedFiles([]);
      onClose();
    } catch (err: any) {
      console.error("Erro na leitura de documentos da embarcação:", err);
      toast.error("Não foi possível processar todos os documentos automaticamente. Você pode continuar preenchendo manualmente.");
      onDataExtracted(extracted, uploadedRecords);
      onClose();
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="max-w-xl p-6 sm:p-8 rounded-2xl bg-white border border-slate-150 shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#075BFF] uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Extração Inteligente de Embarcação</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-[#0B1739] tracking-tight">
            Preencher com documentos
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1 leading-relaxed">
            Anexe o TIE, TIEM, Termo Provisório, Nota Fiscal ou Memorial Descritivo para identificar os dados da embarcação.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
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
          className="border-2 border-dashed border-blue-200 hover:border-[#075BFF] bg-[#F8FAFF] rounded-2xl p-8 text-center cursor-pointer transition-colors group mt-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
            <FileUp className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-[#0B1739]">
            Clique para selecionar ou arraste os documentos da embarcação
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Suporta PDF, JPG ou PNG (até 15MB por arquivo)
          </p>
        </div>

        {/* Lista de Arquivos */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Arquivos selecionados ({selectedFiles.length})
            </p>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                  <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-[#075BFF] animate-spin shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-[#0B1739]">Lendo documentos náuticos</p>
              <p className="text-slate-500 mt-0.5">{processingStage}</p>
            </div>
          </div>
        )}

        {/* Nota sobre consumo de franquia OCR */}
        <div className="flex items-start gap-2 text-[11px] text-slate-500 mt-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Cada leitura de documento consome <strong>1 unidade</strong> da franquia OCR do seu plano.
            Preenchimento manual, correção de campos e reutilização de documentos já salvos{" "}
            <strong>não consomem</strong> leituras.
          </span>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || selectedFiles.length === 0}
            onClick={handleProcessDocuments}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Ler documentos</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
