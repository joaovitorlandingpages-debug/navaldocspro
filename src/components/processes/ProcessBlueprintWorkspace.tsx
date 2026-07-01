/**
 * Onda C — Workspace Operacional do Processo
 * Renderiza a estrutura materializada pelo Blueprint Engine com foco em
 * pendências, cards ao vivo, checklist inteligente e ações rápidas.
 */
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";
import {
  batchGenerate, batchDownload, type BatchReport, type BatchSignatureReport,
} from "@/services/processes/batchChecklistActions";
import { BatchSignatureDialog } from "./BatchSignatureDialog";
import { ProcessTimelineMacro, type TimelineStage } from "./ProcessTimelineMacro";
import { SmartDocumentCard } from "./SmartDocumentCard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  RefreshCw, FileText, ShieldCheck, ShieldAlert, GitBranch, Signature,
  Zap, PackageOpen, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  User, Ship, Target, Loader2, Sparkles, Download, XCircle, ChevronDown,
} from "lucide-react";

interface Props {
  process: any;
  onOpenTab: (tab: string) => void;
  onFocusItem?: (checklistId: string, action: "gerar" | "editar" | "anexar" | "assinar" | "historico") => void;
  onChanged?: () => void;
}

type ChecklistRow = {
  id: string;
  item_name: string;
  status: string | null;
  is_mandatory: boolean | null;
  is_conditional: boolean | null;
  conditional_rule: any;
  requires_signature: boolean | null;
  requires_ocr: boolean | null;
  document_id: string | null;
  template_id: string | null;
  document_role: string | null;
  sort_order: number | null;
};

function classify(row: ChecklistRow) {
  if (row.is_conditional) return "conditional" as const;
  if (row.is_mandatory) return "mandatory" as const;
  return "optional" as const;
}

