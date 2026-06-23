import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Ship,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useOCR } from "@/hooks/useOCR";
import {
  SERVICES,
  findService,
  type ServiceKind,
  type ServiceDef,
} from "@/types/service-requirements";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type CustomerDraft = {
  name: string;
  cpf_cnpj: string;
  rg: string;
  address: string;
  city: string;
  state: string;
  email: string;
  phone: string;
};

type VesselDraft = {
  name: string;
  registration_number: string;
  owner_name: string;
  material: string;
  capacity: string;
  vessel_type: string;
};

type UploadedDoc = {
  fileId: string;
  filePath: string;
  fileName: string;
  ocrJobId?: string;
  extracted?: any;
  status: "uploading" | "ocr" | "done" | "failed";
};

interface WizardState {
  step: number;
  service: ServiceKind | null;
  customer: CustomerDraft;
  vessel: VesselDraft;
  personalDocs: UploadedDoc[];
  addressDocs: UploadedDoc[];
  vesselDocs: UploadedDoc[];
  generating: boolean;
  progressLog: string[];
  createdProcessId: string | null;
}

const emptyCustomer: CustomerDraft = {
  name: "", cpf_cnpj: "", rg: "", address: "", city: "", state: "", email: "", phone: "",
};
const emptyVessel: VesselDraft = {
  name: "", registration_number: "", owner_name: "", material: "", capacity: "", vessel_type: "",
};

const initialState: WizardState = {
  step: 1,
  service: null,
  customer: emptyCustomer,
  vessel: emptyVessel,
  personalDocs: [],
  addressDocs: [],
  vesselDocs: [],
  generating: false,
  progressLog: [],
  createdProcessId: null,
};

type Action =
  | { type: "RESET" }
  | { type: "STEP"; step: number }
  | { type: "SET_SERVICE"; service: ServiceKind }
  | { type: "PATCH_CUSTOMER"; patch: Partial<CustomerDraft> }
  | { type: "PATCH_VESSEL"; patch: Partial<VesselDraft> }
  | { type: "ADD_DOC"; bucket: "personal" | "address" | "vessel"; doc: UploadedDoc }
  | { type: "UPDATE_DOC"; bucket: "personal" | "address" | "vessel"; fileId: string; patch: Partial<UploadedDoc> }
  | { type: "GENERATING"; on: boolean }
  | { type: "LOG"; line: string }
  | { type: "CREATED"; processId: string };

const bucketKey = (b: "personal" | "address" | "vessel") =>
  b === "personal" ? "personalDocs" : b === "address" ? "addressDocs" : "vesselDocs";

function reducer(s: WizardState, a: Action): WizardState {
  switch (a.type) {
    case "RESET": return initialState;
    case "STEP": return { ...s, step: a.step };
    case "SET_SERVICE": return { ...s, service: a.service };
    case "PATCH_CUSTOMER": return { ...s, customer: { ...s.customer, ...a.patch } };
    case "PATCH_VESSEL": return { ...s, vessel: { ...s.vessel, ...a.patch } };
    case "ADD_DOC": {
      const key = bucketKey(a.bucket);
      return { ...s, [key]: [...s[key], a.doc] } as WizardState;
    }
    case "UPDATE_DOC": {
      const key = bucketKey(a.bucket);
      return {
        ...s,
        [key]: s[key].map((d) => (d.fileId === a.fileId ? { ...d, ...a.patch } : d)),
      } as WizardState;
    }
    case "GENERATING": return { ...s, generating: a.on };
    case "LOG": return { ...s, progressLog: [...s.progressLog, a.line] };
    case "CREATED": return { ...s, createdProcessId: a.processId };
  }
}

// Map OCR extracted_data → customer / vessel fields. Tolerant of various shapes.
function mergeCustomerFromOCR(current: CustomerDraft, extracted: any): CustomerDraft {
  if (!extracted || typeof extracted !== "object") return current;
  const e = extracted.fields ?? extracted;
  return {
    name: current.name || e.name || e.nome || e.full_name || "",
    cpf_cnpj: current.cpf_cnpj || e.cpf || e.cnpj || e.cpf_cnpj || "",
    rg: current.rg || e.rg || e.identidade || "",
    address: current.address || e.address || e.endereco || e.endereço || "",
    city: current.city || e.city || e.cidade || "",
    state: current.state || e.state || e.estado || e.uf || "",
    email: current.email || e.email || "",
    phone: current.phone || e.phone || e.telefone || "",
  };
}

