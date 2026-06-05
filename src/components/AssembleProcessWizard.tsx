import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUploader } from "@/components/FileUploader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, FileText, Zap, User, Ship, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AssembleProcessWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<any>({});
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const handleNext = () => setStep(s => s + 1);
  
  const handleFileUpload = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const processOCR = async () => {
    setIsProcessing(true);
    // Placeholder for batch OCR logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    setExtractedData({
      name: "RICARDO ALMEIDA",
      cpf: "123.456.789-00",
      rg: "20.123.456-X",
      address: "RUA MARÍTIMA, 123, RIO DE JANEIRO"
    });
    setIsProcessing(false);
    handleNext();
  };

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Montagem Automática de Processo" maxWidth="3xl">
      <div className="space-y-6">
        <Progress value={(step / 4) * 100} />
        
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-black text-navy uppercase text-sm tracking-widest">Upload de Documentos Base</h3>
            <FileUploader bucket="process-attachments" category="identidade" onSuccess={(f) => handleFileUpload([f])} />
            <Button onClick={processOCR} disabled={files.length === 0 || isProcessing} className="w-full bg-navy">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Processar via IA"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-black text-navy uppercase text-sm tracking-widest">Revisão de Dados Extraídos</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div><p className="text-[10px] text-slate-400">NOME</p><p className="font-bold">{extractedData.name}</p></div>
              <div><p className="text-[10px] text-slate-400">CPF</p><p className="font-bold">{extractedData.cpf}</p></div>
            </div>
            <Button onClick={handleNext} className="w-full bg-primary">Confirmar e Selecionar Documentos</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-black text-navy uppercase text-sm tracking-widest">Seleção de Documentos</h3>
            {['Procuração', 'Requerimento DPC-2211', 'Declaração'].map(doc => (
              <div key={doc} className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50" onClick={() => setSelectedTemplates(prev => prev.includes(doc) ? prev.filter(p => p !== doc) : [...prev, doc])}>
                <div className={`h-5 w-5 border rounded flex items-center justify-center ${selectedTemplates.includes(doc) ? 'bg-primary border-primary' : ''}`}>
                  {selectedTemplates.includes(doc) && <Check className="text-white h-3 w-3" />}
                </div>
                <span className="text-sm font-bold">{doc}</span>
              </div>
            ))}
            <Button onClick={handleNext} disabled={selectedTemplates.length === 0} className="w-full bg-navy">Gerar Documentos</Button>
          </div>
        )}
      </div>
    </ModalLayout>
  );
}
