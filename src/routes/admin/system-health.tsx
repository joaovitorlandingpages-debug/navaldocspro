import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText, Zap,
  ShieldCheck, RefreshCw, Database, ScanText, FileSignature,
  Archive, TrendingUp, Users
} from "lucide-react";

export const Route = createFileRoute("/admin/system-health")({
  component: SystemHealthDashboard,
});

const REFRESH_MS = 30_000;

type Metric = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "ok" | "warn" | "error" | "neutral";
  icon: any;
};

type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
};

function SystemHealthDashboard() {
  const { profile, loading } = useAuth();

  const isAdmin =
    profile?.role === "admin_master" ||
    profile?.role === "admin_master_global" ||
    profile?.email === "joaovitor.f0725@gmail.com";

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["system-health-snapshot"],
    queryFn: fetchSnapshot,
    enabled: !!isAdmin,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS / 2,
  });

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  const metrics: Metric[] = data ? buildMetrics(data) : [];
  const alerts: Alert[] = data ? buildAlerts(data) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-navy flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" /> System Health
          </h1>
          <p className="text-slate-500 text-sm">
            Observabilidade em tempo real — OCR, PDFs, Dossiês, Assinaturas, Auditoria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {dataUpdatedAt ? `Atualizado ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "—"}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {/* Alerts */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
          Alertas ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Nenhum alerta ativo</p>
              <p className="text-xs text-emerald-700">Todos os subsistemas estão dentro dos limites.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  a.severity === "critical" ? "bg-rose-50 border-rose-200" :
                  a.severity === "warning" ? "bg-amber-50 border-amber-200" :
                  "bg-slate-50 border-slate-200"
                }`}
              >
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                  a.severity === "critical" ? "text-rose-600" :
                  a.severity === "warning" ? "text-amber-600" : "text-slate-500"
                }`} />
                <div className="min-w-0">
                  <p className="font-bold text-navy text-sm">{a.title}</p>
                  <p className="text-xs text-slate-600">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Metrics grid */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
          Métricas ({isLoading ? "carregando…" : "últimas 24h"})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {isLoading && !data ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))
          ) : (
            metrics.map(m => <MetricCard key={m.label} m={m} />)
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  const Icon = m.icon;
  const toneCls =
    m.tone === "ok" ? "text-emerald-600" :
    m.tone === "warn" ? "text-amber-600" :
    m.tone === "error" ? "text-rose-600" : "text-navy";
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {m.label}
        </span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`text-2xl font-semibold ${toneCls}`}>{m.value}</p>
      {m.hint && <p className="text-[10px] text-slate-400 mt-1">{m.hint}</p>}
    </div>
  );
}

// -------- data --------

type Snapshot = {
  now: string;
  ocr: { pending: number; processing: number; completed: number; failed: number; avgMs: number | null; stuck: number };
  docs: { total24h: number; error24h: number; avgTodayCount: number };
  dossiers: { total24h: number; failed24h: number };
  signatures: { pending: number; completed: number; expired: number };
  auditors: { events24h: number; overrides24h: number };
  ai: { requests24h: number; tokens24h: number; costUsd24h: number };
  incidents: { open: number };
};

async function fetchSnapshot(): Promise<Snapshot> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const stuckCutoff = new Date(now.getTime() - 10 * 60_000).toISOString();

  const [
    ocrPending, ocrProcessing, ocrCompleted, ocrFailed, ocrAvg, ocrStuck,
    docs24h, docsError24h,
    dossiers24h, dossiersFailed24h,
    sigPending, sigCompleted, sigExpired,
    audit24h, override24h,
    aiUsage24h,
    incidents,
  ] = await Promise.all([
    countRows("ocr_jobs", q => q.eq("status", "pending")),
    countRows("ocr_jobs", q => q.eq("status", "processing")),
    countRows("ocr_jobs", q => q.eq("status", "completed").gte("created_at", since24h)),
    countRows("ocr_jobs", q => q.eq("status", "failed").gte("created_at", since24h)),
    avgProcessing(),
    countRows("ocr_jobs", q => q.eq("status", "processing").lt("updated_at", stuckCutoff)),
    countRows("generated_documents", q => q.gte("created_at", since24h)),
    countRows("generated_documents", q => q.eq("status", "error").gte("created_at", since24h)),
    countRows("process_dossiers", q => q.gte("created_at", since24h)),
    countRows("process_dossiers", q => q.eq("status", "failed").gte("created_at", since24h)),
    countRows("signature_requests", q => q.eq("status", "pending")),
    countRows("signature_requests", q => q.eq("status", "completed").gte("created_at", since24h)),
    countRows("signature_requests", q => q.eq("status", "expired").gte("expires_at", since24h)),
    countRows("audit_logs", q => q.gte("created_at", since24h)),
    countRows("audit_logs", q => q.gte("created_at", since24h).ilike("action", "%override%")),
    aiUsageSince(since24h),
    countRows("system_incidents", q => q.neq("status", "resolved")),
  ]);

  return {
    now: now.toISOString(),
    ocr: {
      pending: ocrPending, processing: ocrProcessing,
      completed: ocrCompleted, failed: ocrFailed,
      avgMs: ocrAvg, stuck: ocrStuck,
    },
    docs: { total24h: docs24h, error24h: docsError24h, avgTodayCount: docs24h },
    dossiers: { total24h: dossiers24h, failed24h: dossiersFailed24h },
    signatures: { pending: sigPending, completed: sigCompleted, expired: sigExpired },
    auditors: { events24h: audit24h, overrides24h: override24h },
    ai: aiUsage24h,
    incidents: { open: incidents },
  };
}

async function countRows(
  table: string,
  build: (q: any) => any,
): Promise<number> {
  try {
    const base: any = supabase.from(table as any).select("*", { count: "exact", head: true });
    const { count, error } = await build(base);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function avgProcessing(): Promise<number | null> {
  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data } = await supabase
      .from("ocr_jobs")
      .select("processing_time")
      .eq("status", "completed")
      .gte("created_at", since)
      .not("processing_time", "is", null)
      .limit(200);
    if (!data || data.length === 0) return null;
    const vals = data.map((r: any) => Number(r.processing_time)).filter((n: number) => Number.isFinite(n));
    if (!vals.length) return null;
    return Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length);
  } catch {
    return null;
  }
}

async function aiUsageSince(since: string) {
  try {
    const { data } = await supabase
      .from("ai_usage_stats")
      .select("request_count, tokens_input, tokens_output, estimated_cost")
      .gte("recorded_at", since);
    const rows = data || [];
    const requests = rows.reduce((s: number, r: any) => s + (r.request_count || 0), 0);
    const tokens = rows.reduce((s: number, r: any) => s + (r.tokens_input || 0) + (r.tokens_output || 0), 0);
    const cost = rows.reduce((s: number, r: any) => s + Number(r.estimated_cost || 0), 0);
    return { requests24h: requests, tokens24h: tokens, costUsd24h: Number(cost.toFixed(2)) };
  } catch {
    return { requests24h: 0, tokens24h: 0, costUsd24h: 0 };
  }
}

// -------- derivations --------

function buildMetrics(s: Snapshot): Metric[] {
  return [
    { label: "OCR — Fila", value: s.ocr.pending + s.ocr.processing, hint: `${s.ocr.pending} pend · ${s.ocr.processing} proc`, tone: s.ocr.processing > 20 ? "warn" : "neutral", icon: ScanText },
    { label: "OCR — Concluídos 24h", value: s.ocr.completed, tone: "ok", icon: CheckCircle2 },
    { label: "OCR — Falhas 24h", value: s.ocr.failed, tone: s.ocr.failed > 5 ? "error" : s.ocr.failed > 0 ? "warn" : "ok", icon: AlertTriangle },
    { label: "OCR — Tempo médio", value: s.ocr.avgMs != null ? `${(s.ocr.avgMs / 1000).toFixed(1)}s` : "—", icon: Clock },
    { label: "PDFs gerados 24h", value: s.docs.total24h, tone: "ok", icon: FileText },
    { label: "PDFs com erro 24h", value: s.docs.error24h, tone: s.docs.error24h > 0 ? "error" : "ok", icon: AlertTriangle },
    { label: "Dossiês 24h", value: s.dossiers.total24h, icon: Archive },
    { label: "Dossiês falhados", value: s.dossiers.failed24h, tone: s.dossiers.failed24h > 0 ? "error" : "ok", icon: AlertTriangle },
    { label: "Assinaturas pendentes", value: s.signatures.pending, tone: s.signatures.pending > 50 ? "warn" : "neutral", icon: FileSignature },
    { label: "Assinaturas concluídas 24h", value: s.signatures.completed, tone: "ok", icon: ShieldCheck },
    { label: "Auditoria — Eventos 24h", value: s.auditors.events24h, icon: Database },
    { label: "Overrides admin 24h", value: s.auditors.overrides24h, tone: s.auditors.overrides24h > 0 ? "warn" : "ok", icon: Users },
    { label: "IA — Requests 24h", value: s.ai.requests24h, icon: Zap },
    { label: "IA — Tokens 24h", value: s.ai.tokens24h.toLocaleString("pt-BR"), icon: TrendingUp },
    { label: "IA — Custo 24h (USD)", value: `$${s.ai.costUsd24h.toFixed(2)}`, tone: s.ai.costUsd24h > 50 ? "warn" : "neutral", icon: TrendingUp },
    { label: "Incidentes abertos", value: s.incidents.open, tone: s.incidents.open > 0 ? "error" : "ok", icon: AlertTriangle },
  ];
}

function buildAlerts(s: Snapshot): Alert[] {
  const out: Alert[] = [];
  if (s.ocr.stuck > 0) {
    out.push({
      id: "ocr-stuck",
      severity: "critical",
      title: `${s.ocr.stuck} job(s) OCR presos em 'processing' > 10min`,
      detail: "Investigar edge function process-ocr-document e conexão com o provedor.",
    });
  }
  if (s.ocr.failed > 5) {
    out.push({
      id: "ocr-failure-rate",
      severity: "warning",
      title: `OCR: ${s.ocr.failed} falhas nas últimas 24h`,
      detail: "Taxa de falha elevada. Verifique logs da função e cotas de IA.",
    });
  }
  if (s.docs.error24h > 0) {
    out.push({
      id: "pdf-errors",
      severity: s.docs.error24h > 3 ? "critical" : "warning",
      title: `${s.docs.error24h} PDF(s) com erro nas últimas 24h`,
      detail: "Reveja templates recém-alterados e placeholders inválidos.",
    });
  }
  if (s.dossiers.failed24h > 0) {
    out.push({
      id: "dossier-fail",
      severity: "warning",
      title: `${s.dossiers.failed24h} dossiê(s) falharam em 24h`,
      detail: "Rodar reprocessamento manual e checar snapshots inconsistentes.",
    });
  }
  if (s.signatures.pending > 100) {
    out.push({
      id: "sig-backlog",
      severity: "warning",
      title: `Assinaturas pendentes acima do limite (${s.signatures.pending})`,
      detail: "Backlog grande — considere lembretes automáticos aos signatários.",
    });
  }
  if (s.auditors.overrides24h > 0) {
    out.push({
      id: "admin-overrides",
      severity: "info",
      title: `${s.auditors.overrides24h} override(s) admin em 24h`,
      detail: "Ações administrativas foram executadas — reveja em /admin/logs.",
    });
  }
  if (s.incidents.open > 0) {
    out.push({
      id: "open-incidents",
      severity: "critical",
      title: `${s.incidents.open} incidente(s) aberto(s)`,
      detail: "Verifique system_incidents para triagem.",
    });
  }
  if (s.ai.costUsd24h > 50) {
    out.push({
      id: "ai-cost",
      severity: "warning",
      title: `Custo IA nas últimas 24h: $${s.ai.costUsd24h.toFixed(2)}`,
      detail: "Consumo elevado — revisar prompts, cache e batching.",
    });
  }
  return out;
}
