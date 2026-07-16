import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Empty, ProgressBar } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { useDocumentationCoverage } from "@/hooks/useDocumentationCoverage";
import type { ProcessTypeCoverage } from "@/services/documentation/types";

export const Route = createFileRoute("/admin/docs-central/coverage")({
  component: CoveragePage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <p className="text-sm text-rose-600 mb-3">Erro ao carregar cobertura: {error.message}</p>
      <Button size="sm" onClick={reset}>Tentar novamente</Button>
    </div>
  ),
  notFoundComponent: () => <Empty title="Página não encontrada" />,
});

function statusMeta(s: ProcessTypeCoverage["status"]) {
  switch (s) {
    case "ok":      return { icon: CheckCircle2, cls: "text-emerald-600", label: "Completo" };
    case "partial": return { icon: AlertCircle,  cls: "text-amber-600",   label: "Parcial" };
    case "missing": return { icon: AlertCircle,  cls: "text-rose-600",    label: "Incompleto" };
    case "empty":   return { icon: Circle,       cls: "text-slate-400",   label: "Sem exigências" };
  }
}

function CoverageItem({ p }: { p: ProcessTypeCoverage }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(p.status);
  const Icon = meta.icon;
  return (
    <Card className="border-slate-100">
      <button
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
        <Icon className={`h-5 w-5 ${meta.cls} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-navy truncate">{p.process_type_name}</p>
            <span className={`text-[10px] font-black uppercase tracking-wider ${meta.cls}`}>{meta.label}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 max-w-xs"><ProgressBar value={p.coverage} /></div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {p.covered.length}/{p.required.length} · {p.coverage}%
            </span>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-slate-400">Exigidos:</span> <b className="text-navy">{p.required.length}</b></div>
            <div><span className="text-slate-400">Configurados:</span> <b className="text-navy">{p.configured.length}</b></div>
            <div><span className="text-slate-400">Cobertos:</span> <b className="text-emerald-600">{p.covered.length}</b></div>
            <div><span className="text-slate-400">Faltantes:</span> <b className="text-rose-600">{p.missing.length}</b></div>
          </div>
          {p.issues.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1.5">Problemas</p>
              <ul className="space-y-1">
                {p.issues.map((i, idx) => (
                  <li key={idx} className="text-xs text-slate-700 pl-3 border-l-2 border-rose-200">{i.message}</li>
                ))}
              </ul>
            </div>
          )}
          {p.warnings.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5">Avisos</p>
              <ul className="space-y-1">
                {p.warnings.slice(0, 8).map((i, idx) => (
                  <li key={idx} className="text-xs text-slate-600 pl-3 border-l-2 border-amber-200">{i.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CoveragePage() {
  const { data, isLoading, error, refetch } = useDocumentationCoverage();

  if (isLoading) {
    return (
      <div>
        <PageTitle title="Cobertura por Processo" />
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageTitle title="Cobertura por Processo" />
        <Empty title="Não foi possível carregar" hint={error?.message} />
        <div className="mt-4"><Button size="sm" onClick={() => refetch()}>Tentar novamente</Button></div>
      </div>
    );
  }

  if (data.processes.length === 0) {
    return (
      <div>
        <PageTitle title="Cobertura por Processo" />
        <Empty title="Nenhum tipo de processo configurado" hint="Cadastre tipos de processo para acompanhar a cobertura." />
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Cobertura por Processo"
        description={`Cobertura geral: ${data.coverage}% · ${data.processes.length} tipos de processo`}
      />
      <div className="space-y-2">
        {data.processes.map((p) => <CoverageItem key={p.process_type_id} p={p} />)}
      </div>
    </div>
  );
}
