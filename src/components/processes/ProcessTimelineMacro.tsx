/**
 * Timeline macro do processo — Cliente → Embarcação → Procuração → …
 * → Entrega. Renderiza estado por etapa (concluído / atual / pendente).
 */
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineStage = {
  key: string;
  label: string;
  status: "done" | "current" | "pending";
};

interface Props {
  stages: TimelineStage[];
  progress: number;
}

export function ProcessTimelineMacro({ stages, progress }: Props) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Linha do tempo do processo
        </p>
        <p className="text-[11px] font-black text-primary">{progress}%</p>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-start gap-1 md:gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {stages.map((s, i) => {
          const Icon =
            s.status === "done" ? CheckCircle2 : s.status === "current" ? Loader2 : Circle;
          return (
            <div key={s.key} className="flex items-center gap-1 md:gap-2 shrink-0">
              <div className="flex flex-col items-center gap-1 min-w-[68px] md:min-w-[88px]">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full grid place-content-center border-2 transition-all",
                    s.status === "done" && "bg-emerald-500 border-emerald-500 text-white",
                    s.status === "current" && "bg-primary border-primary text-white",
                    s.status === "pending" && "bg-white border-slate-200 text-slate-300",
                  )}
                >
                  <Icon className={cn("h-4 w-4", s.status === "current" && "animate-spin")} />
                </div>
                <p
                  className={cn(
                    "text-[9px] md:text-[10px] font-black uppercase tracking-tight text-center leading-tight",
                    s.status === "done" && "text-emerald-700",
                    s.status === "current" && "text-primary",
                    s.status === "pending" && "text-slate-400",
                  )}
                >
                  {s.label}
                </p>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-4 md:w-8 mt-4 rounded",
                    stages[i + 1].status !== "pending" || s.status === "done"
                      ? "bg-emerald-400"
                      : "bg-slate-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessTimelineMacro;
