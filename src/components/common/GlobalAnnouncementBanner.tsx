import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Wrench,
} from "lucide-react";
import { getSystemSettings, SystemFullSettings } from "@/services/admin/systemSettingsService";

export function GlobalAnnouncementBanner() {
  const [settings, setSettings] = useState<SystemFullSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Carrega settings inicial
    const current = getSystemSettings();
    setSettings(current);

    // Escuta evento de atualização em tempo real
    const handleUpdate = (e: any) => {
      const updated = e.detail as SystemFullSettings;
      setSettings(updated || getSystemSettings());
      setDismissed(false); // Reabre se o admin atualizou o aviso
    };

    window.addEventListener("navaldocs_system_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("navaldocs_system_settings_updated", handleUpdate);
    };
  }, []);

  if (!settings || dismissed) return null;

  const { broadcast } = settings;

  // Se modo manutenção estiver ativo, tem prioridade máxima
  if (broadcast.isMaintenanceMode) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1 justify-center text-center">
          <Wrench className="h-4 w-4 animate-bounce shrink-0" />
          <span>
            <strong>Aviso de Manutenção:</strong>{" "}
            {broadcast.maintenanceMessage ||
              "O sistema está passando por ajustes programados. O acesso poderá ser temporariamente instável."}
          </span>
        </div>
      </div>
    );
  }

  // Se broadcast normal estiver desativado, não renderiza
  if (!broadcast.isEnabled || !broadcast.message) return null;

  const typeStyles = {
    info: "bg-blue-600 text-white border-blue-700",
    warning: "bg-amber-500 text-slate-950 border-amber-600",
    destructive: "bg-red-600 text-white border-red-700",
    success: "bg-emerald-600 text-white border-emerald-700",
  };

  const icons = {
    info: <Info className="h-4 w-4 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  };

  return (
    <div
      className={`${typeStyles[broadcast.type] || typeStyles.info} px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs transition-all`}
    >
      <div className="flex items-center gap-2.5 max-w-6xl mx-auto flex-1 justify-center text-center">
        {icons[broadcast.type] || icons.info}
        <div>
          {broadcast.title && <strong>{broadcast.title}: </strong>}
          <span>{broadcast.message}</span>
        </div>
        {broadcast.actionUrl && (
          <a
            href={broadcast.actionUrl}
            target="_blank"
            rel="noreferrer"
            className="underline font-bold ml-1.5 inline-flex items-center gap-0.5 hover:opacity-85"
          >
            {broadcast.actionText || "Saiba mais"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md hover:bg-black/10 transition-colors shrink-0 ml-2"
        title="Dispensar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
