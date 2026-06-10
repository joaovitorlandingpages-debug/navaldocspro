import { useState, useRef, useEffect } from "react";
import { Upload, Camera, FileText, CheckCircle2, Loader2, X, Info, Zap, ListChecks, ShieldCheck, Sparkles, AlertCircle, Edit3, Database } from "lucide-react";
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
  processId?: string;
}

export function OCRUpload({ companyId, processId }: OCRUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<string>("AUTO_DETECT");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createBatchJobs, jobs, applyOCRData } = useOCR(processId);
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
      console.log("DOCUMENT_UPLOAD_STARTED");
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
            process_id: processId,
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
        <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="h-28 w-28 bg-white rounded-[2rem] shadow-2xl shadow-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 border border-slate-100 relative">
            <div className="absolute inset-0 bg-primary/5 rounded-[2rem] animate-pulse"></div>
            <Upload className="h-12 w-12 text-primary relative z-10" />
          </div>
          <div className="space-y-3">
            <h4 className="text-2xl font-black text-navy uppercase tracking-tight">IA Scanner Naval Multi-Doc</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed italic">
              "Digitalização inteligente com 98% de precisão em documentos náuticos."
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
               className="flex-[2] bg-navy text-white rounded-xl h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-navy/20 gap-3 active:scale-95 transition-all group"
               onClick={processBatch}
               disabled={isUploading}
             >
               {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-primary group-hover:rotate-12 transition-transform" />}
               Análise Inteligente
             </Button>
          </div>
          <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
             <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
             </div>
             <p className="text-[10px] font-bold text-navy/70">
                Sua IA está calibrada para identificar CPFs, CNPJs, nomes de embarcações e datas técnicas com 98% de confiança.
             </p>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-navy/5 rounded-tr-[100px] group-hover:bg-navy/10 transition-colors"></div>
    </Card>
  );
}
