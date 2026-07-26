import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RELEASE } from '@/lib/release';
import { isPilotMode, setPilotMode } from '@/lib/pilot-mode';
import {
  Activity, AlertTriangle, Building2, CheckCircle2, Clock, FileSignature,
  FileText, Gauge, RefreshCcw, ScanLine, Users, Workflow, Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Counters {
  companies: number;
  users: number;
  processes: number;
  ocr: number;
  actions: number;
  documents: number;
  signatures: number;
}

interface OpsMetrics {
  avgDurationMs: number;
  successRate: number;
  total: number;
  perModule: { module: string; total: number; failures: number; avgMs: number }[];
}

interface Incident {
  id: string;
  title: string;
  priority: string | null;
  status: string | null;
  module: string | null;
  owner: string | null;
  starts_at: string | null;
  closed_at: string | null;
}

const PRIORITY_STYLE: Record<string, string> = {
  p0: 'bg-red-50 text-red-600 border-red-200',
  p1: 'bg-orange-50 text-orange-600 border-orange-200',
  p2: 'bg-amber-50 text-amber-600 border-amber-200',
  p3: 'bg-slate-50 text-slate-500 border-slate-200',
};

async function countOf(table: string) {
  const { count } = await supabase
    .from(table as any)
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export default function PilotDashboard() {
  const [loading, setLoading] = useState(true);
  const [pilot, setPilot] = useState(isPilotMode());
  const [counters, setCounters] = useState<Counters | null>(null);
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [errorsByModule, setErrorsByModule] = useState<{ module: string; total: number }[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [companies, users, processes, ocr, actions, documents, signatures] = await Promise.all([
        countOf('companies'),
        countOf('profiles'),
        countOf('processes'),
        countOf('ocr_jobs'),
        countOf('ai_action_audits'),
        countOf('generated_documents'),
        countOf('signature_requests'),
      ]);
      setCounters({ companies, users, processes, ocr, actions, documents, signatures });

      const { data: logs } = await supabase
        .from('telemetry_logs')
        .select('module_name, duration_ms, event_type')
        .in('event_type', ['operation_success', 'operation_failure'])
        .order('created_at', { ascending: false })
        .limit(1000);

      const rows = logs ?? [];
      const grouped = new Map<string, { total: number; failures: number; sum: number; withMs: number }>();
      rows.forEach((r: any) => {
        const key = r.module_name ?? 'desconhecido';
        const g = grouped.get(key) ?? { total: 0, failures: 0, sum: 0, withMs: 0 };
        g.total += 1;
        if (r.event_type === 'operation_failure') g.failures += 1;
        if (typeof r.duration_ms === 'number') {
          g.sum += r.duration_ms;
          g.withMs += 1;
        }
        grouped.set(key, g);
      });
      const totalMs = rows.reduce((acc: number, r: any) => acc + (r.duration_ms ?? 0), 0);
      const withMs = rows.filter((r: any) => typeof r.duration_ms === 'number').length;
      const failures = rows.filter((r: any) => r.event_type === 'operation_failure').length;
      setMetrics({
        total: rows.length,
        avgDurationMs: withMs ? Math.round(totalMs / withMs) : 0,
        successRate: rows.length ? ((rows.length - failures) / rows.length) * 100 : 100,
        perModule: Array.from(grouped.entries())
          .map(([module, g]) => ({
            module,
            total: g.total,
            failures: g.failures,
            avgMs: g.withMs ? Math.round(g.sum / g.withMs) : 0,
          }))
          .sort((a, b) => b.total - a.total),
      });

      const { data: errs } = await supabase
        .from('frontend_errors' as any)
        .select('metadata, route')
        .order('created_at', { ascending: false })
        .limit(500);
      const errGroups = new Map<string, number>();
      (errs as any[] | null)?.forEach((e) => {
        const key = e?.metadata?.module ?? e?.route ?? 'desconhecido';
        errGroups.set(key, (errGroups.get(key) ?? 0) + 1);
      });
      setErrorsByModule(
        Array.from(errGroups.entries())
          .map(([module, total]) => ({ module, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8),
      );

      const { data: inc } = await supabase
        .from('system_incidents')
        .select('id, title, priority, status, module, owner, starts_at, closed_at')
        .order('starts_at', { ascending: false })
        .limit(10);
      setIncidents((inc as any as Incident[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const togglePilot = () => {
    const next = !pilot;
    setPilotMode(next);
    setPilot(next);
  };

  const cards = [
    { label: 'Empresas participantes', value: counters?.companies, icon: Building2 },
    { label: 'Usuários ativos', value: counters?.users, icon: Users },
    { label: 'Processos criados', value: counters?.processes, icon: Workflow },
    { label: 'OCR executados', value: counters?.ocr, icon: ScanLine },
    { label: 'Action Engine', value: counters?.actions, icon: Zap },
    { label: 'Documentos emitidos', value: counters?.documents, icon: FileText },
    { label: 'Assinaturas realizadas', value: counters?.signatures, icon: FileSignature },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Fase 4 · {RELEASE.version}
          </span>
          <h1 className="text-3xl font-semibold text-navy">Dashboard Operacional do Piloto</h1>
          <p className="text-sm text-muted-foreground">
            Estabilidade, confiabilidade e monitoramento das operações críticas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePilot}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              pilot
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            Modo Piloto: {pilot ? 'ativo' : 'inativo'}
          </button>
          <button
            onClick={() => void load()}
            className="p-3 rounded-2xl bg-navy text-white hover:opacity-90 transition-all"
            aria-label="Atualizar métricas"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-3xl p-6 space-y-3">
            <Icon className="h-5 w-5 text-primary" />
            <p className="text-3xl font-semibold text-navy">{loading ? '—' : (value ?? 0)}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-3">
          <Clock className="h-5 w-5 text-primary" />
          <p className="text-3xl font-semibold text-navy">
            {loading ? '—' : `${metrics?.avgDurationMs ?? 0}ms`}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Tempo médio das operações
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-500" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Taxa de sucesso
            </h2>
          </div>
          <p className="text-4xl font-semibold text-navy">
            {loading ? '—' : `${(metrics?.successRate ?? 100).toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            Baseado nas últimas {metrics?.total ?? 0} operações monitoradas.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Operações por módulo
            </h2>
          </div>
          {metrics?.perModule.length ? (
            <div className="space-y-2">
              {metrics.perModule.map((m) => (
                <div key={m.module} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-navy">{m.module}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.total} exec · {m.avgMs}ms · {m.failures} falhas
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma operação monitorada registrada ainda.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Erros por módulo
            </h2>
          </div>
          {errorsByModule.length ? (
            <div className="space-y-2">
              {errorsByModule.map((e) => (
                <div key={e.module} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-navy truncate">{e.module}</span>
                  <span className="text-red-500 font-bold text-xs">{e.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nenhum erro registrado.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Últimos incidentes
          </h2>
          {incidents.length ? (
            <div className="space-y-3">
              {incidents.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{i.title}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {i.module ?? 'geral'} · {i.owner ?? 'sem responsável'} ·{' '}
                      {i.starts_at
                        ? format(new Date(i.starts_at), "dd/MM/yy HH:mm", { locale: ptBR })
                        : '—'}
                      {i.closed_at
                        ? ` → ${format(new Date(i.closed_at), 'dd/MM/yy HH:mm', { locale: ptBR })}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${
                      PRIORITY_STYLE[i.priority ?? 'p2'] ?? PRIORITY_STYLE.p2
                    }`}
                  >
                    {(i.priority ?? 'p2').toUpperCase()} · {i.status ?? 'aberto'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum incidente registrado.</p>
          )}
        </div>
      </section>
    </div>
  );
}
