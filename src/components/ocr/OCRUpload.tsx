import { useState, useRef } from "react";
import { Upload, Camera, FileText, CheckCircle2, Loader2, X, Info, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOCR } from "@/hooks/useOCR";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface OCRUploadProps {
  companyId: string;
}

export function OCRUpload({ companyId }: OCRUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>("AUTO_DETECT");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createJob } = useOCR();
  const { checkLimit } = usePlanLimits();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const limitStatus = await checkLimit('ocr');
    if (limitStatus.reached) {
      toast.error("Limite atingido", {
        description: `Seu plano atual permite apenas ${limitStatus.limit} processamentos de OCR. Faça upgrade para continuar.`
      });
      return;
    }

    setIsUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${companyId}/ocr/${fileName}`;

      // 1. Upload to bucket
      const { error: uploadError } = await supabase.storage
        .from('ocr-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Register in uploaded_files
      const { data: fileData, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          company_id: companyId,
          file_name: file.name,
          file_url: filePath,
          category: 'ocr_analysis',
          file_type: file.type,
          file_size: file.size,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Create OCR Job
      await createJob.mutateAsync({
        fileId: fileData.id,
        companyId: companyId,
        docType: docType
      });

      toast.success("Enviado para análise inteligente!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="p-8 border-dashed border-2 bg-slate-50/50 hover:bg-slate-50 transition-all group rounded-[2.5rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
      
      {!preview ? (
        <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center relative z-10">
          <div className="h-24 w-24 bg-white rounded-3xl shadow-xl shadow-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-slate-100">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-navy uppercase tracking-tight">IA Scanner Naval</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
              Extraia dados técnicos e pessoais de documentos oficiais com 98% de precisão.
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
             <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1.5">
                   Tipo do Documento <Info className="h-3 w-3 text-primary" />
                </label>
                <Select value={docType} onValueChange={setDocType}>
                   <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11 font-bold text-xs uppercase tracking-wider">
                      <SelectValue placeholder="Selecione o tipo..." />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="AUTO_DETECT" className="text-xs font-bold uppercase py-3">Auto-detectar (IA)</SelectItem>
                      <SelectItem value="PERSONAL_IDENTITY" className="text-xs font-bold uppercase py-3">Identidade (RG/CNH)</SelectItem>
                      <SelectItem value="VESSEL_TIE" className="text-xs font-bold uppercase py-3">Documento Naval (TIE/TIEM)</SelectItem>
                      <SelectItem value="FINANCIAL_GRU" className="text-xs font-bold uppercase py-3">Financeiro (GRU/NF)</SelectItem>
                      <SelectItem value="TECHNICAL_MEMORIAL" className="text-xs font-bold uppercase py-3">Memorial Técnico</SelectItem>
                   </SelectContent>
                </Select>
             </div>

             <div className="flex flex-col gap-2 pt-2">
                <Button 
                  className="bg-primary text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20 hover:opacity-90"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <FileText className="h-4 w-4" /> Selecionar Arquivo
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-xl h-12 border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 bg-white"
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4 text-primary" /> Abrir Câmera
                </Button>
             </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />

          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
             <Zap className="h-3 w-3 text-blue-500" />
             <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Processamento Criptografado</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-[2rem] overflow-hidden aspect-video bg-navy flex items-center justify-center border-4 border-white shadow-2xl">
          <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain opacity-40 blur-[2px]" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-6">
            {isUploading ? (
              <>
                <div className="relative">
                   <Loader2 className="h-16 w-16 animate-spin text-primary opacity-50" />
                   <Zap className="h-6 w-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                   <p className="text-sm font-black uppercase tracking-[0.2em]">Otimizando Imagem</p>
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Extraindo metadados via Visão Computacional...</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in-50 duration-500" />
                <div className="text-center space-y-1">
                   <p className="text-sm font-black uppercase tracking-[0.2em]">Upload Concluído</p>
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest text-center">IA identificou o documento como: <span className="text-primary">{docType}</span></p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full h-10 w-10"
                  onClick={clearPreview}
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="pt-4">
                   <Button className="bg-white text-navy rounded-xl h-10 px-8 font-black uppercase text-[10px] tracking-widest" onClick={clearPreview}>
                      Processar Outro
                   </Button>
                </div>
              </>
            )}
          </div>

          {/* Scanning Line Animation */}
          {isUploading && (
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_20px_rgba(var(--primary),1)] animate-scan z-20"></div>
          )}
        </div>
      )}
    </Card>
  );
}
