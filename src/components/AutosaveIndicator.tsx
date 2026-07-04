import { Check, Loader2, AlertTriangle, RefreshCw, Cloud } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/useAutosave";

interface Props {
  status: AutosaveStatus;
  lastSavedAt?: Date | null;
  onRetry?: () => void;
  onReload?: () => void;
}

export function AutosaveIndicator({ status, lastSavedAt, onRetry, onReload }: Props) {
  const label = (() => {
    switch (status) {
      case "saving": return "Salvando…";
      case "saved":  return lastSavedAt ? `Salvo ${lastSavedAt.toLocaleTimeString()}` : "Salvo";
      case "error":  return "Falha ao salvar";
      case "conflict": return "Conflito de versão";
      default: return "Autosave ativo";
    }
  })();

  const Icon =
    status === "saving" ? Loader2 :
    status === "saved" ? Check :
    status === "conflict" ? AlertTriangle :
    status === "error" ? AlertTriangle :
    Cloud;

  const tone =
    status === "saved" ? "text-emerald-600" :
    status === "saving" ? "text-blue-600" :
    status === "conflict" ? "text-amber-600" :
    status === "error" ? "text-red-600" :
    "text-slate-400";

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${tone}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "saving" ? "animate-spin" : ""}`} />
      <span>{label}</span>
      {status === "error" && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 underline hover:no-underline inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Tentar novamente
        </button>
      )}
      {status === "conflict" && onReload && (
        <button type="button" onClick={onReload} className="ml-1 underline hover:no-underline">
          Recarregar
        </button>
      )}
    </div>
  );
}
