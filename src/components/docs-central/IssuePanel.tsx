import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertOctagon, AlertTriangle, Info, ChevronRight } from "lucide-react";
import type { CoverageIssue, IssueSeverity } from "@/services/documentation/types";

const sevMeta: Record<IssueSeverity, { icon: any; color: string; label: string; order: number }> = {
  error:   { icon: AlertOctagon,  color: "text-rose-600 bg-rose-50 border-rose-200",     label: "Crítico",     order: 0 },
  warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200",  label: "Atenção",     order: 1 },
  info:    { icon: Info,          color: "text-sky-600 bg-sky-50 border-sky-200",         label: "Informativo", order: 2 },
};

function resolveTarget(issue: CoverageIssue): string {
  switch (issue.code) {
    case "template_missing":
      return "/admin/docs-central/models";
    case "template_draft":
    case "template_no_published_version":
    case "template_no_structure":
      return "/admin/docs-central/publishing";
    case "template_archived":
    case "template_inactive":
    case "template_duplicated":
    case "template_unused":
      return "/admin/docs-central/models";
    case "mapping_broken":
    case "required_field_no_mapping":
      return "/admin/docs-central/mappings";
    case "placeholder_unknown":
    case "placeholder_deprecated":
      return "/admin/docs-central/fields";
    case "version_outdated":
      return "/admin/docs-central/versions";
    default:
      return "/admin/docs-central";
  }
}

export function IssuePanel({ issues }: { issues: CoverageIssue[] }) {
  const navigate = useNavigate();
  const sorted = [...issues].sort((a, b) => sevMeta[a.severity].order - sevMeta[b.severity].order);

  if (sorted.length === 0) {
    return (
      <Card className="p-8 text-center border-emerald-100 bg-emerald-50/40">
        <p className="text-sm font-semibold text-emerald-700">Nenhum problema detectado</p>
        <p className="text-xs text-emerald-600/80 mt-1">A documentação está saudável.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.slice(0, 50).map((issue, i) => {
        const meta = sevMeta[issue.severity];
        const Icon = meta.icon;
        return (
          <Card key={i} className="p-4 border-slate-100 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${meta.color} shrink-0`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{issue.code}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1.5">{issue.message}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => navigate({ to: resolveTarget(issue) as any })}
              >
                Resolver <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        );
      })}
      {sorted.length > 50 && (
        <p className="text-xs text-slate-400 text-center pt-2">
          Mostrando 50 de {sorted.length} problemas.
        </p>
      )}
    </div>
  );
}
