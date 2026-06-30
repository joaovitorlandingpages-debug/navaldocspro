import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { hardDeleteProcess, getProcessConfirmationHint } from "@/services/processLifecycle";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  process: { id: string; protocol_number?: string | null; title?: string | null; process_type?: string };
  onDeleted?: () => void;
}

export function HardDeleteDialog({ open, onOpenChange, process, onDeleted }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const expected = getProcessConfirmationHint(process);

  async function handleConfirm() {
    if (text !== expected) {
      toast.error("Confirmação inválida. Digite exatamente o identificador exibido.");
      return;
    }
    setLoading(true);
    try {
      await hardDeleteProcess(process.id, text);
      toast.success("Processo excluído definitivamente.");
      onOpenChange(false);
      setText("");
      onDeleted?.();
    } catch (err: any) {
      toast.error(err.message || "Falha ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setText(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" /> Excluir definitivamente?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              Esta ação é <strong>irreversível</strong>. O processo, seus uploads, checklist e
              histórico serão removidos permanentemente.
            </span>
            <span className="block">
              Para confirmar, digite: <code className="bg-slate-100 px-2 py-0.5 rounded text-navy font-mono">{expected}</code>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={expected}
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading || text !== expected}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Excluindo..." : "Excluir definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
