import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList, Search, Plus,
  ArrowRight, Calendar, User, Ship, Loader2,
  Clock, Package, FileSignature, FolderArchive, Filter, ArrowUpDown,
  AlertTriangle, Star, Archive, Trash2
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProcessActionsMenu } from "@/components/processes/ProcessActionsMenu";

export const Route = createFileRoute("/processes")({
  component: Processes,
});

type SortKey = "recent" | "updated" | "due" | "priority";
type StatusFilter = "all" | "active" | "pending_signature" | "completed" | "late";
type PriorityFilter = "all" | "high" | "medium" | "low";

function Processes() {
  const [view, setView] = useState<"crm" | "kanban" | "list">("crm");

  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const pageSize = 12;

  const { setIsNewProcessOpen } = useNewProcess();
  const { checkLimit } = usePlanLimits();
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; current: number; limit: number | null }>({
    isOpen: false,
    current: 0,
    limit: null
  });

  const fetchProcesses = useCallback(async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) { setIsLoading(false); return; }

      let query = supabase
        .from('processes')
        .select('*, customers(name), vessels(name)', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .is('archived_at', null)
        .is('trashed_at', null);

      if (searchTerm) {
        const term = `%${searchTerm}%`;
        query = query.or(`process_type.ilike.${term},title.ilike.${term},protocol_number.ilike.${term}`);
      }

      if (statusFilter === "completed") query = query.eq('status', 'completed');
      else if (statusFilter === "pending_signature") query = query.eq('status', 'waiting_signature');
      else if (statusFilter === "active") query = query.not('status', 'in', '(completed,cancelled)');
      else if (statusFilter === "late") query = query.lt('due_date', new Date().toISOString().slice(0, 10)).not('status', 'in', '(completed,cancelled)');

      if (priorityFilter !== "all") query = query.eq('priority', priorityFilter);

      const orderColumn =
        sort === "updated" ? 'updated_at' :
        sort === "due" ? 'due_date' :
        sort === "priority" ? 'priority_score' : 'created_at';
      const orderAsc = sort === "due";

      const { data, count, error } = await query
        .order(orderColumn, { ascending: orderAsc, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (data) setProcesses(data);
      if (count !== null) setTotalCount(count);
      if (error) console.error("Error fetching processes:", error);
      setIsLoading(false);
  }, [page, searchTerm, statusFilter, priorityFilter, sort]);

  useEffect(() => {
    const debounceTimer = setTimeout(fetchProcesses, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchProcesses]);


  const columns = [
    { id: "pending", title: "Novo", color: "bg-red-500" },
    { id: "in_progress", title: "Em andamento", color: "bg-blue-500" },
    { id: "waiting_docs", title: "Aguardando documentos", color: "bg-amber-500" },
    { id: "review", title: "Em revisão", color: "bg-purple-500" },
    { id: "ready_to_generate", title: "Pronto para geração", color: "bg-indigo-500" },
    { id: "waiting_signature", title: "Aguardando assinatura", color: "bg-orange-500" },
    { id: "protocolado", title: "Protocolado", color: "bg-cyan-500" },
    { id: "completed", title: "Finalizado", color: "bg-green-500" },
  ];

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "active", label: "Ativos" },
    { id: "pending_signature", label: "Aguardando assinatura" },
    { id: "late", label: "Atrasados" },
    { id: "completed", label: "Finalizados" },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <PageHeader
        title="Fluxo de Processos"
        description="Acompanhamento operacional em tempo real."
        actions={
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
              {(["crm", "kanban", "list"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === v ? 'bg-white shadow-sm text-navy' : 'text-slate-500'}`}
                >
                  {v === "crm" ? "CRM" : v === "kanban" ? "Kanban" : "Lista"}
                </button>
              ))}
            </div>

            <Link
              to="/processes/archived"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-primary hover:border-primary/40"
            >
              <Archive className="h-3.5 w-3.5" /> Arquivados
            </Link>
            <Link
              to="/processes/trash"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-red-600 hover:border-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Lixeira
            </Link>

            <button
              onClick={async () => {
                const limit = await checkLimit('processes');
                if (limit.reached) {
                  setUpgradeModal({ isOpen: true, current: limit.current, limit: limit.limit });
                  return;
                }
                setIsNewProcessOpen(true);
              }}
              className="flex-grow sm:flex-initial bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              <Plus className="h-4 w-4 inline mr-2" /> Novo Processo
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Buscar por tipo, título ou protocolo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as PriorityFilter); setPage(1); }}
              className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm focus:ring-4 focus:ring-primary/10 appearance-none"
            >
              <option value="all">Prioridade: Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm focus:ring-4 focus:ring-primary/10 appearance-none"
            >
              <option value="recent">Mais recentes</option>
              <option value="updated">Última atualização</option>
              <option value="due">Prazo mais próximo</option>
              <option value="priority">Maior prioridade</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusTabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setStatusFilter(t.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusFilter === t.id ? 'bg-navy text-white border-navy shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40 hover:text-primary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {processes.length === 0 && !isLoading && (
        <div className="mb-8">
          <EmptyState
            icon={ClipboardList}
            title="Nenhum processo encontrado"
            description="Ajuste os filtros ou clique em 'Novo Processo' para iniciar um atendimento."
            actionLabel="Iniciar Novo Processo"
            onAction={() => setIsNewProcessOpen(true)}
          />
        </div>
      )}

      {view === "crm" ? (
        <CrmGrid
          processes={processes}
          isLoading={isLoading}
          columns={columns}
          onNewProcess={() => setIsNewProcessOpen(true)}
          onChanged={fetchProcesses}
        />
      ) : view === "kanban" ? (

        <div className="flex gap-4 md:gap-8 overflow-x-auto pb-8 min-h-[600px] md:min-h-[700px] custom-scrollbar px-2">
          {columns.map((col) => {
            const columnProcesses = processes.filter(p => p.status === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                    <h3 className="font-black text-navy text-[10px] uppercase tracking-[0.15em]">{col.title}</h3>
                    <span className="bg-slate-200/50 text-navy/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                      {columnProcesses.length}
                    </span>
                  </div>
                  <button onClick={() => setIsNewProcessOpen(true)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-300 transition-colors"><Plus className="h-4 w-4" /></button>
                </div>

                <div className="flex-grow bg-slate-100/30 rounded-[2.5rem] p-5 space-y-5 border border-slate-100/50 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                  {isLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300 mx-auto" />
                    </div>
                  ) : columnProcesses.length > 0 ? (
                    columnProcesses.map((p) => (
                      <Link
                        key={p.id}
                        to="/processes/$id" params={{ id: p.id }}
                        className="block bg-white p-5 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-primary/40 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter border border-primary/10">PROC-{p.id.substring(0, 6)}</span>
                          {p.priority && <PriorityChip priority={p.priority} />}
                        </div>

                        <h4 className="font-black text-navy text-[13px] mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">{p.title || p.process_type}</h4>

                        <div className="space-y-2 pb-3 mb-3 border-b border-slate-50">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 min-w-0">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{p.customers?.name || "Cliente"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 min-w-0">
                            <Ship className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{p.vessels?.name || "Sem embarcação"}</span>
                          </div>
                        </div>

                        <ProgressBar value={p.completion_percentage} />

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                          <DueLabel dueDate={p.due_date} />
                          <span className="text-[10px] font-black uppercase text-primary group-hover:translate-x-1 transition-transform">Abrir</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-8 px-4 opacity-80 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center">
                      <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Package className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa sem processos</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">PROCESSO / TIPO</th>
                  <th className="px-6 py-4">CLIENTE</th>
                  <th className="px-6 py-4">EMBARCAÇÃO</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">PROGRESSO</th>
                  <th className="px-6 py-4">PRAZO</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : processes.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center"><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum processo encontrado</p></td></tr>
                ) : processes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to="/processes/$id" params={{ id: p.id }} className="block">
                        <div className="font-bold text-navy text-sm">{p.title || p.process_type}</div>
                        <div className="text-[10px] text-primary font-mono font-black uppercase tracking-tighter">PROC-{p.id.substring(0, 6)}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{p.customers?.name || "---"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{p.vessels?.name || "---"}</td>
                    <td className="px-6 py-4">
                      <Badge className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border-none">
                        {columns.find(c => c.id === p.status)?.title || p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 w-40"><ProgressBar value={p.completion_percentage} compact /></td>
                    <td className="px-6 py-4 text-xs font-bold"><DueLabel dueDate={p.due_date} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link to="/processes/$id" params={{ id: p.id }}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowRight className="h-4 w-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : processes.length === 0 ? (
              <div className="p-10 text-center"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nenhum processo</p></div>
            ) : processes.map((p) => (
              <Link key={p.id} to="/processes/$id" params={{ id: p.id }} className="block p-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-navy text-sm truncate">{p.title || p.process_type}</div>
                    <div className="text-[9px] text-primary font-mono font-black uppercase">PROC-{p.id.substring(0, 6)}</div>
                  </div>
                  <Badge className="shrink-0 text-[7px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
                    {columns.find(c => c.id === p.status)?.title || p.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5 overflow-hidden"><User className="h-3 w-3 shrink-0" /><span className="truncate">{p.customers?.name || "---"}</span></div>
                  <div className="flex items-center gap-1.5 overflow-hidden justify-end"><Ship className="h-3 w-3 shrink-0" /><span className="truncate">{p.vessels?.name || "---"}</span></div>
                </div>
                <ProgressBar value={p.completion_percentage} compact />
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isLoading && totalCount > 0 && (
        <div className="p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white rounded-b-[2rem]">
          <span>Mostrando {processes.length} de {totalCount} processos</span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[9px] uppercase font-black tracking-widest border-slate-200 bg-white" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>Anterior</Button>
            <span className="px-3 h-8 flex items-center bg-primary text-white rounded-lg shadow-sm">{page}</span>
            <span className="text-slate-300">/</span>
            <span className="px-3 h-8 flex items-center text-navy font-bold">{Math.ceil(totalCount / pageSize) || 1}</span>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[9px] uppercase font-black tracking-widest border-slate-200 bg-white" onClick={() => setPage(prev => prev + 1)} disabled={page >= Math.ceil(totalCount / pageSize)}>Próximo</Button>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        resource="processes"
        limit={upgradeModal.limit}
        current={upgradeModal.current}
      />
    </div>
  );
}

type Col = { id: string; title: string; color: string };

function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-100",
    medium: "bg-amber-50 text-amber-700 border-amber-100",
    low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  const cls = map[priority] || "bg-slate-50 text-slate-600 border-slate-100";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}>
      <Star className="h-2.5 w-2.5" />{priority}
    </span>
  );
}

function ProgressBar({ value, compact = false }: { value: number | null | undefined; compact?: boolean }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {!compact && (
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Progresso</span>
          <span className="text-navy">{value != null ? `${Math.round(v)}%` : "—"}</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all" style={{ width: `${v}%` }} />
      </div>
      {compact && <div className="text-[9px] font-black text-slate-400">{value != null ? `${Math.round(v)}%` : "—"}</div>}
    </div>
  );
}

function DueLabel({ dueDate }: { dueDate?: string | null }) {
  const info = useMemo(() => {
    if (!dueDate) return { label: "Sem prazo", tone: "text-slate-400", late: false };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, tone: "text-red-600", late: true };
    if (diff === 0) return { label: "Vence hoje", tone: "text-amber-600", late: false };
    if (diff <= 3) return { label: `Em ${diff}d`, tone: "text-amber-600", late: false };
    return { label: `Em ${diff}d`, tone: "text-slate-500", late: false };
  }, [dueDate]);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${info.tone}`}>
      {info.late ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {info.label}
    </span>
  );
}

function CrmGrid({
  processes,
  isLoading,
  columns,
  onNewProcess,
}: {
  processes: any[];
  isLoading: boolean;
  columns: Col[];
  onNewProcess: () => void;
}) {
  if (isLoading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!processes.length) return null;

  const statusMeta = (status: string) => {
    const found = columns.find((c) => c.id === status);
    return { title: found?.title || status, color: found?.color || "bg-slate-400" };
  };

  const fmtDate = (iso?: string | null) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); } catch { return null; }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 pb-8">
      {processes.map((p) => {
        const s = statusMeta(p.status);
        const created = fmtDate(p.created_at);
        const updated = fmtDate(p.updated_at);
        const pendingDocs = typeof p.pending_documents_count === "number" ? p.pending_documents_count : 0;
        const missingSigs = typeof p.missing_signatures_count === "number" ? p.missing_signatures_count : 0;
        return (
          <div
            key={p.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all overflow-hidden group flex flex-col"
          >
            <div className="p-5 sm:p-6 flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                      PROC-{p.id.substring(0, 6)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
                      {s.title}
                    </span>
                    {p.priority && <PriorityChip priority={p.priority} />}
                    {p.is_favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                  </div>
                  <h3 className="font-black text-navy text-sm leading-tight line-clamp-2" title={p.title || p.process_type}>
                    {p.title || p.process_type}
                  </h3>
                  {p.protocol_number && (
                    <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">Protocolo {p.protocol_number}</p>
                  )}
                </div>
                <ProcessActionsMenu process={p} onChanged={onChanged} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-600 border-y border-slate-50 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate" title={p.customers?.name || ""}>{p.customers?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Ship className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate" title={p.vessels?.name || ""}>{p.vessels?.name || "Sem embarcação"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 min-w-0">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">Abertura {created || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 min-w-0">
                  <DueLabel dueDate={p.due_date} />
                </div>
              </div>

              <ProgressBar value={p.completion_percentage} />

              <div className="flex flex-wrap items-center gap-2">
                {pendingDocs > 0 && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-amber-50 border-amber-100 text-amber-700">
                    {pendingDocs} doc pendente{pendingDocs > 1 ? 's' : ''}
                  </Badge>
                )}
                {missingSigs > 0 && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-orange-50 border-orange-100 text-orange-700">
                    {missingSigs} assinatura{missingSigs > 1 ? 's' : ''}
                  </Badge>
                )}
                {p.sla_status === 'overdue' && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-red-50 border-red-100 text-red-700">
                    SLA estourado
                  </Badge>
                )}
                {updated && (
                  <span className="ml-auto text-[10px] font-bold text-slate-400">
                    Atualizado {updated}
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-slate-50 bg-slate-50/40 flex items-center justify-between gap-2 flex-wrap">
              <Link
                to="/processes/$id" params={{ id: p.id }}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-primary"
              >
                Abrir <ArrowRight className="h-3 w-3" />
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  to="/processes/$id" params={{ id: p.id }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200"
                  title="Assinaturas"
                >
                  <FileSignature className="h-3 w-3" /> Assinaturas
                </Link>
                <Link
                  to="/processes/$id" params={{ id: p.id }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200"
                  title="Dossiê"
                >
                  <FolderArchive className="h-3 w-3" /> Dossiê
                </Link>
                <Link
                  to="/processes/$id" params={{ id: p.id }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white bg-primary hover:opacity-90"
                >
                  Continuar
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onNewProcess}
        className="rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[260px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary"
      >
        <Plus className="h-6 w-6" />
        <span className="text-[10px] font-black uppercase tracking-widest">Novo Processo</span>
      </button>
    </div>
  );
}
