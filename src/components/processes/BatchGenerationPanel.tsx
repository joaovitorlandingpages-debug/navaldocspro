/**
 * BatchGenerationPanel — área dedicada "Gerar documentos em lote" dentro do Workspace.
 *
 * Reaproveita batchChecklistActions (generate/download/signature) sem alterar
 * o Blueprint Engine, o SmartChecklist ou os botões individuais dos SmartCards.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  batchGenerate, batchDownload,
  type BatchReport, type BatchSignatureReport, type ChecklistLite,
} from "@/services/processes/batchChecklistActions";
import { BatchSignatureDialog } from "./BatchSignatureDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Loader2, Sparkles, Download, Signature, FileText,
  ShieldCheck, PackageOpen, GitBranch, CheckCircle2, AlertTriangle,
  XCircle, Layers, Eye, ArrowRight,
} from "lucide-react";

type ChecklistRow = {
  id: string;
  item_name: string;
  status: string | null;
  is_mandatory: boolean | null;
  is_conditional: boolean | null;
  requires_signature: boolean | null;
  document_id: string | null;
  template_id: string | null;
  sort_order: number | null;
};

type PresetKey = "all" | "mandatory" | "pending" | "conditional" | "optional";

interface Props {
  processId: string;
  process: any;
  createdBy?: string;
  onOpenTab: (tab: string) => void;
  onFocusItem?: (checklistId: string, action: "gerar" | "editar" | "anexar" | "assinar" | "historico") => void;
  onChanged?: () => void;
}

function isDone(r: ChecklistRow): boolean {
  const s = (r.status || "").toLowerCase();
  return !!r.document_id || ["completed", "done", "ok", "generated", "attached", "signed"].includes(s);
}

function isAlreadyGenerated(r: ChecklistRow): boolean {
  const s = (r.status || "").toLowerCase();
  return !!r.document_id || ["generated", "completed", "signed"].includes(s);
}

export function BatchGenerationPanel({
  processId, process, createdBy, onOpenTab, onFocusItem, onChanged,
}: Props) {
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<PresetKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<null | "generate" | "download">(null);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [report, setReport] = useState<BatchReport | null>(null);
  const [sigReport, setSigReport] = useState<BatchSignatureReport | null>(null);
  const [sigDialogOpen, setSigDialogOpen] = useState(false);

  const { data: checklist = [], refetch, isLoading } = useQuery({
    queryKey: ["batch-panel-checklist", processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_checklists")
        .select("id,item_name,status,is_mandatory,is_conditional,requires_signature,document_id,template_id,sort_order")
        .eq("process_id", processId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistRow[];
    },
    enabled: !!processId,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return checklist.filter((r) => {
      if (q && !r.item_name.toLowerCase().includes(q)) return false;
      switch (preset) {
        case "mandatory":  return !!r.is_mandatory && !r.is_conditional;
        case "conditional": return !!r.is_conditional;
        case "optional":   return !r.is_mandatory && !r.is_conditional;
        case "pending":    return !isDone(r);
        case "all":
        default:           return true;
      }
    });
  }, [checklist, query, preset]);

  const counts = useMemo(() => ({
    total: checklist.length,
    mandatory: checklist.filter((r) => r.is_mandatory && !r.is_conditional).length,
    conditional: checklist.filter((r) => r.is_conditional).length,
    optional: checklist.filter((r) => !r.is_mandatory && !r.is_conditional).length,
    pending: checklist.filter((r) => !isDone(r)).length,
  }), [checklist]);

  const selectedRows = useMemo(
    () => checklist.filter((r) => selected.has(r.id)),
    [checklist, selected],
  );
  const selectedItems: ChecklistLite[] = useMemo(
    () => selectedRows.map((r) => ({
      id: r.id, item_name: r.item_name, template_id: r.template_id,
      document_id: r.document_id, requires_signature: r.requires_signature,
    })),
    [selectedRows],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const selectFiltered = useCallback(() => {
    setSelected((prev) => {
      const n = new Set(prev);
      filtered.forEach((r) => n.add(r.id));
      return n;
    });
  }, [filtered]);

  const applyPreset = useCallback((p: PresetKey) => {
    setPreset(p);
    if (p === "all")            setSelected(new Set(checklist.map((r) => r.id)));
    else if (p === "mandatory") setSelected(new Set(checklist.filter((r) => r.is_mandatory && !r.is_conditional).map((r) => r.id)));
    else if (p === "conditional") setSelected(new Set(checklist.filter((r) => r.is_conditional).map((r) => r.id)));
    else if (p === "optional")  setSelected(new Set(checklist.filter((r) => !r.is_mandatory && !r.is_conditional).map((r) => r.id)));
    else if (p === "pending")   setSelected(new Set(checklist.filter((r) => !isDone(r)).map((r) => r.id)));
  }, [checklist]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const runGenerate = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.info("Selecione ao menos um documento para gerar.");
      return;
    }
    setRunning("generate");
    setReport(null);
    setProgress({ done: 0, total: selectedItems.length, current: "" });
    try {
      const r = await batchGenerate(processId, selectedItems, (done, total, current) => {
        setProgress({ done, total, current });
      });
      setReport(r);
      await refetch();
      onChanged?.();
      toast.success(`Geração concluída: ${r.ok.length} ok, ${r.failed.length} falhas, ${r.missingData.length} sem dados.`);
    } finally {
      setRunning(null);
      setProgress(null);
    }
  }, [processId, selectedItems, refetch, onChanged]);

  const runDownload = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.info("Selecione ao menos um documento para baixar.");
      return;
    }
    setRunning("download");
    try {
      const code = process?.protocol_number || process?.code || process?.id?.slice(0, 8);
      await batchDownload(processId, selectedItems, code);
    } finally { setRunning(null); }
  }, [processId, selectedItems, process]);

  const handleSigDone = useCallback(async (r: BatchSignatureReport) => {
    setSigReport(r);
    await refetch();
    onChanged?.();
  }, [refetch, onChanged]);

  // Já existentes = itens selecionados que já têm document_id ou status generated/completed.
  const alreadyExisting = useMemo(
    () => selectedRows.filter(isAlreadyGenerated).map((r) => r.item_name),
    [selectedRows],
  );

  return (
    <div id="batch-generation-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm scroll-mt-24">
      {/* HEADER */}
      <div className="p-6 md:p-8 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest mb-2">
              <Layers className="h-3 w-3 mr-1" /> Geração em Lote
            </Badge>
            <h3 className="text-lg md:text-xl font-semibold text-navy">
              Gerar documentos em lote
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
              Selecione múltiplos documentos e gere todos de uma vez. Se algum falhar, os demais continuam.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecionados</p>
            <p className="text-4xl font-black text-primary leading-none">{selected.size}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">de {counts.total} no processo</p>
          </div>
        </div>

        {/* Busca */}
        <div className="mt-5 relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documento pelo nome…"
            className="pl-9"
          />
        </div>

        {/* Presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          <PresetChip active={preset === "all"}         label={`Todos (${counts.total})`}         onClick={() => applyPreset("all")} />
          <PresetChip active={preset === "mandatory"}   label={`Obrigatórios (${counts.mandatory})`}   tone="red"     onClick={() => applyPreset("mandatory")} />
          <PresetChip active={preset === "pending"}     label={`Pendentes (${counts.pending})`}       tone="amber"   onClick={() => applyPreset("pending")} />
          <PresetChip active={preset === "conditional"} label={`Condicionais (${counts.conditional})`} tone="violet" onClick={() => applyPreset("conditional")} />
          <PresetChip active={preset === "optional"}    label={`Opcionais (${counts.optional})`}      tone="slate"   onClick={() => applyPreset("optional")} />
          <button
            onClick={clearSelection}
            className="text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 px-3 py-1.5"
          >
            Limpar seleção
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="p-6 md:p-8 space-y-2 max-h-[520px] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 italic">Nenhum documento encontrado com esses filtros.</p>
        ) : (
          <>
            <div className="flex items-center justify-between pb-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Mostrando {filtered.length} de {counts.total}
              </p>
              <button
                onClick={selectFiltered}
                className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline"
              >
                Selecionar todos os visíveis
              </button>
            </div>
            {filtered.map((r) => {
              const done = isDone(r);
              const kind: "mandatory" | "conditional" | "optional" =
                r.is_conditional ? "conditional" : r.is_mandatory ? "mandatory" : "optional";
              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    selected.has(r.id) ? "border-primary/40 bg-primary/5" : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    disabled={!r.template_id}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy truncate">{r.item_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <KindChip kind={kind} />
                      {done && <Chip tone="emerald" label="Já gerado" icon={CheckCircle2} />}
                      {r.requires_signature && <Chip tone="amber" label="assina" icon={Signature} />}
                      {!r.template_id && <Chip tone="slate" label="sem template" />}
                    </div>
                  </div>
                </label>
              );
            })}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 md:p-5 flex flex-wrap gap-3 items-center justify-between rounded-b-[2rem]">
        <div className="text-sm">
          <p className="font-black text-navy">
            {selected.size} documento{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}
          </p>
          {alreadyExisting.length > 0 && (
            <p className="text-[11px] text-amber-600 font-bold">
              {alreadyExisting.length} já gerado{alreadyExisting.length === 1 ? "" : "s"} (serão sobrescrito{alreadyExisting.length === 1 ? "" : "s"})
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={runDownload} disabled={!!running || selected.size === 0} className="rounded-xl">
            {running === "download" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Baixar ZIP
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSigDialogOpen(true)} disabled={!!running || selected.size === 0} className="rounded-xl">
            <Signature className="h-4 w-4 mr-1" /> Enviar p/ assinatura
          </Button>
          <Button size="lg" onClick={runGenerate} disabled={!!running || selected.size === 0} className="rounded-xl gap-2">
            {running === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar {selected.size || ""} documento{selected.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {/* MODAL DE PROGRESSO */}
      <Dialog open={running === "generate"} onOpenChange={() => { /* no close during batch */ }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Gerando documentos…
            </DialogTitle>
            <DialogDescription>
              Se algum falhar, os demais continuam. Você verá o relatório completo ao final.
            </DialogDescription>
          </DialogHeader>
          {progress && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="truncate max-w-[70%]">{progress.current || "Preparando…"}</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE RELATÓRIO FINAL */}
      <Dialog open={!!report && running === null} onOpenChange={(v) => { if (!v) setReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Relatório da geração em lote
            </DialogTitle>
            <DialogDescription>
              Resumo da execução. Escolha uma ação abaixo ou feche para revisar depois.
            </DialogDescription>
          </DialogHeader>
          {report && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatBox tone="emerald" label="Gerados" value={report.ok.length} icon={CheckCircle2} />
                <StatBox tone="red"     label="Falharam" value={report.failed.length} icon={XCircle} />
                <StatBox tone="amber"   label="Pendências" value={report.missingData.length} icon={AlertTriangle} />
                <StatBox tone="slate"   label="Já existentes" value={alreadyExisting.length} icon={FileText} />
              </div>

              {report.ok.length > 0 && (
                <ReportSection tone="emerald" title="Gerados com sucesso" items={report.ok} />
              )}
              {report.failed.length > 0 && (
                <ReportSection
                  tone="red"
                  title="Falhas"
                  items={report.failed.map((f) => `${f.name} — ${f.reason}`)}
                />
              )}
              {report.missingData.length > 0 && (
                <ReportSection tone="amber" title="Sem template/dados" items={report.missingData} />
              )}
              {alreadyExisting.length > 0 && (
                <ReportSection tone="slate" title="Já existentes (sobrescritos)" items={alreadyExisting} />
              )}
            </div>
          )}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setReport(null)}>Fechar</Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runDownload} disabled={running !== null}>
                <Download className="h-4 w-4 mr-1" /> Baixar ZIP
              </Button>
              <Button variant="outline" onClick={() => { setReport(null); setSigDialogOpen(true); }}>
                <Signature className="h-4 w-4 mr-1" /> Enviar p/ assinatura
              </Button>
              <Button variant="outline" onClick={() => {
                const first = selectedRows[0];
                setReport(null);
                if (first) onFocusItem?.(first.id, "editar");
                else onOpenTab("requirements");
              }}>
                <Eye className="h-4 w-4 mr-1" /> Revisar um a um
              </Button>
              <Button onClick={() => { setReport(null); onOpenTab("dossier_v2"); }}>
                <FileText className="h-4 w-4 mr-1" /> Gerar dossiê <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relatório de assinaturas em lote */}
      {sigReport && (
        <div className="mx-6 mb-6 p-3 rounded-xl border border-amber-100 bg-amber-50/50 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-widest text-amber-700">Assinaturas em lote</span>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setSigReport(null)}>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          {sigReport.created.length > 0 && <p className="text-emerald-700"><b>{sigReport.created.length}</b> solicitação(ões) criada(s)</p>}
          {sigReport.failed.length > 0 && <p className="text-red-700"><b>{sigReport.failed.length}</b> falha(s)</p>}
          {sigReport.missingPdf.length > 0 && <p className="text-amber-700"><b>{sigReport.missingPdf.length}</b> sem PDF gerado</p>}
          {sigReport.alreadySigned.length > 0 && <p className="text-slate-600"><b>{sigReport.alreadySigned.length}</b> já assinado(s)</p>}
        </div>
      )}

      <BatchSignatureDialog
        open={sigDialogOpen}
        onClose={() => setSigDialogOpen(false)}
        processId={processId}
        process={process}
        items={selectedItems}
        createdBy={createdBy}
        onDone={handleSigDone}
      />
    </div>
  );
}

