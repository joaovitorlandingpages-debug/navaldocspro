import { Card } from "@/components/ui/card";
import { classifyHealth, healthLabel, type HealthTier } from "@/services/documentation/diagnostics";

const tierStyles: Record<HealthTier, { ring: string; text: string; badge: string }> = {
  ready:      { ring: "stroke-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  attention:  { ring: "stroke-amber-500",   text: "text-amber-600",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  incomplete: { ring: "stroke-orange-500",  text: "text-orange-600",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
  critical:   { ring: "stroke-rose-500",    text: "text-rose-600",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function HealthScore({
  score,
  coverage,
  diagnostic,
}: { score: number; coverage: number; diagnostic: string }) {
  const tier = classifyHealth(score);
  const s = tierStyles[tier];
  const dash = 2 * Math.PI * 48;
  const offset = dash - (dash * Math.max(0, Math.min(100, score))) / 100;

  return (
    <Card className="p-6 border-slate-100 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="48" strokeWidth="10" className="stroke-slate-100 fill-none" />
            <circle
              cx="60" cy="60" r="48" strokeWidth="10" strokeLinecap="round"
              className={`${s.ring} fill-none transition-all duration-500`}
              strokeDasharray={dash} strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${s.text}`}>{score}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Saúde</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.badge}`}>
              {healthLabel(tier)}
            </span>
            <span className="text-xs text-slate-500">Cobertura {coverage}%</span>
          </div>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">{diagnostic}</p>
        </div>
      </div>
    </Card>
  );
}
