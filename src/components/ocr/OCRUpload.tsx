import { useState, useRef } from "react";
import { Upload, Camera, FileText, CheckCircle2, Loader2, X, Info, Zap, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOCR } from "@/hooks/useOCR";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Progress } from "@/components/ui/progress";

interface OCRUploadProps {
  companyId: string;
}

export function OCRUpload({ companyId }: OCRUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<string>("AUTO_DETECT");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createBatchJobs } = useOCR();
  const { checkLimit } = usePlanLimits();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processBatch = async () => {
    if (selectedFiles.length === 0) return;

    const limitStatus = await checkLimit('ocr');
    if (limitStatus.reached) {
      toast.error("Limite atingido", {
        description: `Seu plano atual permite apenas ${limitStatus.limit} processamentos de OCR. Faça upgrade para continuar.`
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const uploadedFilesInfo = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
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
        uploadedFilesInfo.push({ file, id: fileData.id });
        
        setUploadProgress(10 + ((i + 1) / selectedFiles.length) * 80);
      }

      // 3. Create Batch OCR Jobs
      await createBatchJobs.mutateAsync({
        files: uploadedFilesInfo,
        companyId: companyId,
        docType: docType
      });

      setUploadProgress(100);
      toast.success(`${selectedFiles.length} documentos enviados para análise inteligente!`);
      setSelectedFiles([]);
    } catch (error: any) {
      toast.error("Erro no processamento em lote: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="p-8 border-dashed border-2 bg-slate-50/50 hover:bg-slate-50 transition-all group rounded-[2.5rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
      
      {selectedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center relative z-10">
          <div className="h-24 w-24 bg-white rounded-3xl shadow-xl shadow-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-slate-100">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-navy uppercase tracking-tight">IA Scanner Naval Multi-Doc</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
              Envie um ou múltiplos documentos de uma vez. Nossa IA fará o resto.
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
                  <FileText className="h-4 w-4" /> Selecionar Arquivos
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
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Arquivos Selecionados ({selectedFiles.length})
            </h4>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-red-500" onClick={() => setSelectedFiles([])}>
              Limpar Tudo
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group/item">
                <div className="flex items-center gap-3 truncate">
                  <div className="h-8 w-8 bg-slate-50 rounded flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <span className="text-[11px] font-bold text-navy truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => removeFile(idx)}>
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                <span>Enviando para Nuvem...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          <div className="pt-4 flex gap-3">
             <Button 
               variant="outline" 
               className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest"
               onClick={() => fileInputRef.current?.click()}
               disabled={isUploading}
             >
               Adicionar Mais
             </Button>
             <Button 
               className="flex-1 bg-navy text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-navy/20 gap-2"
               onClick={processBatch}
               disabled={isUploading}
             >
               {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-primary" />}
               Iniciar OCR Lote
             </Button>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-navy/5 rounded-tr-[100px] group-hover:bg-navy/10 transition-colors"></div>
    </Card>
  );
}
