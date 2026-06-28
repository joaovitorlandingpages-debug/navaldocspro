import { Anchor, FileText, ShieldCheck, Sparkles, Stamp, Crown, Package } from "lucide-react";

export type TemplateCoverKind = "free" | "premium" | "owned" | "document";

const STYLE_BY_ID: Record<string, { from: string; to: string; accent: string; icon: any; pattern: "lines" | "grid" | "waves" | "dots" }> = {
  classico:       { from: "#1e3a8a", to: "#1e293b", accent: "#fbbf24", icon: FileText,    pattern: "lines" },
  executivo:      { from: "#0f172a", to: "#312e81", accent: "#f59e0b", icon: Crown,       pattern: "grid"  },
  naval_azul:     { from: "#0c4a6e", to: "#082f49", accent: "#7dd3fc", icon: Anchor,      pattern: "waves" },
  minimalista:    { from: "#f8fafc", to: "#e2e8f0", accent: "#0f172a", icon: FileText,    pattern: "dots"  },
  laudo_tecnico:  { from: "#064e3b", to: "#022c22", accent: "#34d399", icon: ShieldCheck, pattern: "grid"  },
  checklist:      { from: "#1d4ed8", to: "#1e1b4b", accent: "#a5b4fc", icon: Package,     pattern: "lines" },
  premium:        { from: "#7c2d12", to: "#431407", accent: "#fcd34d", icon: Sparkles,    pattern: "waves" },
};

function colorFor(id: string) {
  return STYLE_BY_ID[id] ?? STYLE_BY_ID.classico;
}

export function TemplateCover({
  templateId,
  name,
  category,
  kind = "free",
  logoUrl,
  primaryColor,
}: {
  templateId: string;
  name: string;
  category?: string | null;
  kind?: TemplateCoverKind;
  logoUrl?: string | null;
  primaryColor?: string | null;
}) {
  const style = colorFor(templateId);
  const from = primaryColor || style.from;
  const to = style.to;
  const accent = style.accent;
  const Icon = style.icon;

  const ribbon =
    kind === "premium" ? { label: "PREMIUM", bg: "bg-amber-500", color: "text-amber-950" } :
    kind === "owned"   ? { label: "MINHA",    bg: "bg-emerald-500", color: "text-emerald-950" } :
    kind === "document"? { label: "DOC",      bg: "bg-blue-500", color: "text-white" } :
                         { label: "GRÁTIS",   bg: "bg-emerald-500", color: "text-emerald-950" };

  const isLight = templateId === "minimalista";
  const text = isLight ? "text-slate-900" : "text-white";
  const sub = isLight ? "text-slate-500" : "text-white/70";

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {style.pattern === "lines" && (
            <pattern id={`p-${templateId}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="14" stroke={accent} strokeWidth="1" />
            </pattern>
          )}
          {style.pattern === "grid" && (
            <pattern id={`p-${templateId}`} width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke={accent} strokeWidth="0.6" />
            </pattern>
          )}
          {style.pattern === "dots" && (
            <pattern id={`p-${templateId}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill={accent} />
            </pattern>
          )}
          {style.pattern === "waves" && (
            <pattern id={`p-${templateId}`} width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 Q 10 0 20 10 T 40 10" fill="none" stroke={accent} strokeWidth="1" />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${templateId})`} />
      </svg>

      {/* paper card */}
      <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col p-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="h-6 max-w-[60%] object-contain" />
          ) : (
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: from }}>NavalDocs</div>
          )}
          <div className="size-7 rounded flex items-center justify-center" style={{ background: from, color: accent }}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="h-2 rounded bg-slate-200 w-[90%]" />
          <div className="h-2 rounded bg-slate-200 w-[70%]" />
          <div className="h-2 rounded bg-slate-200 w-[80%]" />
        </div>
        <div className="space-y-1 opacity-70">
          <div className="h-1.5 rounded bg-slate-200 w-full" />
          <div className="h-1.5 rounded bg-slate-200 w-full" />
          <div className="h-1.5 rounded bg-slate-200 w-[85%]" />
          <div className="h-1.5 rounded bg-slate-200 w-[92%]" />
          <div className="h-1.5 rounded bg-slate-200 w-[60%]" />
        </div>
        <div className="mt-auto pt-3 border-t border-dashed border-slate-200 flex items-end justify-between">
          <div className="space-y-1">
            <div className="h-1 w-16 bg-slate-300 rounded" />
            <div className="text-[8px] uppercase tracking-widest text-slate-400">Assinatura</div>
          </div>
          <Stamp className="size-5 text-slate-300" />
        </div>
      </div>

      {/* footer label */}
      <div className={`absolute left-0 right-0 bottom-0 px-4 py-2 flex items-center justify-between ${text}`}
           style={{ background: `linear-gradient(0deg, ${to}ee, transparent)` }}>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-semibold opacity-90 truncate">{category ?? "Template"}</div>
          <div className={`text-xs font-bold truncate ${text}`}>{name}</div>
        </div>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ribbon.bg} ${ribbon.color}`}>{ribbon.label}</span>
      </div>

      <div className={`absolute top-3 right-3 text-[9px] uppercase tracking-widest font-bold ${sub}`}>{templateId}</div>
    </div>
  );
}
