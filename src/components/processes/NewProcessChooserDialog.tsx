/**
 * NewProcessChooserDialog — entrada dupla do fluxo "Novo Processo".
 *
 * Opção 1: Processo Guiado (QuickDialog atual do Motor Inteligente).
 * Opção 2: Criar por Upload (dropzone → OCR/AI → revisão → processo).
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, UploadCloud, ArrowRight, ListChecks, ScanText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPickGuided: () => void;
  onPickUpload: () => void;
}

export function NewProcessChooserDialog({ isOpen, onClose, onPickGuided, onPickUpload }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Como você quer criar este processo?
          </DialogTitle>
          <DialogDescription>
            Escolha entre montar do zero com o checklist inteligente ou começar
            enviando os documentos que você já tem em mãos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <button
            type="button"
            onClick={onPickGuided}
            className="group text-left rounded-2xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all p-5 bg-white"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <ListChecks className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-base font-black text-slate-900">Processo Guiado</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              Escolha o tipo, cliente e embarcação. O sistema monta o checklist
              inteligente com todos os documentos obrigatórios.
            </div>
            <ul className="text-[11px] text-slate-500 mt-3 space-y-1 list-disc pl-4">
              <li>Ideal para começar do zero</li>
              <li>Motor inteligente sugere documentos</li>
              <li>Gera modelos automaticamente</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={onPickUpload}
            className="group text-left rounded-2xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all p-5 bg-white"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-base font-black text-slate-900">Criar por Upload</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              Envie os documentos do cliente. A IA identifica o tipo, extrai os
              dados e monta o processo com base no que foi enviado.
            </div>
            <ul className="text-[11px] text-slate-500 mt-3 space-y-1 list-disc pl-4">
              <li>Até 20 arquivos por lote</li>
              <li><ScanText className="inline h-3 w-3 -mt-0.5" /> Classificação automática (com override)</li>
              <li>Cria cliente/embarcação inline</li>
            </ul>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center pt-1">
          Você pode alternar entre os fluxos a qualquer momento — nada é
          descartado ao fechar este diálogo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
