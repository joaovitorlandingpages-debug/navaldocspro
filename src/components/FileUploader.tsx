import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, Zap, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFiles, FileBucket } from "@/hooks/useFiles";
import { useOCR } from "@/hooks/useOCR";
import { useAuth } from "@/hooks/useAuth";
import { validateUpload, parseStorageError } from "@/lib/storage";
import { toast } from "sonner";

interface FileUploaderProps {
  bucket: FileBucket;
  category: string;
  customerId?: string;
  vesselId?: string;
  processId?: string;
  onSuccess?: (file: any) => void;
  compact?: boolean;
  maxSizeMb?: number;
}

export function FileUploader({ 
  bucket, 
  category, 
  customerId, 
  vesselId, 
  processId,
  onSuccess,
  compact = false,
  maxSizeMb = 10
}: FileUploaderProps) {

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Preparando envio...");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { uploadFile } = useFiles();
  const { createBatchJobs } = useOCR();
  const { profile } = useAuth();

  const resetInput = useCallback(() => {
    const el = containerRef.current?.querySelector("input[type='file']") as HTMLInputElement | null;
    if (el) {
      el.value = "";
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    // Trata rejeições pelo react-dropzone primeiro
    if (fileRejections && fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const errorMsg = rejection.errors?.[0]?.code === "file-too-large"
        ? `O arquivo "${rejection.file.name}" excede o tamanho máximo de ${maxSizeMb}MB.`
        : rejection.errors?.[0]?.code === "file-invalid-type"
          ? `Formato não suportado para "${rejection.file.name}". Use PDF, PNG, JPG, JPEG ou WEBP.`
          : `Não foi possível anexar: ${rejection.errors?.[0]?.message || 'Arquivo inválido'}.`;

      toast.error(errorMsg);
      resetInput();
      return;
    }

    if (acceptedFiles.length === 0) {
      resetInput();
      return;
    }

    const file = acceptedFiles[0];

    // 1. Validação estrita de entrada client-side antes de qualquer requisição
    try {
      validateUpload(file, {
        maxBytes: maxSizeMb * 1024 * 1024,
        purpose: 'attachment'
      });
    } catch (valErr: any) {
      toast.error(valErr.message || "Arquivo inválido para upload.");
      resetInput();
      return;
    }

    console.log("[FILE_UPLOAD_START]", { name: file.name, size: file.size, type: file.type, bucket });
    setIsUploading(true);
    setProgress(15);
    setStatusMessage("Validando integridade...");

    const loadingToast = toast.loading(`Enviando ${file.name}...`);

    try {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 40) {
            setStatusMessage("Transmitindo arquivo...");
            return prev + 15;
          }
          if (prev < 80) {
            setStatusMessage("Processando no Supabase Storage...");
            return prev + 10;
          }
          if (prev < 95) {
            setStatusMessage("Finalizando registro...");
            return prev + 5;
          }
          return prev;
        });
      }, 180);

      const result = await uploadFile.mutateAsync({
        file,
        category,
        bucket,
        customerId,
        vesselId,
        processId
      });

      clearInterval(interval);
      setProgress(100);
      setStatusMessage("Concluído!");

      toast.dismiss(loadingToast);
      toast.success(`Arquivo "${file.name}" enviado com sucesso!`);

      // OCR triggers para categorias reconhecidas
      const ocrCategories = [
        'RG', 'CNH', 'CPF', 'CNPJ',
        'TIE', 'TIEM', 'NOTA_FISCAL', 'NOTA FISCAL', 'MEMORIAL',
        'COMPROVANTE', 'DECLARACAO', 'DECLARAÇÃO',
        'Documentos Pessoais', 'Documentos da Embarcação',
      ];
      const catU = (category || '').toUpperCase();
      const nameU = (result.file_name || '').toUpperCase();
      const hit = ocrCategories.some((cat) => {
        const c = cat.toUpperCase();
        return catU.includes(c) || c.includes(catU) || nameU.includes(c);
      });

      if (hit) {
        try {
          createBatchJobs.mutate({
            files: [{ file, id: result.id }],
            companyId: profile?.company_id || "",
            docType: category || "Identidade"
          });
        } catch (ocrErr) {
          console.warn("OCR_TRIGGER_SAFE_IGNORE", ocrErr);
        }
      }

      if (onSuccess) onSuccess(result);

      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
        setStatusMessage("");
        resetInput();
      }, 500);

    } catch (error: any) {
      console.error("[FILE_UPLOAD_FAILED]", error);
      toast.dismiss(loadingToast);
      const userMessage = parseStorageError(error);
      toast.error(`Falha no upload: ${userMessage}`);
      setIsUploading(false);
      setProgress(0);
      setStatusMessage("");
      resetInput();
    }
  }, [maxSizeMb, resetInput, uploadFile, category, bucket, customerId, vesselId, processId, onSuccess, createBatchJobs, profile?.company_id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    maxSize: maxSizeMb * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    }
  });

  return (
    <div ref={containerRef} className="w-full">
      {!isUploading ? (
        <div 
          {...getRootProps()} 
          className={`
            border-2 border-dashed rounded-2xl transition-all cursor-pointer group relative overflow-hidden
            ${compact ? "p-4" : "p-10 text-center bg-white shadow-sm hover:shadow-xl hover:scale-[1.01]"} 
            ${isDragActive ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 hover:border-primary/40 hover:bg-slate-50"}
          `}
        >
          <input 
            {...getInputProps({
              onClick: (e: any) => {
                if (e?.target) e.target.value = "";
              }
            })} 
          />
          
          {!compact && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[80px] -mr-6 -mt-6 group-hover:bg-primary/10 transition-colors"></div>
          )}

          <div className={`${compact ? "flex items-center gap-4" : "space-y-4"}`}>
            <div className={`
              ${compact ? "h-10 w-10" : "h-16 w-16 mx-auto"} 
              bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all shadow-sm border border-slate-100 group-hover:border-primary/20
            `}>
              <Upload className={`${compact ? "h-5 w-5" : "h-8 w-8"} text-slate-400 group-hover:text-primary transition-colors`} />
            </div>
            
            <div className={compact ? "text-left" : "relative z-10"}>
              <h4 className={`${compact ? "text-xs" : "text-lg"} font-semibold text-navy`}>
                {isDragActive ? "Solte para Iniciar" : compact ? "Anexar Arquivo" : "Scanner Naval IA"}
              </h4>
              {!compact && (
                <p className="text-xs text-slate-500 font-medium max-w-[260px] mx-auto mt-1 leading-relaxed">
                  Arraste documentos oficiais ou clique para selecionar. Formatos: PDF, PNG, JPG ou WEBP (até {maxSizeMb}MB).
                </p>
              )}
              {!compact && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    <ShieldCheck className="h-3 w-3 text-blue-500" />
                    <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Protegido</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">OCR Pronto</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : (
        <div className="border-2 border-primary/20 rounded-2xl p-8 bg-white shadow-xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan z-20"></div>
           
           <div className="flex flex-col items-center text-center space-y-5 relative z-10">
              <div className="relative">
                <Loader2 className="h-14 w-14 text-primary animate-spin opacity-30" />
                <FileText className="h-7 w-7 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              <div className="space-y-2 w-full max-w-xs">
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-sm font-black text-navy uppercase tracking-tight">{statusMessage}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Armazenamento Seguro</p>
                    </div>
                    <span className="text-sm font-black text-primary">{progress}%</span>
                 </div>
                 <Progress value={progress} className="h-2 rounded-full" />
              </div>

              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                 <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
                 <p className="text-[10px] font-black text-navy/60 uppercase tracking-tighter">Criptografia & Auditoria RLS Ativas</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
