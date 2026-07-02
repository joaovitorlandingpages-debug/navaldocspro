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
            <div className="text-base font-black text-slate-900">Processo Guiado <span className="text-[10px] text-emerald-600 uppercase ml-1">recomendado</span></div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              Passo a passo em 7 etapas. Pede só o que este tipo de processo
              exige — cliente, documentos, embarcação, identidade e geração.
            </div>
            <ul className="text-[11px] text-slate-500 mt-3 space-y-1 list-disc pl-4">
              <li>Fluxo explicado, sem adivinhação</li>
              <li>Uploads condicionais por tipo</li>
              <li>Gera modelos automaticamente ao final</li>
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
            <div className="text-base font-black text-slate-900">Modo Rápido <span className="text-[10px] text-slate-400 uppercase ml-1">upload solto</span></div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              Já tem todos os PDFs em mãos? Jogue tudo aqui e a IA tenta
              classificar. Use quando quiser velocidade e não precisar de
              passo a passo.
            </div>
            <ul className="text-[11px] text-slate-500 mt-3 space-y-1 list-disc pl-4">
              <li>Até 20 arquivos por lote</li>
              <li><ScanText className="inline h-3 w-3 -mt-0.5" /> Classificação automática</li>
              <li>Sem checklist condicional</li>
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