/* ---------- helpers ---------- */

function PresetChip({
  active, label, tone = "primary", onClick,
}: { active: boolean; label: string; tone?: "primary" | "red" | "amber" | "violet" | "slate"; onClick: () => void }) {
  const activeCls: Record<string, string> = {
    primary: "bg-primary text-primary-foreground border-primary",
    red:     "bg-red-600 text-white border-red-600",
    amber:   "bg-amber-500 text-white border-amber-500",
    violet:  "bg-violet-600 text-white border-violet-600",
    slate:   "bg-slate-700 text-white border-slate-700",
  };
  const idleCls =
    "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50";
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition ${active ? activeCls[tone] : idleCls}`}
    >
      {label}
    </button>
  );
}

function KindChip({ kind }: { kind: "mandatory" | "conditional" | "optional" }) {
  if (kind === "mandatory") return <Chip tone="red" label="obrigatório" icon={ShieldCheck} />;
  if (kind === "conditional") return <Chip tone="violet" label="condicional" icon={GitBranch} />;
  return <Chip tone="slate" label="opcional" icon={PackageOpen} />;
}

function Chip({ tone, label, icon: Icon }: { tone: "emerald" | "red" | "amber" | "violet" | "slate"; label: string; icon?: any }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red:     "bg-red-50 text-red-700 border-red-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    violet:  "bg-violet-50 text-violet-700 border-violet-200",
    slate:   "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${map[tone]}`}>
      {Icon && <Icon className="h-2.5 w-2.5" />} {label}
    </span>
  );
}

function StatBox({
  tone, label, value, icon: Icon,
}: { tone: "emerald" | "red" | "amber" | "slate"; label: string; value: number; icon: any }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red:     "bg-red-50 text-red-700 border-red-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-100",
    slate:   "bg-slate-50 text-slate-600 border-slate-100",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <Icon className="h-4 w-4 mb-1" />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}

function ReportSection({ tone, title, items }: { tone: "emerald" | "red" | "amber" | "slate"; title: string; items: string[] }) {
  const map: Record<string, string> = {
    emerald: "text-emerald-700",
    red:     "text-red-700",
    amber:   "text-amber-700",
    slate:   "text-slate-600",
  };
  return (
    <div>
      <p className={`text-[11px] font-black uppercase tracking-widest ${map[tone]} mb-1`}>{title} ({items.length})</p>
      <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto pr-1">
        {items.map((i, idx) => <li key={idx} className="text-slate-700">• {i}</li>)}
      </ul>
    </div>
  );
}

export default BatchGenerationPanel;
