import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Activity, PieChart, FileText, Workflow, Link2, Type, GitBranch,
  Send, CheckSquare, Store, Library, ShieldCheck, Sparkles,
} from "lucide-react";
import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export const dcNav: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin/docs-central", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/docs-central/health", label: "Saúde", icon: Activity },
  { to: "/admin/docs-central/coverage", label: "Cobertura", icon: PieChart },
  { to: "/admin/docs-central/models", label: "Modelos", icon: FileText },
  { to: "/admin/docs-central/process-types", label: "Tipos de Processo", icon: Workflow },
  { to: "/admin/docs-central/mappings", label: "Mapeamentos", icon: Link2 },
  { to: "/admin/docs-central/fields", label: "Campos", icon: Type },
  { to: "/admin/docs-central/versions", label: "Versões", icon: GitBranch },
  { to: "/admin/docs-central/publishing", label: "Publicações", icon: Send },
  { to: "/admin/docs-central/review", label: "Revisão", icon: CheckSquare },
  { to: "/admin/docs-central/marketplace", label: "Marketplace", icon: Store },
  { to: "/admin/docs-central/library", label: "Biblioteca Nacional", icon: Library },
  { to: "/admin/docs-central/audit", label: "Auditoria", icon: ShieldCheck },
  { to: "/admin/docs-central/setup-assistant", label: "Assistente", icon: Sparkles },
];

export function DocsCentralSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-6 py-6 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Módulo</p>
        <h2 className="text-lg font-bold text-navy mt-1">Enterprise Documentation Central v2.0</h2>
      </div>
      <nav className="p-3 space-y-1">
        {dcNav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function StatCard({
  label, value, hint, tone = "default",
}: { label: string; value: ReactNode; hint?: string; tone?: "default" | "warn" | "ok" | "danger" }) {
  const toneCls = {
    default: "text-navy",
    warn: "text-amber-600",
    ok: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];
  return (
    <Card className="p-5 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${toneCls}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </Card>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center bg-white">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
