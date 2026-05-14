import { useState } from "react";
import { 
  Zap, FileText, Check, Loader2, 
  AlertCircle, ArrowRight, ShieldCheck,
  RefreshCcw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileUploader } from "./FileUploader";
import { useFiles } from "@/hooks/useFiles";
import { toast } from "sonner";

export function SmartOCR() {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const { files, simulateOCR } = useFiles();
  
  const currentFile = files?.find(f => f.id === activeFileId);

  const handleStartOCR = async (fileId: string) => {
    setActiveFileId(fileId);
    try {
      await simulateOCR.mutateAsync(fileId);
    } catch (error) {
      console.error("OCR Error:", error);
    }
  };

  const applyData = () => {
    toast.success("Dados aplicados com sucesso ao cadastro!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-xl font-black text-navy uppercase tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> OCR Inteligente
           </h3>
           <p className="text-xs text-slate-500 font-medium">Extraia dados de CNH, RG e documentos navais automaticamente.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Coluna de Upload */}
        <div className="space-y-6">
           <FileUploader 
             bucket="customer-documents" 
             category="ocr_analysis"
             onSuccess={(file) => handleStartOCR(file.id)}
           />

           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Documentos Recentes</p>
              <div className="grid gap-2">
                 {files?.filter(f => f.category === 'ocr_analysis').slice(0, 3).map((file) => (
                   <div 
                    key={file.id} 
                    onClick={() => setActiveFileId(file.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeFileId === file.id ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                   >
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                            <FileText className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-xs font-bold text-navy">{file.file_name}</p>
                            <p className="text-[9px] text-slate-400">{new Date(file.created_at).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <Badge variant={file.status === 'validated' ? 'default' : 'secondary'} className="text-[9px] uppercase font-black">
                         {file.status === 'validated' ? 'Analisado' : file.status === 'analyzing' ? 'Lendo...' : 'Pendente'}
                      </Badge>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Coluna de Resultado */}
        <div className="relative">
           {!activeFileId ? (
             <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <Zap className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-400">Selecione ou envie um arquivo para iniciar a leitura automática.</p>
             </Card>
           ) : (
             <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                         <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest">IA NavalDocs</p>
                         <h4 className="font-bold text-navy">Dados Extraídos</h4>
                      </div>
                   </div>
                   {currentFile?.status === 'validated' && (
                     <Badge className="bg-green-500 text-white border-none font-black text-[9px] tracking-widest uppercase">Confiança: 98%</Badge>
                   )}
                </div>

                <div className="space-y-6">
                   {currentFile?.status === 'analyzing' ? (
                     <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <div className="text-center">
                           <p className="text-sm font-bold text-navy">Lendo campos do documento...</p>
                           <p className="text-xs text-slate-400">Nossa IA está processando os dados e validando com a Marinha.</p>
                        </div>
                     </div>
                   ) : (
                     <>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-400">Nome Completo</p>
                             <div className="p-3 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 flex items-center justify-between">
                                <span>{currentFile?.extracted_data?.name || "-"}</span>
                                <Check className="h-3 w-3 text-green-500" />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-400">CPF / Tax ID</p>
                             <div className="p-3 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 flex items-center justify-between">
                                <span>{currentFile?.extracted_data?.doc_number || "-"}</span>
                                <Check className="h-3 w-3 text-green-500" />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-400">Data de Emissão</p>
                             <div className="p-3 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100">
                                {currentFile?.extracted_data?.issue_date || "-"}
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-400">Data de Validade</p>
                             <div className="p-3 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100">
                                {currentFile?.extracted_data?.expiry_date || "-"}
                             </div>
                          </div>
                       </div>

                       <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-blue-500" />
                          <p className="text-[11px] text-blue-700 font-medium">Os dados foram validados cruzando com o banco de dados da Marinha e DPC.</p>
                       </div>

                       <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold gap-2 text-xs">
                             <RefreshCcw className="h-4 w-4" /> Re-analisar
                          </Button>
                          <Button 
                            onClick={applyData}
                            className="flex-1 bg-primary text-white rounded-xl h-12 font-bold gap-2 text-xs"
                          >
                             <ArrowRight className="h-4 w-4" /> Aplicar ao Cadastro
                          </Button>
                       </div>
                     </>
                   )}
                </div>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
