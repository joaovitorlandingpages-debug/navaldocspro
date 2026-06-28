import {
  Anchor, FileText, ShieldCheck, Sparkles, Stamp, Crown, Package,
  Scale, Leaf, Flame, Wrench, Building2, BadgeCheck, Receipt, FileSignature,
  ClipboardList, FlaskConical, Globe, Compass, LifeBuoy, Truck, Coins, Gavel,
} from "lucide-react";

export type TemplateCoverKind = "free" | "premium" | "owned" | "document";

type Pattern = "lines" | "grid" | "waves" | "dots" | "diagonal" | "chevron" | "blueprint" | "hex";
type Layout = "classic" | "executive" | "naval" | "minimal" | "report" | "checklist" | "luxury" | "tech" | "magazine" | "engineering";

type Style = {
  from: string; to: string; accent: string; icon: any;
  pattern: Pattern; layout?: Layout;
};

// 30+ distinct visual identities, indexable by templateId OR by category name (lowercased)
const STYLE_BY_ID: Record<string, Style> = {
  // Known templates
  classico:       { from: "#1e3a8a", to: "#1e293b", accent: "#fbbf24", icon: FileText,      pattern: "lines",     layout: "classic" },
  executivo:      { from: "#0f172a", to: "#312e81", accent: "#f59e0b", icon: Crown,         pattern: "grid",      layout: "executive" },
  naval_azul:     { from: "#0c4a6e", to: "#082f49", accent: "#7dd3fc", icon: Anchor,        pattern: "waves",     layout: "naval" },
  minimalista:    { from: "#f8fafc", to: "#e2e8f0", accent: "#0f172a", icon: FileText,      pattern: "dots",      layout: "minimal" },
  laudo_tecnico:  { from: "#064e3b", to: "#022c22", accent: "#34d399", icon: ShieldCheck,   pattern: "grid",      layout: "report" },
  checklist:      { from: "#1d4ed8", to: "#1e1b4b", accent: "#a5b4fc", icon: ClipboardList, pattern: "lines",     layout: "checklist" },
  premium:        { from: "#7c2d12", to: "#431407", accent: "#fcd34d", icon: Sparkles,      pattern: "waves",     layout: "luxury" },

  // Documents by id/category
  gru:            { from: "#ffffff", to: "#f1f5f9", accent: "#1e3a8a", icon: Receipt,       pattern: "hex",       layout: "minimal" },
  requerimento:   { from: "#ffffff", to: "#e2e8f0", accent: "#0ea5e9", icon: FileSignature, pattern: "diagonal",  layout: "engineering" },
  contrato:       { from: "#0f172a", to: "#020617", accent: "#eab308", icon: FileSignature, pattern: "lines",     layout: "luxury" },
  procuracao:     { from: "#3f1d38", to: "#1c0a18", accent: "#f0abfc", icon: Gavel,         pattern: "chevron",   layout: "luxury" },
  memorial:       { from: "#1e3a8a", to: "#0c1a40", accent: "#bae6fd", icon: Wrench,        pattern: "blueprint", layout: "engineering" },
  art:            { from: "#7f1d1d", to: "#450a0a", accent: "#fecaca", icon: BadgeCheck,    pattern: "diagonal",  layout: "report" },
  relatorio:      { from: "#155e75", to: "#083344", accent: "#67e8f9", icon: FileText,      pattern: "grid",      layout: "report" },
  certificado:    { from: "#713f12", to: "#451a03", accent: "#fde68a", icon: BadgeCheck,    pattern: "chevron",   layout: "luxury" },
  declaracao:     { from: "#1e293b", to: "#020617", accent: "#cbd5e1", icon: FileText,      pattern: "lines",     layout: "classic" },
  dossie:         { from: "#312e81", to: "#0f0a2a", accent: "#c4b5fd", icon: Package,       pattern: "grid",      layout: "executive" },

  // Categories
  engenharia:     { from: "#1e3a8a", to: "#0c1a40", accent: "#93c5fd", icon: Wrench,        pattern: "blueprint", layout: "engineering" },
  marinha:        { from: "#0c4a6e", to: "#082f49", accent: "#7dd3fc", icon: Anchor,        pattern: "waves",     layout: "naval" },
  financeiro:     { from: "#064e3b", to: "#022c22", accent: "#fde68a", icon: Coins,         pattern: "grid",      layout: "report" },
  juridico:       { from: "#1f1937", to: "#0c0a1f", accent: "#fbbf24", icon: Scale,         pattern: "lines",     layout: "luxury" },
  ambiental:      { from: "#14532d", to: "#052e16", accent: "#86efac", icon: Leaf,          pattern: "dots",      layout: "report" },
  seguranca:      { from: "#7c2d12", to: "#3a1208", accent: "#fdba74", icon: Flame,         pattern: "diagonal",  layout: "report" },
  operacional:    { from: "#0c4a6e", to: "#082f49", accent: "#67e8f9", icon: Compass,       pattern: "hex",       layout: "tech" },
  administrativo: { from: "#334155", to: "#0f172a", accent: "#cbd5e1", icon: Building2,     pattern: "grid",      layout: "classic" },
  certificados:   { from: "#713f12", to: "#451a03", accent: "#fde68a", icon: BadgeCheck,    pattern: "chevron",   layout: "luxury" },
  laudos:         { from: "#064e3b", to: "#022c22", accent: "#34d399", icon: FlaskConical,  pattern: "grid",      layout: "report" },
  checklists:     { from: "#1d4ed8", to: "#1e1b4b", accent: "#a5b4fc", icon: ClipboardList, pattern: "lines",     layout: "checklist" },
  contratos:      { from: "#0f172a", to: "#020617", accent: "#eab308", icon: FileSignature, pattern: "lines",     layout: "luxury" },
  memoriais:      { from: "#1e3a8a", to: "#0c1a40", accent: "#bae6fd", icon: Wrench,        pattern: "blueprint", layout: "engineering" },
  registro:       { from: "#0c4a6e", to: "#082f49", accent: "#7dd3fc", icon: Stamp,         pattern: "waves",     layout: "naval" },
  fiscalizacao:   { from: "#7f1d1d", to: "#450a0a", accent: "#fecaca", icon: ShieldCheck,   pattern: "diagonal",  layout: "report" },
  corporate:      { from: "#0f172a", to: "#1e293b", accent: "#c7d2fe", icon: Building2,     pattern: "grid",      layout: "executive" },
  transporte:     { from: "#1e293b", to: "#020617", accent: "#fbbf24", icon: Truck,         pattern: "chevron",   layout: "tech" },
  emergencia:     { from: "#991b1b", to: "#450a0a", accent: "#fef08a", icon: LifeBuoy,      pattern: "diagonal",  layout: "report" },
  internacional:  { from: "#1e1b4b", to: "#0a0820", accent: "#a5b4fc", icon: Globe,         pattern: "hex",       layout: "executive" },
};

