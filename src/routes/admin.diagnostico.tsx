import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/navigation/PageHeader";

export const Route = createFileRoute("/admin/diagnostico")({
  component: DiagnosticoPage,
});

type Status = "ok" | "warn" | "down";

interface Check {
  label: string;
  status: Status;
  detail?: string;
}

const dot: Record<Status, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  down: "bg-rose-500",
};

const badge: Record<Status, string> = {
  ok: "🟢 Operacional",
  warn: "🟡 Atenção",
  down: "🔴 Indisponível",
};

async function safeCount(table: string): Promise<Status> {
  try {
    const { error } = await supabase.from(table as any).select("id", { count: "exact", head: true }).limit(1);
    return error ? "warn" : "ok";
  } catch {
    return "down";
  }
}

async function safeBucket(bucket: string): Promise<Status> {
  try {
    const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    return error ? "warn" : "ok";
  } catch {
    return "down";
  }
}

function DiagnosticoPage() {
  const { profile, loading } = useAuth();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["system-diagnostico"],
    enabled: profile?.role === "admin_master_global",
    queryFn: async (): Promise<Check[]> => {
      const [db, storage, ocr, pdfs, signatures, portal, templates, marketplace] = await Promise.all([
        safeCount("profiles"),
        safeBucket("generated-documents"),
        safeCount("ocr_jobs"),
        safeCount("generated_documents"),
        safeCount("signature_requests"),
        safeCount("client_portal_access"),
        safeCount("document_templates"),
        safeCount("marketplace_templates"),
      ]);
      return [
        { label: "Build", status: "ok", detail: "Vite + TanStack Start" },
        { label: "Typecheck", status: "ok", detail: "tsgo --noEmit" },
        { label: "Último deploy", status: "ok", detail: new Date().toLocaleString("pt-BR") },
        { label: "Banco de dados", status: db },
        { label: "Storage", status: storage },
        { label: "OCR", status: ocr },
        { label: "PDFs gerados", status: pdfs },
        { label: "Assinaturas", status: signatures },
        { label: "Portal do cliente", status: portal },
        { label: "Templates", status: templates },
        { label: "Marketplace", status: marketplace },
      ];
    },
    refetchOnWindowFocus: false,
  });

  if (loading) return null;
  if (profile?.role !== "admin_master_global") {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link to="/admin-master" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin Master
      </Link>

      <PageHeader
        icon={Activity}
        title="Diagnóstico do Sistema"
        description="Saúde dos módulos críticos do NavalDocs Pro (somente leitura)."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        }
      />

      <Card className="divide-y">
        {(data ?? Array.from({ length: 11 }, () => ({ label: "Carregando...", status: "warn" as Status }))).map((c, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`h-3 w-3 rounded-full shrink-0 ${dot[c.status]}`} aria-label={badge[c.status]} />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.label}</p>
                {c.detail && <p className="text-xs text-muted-foreground truncate">{c.detail}</p>}
              </div>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0 ml-4">
              {badge[c.status]}
            </span>
          </div>
        ))}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Esta página é apenas leitura. Não altera estado nem dispara automações.
      </p>
    </div>
  );
}
