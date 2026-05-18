import { useState, useRef } from "react";
import { Upload, Camera, FileText, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOCR } from "@/hooks/useOCR";

interface OCRUploadProps {
  companyId: string;
}

export function OCRUpload({ companyId }: OCRUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createJob } = useOCR();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;

      // 1. Upload to bucket
      const { error: uploadError, data } = await supabase.storage
        .from('ocr-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Register in uploaded_files (assuming it exists based on previous search)
      const { data: fileData, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          company_id: companyId,
          file_name: file.name,
          file_url: filePath,
          category: 'ocr_analysis',
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Create OCR Job
      await createJob.mutateAsync({
        fileId: fileData.id,
        companyId: companyId,
        docType: 'Auto-detect'
      });

      toast.success("Documento pronto para leitura!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="p-8 border-dashed border-2 bg-slate-50/50 hover:bg-slate-50 transition-all group">
      {!preview ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-black text-navy uppercase tracking-tight">Scanner Inteligente</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Arraste o documento ou use a câmera para extrair dados automaticamente.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="rounded-xl h-12 px-6 font-bold gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <FileText className="h-4 w-4" /> Selecionar Arquivo
            </Button>
            <Button 
              className="bg-navy text-white rounded-xl h-12 px-6 font-bold gap-2 text-xs"
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" /> Capturar Agora
            </Button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center">
          <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain opacity-50" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-black uppercase tracking-widest">Enviando Documento...</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm font-black uppercase tracking-widest">Aguardando IA...</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                  onClick={clearPreview}
                >
                  <X className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Scanning Line Animation */}
          {isUploading && (
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan"></div>
          )}
        </div>
      )}
    </Card>
  );
}
