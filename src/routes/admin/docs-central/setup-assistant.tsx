import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, ProgressBar } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/docs-central/setup-assistant")({
  component: SetupAssistantPage,
});

type StepStatus = "ok" | "partial" | "missing";

function StatusIcon({ s }: { s: StepStatus }) {
  if (s === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (s === "partial") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-rose-500" />;
}

function SetupAssistantPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data, isLoading } = useQuery({
    queryKey: ["dc-setup", companyId],
    queryFn: async () => {
      const [company, users, ptypes, tpls, versions, fields, mappings] = await Promise.all([
        companyId ? supabase.from("companies").select("id,name,cnpj,email").eq("id", companyId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId ?? ""),
        supabase.from("process_types").select("id", { count: "exact", head: true }),
        supabase.from("document_templates").select("id", { count: "exact", head: true }),
        supabase.from("template_versions").select("id,status").eq("status", "published").limit(1),
        supabase.from("document_template_fields").select("id", { count: "exact", head: true }),
        supabase.from("process_document_template_mappings").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const c: any = company?.data;
      return {
        company: c ? (c.name && c.cnpj && c.email ? "ok" : "partial") : "missing",
        users: (users.count ?? 0) > 1 ? "ok" : (users.count ?? 0) === 1 ? "partial" : "missing",
        ptypes: (ptypes.count ?? 0) > 0 ? "ok" : "missing",
        tpls: (tpls.count ?? 0) > 0 ? "ok" : "missing",
        fields: (fields.count ?? 0) > 0 ? "ok" : "missing",
        mappings: (mappings.count ?? 0) > 0 ? "ok" : "missing",
        publishedTpl: (versions.data?.length ?? 0) > 0 ? "ok" : "missing",
      } as Record<string, StepStatus>;
    },
    enabled: !!companyId,
  });

  const steps: { key: string; label: string; to?: string; status: StepStatus }[] = [
    { key: "company", label: "Empresa", to: "/settings", status: data?.company ?? "missing" },
    { key: "users", label: "Usuários", to: "/admin/users" as any, status: data?.users ?? "missing" },
    { key: "ptypes", label: "Tipos de Processo", to: "/admin/docs-central/process-types", status: data?.ptypes ?? "missing" },
    { key: "tpls", label: "Modelos", to: "/admin/docs-central/models", status: data?.tpls ?? "missing" },
    { key: "publishedTpl", label: "Modelos publicados", to: "/admin/docs-central/publishing", status: data?.publishedTpl ?? "missing" },
    { key: "fields", label: "Campos / Placeholders", to: "/admin/docs-central/fields", status: data?.fields ?? "missing" },
    { key: "mappings", label: "Mapeamentos ativos", to: "/admin/docs-central/mappings", status: data?.mappings ?? "missing" },
    { key: "ocr", label: "OCR", to: "/admin/ocr", status: "partial" },
    { key: "signatures", label: "Assinaturas", to: "/assinaturas", status: "partial" },
    { key: "portal", label: "Portal do Cliente", to: "/client-portal", status: "partial" },
    { key: "ai", label: "IA", to: "/admin/global", status: "partial" },
    { key: "dossier", label: "Dossiê", status: "partial" },
  ];

  const okCount = steps.filter((s) => s.status === "ok").length;
  const partialCount = steps.filter((s) => s.status === "partial").length;
  const percent = Math.round(((okCount + partialCount * 0.5) / steps.length) * 100);

  return (
    <div>
      <PageTitle title="Assistente de Configuração" description="Enterprise Documentation Central v2.0" />
      {isLoading && <p className="text-sm text-slate-500 mb-4">Analisando ambiente...</p>}
      <Card className="p-6 border-slate-100 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-semibold text-navy">Configuração geral</p>
          <p className="text-2xl font-bold text-primary">{percent}%</p>
        </div>
        <ProgressBar value={percent} />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {steps.map((s) => {
          const inner = (
            <Card className="p-4 border-slate-100 hover:shadow-md transition-shadow flex items-center gap-4">
              <StatusIcon s={s.status} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">{s.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {s.status === "ok" ? "Configurado" : s.status === "partial" ? "Parcialmente configurado" : "Não configurado"}
                </p>
              </div>
              {s.to && <span className="text-[10px] font-bold uppercase text-primary">Configurar →</span>}
            </Card>
          );
          return s.to ? <Link key={s.key} to={s.to as any}>{inner}</Link> : <div key={s.key}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
