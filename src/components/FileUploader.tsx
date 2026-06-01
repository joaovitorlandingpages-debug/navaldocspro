import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFiles, FileBucket } from "@/hooks/useFiles";
import { useOCR } from "@/hooks/useOCR";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FileUploaderProps {
  bucket: FileBucket;
  category: string;
  customerId?: string;
  vesselId?: string;
  processId?: string;
  onSuccess?: (file: any) => void;
  compact?: boolean;
}

export function FileUploader({ 
  bucket, 
  category, 
  customerId, 
  vesselId, 
  processId,
  onSuccess,
  compact = false
}: FileUploaderProps) {

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { uploadFile } = useFiles();
  const { createBatchJobs } = useOCR();
  const { profile } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      console.warn("UPLOAD_REJECTED_NO_FILES");
      toast.error("Formato não aceito. Use PDF, JPG ou PNG.");
      return;
    }

    const file = acceptedFiles[0];
    console.log("UPLOAD_STARTED", { name: file.name, size: file.size, type: file.type });
    setIsUploading(true);
    setProgress(10);

    const loadingToast = toast.loading(`Enviando ${file.name}...`);

    try {
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 150);

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

      console.log("UPLOAD_COMPLETED", result.id);
      toast.dismiss(loadingToast);
      toast.success(`Arquivo "${file.name}" enviado com sucesso!`);

      const ocrCategories = ['RG', 'CNH', 'CPF', 'TIE', 'TIEM', 'Documentos Pessoais', 'Documentos da Embarcação'];
      if (ocrCategories.some(cat => category?.toUpperCase()?.includes(cat.toUpperCase()) || result.file_name?.toUpperCase().includes(cat.toUpperCase()))) {
        console.log("OCR_DOCUMENT_ATTACHED", result.id);
        try {
          createBatchJobs.mutate({
            files: [{ file, id: result.id }],
            companyId: profile?.company_id || "",
            docType: category || "Identidade"
          });
        } catch (ocrErr) {
          console.warn("OCR_TRIGGER_FAILED_SAFE", ocrErr);
        }
      }

      if (onSuccess) onSuccess(result);

      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 600);

    } catch (error: any) {
      console.error("UPLOAD_FAILED", error);
      toast.dismiss(loadingToast);
      toast.error(`Falha no envio: ${error?.message || 'Erro desconhecido'}`);
      setIsUploading(false);
      setProgress(0);
    }
  }, [uploadFile, bucket, category, customerId, vesselId, processId, onSuccess, createBatchJobs, profile?.company_id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  return (
    <div className="w-full">
      {!isUploading ? (
        <div 
          {...getRootProps()} 
          className={`
            border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group relative overflow-hidden
            ${compact ? "p-4" : "p-10 text-center bg-white shadow-sm hover:shadow-xl hover:scale-[1.01]"} 
            ${isDragActive ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 hover:border-primary/40 hover:bg-slate-50"}
          `}
        >
          <input {...getInputProps()} />
          
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
              <h4 className={`${compact ? "text-xs" : "text-lg"} font-black text-navy uppercase tracking-tight`}>
                {isDragActive ? "Solte para Iniciar" : compact ? "Anexar Arquivo" : "Scanner Naval IA"}
              </h4>
              {!compact && (
                <p className="text-xs text-slate-500 font-medium max-w-[240px] mx-auto mt-1 leading-relaxed">
                  Arraste documentos oficiais ou clique para selecionar. Nossa IA fará a leitura automática.
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
        <div className="border-2 border-primary/20 rounded-[2rem] p-10 bg-white shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan z-20"></div>
           
           <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin opacity-30" />
                <FileText className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              <div className="space-y-2 w-full max-w-xs">
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-sm font-black text-navy uppercase tracking-tight">Otimizando Documento</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preparando para Extração IA...</p>
                    </div>
                    <span className="text-sm font-black text-primary">{progress}%</span>
                 </div>
                 <Progress value={progress} className="h-2 rounded-full" />
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                 <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
                 <p className="text-[10px] font-black text-navy/60 uppercase tracking-tighter">Motor Vision v4.2 Localizando Campos...</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