function normalize(s?: string | null) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveStyle(templateId: string, category?: string | null): Style {
  const direct = STYLE_BY_ID[templateId];
  if (direct) return direct;
  const byId = STYLE_BY_ID[normalize(templateId)];
  if (byId) return byId;
  const byCat = STYLE_BY_ID[normalize(category)];
  if (byCat) return byCat;
  // Deterministic fallback: hash id to one of the styles
  const keys = Object.keys(STYLE_BY_ID);
  let h = 0;
  for (let i = 0; i < templateId.length; i++) h = (h * 31 + templateId.charCodeAt(i)) >>> 0;
  return STYLE_BY_ID[keys[h % keys.length]];
}

export function TemplateCover({
  templateId,
  name,
  category,
  kind = "free",
  logoUrl,
  primaryColor,
  companyName,
}: {
  templateId: string;
  name: string;
  category?: string | null;
  kind?: TemplateCoverKind;
  logoUrl?: string | null;
  primaryColor?: string | null;
  companyName?: string | null;
}) {
  const style = resolveStyle(templateId, category);
  const from = primaryColor || style.from;
  const to = style.to;
  const accent = style.accent;
  const Icon = style.icon;
  const layout = style.layout ?? "classic";

  const ribbon =
    kind === "premium" ? { label: "PREMIUM", bg: "bg-amber-500", color: "text-amber-950" } :
    kind === "owned"   ? { label: "MINHA",    bg: "bg-emerald-500", color: "text-emerald-950" } :
    kind === "document"? { label: "DOC",      bg: "bg-blue-500", color: "text-white" } :
                         { label: "GRÁTIS",   bg: "bg-emerald-500", color: "text-emerald-950" };

  const isLight = layout === "minimal";
  const text = isLight ? "text-slate-900" : "text-white";
  const sub = isLight ? "text-slate-500" : "text-white/70";
  const patternId = `p-${normalize(templateId) || "cover"}`;

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.14]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {style.pattern === "lines" && (
            <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="14" stroke={accent} strokeWidth="1" />
            </pattern>
          )}
          {style.pattern === "grid" && (
            <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke={accent} strokeWidth="0.6" />
            </pattern>
          )}
          {style.pattern === "dots" && (
            <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill={accent} />
            </pattern>
          )}
          {style.pattern === "waves" && (
            <pattern id={patternId} width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 Q 10 0 20 10 T 40 10" fill="none" stroke={accent} strokeWidth="1" />
            </pattern>
          )}
          {style.pattern === "diagonal" && (
            <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20 L20 0" stroke={accent} strokeWidth="2" />
            </pattern>
          )}
          {style.pattern === "chevron" && (
            <pattern id={patternId} width="24" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 12 L12 0 L24 12" fill="none" stroke={accent} strokeWidth="1" />
            </pattern>
          )}
          {style.pattern === "blueprint" && (
            <pattern id={patternId} width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke={accent} strokeWidth="0.4" />
              <path d="M 16 0 L 16 32 M 0 16 L 32 16" fill="none" stroke={accent} strokeWidth="0.2" />
            </pattern>
          )}
          {style.pattern === "hex" && (
            <pattern id={patternId} width="28" height="24" patternUnits="userSpaceOnUse">
              <path d="M14 2 L26 9 L26 19 L14 26 L2 19 L2 9 Z" fill="none" stroke={accent} strokeWidth="0.6" />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* paper card (layout variants) */}
      {layout === "luxury" ? (
        <div className="absolute inset-6 rounded-md bg-white/95 shadow-2xl flex flex-col items-center justify-center p-6 text-slate-900 border-[6px]" style={{ borderColor: accent }}>
          {logoUrl ? <img src={logoUrl} alt="logo" className="h-8 mb-3 object-contain" /> : null}
          <div className="text-[8px] uppercase tracking-[0.3em] text-slate-400">{category || "Documento"}</div>
          <div className="text-sm font-black text-center mt-1 line-clamp-2" style={{ color: from }}>{name}</div>
          <div className="my-3 h-px w-12" style={{ background: accent }} />
          <Icon className="size-7" style={{ color: from }} />
          <div className="mt-3 text-[7px] uppercase tracking-[0.4em] text-slate-500">{companyName || "NavalDocs"}</div>
        </div>
      ) : layout === "naval" ? (
        <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col p-4 text-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b-2 pb-2 mb-3" style={{ borderColor: from }}>
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-6 max-w-[55%] object-contain" /> :
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: from }}>{companyName || "NavalDocs"}</div>}
            <Anchor className="size-5" style={{ color: from }} />
          </div>
          <div className="flex-1 relative">
            <svg viewBox="0 0 100 40" className="w-full h-12 opacity-30" preserveAspectRatio="none">
              <path d="M0 25 Q 25 5 50 25 T 100 25 L100 40 L0 40 Z" fill={from} />
            </svg>
            <div className="space-y-1 mt-2">
              <div className="h-1.5 rounded bg-slate-200 w-full" />
              <div className="h-1.5 rounded bg-slate-200 w-[85%]" />
              <div className="h-1.5 rounded bg-slate-200 w-[70%]" />
            </div>
          </div>
        </div>
      ) : layout === "engineering" ? (
        <div className="absolute inset-5 rounded-sm bg-white/95 shadow-xl flex flex-col p-4 text-slate-900" style={{ backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`, backgroundSize: "12px 12px" }}>
          <div className="flex items-center justify-between mb-2">
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-5 max-w-[50%] object-contain" /> :
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: from }}>{companyName || "NavalDocs"}</div>}
            <Wrench className="size-4" style={{ color: from }} />
          </div>
          <div className="border-2 border-dashed flex-1 rounded flex items-center justify-center" style={{ borderColor: from }}>
            <Icon className="size-10 opacity-60" style={{ color: from }} />
          </div>
          <div className="mt-2 text-[8px] uppercase tracking-widest text-slate-500 truncate">{name}</div>
        </div>
      ) : layout === "checklist" ? (
        <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col p-4 text-slate-900">
          {logoUrl ? <img src={logoUrl} alt="logo" className="h-5 mb-2 object-contain" /> :
            <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: from }}>{companyName || "NavalDocs"}</div>}
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <div className="size-3 rounded-sm border-2" style={{ borderColor: from, background: i < 3 ? from : "transparent" }} />
              <div className="h-1.5 rounded bg-slate-200" style={{ width: `${60 + ((i * 7) % 30)}%` }} />
            </div>
          ))}
        </div>
      ) : layout === "minimal" ? (
        <div className="absolute inset-6 rounded-md bg-white shadow-md flex flex-col p-5 text-slate-900">
          <div className="text-[8px] uppercase tracking-[0.4em] text-slate-400">{category || "Documento"}</div>
          <div className="mt-auto">
            <div className="text-base font-black leading-tight">{name}</div>
            <div className="mt-2 h-0.5 w-8" style={{ background: accent }} />
            <div className="mt-2 text-[8px] uppercase tracking-widest text-slate-400">{companyName || "NavalDocs"}</div>
          </div>
        </div>
      ) : layout === "report" ? (
        <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col text-slate-900 overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: from, color: "#fff" }}>
            <div className="text-[9px] font-black uppercase tracking-widest truncate">{category || "Relatório"}</div>
            <Icon className="size-4" />
          </div>
          <div className="p-4 flex-1 flex flex-col">
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-5 mb-2 object-contain" /> : null}
            <div className="text-xs font-black mb-2 line-clamp-2" style={{ color: from }}>{name}</div>
            <div className="space-y-1 opacity-80">
              <div className="h-1.5 rounded bg-slate-200 w-full" />
              <div className="h-1.5 rounded bg-slate-200 w-[88%]" />
              <div className="h-1.5 rounded bg-slate-200 w-[72%]" />
              <div className="h-1.5 rounded bg-slate-200 w-[60%]" />
            </div>
            <div className="mt-auto flex items-center justify-between pt-2 border-t">
              <div className="h-1 w-12 bg-slate-300 rounded" />
              <Stamp className="size-4 text-slate-300" />
            </div>
          </div>
        </div>
      ) : layout === "tech" ? (
        <div className="absolute inset-5 rounded-md bg-slate-950 shadow-xl flex flex-col p-4 text-white border" style={{ borderColor: accent }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-mono" style={{ color: accent }}>// {category || "doc"}</div>
            <Icon className="size-4" style={{ color: accent }} />
          </div>
          <div className="text-xs font-black mb-2 line-clamp-2">{name}</div>
          <div className="space-y-1 font-mono text-[8px] opacity-70">
            <div>{`> init ${normalize(templateId)}`}</div>
            <div>{`> load company.brand`}</div>
            <div style={{ color: accent }}>{`> ready ✓`}</div>
          </div>
          <div className="mt-auto text-[8px] font-mono opacity-50">{companyName || "NavalDocs"}</div>
        </div>
      ) : layout === "executive" ? (
        <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col p-4 text-slate-900">
          <div className="flex items-center justify-between mb-3">
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-6 max-w-[55%] object-contain" /> :
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: from }}>{companyName || "NavalDocs"}</div>}
            <div className="size-8 rounded-full flex items-center justify-center" style={{ background: from, color: accent }}>
              <Icon className="size-4" />
            </div>
          </div>
          <div className="text-[8px] uppercase tracking-[0.3em] text-slate-400">{category || "Executivo"}</div>
          <div className="text-sm font-black mt-1 line-clamp-2" style={{ color: from }}>{name}</div>
          <div className="mt-auto pt-3 border-t flex items-end justify-between">
            <div className="space-y-1">
              <div className="h-1 w-16 bg-slate-300 rounded" />
              <div className="text-[8px] uppercase tracking-widest text-slate-400">Assinatura</div>
            </div>
            <div className="text-[8px] uppercase tracking-widest font-black" style={{ color: accent === "#ffffff" ? from : accent }}>OFICIAL</div>
          </div>
        </div>
      ) : (
        /* classic */
        <div className="absolute inset-5 rounded-md bg-white/95 shadow-xl flex flex-col p-4 text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-6 max-w-[60%] object-contain" /> :
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: from }}>{companyName || "NavalDocs"}</div>}
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
      )}

      {/* footer label */}
      <div className={`absolute left-0 right-0 bottom-0 px-4 py-2 flex items-center justify-between ${text}`}
           style={{ background: `linear-gradient(0deg, ${to}ee, transparent)` }}>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-semibold opacity-90 truncate">{category ?? "Template"}</div>
          <div className={`text-xs font-bold truncate ${text}`}>{name}</div>
        </div>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ribbon.bg} ${ribbon.color}`}>{ribbon.label}</span>
      </div>

      {/* paper edge highlight for magazine feel */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/20 to-transparent" />
    </div>
  );
}