function statusChip(status: string | null | undefined) {
  const s = (status || "pending").toLowerCase();
  if (s === "completed" || s === "done" || s === "ok" || s === "generated" || s === "attached") {
    return { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" };
  }
  if (s === "in_progress" || s === "processing") {
    return { label: "Em andamento", cls: "bg-amber-100 text-amber-700" };
  }
  if (s === "blocked" || s === "error") {
    return { label: "Bloqueado", cls: "bg-red-100 text-red-700" };
  }
  return { label: "Pendente", cls: "bg-slate-100 text-slate-600" };
}

export function ProcessBlueprintWorkspace({ process, onOpenTab, onFocusItem, onChanged }: Props) {
  const processId: string = process?.id;
  const { profile } = useAuth();
  const [reprocessing, setReprocessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState<null | "generate" | "signature" | "download">(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [lastReport, setLastReport] = useState<BatchReport | null>(null);
  const [lastSigReport, setLastSigReport] = useState<BatchSignatureReport | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  const { data: checklist = [], isLoading, refetch } = useQuery({
    queryKey: ["blueprint-checklist", processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_checklists")
        .select("id,item_name,status,is_mandatory,is_conditional,conditional_rule,requires_signature,requires_ocr,document_id,template_id,document_role,sort_order")
        .eq("process_id", processId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistRow[];
    },
    enabled: !!processId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["blueprint-signatures", processId],
    queryFn: async () => {
      const { data } = await supabase
        .from("signature_requests")
        .select("id,title,status")
        .eq("process_id", processId);
      return data ?? [];
    },
    enabled: !!processId,
  });

  const { data: uploads = [] } = useQuery({
    queryKey: ["blueprint-uploads", processId],
    queryFn: async () => {
      const { data } = await supabase
        .from("process_document_uploads")
        .select("id,status")
        .eq("process_id", processId);
      return data ?? [];
    },
    enabled: !!processId,
  });

  const stats = useMemo(() => {
    const done = (r: ChecklistRow) => !!r.document_id || ["completed", "done", "ok", "generated", "attached"].includes((r.status || "").toLowerCase());
    const mandatory = checklist.filter((r) => r.is_mandatory && !r.is_conditional);
    const optional = checklist.filter((r) => !r.is_mandatory && !r.is_conditional);
    const conditional = checklist.filter((r) => r.is_conditional);
    const mandatoryDone = mandatory.filter(done);
    const pendingMandatory = mandatory.filter((r) => !done(r));
    const needsSignature = checklist.filter((r) => r.requires_signature && !done(r));
    const needsOcr = checklist.filter((r) => r.requires_ocr && !done(r));
    const pendingSignatures = (signatures as any[]).filter((s) => !["completed", "signed"].includes((s.status || "").toLowerCase()));
    const pendingOcr = (uploads as any[]).filter((u) => !["completed", "done", "ok"].includes((u.status || "").toLowerCase()));

    const total = checklist.length || 1;
    const totalDone = checklist.filter(done).length;
    const progress = Math.round((totalDone / total) * 100);

    return {
      mandatory, optional, conditional, mandatoryDone, pendingMandatory,
      needsSignature, needsOcr, pendingSignatures, pendingOcr,
      progress, totalDone, total: checklist.length,
    };
  }, [checklist, signatures, uploads]);

  const pendencies = useMemo(() => {
    const list: string[] = [];
    if (stats.pendingMandatory.length > 0) {
      list.push(`Faltam ${stats.pendingMandatory.length} documento(s) obrigatório(s).`);
      stats.pendingMandatory.slice(0, 3).forEach((r) => list.push(`${r.item_name} ainda não foi gerado.`));
    }
    if (stats.pendingSignatures.length > 0) {
      list.push(`${stats.pendingSignatures.length} assinatura(s) aguardando conclusão.`);
    }
    if (stats.pendingOcr.length > 0) {
      list.push(`${stats.pendingOcr.length} upload(s) aguardando OCR.`);
    }
    if (!process?.customer_id) list.push("Cliente ainda não vinculado ao processo.");
    if (!process?.vessel_id) list.push("Embarcação ainda não vinculada ao processo.");
    if (list.length === 0) list.push("Processo pronto para gerar dossiê.");
    return list;
  }, [stats, process]);

  const smartChecklist = useMemo(() => [
    { label: "Cliente completo", ok: !!process?.customer_id },
    { label: "Embarcação completa", ok: !!process?.vessel_id },
    { label: "Documentos obrigatórios", ok: stats.pendingMandatory.length === 0 && stats.mandatory.length > 0 },
    { label: "Documentos condicionais avaliados", ok: stats.conditional.every((r) => !!r.document_id || (r.status || "").toLowerCase() !== "pending") || stats.conditional.length === 0 },
    { label: "OCR concluído", ok: stats.pendingOcr.length === 0 },
    { label: "Assinaturas concluídas", ok: stats.pendingSignatures.length === 0 },
    { label: "Pronto para dossiê", ok: stats.pendingMandatory.length === 0 && stats.pendingSignatures.length === 0 },
  ], [process, stats]);

  // Timeline macro do processo — Cliente → … → Entrega
  const timelineStages = useMemo<TimelineStage[]>(() => {
    const has = (needle: string) =>
      checklist.some((r) => {
        const n = r.item_name?.toLowerCase() || "";
        const done = !!r.document_id || ["completed", "done", "generated", "attached", "signed"].includes((r.status || "").toLowerCase());
        return n.includes(needle) && done;
      });
    const stages: Array<{ key: string; label: string; done: boolean }> = [
      { key: "cliente", label: "Cliente", done: !!process?.customer_id },
      { key: "embarcacao", label: "Embarcação", done: !!process?.vessel_id },
      { key: "procuracao", label: "Procuração", done: has("procura") },
      { key: "requerimento", label: "Requerimento", done: has("requerimento") },
      { key: "bsade", label: "BSADE", done: has("bsade") || has("boletim") },
      { key: "documentos", label: "Documentos", done: stats.pendingMandatory.length === 0 && checklist.length > 0 },
      { key: "ocr", label: "OCR", done: stats.pendingOcr.length === 0 && uploads.length > 0 },
      { key: "assinaturas", label: "Assinaturas", done: signatures.length > 0 && stats.pendingSignatures.length === 0 },
      { key: "dossie", label: "Dossiê", done: (process?.status || "").toLowerCase() === "dossier_ready" || (process?.status || "").toLowerCase() === "delivered" },
      { key: "entrega", label: "Entrega", done: (process?.status || "").toLowerCase() === "delivered" },
    ];
    let currentSet = false;
    return stages.map((s) => {
      if (s.done) return { key: s.key, label: s.label, status: "done" as const };
      if (!currentSet) { currentSet = true; return { key: s.key, label: s.label, status: "current" as const }; }
      return { key: s.key, label: s.label, status: "pending" as const };
    });
  }, [checklist, process, stats, uploads, signatures]);

  const handleWaive = useCallback(async (id: string) => {
    const { error } = await supabase.from("document_checklists").update({ status: "waived" }).eq("id", id);
    if (error) return toast.error("Falha ao marcar como não aplicável.");
    toast.success("Item marcado como não aplicável.");
    await refetch();
    onChanged?.();
  }, [refetch, onChanged]);

  const handleMarkAttached = useCallback(async (id: string) => {
    const { error } = await supabase.from("document_checklists").update({ status: "attached" }).eq("id", id);
    if (error) return toast.error("Falha ao marcar como anexado.");
    toast.success("Comprovante marcado como anexado.");
    await refetch();
    onChanged?.();
  }, [refetch, onChanged]);

  const handleEditVessel = useCallback(() => {
    window.dispatchEvent(new CustomEvent("naval:edit-vessel", { detail: { processId, vesselId: process?.vessel_id } }));
    onOpenTab("crm");
  }, [processId, process, onOpenTab]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);


  const handleReprocess = useCallback(async () => {
    setReprocessing(true);
    try {
      // Tenta RPC primeiro; fallback client-side.
      const { error } = await supabase.rpc("process_materialize_checklist" as any, { p_process_id: processId });
      if (error) {
        const r = await materializeProcessBlueprint(processId);
        toast.success(`Estrutura atualizada: +${r.added} novos, ${r.updated} atualizados, ${r.removed} removidos.`);
      } else {
        toast.success("Estrutura do processo atualizada.");
      }
      await refetch();
      onChanged?.();
    } catch (e: any) {
      toast.error("Falha ao reprocessar blueprint: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setReprocessing(false);
    }
  }, [processId, refetch, onChanged]);

  const selectedItems = useMemo(() =>
    checklist.filter((r) => selected.has(r.id)).map((r) => ({
      id: r.id, item_name: r.item_name, template_id: r.template_id,
      document_id: r.document_id, requires_signature: r.requires_signature,
    })), [checklist, selected]);

  const runBatchGenerate = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setBatchRunning("generate");
    setLastReport(null);
    setBatchProgress({ done: 0, total: selectedItems.length, current: "" });
    try {
      const report = await batchGenerate(processId, selectedItems, (done, total, current) => {
        setBatchProgress({ done, total, current });
      });
      setLastReport(report);
      toast.success(`Geração concluída: ${report.ok.length} ok, ${report.failed.length} falhas, ${report.missingData.length} sem dados.`);
      await refetch();
      onChanged?.();
    } finally {
      setBatchRunning(null);
      setBatchProgress(null);
    }
  }, [processId, selectedItems, refetch, onChanged]);

  const openBatchSignature = useCallback(() => {
    if (selectedItems.length === 0) return;
    setSignatureDialogOpen(true);
  }, [selectedItems]);

  const handleBatchSignatureDone = useCallback(async (report: BatchSignatureReport) => {
    setLastSigReport(report);
    const total = report.created.length + report.failed.length + report.missingPdf.length + report.alreadySigned.length;
    toast.success(`Assinaturas: ${report.created.length}/${total} criadas.`);
    await refetch();
    onChanged?.();
  }, [refetch, onChanged]);

  const runBatchDownload = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setBatchRunning("download");
    try {
      const code = process?.protocol_number || process?.code || process?.id?.slice(0, 8);
      await batchDownload(processId, selectedItems, code);
    } finally { setBatchRunning(null); }
  }, [processId, selectedItems, process]);

  const readyForDossier = stats.pendingMandatory.length === 0 && stats.pendingSignatures.length === 0 && checklist.length > 0;

  return (
    <div className="space-y-6">
      {/* Header operacional */}
      <div className="bg-gradient-to-br from-navy to-slate-900 text-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-navy/20">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0 space-y-3">
            <Badge className="bg-white/10 text-white border-none text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3 mr-1" /> Workspace Inteligente
            </Badge>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight truncate">
              {process?.title || process?.process_type || "Processo"}
            </h2>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300"><Target className="h-3.5 w-3.5" /> {process?.process_type || "—"}</span>
              <span className="flex items-center gap-1.5 text-slate-300"><User className="h-3.5 w-3.5" /> {process?.customer?.name || "Sem cliente"}</span>
              <span className="flex items-center gap-1.5 text-slate-300"><Ship className="h-3.5 w-3.5" /> {process?.vessel?.name || "Sem embarcação"}</span>
              <span className="flex items-center gap-1.5 text-slate-300"><Clock className="h-3.5 w-3.5" /> {process?.due_date ? new Date(process.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso</p>
              <p className="text-3xl font-black">{stats.progress}%</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
              className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
            >
              {reprocessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar estrutura
            </Button>
          </div>
        </div>
        <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${stats.progress}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold text-slate-300">
          <span>{stats.totalDone}/{stats.total} concluídos</span>
          <span className="text-red-300">{stats.pendingMandatory.length} obrigatórios pendentes</span>
          <span className="text-amber-300">{stats.pendingSignatures.length} assinaturas</span>
          <span className="text-sky-300">{stats.pendingOcr.length} OCR</span>
        </div>
      </div>

      {/* CTAs rápidos pós-criação */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximos passos</p>
            <h3 className="text-base md:text-lg font-black text-navy uppercase tracking-tight">
              O que você quer fazer agora?
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Anexe documentos existentes, gere os obrigatórios pendentes ou solicite assinaturas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-black uppercase tracking-widest gap-2"
              onClick={() => onOpenTab("documents")}
            >
              <PackageOpen className="h-3.5 w-3.5" /> Anexar documentos agora
            </Button>
            {stats.pendingMandatory.filter((r) => !!r.template_id).length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl text-[11px] font-black uppercase tracking-widest gap-2"
                onClick={() => {
                  const ids = stats.pendingMandatory.filter((r) => !!r.template_id).map((r) => r.id);
                  setSelected(new Set(ids));
                  toast.info(`${ids.length} documento(s) selecionado(s). Clique em "Gerar selecionados" abaixo.`);
                  document.getElementById("blueprint-documentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Gerar documentos pendentes ({stats.pendingMandatory.filter((r) => !!r.template_id).length})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[11px] font-black uppercase tracking-widest gap-2"
              onClick={() => onOpenTab("signatures")}
            >
              <Signature className="h-3.5 w-3.5" /> Solicitar assinatura
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[11px] font-black uppercase tracking-widest gap-2"
              onClick={() => onOpenTab("dossier_v2")}
            >
              <FileText className="h-3.5 w-3.5" /> Gerar dossiê
            </Button>
          </div>
        </div>
      </div>

      {/* Cards ao vivo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <LiveCard icon={ShieldCheck} label="Obrigatórios" value={`${stats.mandatoryDone.length}/${stats.mandatory.length}`} tone="emerald" onClick={() => onOpenTab("requirements")} />
        <LiveCard icon={PackageOpen} label="Opcionais" value={String(stats.optional.length)} tone="slate" onClick={() => onOpenTab("requirements")} />
        <LiveCard icon={GitBranch} label="Condicionais" value={String(stats.conditional.length)} tone="violet" onClick={() => onOpenTab("requirements")} />
        <LiveCard icon={Signature} label="Assinaturas pendentes" value={String(stats.pendingSignatures.length)} tone="amber" onClick={() => onOpenTab("signatures")} />
        <LiveCard icon={Zap} label="OCR pendente" value={String(stats.pendingOcr.length)} tone="sky" onClick={() => onOpenTab("ocr")} />
        <LiveCard icon={ShieldAlert} label="Anexos faltantes" value={String(stats.pendingMandatory.length)} tone="red" onClick={() => onOpenTab("documents")} />
        <LiveCard icon={FileText} label="Documentos" value={String(checklist.length)} tone="navy" onClick={() => onOpenTab("library_docs")} />
        <LiveCard icon={CheckCircle2} label="Dossiê" value={readyForDossier ? "Pronto" : "Aguardando"} tone={readyForDossier ? "emerald" : "slate"} onClick={() => onOpenTab("dossier_v2")} />
      </div>

      {/* Painel de pendências */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Pendências
          </h3>
          {readyForDossier && (
            <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest" onClick={() => onOpenTab("dossier_v2")}>
              Gerar dossiê <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
        <ul className="space-y-2">
          {pendencies.map((p, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700 py-2 border-b border-slate-50 last:border-0">
              <span className={`h-2 w-2 rounded-full mt-2 shrink-0 ${p.startsWith("Processo pronto") ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="font-medium">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Checklist inteligente */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" /> Checklist inteligente
        </h3>
        <div className="grid md:grid-cols-2 gap-2">
          {smartChecklist.map((s) => (
            <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border ${s.ok ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${s.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                {s.ok ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <span className={`text-sm font-bold ${s.ok ? "text-emerald-700" : "text-slate-500"}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documentos do processo */}
      <div id="blueprint-documentos" className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-24">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Documentos do processo
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
              {checklist.length} itens
            </Badge>
            {checklist.length > 0 && (
              <>
                <Button size="sm" variant="ghost" className="text-[10px] font-bold h-7"
                  onClick={() => setSelected(new Set(checklist.map((r) => r.id)))}>
                  Selecionar todos
                </Button>
                <Button size="sm" variant="ghost" className="text-[10px] font-bold h-7"
                  onClick={() => setSelected(new Set(checklist.filter((r) => !r.document_id).map((r) => r.id)))}>
                  Só pendentes
                </Button>
                {selected.size > 0 && (
                  <Button size="sm" variant="ghost" className="text-[10px] font-bold h-7 text-red-600"
                    onClick={() => setSelected(new Set())}>
                    Limpar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Barra de ações em lote */}
        {selected.size > 0 && (
          <div className="mb-4 p-3 rounded-2xl border border-primary/20 bg-primary/5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              {selected.size} selecionado{selected.size === 1 ? "" : "s"}
            </span>
            <div className="flex-1" />
            <Button size="sm" onClick={runBatchGenerate} disabled={!!batchRunning} className="h-8 rounded-lg">
              {batchRunning === "generate" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Gerar selecionados
            </Button>
            <Button size="sm" variant="outline" onClick={openBatchSignature} disabled={!!batchRunning} className="h-8 rounded-lg">
              <Signature className="h-3 w-3 mr-1" /> Solicitar assinatura
            </Button>
            <Button size="sm" variant="outline" onClick={runBatchDownload} disabled={!!batchRunning} className="h-8 rounded-lg">
              <Download className="h-3 w-3 mr-1" /> Baixar
            </Button>
          </div>
        )}

        {batchProgress && batchRunning === "generate" && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span className="truncate">Gerando: {batchProgress.current}</span>
              <span>{batchProgress.done}/{batchProgress.total}</span>
            </div>
            <Progress value={(batchProgress.done / Math.max(1, batchProgress.total)) * 100} />
          </div>
        )}

        {lastReport && (
          <div className="mb-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-slate-600">Relatório da geração em lote</span>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setLastReport(null)}>
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            {lastReport.ok.length > 0 && (
              <p className="text-emerald-700"><b>{lastReport.ok.length}</b> gerado(s): {lastReport.ok.join(", ")}</p>
            )}
            {lastReport.failed.length > 0 && (
              <p className="text-red-700"><b>{lastReport.failed.length}</b> falha(s): {lastReport.failed.map(f => `${f.name} (${f.reason})`).join("; ")}</p>
            )}
            {lastReport.missingData.length > 0 && (
              <p className="text-amber-700"><b>{lastReport.missingData.length}</b> sem template/dados: {lastReport.missingData.join(", ")}</p>
            )}
          </div>
        )}

        {lastSigReport && (
          <div className="mb-4 p-3 rounded-xl border border-amber-100 bg-amber-50/50 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-amber-700">Relatório de assinaturas em lote</span>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setLastSigReport(null)}>
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            {lastSigReport.created.length > 0 && (
              <p className="text-emerald-700"><b>{lastSigReport.created.length}</b> solicitação(ões) criada(s): {lastSigReport.created.join(", ")}</p>
            )}
            {lastSigReport.failed.length > 0 && (
              <p className="text-red-700"><b>{lastSigReport.failed.length}</b> falha(s): {lastSigReport.failed.map(f => `${f.name} (${f.reason})`).join("; ")}</p>
            )}
            {lastSigReport.missingPdf.length > 0 && (
              <p className="text-amber-700"><b>{lastSigReport.missingPdf.length}</b> sem PDF gerado: {lastSigReport.missingPdf.join(", ")}</p>
            )}
            {lastSigReport.alreadySigned.length > 0 && (
              <p className="text-slate-600"><b>{lastSigReport.alreadySigned.length}</b> já assinado(s): {lastSigReport.alreadySigned.join(", ")}</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : checklist.length === 0 ? (
          <div className="py-10 text-center">
            <PackageOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-500 mb-4">Nenhum documento materializado ainda.</p>
            <Button onClick={handleReprocess} disabled={reprocessing} className="rounded-xl">
              {reprocessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Materializar blueprint
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {checklist.map((row) => {
              const kind = classify(row);
              const st = statusChip(row.status);
              const kindLabel =
                kind === "mandatory" ? "Obrigatório" : kind === "conditional" ? "Condicional" : "Opcional";
              const kindCls =
                kind === "mandatory" ? "bg-red-50 text-red-600 border-red-100"
                : kind === "conditional" ? "bg-violet-50 text-violet-600 border-violet-100"
                : "bg-slate-50 text-slate-500 border-slate-100";
              const isSelected = selected.has(row.id);
              return (
                <div key={row.id} className={`p-4 rounded-2xl border transition-all ${
                  isSelected ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/30 hover:bg-white hover:border-primary/30"
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(row.id)) n.delete(row.id); else n.add(row.id);
                        return n;
                      })}
                      className="mt-1"
                    />
                    <div className="flex-1 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy truncate">{row.item_name}</p>
                        {row.document_role && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{row.document_role}</p>
                        )}
                      </div>
                      <Badge className={`text-[9px] font-black uppercase tracking-widest border ${kindCls}`}>{kindLabel}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest ${st.cls}`}>{st.label}</Badge>
                    {row.requires_signature && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-amber-200 text-amber-600">
                        <Signature className="h-2.5 w-2.5" /> assina
                      </Badge>
                    )}
                    {row.requires_ocr && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-sky-200 text-sky-600">
                        <Zap className="h-2.5 w-2.5" /> OCR
                      </Badge>
                    )}
                  </div>
                  {row.is_conditional && row.conditional_rule && (
                    <p className="text-[10px] text-violet-600 font-medium mb-2 line-clamp-2">
                      Regra: {typeof row.conditional_rule === "string" ? row.conditional_rule : JSON.stringify(row.conditional_rule)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold" onClick={() => onFocusItem ? onFocusItem(row.id, "gerar") : onOpenTab("generation")}>Gerar</Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold" onClick={() => onFocusItem ? onFocusItem(row.id, "editar") : onOpenTab("library_docs")}>Editar</Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold" onClick={() => onFocusItem ? onFocusItem(row.id, "anexar") : onOpenTab("documents")}>Anexar</Button>
                    {row.requires_signature && (
                      <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold" onClick={() => onFocusItem ? onFocusItem(row.id, "assinar") : onOpenTab("signatures")}>Assinar</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[10px] font-bold" onClick={() => onFocusItem ? onFocusItem(row.id, "historico") : onOpenTab("history")}>Histórico</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BatchSignatureDialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        processId={processId}
        process={process}
        items={selectedItems}
        createdBy={profile?.id}
        onDone={handleBatchSignatureDone}
      />
    </div>
  );
}

function LiveCard({
  icon: Icon, label, value, tone, onClick,
}: {
  icon: any; label: string; value: string; tone: "emerald" | "amber" | "sky" | "red" | "slate" | "violet" | "navy"; onClick?: () => void;
}) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-500 border-slate-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    navy: "bg-navy/5 text-navy border-navy/10",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${map[tone]}`}
    >
      <Icon className="h-5 w-5 mb-2" />
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-lg font-black mt-1">{value}</p>
    </button>
  );
}

export default ProcessBlueprintWorkspace;
