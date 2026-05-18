import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFiles, FileBucket } from "@/hooks/useFiles";
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setProgress(10);

    try {
      // Simulate progress since Supabase upload doesn't give native progress easily in the simple client
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 200);

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
      
      if (onSuccess) onSuccess(result);
      
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 500);

    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setProgress(0);
    }
  }, [uploadFile, bucket, category, customerId, vesselId, processId, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="w-full">
      {!isUploading ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer group ${
            compact ? "p-4" : "p-8 text-center"
          } ${
            isDragActive ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/30 hover:bg-slate-50"
          }`}
        >
          <input {...getInputProps()} />
          <div className={`${compact ? "flex items-center gap-3" : ""}`}>
            <div className={`${compact ? "h-8 w-8" : "h-12 w-12 mx-auto mb-3"} bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Upload className={`${compact ? "h-4 w-4" : "h-6 w-6"} text-slate-400 group-hover:text-primary`} />
            </div>
            <div className={compact ? "text-left" : ""}>
              <p className={`${compact ? "text-xs" : "text-sm"} font-bold text-navy`}>
                {isDragActive ? "Solte aqui" : compact ? "Anexar arquivo" : "Clique ou arraste o arquivo"}
              </p>
              {!compact && (
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                  PDF, JPG, PNG (Max. 10MB)
                </p>
              )}
            </div>
          </div>
        </div>

      ) : (
        <div className="border-2 border-slate-100 rounded-2xl p-8 bg-slate-50 animate-in fade-in duration-300">
           <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div className="flex-grow">
                 <p className="text-xs font-bold text-navy">Enviando documento...</p>
                 <Progress value={progress} className="h-1.5 mt-2" />
              </div>
              <span className="text-[10px] font-black text-primary">{progress}%</span>
           </div>
        </div>
      )}
    </div>
  );
}