function mergeVesselFromOCR(current: VesselDraft, extracted: any): VesselDraft {
  if (!extracted || typeof extracted !== "object") return current;
  const e = extracted.fields ?? extracted;
  return {
    name: current.name || e.vessel_name || e.nome_embarcacao || e.nome || "",
    registration_number: current.registration_number || e.registration_number || e.inscricao || e.inscrição || "",
    owner_name: current.owner_name || e.owner || e.proprietario || e.proprietário || "",
    material: current.material || e.material || "",
    capacity: current.capacity || e.capacity || e.capacidade || "",
    vessel_type: current.vessel_type || e.vessel_type || e.tipo || "",
  };
}

export function ProcessFirstWizard({ isOpen, onClose }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { createBatchJobs } = useOCR();
  const navigate = useNavigate();
  const personalInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const vesselInputRef = useRef<HTMLInputElement>(null);

  // Load company id once
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("company_id").eq("id", user.id).single();
      setCompanyId(profile?.company_id ?? null);
    })();
  }, [isOpen]);

  // Poll OCR jobs for any docs still in 'ocr' status
  useEffect(() => {
    if (!isOpen) return;
    const pending = [...state.personalDocs, ...state.addressDocs, ...state.vesselDocs].filter(
      (d) => d.status === "ocr" && d.ocrJobId,
    );
    if (pending.length === 0) return;
    const ids = pending.map((d) => d.ocrJobId!);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("ocr_jobs")
        .select("id, status, extracted_data, uploaded_file_id")
        .in("id", ids);
      if (!data) return;
      for (const job of data) {
        if (job.status !== "completed" && job.status !== "failed") continue;
        const personal = state.personalDocs.find((d) => d.ocrJobId === job.id);
        const address = state.addressDocs.find((d) => d.ocrJobId === job.id);
        const vessel = state.vesselDocs.find((d) => d.ocrJobId === job.id);
        const bucket: "personal" | "address" | "vessel" | null =
          personal ? "personal" : address ? "address" : vessel ? "vessel" : null;
        if (!bucket) continue;
        const doc = personal ?? address ?? vessel!;
        dispatch({
          type: "UPDATE_DOC", bucket, fileId: doc.fileId,
          patch: {
            status: job.status === "completed" ? "done" : "failed",
            extracted: job.extracted_data,
          },
        });
        const hasData = job.status === "completed"
          && job.extracted_data && (job.extracted_data as any)._has_data === true;
        console.log("[OCR_UI_STATUS_FIXED]", { jobId: job.id, status: job.status, hasData, bucket });
        if (hasData) {
          console.log("[OCR_FORM_AUTOFILL_APPLIED]", { jobId: job.id, bucket });
          if (bucket === "vessel") {
            dispatch({ type: "PATCH_VESSEL", patch: mergeVesselFromOCR(state.vessel, job.extracted_data) as any });
          } else {
            // personal (CNH/RG → name/cpf/rg) and address (comprovante → address/city/state)
            // both feed the same customer draft; merge helpers only fill empty fields.
            dispatch({ type: "PATCH_CUSTOMER", patch: mergeCustomerFromOCR(state.customer, job.extracted_data) as any });
          }
        } else if (job.status === "completed") {
          console.log("[OCR_EMPTY_RESULT_HANDLED]", { jobId: job.id });
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, state.personalDocs, state.addressDocs, state.vesselDocs, state.customer, state.vessel]);

  if (!isOpen) return null;

  const service = state.service ? findService(state.service) : null;

  const handleUpload = async (files: FileList | null, bucket: "personal" | "address" | "vessel") => {
    if (!files || !companyId) return;
    const arr = Array.from(files);
    const uploaded: { file: File; id: string }[] = [];
    for (const file of arr) {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${companyId}/process-first/${fileName}`;
      const tempId = crypto.randomUUID();
      dispatch({
        type: "ADD_DOC", bucket,
        doc: { fileId: tempId, filePath, fileName: file.name, status: "uploading" },
      });
      const { error: upErr } = await supabase.storage.from("ocr-documents").upload(filePath, file);
      if (upErr) {
        toast.error(`Falha no upload de ${file.name}: ${upErr.message}`);
        dispatch({ type: "UPDATE_DOC", bucket, fileId: tempId, patch: { status: "failed" } });
        continue;
      }
      const { data: fileRow, error: dbErr } = await supabase
        .from("uploaded_files").insert({
          company_id: companyId,
          file_name: file.name,
          file_url: filePath,
          category: bucket === "personal" ? "personal_doc" : bucket === "address" ? "address_doc" : "vessel_doc",
          file_type: file.type,
          file_size: file.size,
          status: "pending",
        }).select().single();
      if (dbErr || !fileRow) {
        toast.error(`Falha ao registrar ${file.name}`);
        dispatch({ type: "UPDATE_DOC", bucket, fileId: tempId, patch: { status: "failed" } });
        continue;
      }
      dispatch({
        type: "UPDATE_DOC", bucket, fileId: tempId,
        patch: { fileId: fileRow.id, status: "ocr" },
      });
      uploaded.push({ file, id: fileRow.id });
    }
    if (uploaded.length > 0) {
      try {
        const jobs = await createBatchJobs.mutateAsync({
          files: uploaded, companyId,
          docType: bucket === "vessel" ? "vessel_document" : "personal_document",
        });
        for (const job of jobs) {
          dispatch({ type: "UPDATE_DOC", bucket, fileId: job.uploaded_file_id, patch: { ocrJobId: job.id } });
        }
      } catch (e: any) {
        toast.error("Falha ao iniciar OCR: " + e.message);
      }
    }
  };

  const canAdvance = (() => {
    if (state.step === 1) return !!state.service;
    if (state.step === 2) return !service?.needsPersonal || !!state.customer.name;
    if (state.step === 3) return !service?.needsPersonal || !!state.customer.address || !!state.customer.city;
    if (state.step === 4) return !service?.needsVessel || !!state.vessel.name || !!state.vessel.registration_number;
    return true;
  })();

  const handleGenerate = async () => {
    if (!companyId || !service) return;
    dispatch({ type: "GENERATING", on: true });
    try {
      let customerId: string | null = null;
      if (service.needsPersonal && state.customer.name) {
        // Dedup by CPF/CNPJ if provided
        if (state.customer.cpf_cnpj) {
          const { data: existing } = await supabase
            .from("customers").select("id")
            .eq("company_id", companyId)
            .eq("cpf_cnpj", state.customer.cpf_cnpj)
            .maybeSingle();
          if (existing) customerId = existing.id;
        }
        if (!customerId) {
          const { data: c, error } = await supabase.from("customers").insert({
            company_id: companyId,
            name: state.customer.name,
            cpf_cnpj: state.customer.cpf_cnpj || null,
            email: state.customer.email || null,
            phone: state.customer.phone || null,
            address: state.customer.address || null,
            city: state.customer.city || null,
            state: state.customer.state || null,
          }).select().single();
          if (error) throw new Error("Cliente: " + error.message);
          customerId = c.id;
        }
        dispatch({ type: "LOG", line: `✓ Cliente: ${state.customer.name}` });
      }

      let vesselId: string | null = null;
      if (service.needsVessel && (state.vessel.name || state.vessel.registration_number)) {
        if (state.vessel.registration_number) {
          const { data: existing } = await supabase
            .from("vessels").select("id")
            .eq("company_id", companyId)
            .eq("registration_number", state.vessel.registration_number)
            .maybeSingle();
          if (existing) vesselId = existing.id;
        }
        if (!vesselId) {
          const { data: v, error } = await supabase.from("vessels").insert({
            company_id: companyId,
            customer_id: customerId,
            name: state.vessel.name || "Embarcação sem nome",
            registration_number: state.vessel.registration_number || null,
            vessel_type: state.vessel.vessel_type || null,
          }).select().single();
          if (error) throw new Error("Embarcação: " + error.message);
          vesselId = v.id;
        }
        dispatch({ type: "LOG", line: `✓ Embarcação: ${state.vessel.name || state.vessel.registration_number}` });
      }

      const { data: proc, error: procErr } = await supabase.from("processes").insert({
        company_id: companyId,
        customer_id: customerId,
        vessel_id: vesselId,
        process_type: service.processType,
        status: "pending",
        priority: "Média",
      }).select().single();
      if (procErr) throw new Error("Processo: " + procErr.message);
      dispatch({ type: "LOG", line: `✓ Processo criado: ${proc.id.slice(0, 8)}` });

      // Link uploaded files to process
      const allDocs = [...state.personalDocs, ...state.addressDocs, ...state.vesselDocs].filter((d) => d.status !== "failed");
      if (allDocs.length > 0) {
        await supabase.from("uploaded_files")
          .update({ process_id: proc.id })
          .in("id", allDocs.map((d) => d.fileId));
        dispatch({ type: "LOG", line: `✓ ${allDocs.length} documento(s) vinculado(s)` });
      }

      dispatch({ type: "CREATED", processId: proc.id });
      dispatch({ type: "STEP", step: 7 });
      toast.success("Processo criado com sucesso!");
    } catch (e: any) {
      toast.error(e.message);
      dispatch({ type: "LOG", line: `✗ ${e.message}` });
    } finally {
      dispatch({ type: "GENERATING", on: false });
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => dispatch({ type: "RESET" }), 200);
  };

  const steps = ["Serviço", "Pessoais", "Embarcação", "Montagem", "Pré-visualização", "Concluído"];

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">Novo Processo</h2>
            <p className="text-xs text-slate-500 font-medium">Comece pelo serviço — o resto é automático</p>
          </div>
          <button onClick={close} className="p-2 hover:bg-slate-100 rounded-xl" data-testid="pf-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-8 py-4 border-b border-slate-100 flex items-center gap-2">
          {steps.map((label, i) => {
            const num = i + 1;
            const active = num === state.step;
            const done = num < state.step;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                  done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                }`}>{done ? "✓" : num}</div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-navy" : "text-slate-400"} hidden sm:inline`}>{label}</span>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {state.step === 1 && <Step1 onPick={(k) => { dispatch({ type: "SET_SERVICE", service: k }); dispatch({ type: "STEP", step: 2 }); }} />}
          {state.step === 2 && service && (
            <Step2
              service={service}
              docs={state.personalDocs}
              customer={state.customer}
              onUpload={(files) => handleUpload(files, "personal")}
              onChange={(p) => dispatch({ type: "PATCH_CUSTOMER", patch: p })}
              fileInputRef={personalInputRef}
            />
          )}
          {state.step === 3 && service && (
            <Step3
              service={service}
              docs={state.vesselDocs}
              vessel={state.vessel}
              onUpload={(files) => handleUpload(files, "vessel")}
              onChange={(p) => dispatch({ type: "PATCH_VESSEL", patch: p })}
              fileInputRef={vesselInputRef}
            />
          )}
          {state.step === 4 && service && (
            <Step4 service={service} state={state} />
          )}
          {state.step === 5 && service && (
            <Step5 service={service} state={state} />
          )}
          {state.step === 6 && (
            <Step6
              log={state.progressLog}
              processId={state.createdProcessId}
              onOpen={() => {
                if (state.createdProcessId) {
                  navigate({ to: "/processes/$id", params: { id: state.createdProcessId } });
                  close();
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        {state.step < 6 && (
          <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
            <button
              onClick={() => dispatch({ type: "STEP", step: Math.max(1, state.step - 1) })}
              disabled={state.step === 1}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              data-testid="pf-back"
            >
              <ChevronLeft className="h-4 w-4 inline" /> Voltar
            </button>
            {state.step < 5 && (
              <button
                onClick={() => dispatch({ type: "STEP", step: state.step + 1 })}
                disabled={!canAdvance}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-lg shadow-primary/20"
                data-testid="pf-next"
              >
                Avançar <ChevronRight className="h-4 w-4 inline" />
              </button>
            )}
            {state.step === 5 && (
              <button
                onClick={handleGenerate}
                disabled={state.generating}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-lg shadow-green-600/20"
                data-testid="pf-generate"
              >
                {state.generating ? <><Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Gerando...</> : <><Sparkles className="h-4 w-4 inline mr-1" /> Gerar Tudo</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ---------- Steps ----------

function Step1({ onPick }: { onPick: (k: ServiceKind) => void }) {
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Qual serviço você precisa fazer?</h3>
      <p className="text-sm text-slate-500 mb-6">Escolha o tipo. O sistema cuida do resto.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICES.map((s) => (
          <button
            key={s.kind}
            onClick={() => onPick(s.kind)}
            data-testid={`pf-service-${s.kind}`}
            className="text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-primary hover:shadow-lg transition-all bg-white group"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{s.icon}</span>
              <div className="flex-1">
                <div className="font-black text-navy text-sm">{s.name}</div>
                <div className="text-xs text-slate-500 mt-1">{s.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const CUSTOMER_FIELD_LABELS: Record<string, string> = {
  name: "Nome", cpf_cnpj: "CPF/CNPJ", rg: "RG", email: "E-mail",
  phone: "Telefone", address: "Endereço", city: "Cidade", state: "UF",
};
const VESSEL_FIELD_LABELS: Record<string, string> = {
  name: "Nome", registration_number: "Inscrição", owner_name: "Proprietário",
  vessel_type: "Tipo", material: "Material", capacity: "Capacidade",
};

function ocrStatusLabel(d: UploadedDoc): { label: string; tone: "ok" | "warn" | "err" | "load" } {
  if (d.status === "uploading") return { label: "Enviando", tone: "load" };
  if (d.status === "ocr") return { label: "Lendo", tone: "load" };
  if (d.status === "failed") return { label: "Falha na leitura OCR.", tone: "err" };
  const hasData = d.extracted && d.extracted._has_data === true;
  if (hasData) return { label: "OCR OK", tone: "ok" };
  return { label: "OCR executado, mas nenhum dado identificado.", tone: "warn" };
}

function DocsList({ docs }: { docs: UploadedDoc[] }) {
  if (docs.length === 0) return null;
  return (
    <div className="space-y-2 mt-4">
      {docs.map((d) => {
        const s = ocrStatusLabel(d);
        return (
          <div key={d.fileId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-navy truncate">{d.fileName}</span>
            {s.tone === "load" && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {s.label}</span>}
            {s.tone === "ok" && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {s.label}</span>}
            {s.tone === "warn" && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {s.label}</span>}
            {s.tone === "err" && <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {s.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

function OCRDebugPanel({ docs, scope }: { docs: UploadedDoc[]; scope: "personal" | "vessel" }) {
  const completed = docs.filter((d) => d.status === "done" || d.status === "failed");
  if (completed.length === 0) return null;
  const labels = scope === "personal" ? CUSTOMER_FIELD_LABELS : VESSEL_FIELD_LABELS;
  return (
    <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
        Debug OCR (temporário)
      </div>
      <div className="space-y-3">
        {completed.map((d) => {
          const ex = d.extracted || {};
          const raw = (ex._raw_text || "") as string;
          const fieldsFound = (ex._fields_found ?? 0) as number;
          const filled: string[] = [];
          const pending: string[] = [];
          const e = ex.fields ?? ex;
          for (const key of Object.keys(labels)) {
            const ocrKeys =
              key === "cpf_cnpj" ? ["cpf", "cnpj", "cpf_cnpj"] :
              (key === "name" && scope === "vessel") ? ["vessel_name", "nome_embarcacao", "nome", "name"] :
              key === "registration_number" ? ["registration_number", "inscricao", "inscrição"] :
              [key];
            const val = ocrKeys.map((k) => (e as any)?.[k]).find((v) => v && String(v).trim());
            (val ? filled : pending).push(labels[key]);
          }
          return (
            <div key={d.fileId} className="rounded-xl bg-white p-3 border border-slate-100">
              <div className="text-[11px] font-bold text-navy truncate">{d.fileName}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                Campos encontrados: <span className="font-black text-navy">{fieldsFound}</span>
                {ex._has_data ? null : <span className="ml-2 text-amber-600 font-bold">(sem dados aplicáveis)</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                <div>
                  <div className="font-black text-green-700 mb-0.5">Preenchidos</div>
                  <div className="text-slate-600">{filled.length ? filled.join(", ") : "—"}</div>
                </div>
                <div>
                  <div className="font-black text-amber-700 mb-0.5">Pendentes</div>
                  <div className="text-slate-600">{pending.length ? pending.join(", ") : "—"}</div>
                </div>
              </div>
              {raw && (
                <details className="mt-2">
                  <summary className="text-[10px] font-bold text-slate-500 cursor-pointer">Texto bruto extraído</summary>
                  <pre className="mt-1 text-[10px] text-slate-600 whitespace-pre-wrap max-h-40 overflow-auto bg-slate-50 p-2 rounded-lg">{raw}</pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">{children}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </label>
  );
}

function Step2({ service, docs, customer, onUpload, onChange, fileInputRef }: {
  service: ServiceDef; docs: UploadedDoc[]; customer: CustomerDraft;
  onUpload: (files: FileList | null) => void; onChange: (p: Partial<CustomerDraft>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!service.needsPersonal) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500 mt-3">Este serviço não exige documentos pessoais. Avance para a embarcação.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Documentos pessoais</h3>
      <p className="text-sm text-slate-500 mb-4">Envie {service.personalDocs.join(", ")}. O OCR extrai os dados.</p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-8 text-center group transition-all"
        data-testid="pf-upload-personal"
      >
        <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary mx-auto" />
        <p className="text-sm font-bold text-navy mt-2">Clique para enviar (CNH, RG, CPF, Comprovante)</p>
        <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={(e) => onUpload(e.target.files)} />
      <DocsList docs={docs} />
      <OCRDebugPanel docs={docs} scope="personal" />

      <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">Dados encontrados</div>
        <FieldGrid>
          <Field label="Nome" value={customer.name} onChange={(v) => onChange({ name: v })} />
          <Field label="CPF / CNPJ" value={customer.cpf_cnpj} onChange={(v) => onChange({ cpf_cnpj: v })} />
          <Field label="RG" value={customer.rg} onChange={(v) => onChange({ rg: v })} />
          <Field label="Email" value={customer.email} onChange={(v) => onChange({ email: v })} />
          <Field label="Telefone" value={customer.phone} onChange={(v) => onChange({ phone: v })} />
          <Field label="Endereço" value={customer.address} onChange={(v) => onChange({ address: v })} />
          <Field label="Cidade" value={customer.city} onChange={(v) => onChange({ city: v })} />
          <Field label="UF" value={customer.state} onChange={(v) => onChange({ state: v })} />
        </FieldGrid>
      </div>
    </div>
  );
}

function Step3({ service, docs, vessel, onUpload, onChange, fileInputRef }: {
  service: ServiceDef; docs: UploadedDoc[]; vessel: VesselDraft;
  onUpload: (files: FileList | null) => void; onChange: (p: Partial<VesselDraft>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!service.needsVessel) {
    return (
      <div className="text-center py-8">
        <Ship className="h-12 w-12 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500 mt-3">Este serviço não exige documentos da embarcação.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Documentos da embarcação</h3>
      <p className="text-sm text-slate-500 mb-4">Envie {service.vesselDocs.join(", ")}.</p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-8 text-center group transition-all"
        data-testid="pf-upload-vessel"
      >
        <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary mx-auto" />
        <p className="text-sm font-bold text-navy mt-2">Clique para enviar (TIE, TIEM, Nota Fiscal, Recibo)</p>
        <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={(e) => onUpload(e.target.files)} />
      <DocsList docs={docs} />
      <OCRDebugPanel docs={docs} scope="vessel" />

      <div className="mt-6 p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100">
        <div className="text-xs font-black text-cyan-700 uppercase tracking-wider mb-2">Dados encontrados</div>
        <FieldGrid>
          <Field label="Nome da embarcação" value={vessel.name} onChange={(v) => onChange({ name: v })} />
          <Field label="Inscrição" value={vessel.registration_number} onChange={(v) => onChange({ registration_number: v })} />
          <Field label="Proprietário" value={vessel.owner_name} onChange={(v) => onChange({ owner_name: v })} />
          <Field label="Tipo" value={vessel.vessel_type} onChange={(v) => onChange({ vessel_type: v })} />
          <Field label="Material" value={vessel.material} onChange={(v) => onChange({ material: v })} />
          <Field label="Capacidade" value={vessel.capacity} onChange={(v) => onChange({ capacity: v })} />
        </FieldGrid>
      </div>
    </div>
  );
}

function Step4({ service, state }: { service: ServiceDef; state: WizardState }) {
  const personalOk = !service.needsPersonal || state.personalDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.customer.name;
  const vesselOk = !service.needsVessel || state.vesselDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.vessel.name;
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Montagem inteligente</h3>
      <p className="text-sm text-slate-500 mb-4">Para <strong>{service.name}</strong>, vamos precisar de:</p>
      <div className="space-y-2">
        {service.needsPersonal && <Check label="Documentos pessoais enviados" ok={personalOk} />}
        {service.needsVessel && <Check label="Documentos da embarcação enviados" ok={vesselOk} />}
        {service.generatedDocs.map((d) => (
          <Check key={d} label={`${d} — será gerado automaticamente`} ok={true} info />
        ))}
      </div>
    </div>
  );
}

function Check({ label, ok, info }: { label: string; ok: boolean; info?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${ok ? "bg-green-50" : "bg-amber-50"}`}>
      {ok
        ? <CheckCircle2 className={`h-5 w-5 ${info ? "text-blue-500" : "text-green-600"}`} />
        : <AlertTriangle className="h-5 w-5 text-amber-600" />}
      <span className="text-sm font-medium text-navy">{label}</span>
    </div>
  );
}

function Step5({ service, state }: { service: ServiceDef; state: WizardState }) {
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Pré-visualização</h3>
      <p className="text-sm text-slate-500 mb-4">Confira antes de gerar.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Cliente" icon={<User className="h-4 w-4" />}>
          {state.customer.name ? (
            <>
              <Row k="Nome" v={state.customer.name} />
              <Row k="CPF/CNPJ" v={state.customer.cpf_cnpj} />
              <Row k="Cidade/UF" v={`${state.customer.city}${state.customer.state ? "/" + state.customer.state : ""}`} />
            </>
          ) : <p className="text-xs text-slate-400">Sem cliente</p>}
        </Card>
        <Card title="Embarcação" icon={<Ship className="h-4 w-4" />}>
          {state.vessel.name || state.vessel.registration_number ? (
            <>
              <Row k="Nome" v={state.vessel.name} />
              <Row k="Inscrição" v={state.vessel.registration_number} />
              <Row k="Tipo" v={state.vessel.vessel_type} />
            </>
          ) : <p className="text-xs text-slate-400">Sem embarcação</p>}
        </Card>
        <Card title="Processo" icon={<Sparkles className="h-4 w-4" />}>
          <Row k="Serviço" v={service.name} />
          <Row k="Status inicial" v="Pendente" />
        </Card>
        <Card title="Documentos" icon={<FileText className="h-4 w-4" />}>
          <Row k="Enviados" v={String(state.personalDocs.length + state.vesselDocs.length)} />
          <Row k="A gerar" v={service.generatedDocs.join(", ")} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-2 mb-2 text-navy">
        {icon}<span className="text-xs font-black uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-slate-500 font-bold">{k}</span>
      <span className="text-navy font-semibold text-right truncate">{v || "—"}</span>
    </div>
  );
}

function Step6({ log, processId, onOpen }: { log: string[]; processId: string | null; onOpen: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-black text-navy">Tudo pronto!</h3>
      <p className="text-sm text-slate-500 mt-1">Seu processo foi criado.</p>
      <div className="mt-6 text-left max-w-md mx-auto space-y-1">
        {log.map((l, i) => (
          <div key={i} className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{l}</div>
        ))}
      </div>
      {processId && (
        <button onClick={onOpen} className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90"
          data-testid="pf-open-process">
          Abrir Processo <ArrowRight className="h-4 w-4 inline ml-1" />
        </button>
      )}
    </div>
  );
}
