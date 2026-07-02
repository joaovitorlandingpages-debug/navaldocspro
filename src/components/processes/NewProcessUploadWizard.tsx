/**
 * NewProcessUploadWizard — cria processo a partir de upload de documentos.
 *
 * Fluxo:
 *  1. Dropzone (até 20 arquivos, PDF/imagem).
 *  2. Upload + OCR/AI: cria uploaded_files + ocr_jobs, invoca edge function
 *     e faz polling. Usuário pode sobrescrever o tipo detectado (dropdown).
 *  3. Revisão: escolhe o tipo de processo (sugerido pela IA), confirma
 *     cliente e embarcação (criação inline usando dados extraídos).
 *  4. Criação: cria o processo, materializa o Blueprint, vincula os arquivos
 *     enviados (uploaded_files.process_id) e faz best-effort para marcar
 *     itens do checklist como "attached" quando o tipo bate. Abre o Workspace.
 *
 * IMPORTANTE: não altera Blueprint Engine, batchGenerate, OCR base,
 * Assinaturas, Dossiê ou PDF Builder — apenas orquestra.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud, Loader2, X, FileText, ScanText, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, User, Ship, Sparkles, RotateCw, Hand, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBucket, validateUpload } from "@/lib/storage";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";
import { limitsEngine } from "@/services/limitsEngine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILES = 20;

const DOC_TYPES = [
  { value: "GENERIC", label: "Genérico" },
  { value: "CNH", label: "CNH" },
  { value: "RG", label: "RG" },
  { value: "CPF", label: "CPF" },
  { value: "COMPROVANTE_RESIDENCIA", label: "Comprovante de residência" },
  { value: "VESSEL_TIE", label: "TIE / TIEM da embarcação" },
  { value: "SAFETY_CERTIFICATE", label: "Certificado de segurança (CSN)" },
  { value: "DPEM_INSURANCE", label: "Seguro DPEM" },
  { value: "FINANCIAL_GRU", label: "GRU (guia financeira)" },
  { value: "PURCHASE_CONTRACT", label: "Contrato de compra e venda" },
  { value: "TECHNICAL_MEMORIAL", label: "Memorial descritivo" },
  { value: "TECHNICAL_REPORT", label: "Laudo técnico" },
];

type FileStatus = "queued" | "uploading" | "ocr" | "done" | "error" | "timeout" | "manual";
type FailReason = "timeout" | "edge_error" | "ocr_error" | "usage_limit" | "invalid_file" | "unknown";

interface FileItem {
  localId: string;
  file: File;
  status: FileStatus;
  errorMsg?: string;
  failReason?: FailReason;
  uploadedFileId?: string;
  ocrJobId?: string;
  docType?: string;
  fields?: Record<string, any> | null;
  storagePath?: string;
}

const PER_FILE_TIMEOUT_MS = 45000;
const MAX_PARALLEL = 2;

type Step = 1 | 2 | 3;

interface ProcessTypeRow { id: string; name: string; category: string | null }
interface CustomerRow { id: string; name: string; cpf_cnpj?: string | null }
interface VesselRow { id: string; name: string; customer_id: string | null }

// Heurística — sugere tipo de processo com base nos tipos detectados.
function suggestProcessType(files: FileItem[], types: ProcessTypeRow[]): string | null {
  const detected = new Set(files.map((f) => f.docType).filter(Boolean) as string[]);
  const findByName = (needle: string) =>
    types.find((t) => t.name.toLowerCase().includes(needle.toLowerCase()))?.id ?? null;
  if (detected.has("PURCHASE_CONTRACT") && detected.has("VESSEL_TIE")) {
    return findByName("transfer");
  }
  if (detected.has("TECHNICAL_MEMORIAL") || detected.has("TECHNICAL_REPORT")) {
    return findByName("inscri") ?? findByName("regist");
  }
  if (detected.has("VESSEL_TIE")) {
    return findByName("renov") ?? findByName("regist");
  }
  return null;
}

// Heurística — marca checklist.status='attached' quando o item bate com um docType enviado.
const CHECKLIST_KEYWORDS: Record<string, string[]> = {
  VESSEL_TIE: ["tie", "tiem", "inscri"],
  CNH: ["cnh", "habilita"],
  RG: ["rg", "identidade"],
  CPF: ["cpf"],
  COMPROVANTE_RESIDENCIA: ["comprova", "residenc"],
  SAFETY_CERTIFICATE: ["csn", "seguran"],
  DPEM_INSURANCE: ["dpem", "seguro"],
  FINANCIAL_GRU: ["gru"],
  PURCHASE_CONTRACT: ["contrato", "compra"],
  TECHNICAL_MEMORIAL: ["memorial"],
  TECHNICAL_REPORT: ["laudo", "vistoria"],
};

async function pollOcrJob(jobId: string, timeoutMs = 45000): Promise<{ document_type?: string; fields?: any; error?: string } | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase
      .from("ocr_jobs")
      .select("status, identified_document_type, extracted_data, error_message")
      .eq("id", jobId)
      .maybeSingle();
    const row = data as any;
    if (row) {
      if (row.status === "completed") {
        return {
          document_type: row.identified_document_type || (row.extracted_data?.document_type ?? "GENERIC"),
          fields: row.extracted_data?.fields ?? row.extracted_data ?? {},
        };
      }
      if (row.status === "failed") {
        return { error: row.error_message || "Falha no OCR" };
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { error: "Tempo esgotado no OCR" };
}

export function NewProcessUploadWizard({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>(crypto.randomUUID());

  // Etapa 3 — revisão
  const [types, setTypes] = useState<ProcessTypeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [vesselId, setVesselId] = useState<string>("");
  const [title, setTitle] = useState("");

  // Sugestões extraídas do OCR (para criar inline).
  const [suggestedCustomer, setSuggestedCustomer] = useState<{ name?: string; cpf?: string } | null>(null);
  const [suggestedVessel, setSuggestedVessel] = useState<{ name?: string; registration?: string } | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [vesselModalOpen, setVesselModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFiles([]);
      setSelectedTypeId("");
      setCustomerId("");
      setVesselId("");
      setTitle("");
      setSuggestedCustomer(null);
      setSuggestedVessel(null);
      sessionId.current = crypto.randomUUID();
      return;
    }
    (async () => {
      const [{ data: pt }, { data: cs }, { data: vs }] = await Promise.all([
        supabase.from("process_types").select("id,name,category").order("name"),
        supabase.from("customers").select("id,name,cpf_cnpj").order("name").limit(500),
        supabase.from("vessels").select("id,name,customer_id").order("name").limit(500),
      ]);
      setTypes((pt as any) ?? []);
      setCustomers((cs as any) ?? []);
      setVessels((vs as any) ?? []);
    })();
  }, [isOpen]);

  function handleDrop(list: FileList | File[]) {
    const incoming = Array.from(list);
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) {
        toast.error(`Máximo de ${MAX_FILES} arquivos por lote. Divida em lotes menores.`);
        return prev;
      }
      const accepted: FileItem[] = [];
      let rejected = 0;
      for (const file of incoming.slice(0, remaining)) {
        try {
          validateUpload(file);
          accepted.push({
            localId: crypto.randomUUID(),
            file,
            status: "queued",
          });
        } catch (e: any) {
          rejected += 1;
          console.warn("Upload rejeitado:", file.name, e?.message);
        }
      }
      if (rejected > 0) toast.warning(`${rejected} arquivo(s) rejeitado(s) por tipo/tamanho.`);
      if (incoming.length > remaining) toast.warning(`Excedendo ${MAX_FILES} arquivos — os extras foram ignorados.`);
      return [...prev, ...accepted];
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.localId !== id));
  }

  const updateFile = useCallback((id: string, patch: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f) => f.localId === id ? { ...f, ...patch } : f));
  }, []);

  // Processa 1 arquivo. Nunca lança — sempre atualiza status.
  const processOne = useCallback(async (item: FileItem) => {
    if (!profile?.company_id) return;
    try {
      updateFile(item.localId, { status: "uploading", errorMsg: undefined, failReason: undefined });

      // storage upload + rows (reaproveita quando já existir)
      let uploadedFileId = item.uploadedFileId;
      let ocrJobId = item.ocrJobId;

      if (!uploadedFileId) {
        const ext = item.file.name.split(".").pop() || "bin";
        const storagePath = `${profile.company_id}/tmp-${sessionId.current}/${item.localId}.${ext}`;
        try {
          await uploadToBucket("ocr-documents", storagePath, item.file);
        } catch (e: any) {
          updateFile(item.localId, { status: "error", errorMsg: e?.message || "Falha no upload", failReason: "invalid_file", docType: "GENERIC" });
          return;
        }

        const { data: uf, error: ufErr } = await supabase.from("uploaded_files").insert({
          company_id: profile.company_id,
          uploaded_by: profile.id,
          file_name: item.file.name,
          file_type: item.file.type,
          file_size: item.file.size,
          file_url: storagePath,
          category: "ocr-upload",
          status: "uploaded",
        }).select("id").single();
        if (ufErr || !uf) {
          updateFile(item.localId, { status: "error", errorMsg: ufErr?.message || "Falha ao registrar arquivo", failReason: "edge_error", docType: "GENERIC" });
          return;
        }
        uploadedFileId = (uf as any).id;
        try { await limitsEngine.consume("upload_file", 1, { file_id: uploadedFileId }, uploadedFileId, profile.company_id); } catch {}

        const { data: job, error: jobErr } = await supabase.from("ocr_jobs").insert({
          company_id: profile.company_id,
          uploaded_file_id: uploadedFileId,
          document_type: "auto",
          status: "pending",
        }).select("id").single();
        if (jobErr || !job) {
          updateFile(item.localId, { status: "error", errorMsg: jobErr?.message || "Falha ao criar OCR job", failReason: "edge_error", docType: "GENERIC", uploadedFileId });
          return;
        }
        ocrJobId = (job as any).id;
        try { await limitsEngine.consume("ocr", 1, { job_id: ocrJobId }, ocrJobId, profile.company_id); } catch {}
        updateFile(item.localId, { uploadedFileId, ocrJobId, storagePath });
      }

      updateFile(item.localId, { status: "ocr" });
      supabase.functions.invoke("process-ocr-document", { body: { jobId: ocrJobId } })
        .catch((err: any) => console.error("[OCR_INVOKE_ERR]", item.file.name, err));

      const result = await pollOcrJob(ocrJobId!, PER_FILE_TIMEOUT_MS);
      if (!result || result.error) {
        const isTimeout = /tempo esgotado/i.test(result?.error || "");
        console.warn("[OCR_FAIL]", item.file.name, result?.error);
        updateFile(item.localId, {
          status: isTimeout ? "timeout" : "error",
          errorMsg: result?.error || "OCR falhou",
          failReason: isTimeout ? "timeout" : "ocr_error",
          docType: item.docType || "GENERIC",
        });
      } else {
        updateFile(item.localId, {
          status: "done",
          docType: result.document_type || "GENERIC",
          fields: result.fields || {},
        });
      }
    } catch (e: any) {
      console.error("[OCR_UNEXPECTED]", item.file.name, e);
      updateFile(item.localId, {
        status: "error",
        errorMsg: e?.message || "Falha inesperada",
        failReason: "unknown",
        docType: item.docType || "GENERIC",
      });
    }
  }, [profile?.company_id, profile?.id, updateFile]);

  // Pool de concorrência — processa até MAX_PARALLEL simultâneos.
  const runPool = useCallback(async (items: FileItem[]) => {
    let idx = 0;
    const workers: Promise<void>[] = [];
    const next = async () => {
      while (idx < items.length) {
        const my = items[idx++];
        await processOne(my);
      }
    };
    for (let i = 0; i < Math.min(MAX_PARALLEL, items.length); i++) workers.push(next());
    await Promise.all(workers);
  }, [processOne]);

  async function processAllFiles() {
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    if (files.length === 0) { toast.error("Adicione pelo menos 1 arquivo."); return; }
    setProcessing(true);
    try {
      const okUp = await limitsEngine.enforce("upload_file", files.length, profile.company_id);
      if (!okUp) throw new Error("Limite de uploads atingido para o plano atual.");
      const okOcr = await limitsEngine.enforce("ocr", files.length, profile.company_id);
      if (!okOcr) {
        setFiles((prev) => prev.map((f) => f.status === "queued"
          ? { ...f, status: "error", failReason: "usage_limit", errorMsg: "Limite de OCR atingido — classifique manualmente.", docType: f.docType || "GENERIC" }
          : f));
        toast.warning("Limite de OCR atingido. Você pode classificar os arquivos manualmente e continuar.");
        return;
      }

      const pending = files.filter((f) => f.status !== "done" && f.status !== "manual");
      await runPool(pending);

      // Sugestões (após todos os workers)
      setFiles((prev) => {
        const primary = prev.find((f) => f.fields && (f.fields.name || f.fields.cpf));
        if (primary?.fields) {
          setSuggestedCustomer({
            name: primary.fields.name || primary.fields.owner_name || undefined,
            cpf: primary.fields.cpf || primary.fields.owner_document || undefined,
          });
        }
        const vesselSrc = prev.find((f) => f.fields && f.fields.vessel_name);
        if (vesselSrc?.fields) {
          setSuggestedVessel({
            name: vesselSrc.fields.vessel_name || undefined,
            registration: vesselSrc.fields.registration_number || undefined,
          });
        }
        const guess = suggestProcessType(prev, types);
        if (guess && !selectedTypeId) setSelectedTypeId(guess);
        return prev;
      });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao processar arquivos");
    } finally {
      setProcessing(false);
    }
  }

  async function retryFile(id: string) {
    const item = files.find((f) => f.localId === id);
    if (!item) return;
    await processOne({ ...item, status: "queued" });
  }

  function markManual(id: string) {
    updateFile(id, { status: "manual", errorMsg: undefined, docType: files.find(f => f.localId === id)?.docType || "GENERIC" });
  }


  async function createCustomerInline(payload: {
    name: string; cpf_cnpj?: string | null; phone?: string | null;
    email?: string | null; city?: string | null; state?: string | null;
  }) {
    if (!profile?.company_id) throw new Error("Empresa não vinculada.");
    const { data, error } = await supabase.from("customers")
      .insert({ company_id: profile.company_id, ...payload } as any)
      .select("id,name,cpf_cnpj").single();
    if (error) throw new Error(error.message);
    setCustomers((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setCustomerId((data as any).id);
    toast.success(`Cliente "${payload.name}" criado.`);
  }

  async function createVesselInline(payload: {
    name: string; vessel_type?: string | null; registration_number?: string | null;
    hull_number?: string | null; engine?: string | null; construction_year?: number | null;
  }) {
    if (!profile?.company_id) throw new Error("Empresa não vinculada.");
    if (!customerId) throw new Error("Selecione o cliente antes.");
    const { data, error } = await supabase.from("vessels")
      .insert({ company_id: profile.company_id, customer_id: customerId, ...payload } as any)
      .select("id,name,customer_id").single();
    if (error) throw new Error(error.message);
    setVessels((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setVesselId((data as any).id);
    toast.success(`Embarcação "${payload.name}" criada.`);
  }

  async function handleCreate() {
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    if (!selectedTypeId) { toast.error("Selecione o tipo de processo."); return; }
    if (!customerId) { toast.error("Selecione ou crie um cliente."); return; }
    const type = types.find((t) => t.id === selectedTypeId);
    if (!type) return;

    setSubmitting(true);
    try {
      const { data: pdata, error: pErr } = await supabase.from("processes").insert({
        company_id: profile.company_id,
        process_type: type.name,
        process_type_id: type.id,
        customer_id: customerId,
        vessel_id: vesselId || null,
        title: title.trim() || type.name,
        priority: "normal",
        status: "pending",
      } as any).select("id").single();
      if (pErr || !pdata) throw new Error(pErr?.message || "Erro ao criar processo");
      const processId = (pdata as any).id as string;

      // Materializa blueprint.
      try {
        await materializeProcessBlueprint(processId);
      } catch (e) {
        console.warn("Blueprint falhou (não bloqueia):", e);
      }

      // Vincula uploads ao processo.
      const uploadedIds = files.map((f) => f.uploadedFileId).filter(Boolean) as string[];
      if (uploadedIds.length > 0) {
        await supabase.from("uploaded_files")
          .update({ process_id: processId, customer_id: customerId, vessel_id: vesselId || null })
          .in("id", uploadedIds);
      }

      // Best-effort: marca itens do checklist como "attached" quando o docType bate.
      try {
        const { data: checklist } = await supabase.from("document_checklists")
          .select("id,item_name,status").eq("process_id", processId);
        const rows = ((checklist ?? []) as any[]);
        const usedItemIds = new Set<string>();
        for (const f of files) {
          if (!f.docType) continue;
          const keys = CHECKLIST_KEYWORDS[f.docType] || [];
          if (keys.length === 0) continue;
          const hit = rows.find((r) => {
            if (usedItemIds.has(r.id)) return false;
            const nm = String(r.item_name || "").toLowerCase();
            return keys.some((k) => nm.includes(k));
          });
          if (hit) {
            usedItemIds.add(hit.id);
            await supabase.from("document_checklists")
              .update({ status: "attached" }).eq("id", hit.id);
          }
        }
      } catch (e) {
        console.warn("Auto-attach falhou:", e);
      }

      toast.success("Processo criado a partir dos uploads.");
      onClose();
      navigate({ to: "/processes/$id", params: { id: processId }, search: { tab: "overview" } });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar processo");
    } finally {
      setSubmitting(false);
    }
  }

  const okCount = useMemo(() => files.filter((f) => f.status === "done").length, [files]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !processing && !submitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UploadCloud className="h-5 w-5 text-primary" />
            {step === 1 ? "Envie os documentos" : step === 2 ? "Analisando com IA" : "Revisar e criar processo"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Arraste ou selecione até ${MAX_FILES} arquivos (PDF ou imagem). A IA classifica cada um e extrai os dados.`
              : step === 2
                ? "Estamos analisando os arquivos. Você pode continuar manualmente se algum OCR falhar."
                : "Confirme o tipo detectado de cada documento, o tipo do processo, o cliente e a embarcação."}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2 text-[10px] font-black uppercase tracking-widest">
            <StepPill n={1} label="Upload" active={step === 1} done={step > 1} />
            <div className="h-px flex-1 bg-slate-200" />
            <StepPill n={2} label="OCR/IA" active={step === 2} done={step > 2} />
            <div className="h-px flex-1 bg-slate-200" />
            <StepPill n={3} label="Revisão" active={step === 3} done={false} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-2">
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handleDrop(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/60"}`}
              >
                <UploadCloud className="h-10 w-10 text-primary mx-auto mb-2" />
                <div className="text-sm font-black text-slate-900">Arraste os arquivos ou clique para selecionar</div>
                <div className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WEBP · até 20MB cada · máximo {MAX_FILES} por lote</div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files) handleDrop(e.target.files); e.currentTarget.value = ""; }}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {files.length} arquivo(s) selecionado(s)
                  </div>
                  {files.map((f) => (
                    <div key={f.localId} className="flex items-center gap-3 rounded-lg border bg-white p-2.5">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{f.file.name}</div>
                        <div className="text-[10px] text-slate-400">{(f.file.size / 1024).toFixed(0)} KB · {f.file.type || "?"}</div>
                      </div>
                      <button onClick={() => removeFile(f.localId)} className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500 pb-1">
                Processando até {MAX_PARALLEL} em paralelo · timeout de {Math.round(PER_FILE_TIMEOUT_MS/1000)}s por arquivo.
                Falhas não bloqueiam o fluxo — você pode tentar novamente ou classificar manualmente.
              </div>
              {files.map((f) => (
                <div key={f.localId} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{f.file.name}</div>
                    <div className="text-[11px] mt-0.5">
                      {f.status === "queued" && <span className="text-slate-500">Aguardando…</span>}
                      {f.status === "uploading" && <span className="text-slate-600">Enviando…</span>}
                      {f.status === "ocr" && <span className="text-primary">Analisando com IA…</span>}
                      {f.status === "done" && <span className="text-emerald-600 font-semibold">Concluído · {f.docType}</span>}
                      {f.status === "timeout" && <span className="text-amber-600 font-semibold">Timeout — OCR demorou demais</span>}
                      {f.status === "error" && <span className="text-red-600 font-semibold">Falhou — {f.errorMsg}</span>}
                      {f.status === "manual" && <span className="text-slate-700 font-semibold">Marcado para classificação manual</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(f.status === "uploading" || f.status === "ocr") && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {f.status === "timeout" && <Clock className="h-4 w-4 text-amber-500" />}
                    {f.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {(f.status === "error" || f.status === "timeout") && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => retryFile(f.localId)} disabled={processing}>
                          <RotateCw className="h-3 w-3 mr-1" /> Tentar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => markManual(f.localId)}>
                          <Hand className="h-3 w-3 mr-1" /> Manual
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-red-500" onClick={() => removeFile(f.localId)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}



          {step === 3 && (
            <div className="space-y-5">
              {/* Documentos + docType override */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Documentos enviados ({okCount}/{files.length} analisados)
                </Label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {files.map((f) => (
                    <div key={f.localId} className="flex items-center gap-2 rounded-lg border bg-white p-2.5">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{f.file.name}</div>
                        {f.status === "error" && (
                          <div className="text-[10px] text-red-500">IA falhou — defina manualmente</div>
                        )}
                      </div>
                      <Select
                        value={f.docType || "GENERIC"}
                        onValueChange={(v) => setFiles((prev) => prev.map((x) => x.localId === f.localId ? { ...x, docType: v } : x))}
                      >
                        <SelectTrigger className="h-8 text-xs w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipo de processo */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Tipo de processo <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.category ? ` — ${t.category}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTypeId && (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Sugerido pela IA — você pode alterar.
                  </div>
                )}
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Button size="sm" variant="ghost" onClick={() => setCustomerModalOpen(true)} className="h-7 text-[11px]">
                    <User className="h-3 w-3 mr-1" /> Criar cliente inline
                  </Button>
                </div>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.cpf_cnpj ? ` — ${c.cpf_cnpj}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suggestedCustomer && !customerId && (
                  <div className="text-[11px] text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> IA sugere criar cliente:
                    <span className="font-bold">{suggestedCustomer.name || "sem nome"}</span>
                    {suggestedCustomer.cpf ? ` (${suggestedCustomer.cpf})` : ""}
                  </div>
                )}
              </div>

              {/* Embarcação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Embarcação (opcional)
                  </Label>
                  <Button size="sm" variant="ghost" onClick={() => setVesselModalOpen(true)} className="h-7 text-[11px]" disabled={!customerId}>
                    <Ship className="h-3 w-3 mr-1" /> Criar embarcação inline
                  </Button>
                </div>
                <Select value={vesselId} onValueChange={setVesselId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a embarcação" />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels
                      .filter((v) => !customerId || v.customer_id === customerId)
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {suggestedVessel && !vesselId && (
                  <div className="text-[11px] text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> IA sugere:
                    <span className="font-bold">{suggestedVessel.name || "sem nome"}</span>
                    {suggestedVessel.registration ? ` (${suggestedVessel.registration})` : ""}
                  </div>
                )}
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título (opcional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Renovação TIE — Barco Vênus" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {step === 1 && `${files.length} / ${MAX_FILES} arquivos`}
            {step === 2 && "Processando com IA..."}
            {step === 3 && (
              <Badge variant="outline" className="text-[10px]">
                {okCount}/{files.length} classificados
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={() => { setStep(2); processAllFiles(); }}
                  disabled={files.length === 0 || processing}
                >
                  <ScanText className="h-4 w-4 mr-1" /> Analisar com IA
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            {step === 2 && (
              <Button disabled className="opacity-70">
                <Loader2 className="h-4 w-4 animate-spin mr-1" /> Analisando...
              </Button>
            )}
            {step === 3 && (
              <>
                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={handleCreate} disabled={submitting || !selectedTypeId || !customerId}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Criar processo
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <InlineCustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        suggestion={suggestedCustomer}
        onSubmit={async (payload) => {
          await createCustomerInline(payload);
          setCustomerModalOpen(false);
        }}
      />
      <InlineVesselModal
        isOpen={vesselModalOpen}
        onClose={() => setVesselModalOpen(false)}
        suggestion={suggestedVessel}
        onSubmit={async (payload) => {
          await createVesselInline(payload);
          setVesselModalOpen(false);
        }}
      />
    </Dialog>
  );
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${active ? "bg-primary text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">{n}</span>
      <span>{label}</span>
    </div>
  );
}

// ============= Modais profissionais (cliente / embarcação) =============

interface CustomerPayload {
  name: string;
  cpf_cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
}

function InlineCustomerModal({
  isOpen, onClose, suggestion, onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestion: { name?: string; cpf?: string } | null;
  onSubmit: (p: CustomerPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(suggestion?.name || "");
      setCpf(suggestion?.cpf || "");
      setPhone(""); setEmail(""); setCity(""); setUf("");
    }
  }, [isOpen, suggestion]);

  async function handleSave() {
    if (!name.trim()) { toast.error("Informe o nome."); return; }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        cpf_cnpj: cpf.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        state: uf.trim().toUpperCase() || null,
      });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg max-sm:h-[100dvh] max-sm:max-h-[100dvh] flex flex-col p-0">
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Novo cliente
          </DialogTitle>
          <DialogDescription>Preencha os dados básicos do cliente.</DialogDescription>
        </DialogHeader>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nome / Razão social *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João da Silva" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">CPF / CNPJ</Label>
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">UF</Label>
              <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Criar cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VesselPayload {
  name: string;
  vessel_type?: string | null;
  registration_number?: string | null;
  hull_number?: string | null;
  engine?: string | null;
  construction_year?: number | null;
}

function InlineVesselModal({
  isOpen, onClose, suggestion, onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestion: { name?: string; registration?: string } | null;
  onSubmit: (p: VesselPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [vtype, setVtype] = useState("");
  const [reg, setReg] = useState("");
  const [hull, setHull] = useState("");
  const [engine, setEngine] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(suggestion?.name || "");
      setReg(suggestion?.registration || "");
      setVtype(""); setHull(""); setEngine(""); setYear("");
    }
  }, [isOpen, suggestion]);

  async function handleSave() {
    if (!name.trim()) { toast.error("Informe o nome da embarcação."); return; }
    setSaving(true);
    try {
      const yr = year.trim() ? Number(year.trim()) : null;
      await onSubmit({
        name: name.trim(),
        vessel_type: vtype.trim() || null,
        registration_number: reg.trim() || null,
        hull_number: hull.trim() || null,
        engine: engine.trim() || null,
        construction_year: yr && !Number.isNaN(yr) ? yr : null,
      });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar embarcação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg max-sm:h-[100dvh] max-sm:max-h-[100dvh] flex flex-col p-0">
        <DialogHeader className="p-5 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" /> Nova embarcação
          </DialogTitle>
          <DialogDescription>Cadastre a embarcação vinculada ao cliente.</DialogDescription>
        </DialogHeader>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nome da embarcação *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Barco Vênus" autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tipo</Label>
              <Input value={vtype} onChange={(e) => setVtype(e.target.value)} placeholder="Lancha, veleiro..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Inscrição / TIE</Label>
              <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="123456789" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Número do casco</Label>
              <Input value={hull} onChange={(e) => setHull(e.target.value)} placeholder="ABC-0001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Ano de construção</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="2020" maxLength={4} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Motor</Label>
            <Input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="Yamaha 250HP" />
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Criar embarcação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
