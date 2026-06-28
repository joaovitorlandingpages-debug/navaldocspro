import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
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
import { validateCriticalFields } from "@/services/documentNormalizer";
import { PDF_TEMPLATES, type PdfTemplateId } from "@/services/companyBranding";
import {
  fetchLibrary,
  suggestTemplatesForWizard,
  persistProcessDocuments,
  logLibraryEvent,
  type SuggestedTemplate,
} from "@/services/documentLibrary";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  owner_document: string;
  material: string;
  capacity: string;
  vessel_type: string;
  length: string;
  beam: string;
  depth: string;
  construction_year: string;
  navigation_area: string;
  activity_service: string;
  builder: string;
  engine_power: string;
  engine_serial: string;
  city: string;
  state: string;
};

type UploadedDoc = {
  fileId: string;
  filePath: string;
  fileName: string;
  ocrJobId?: string;
  extracted?: any;
  status: "uploading" | "ocr" | "done" | "failed";
};

type ReviewStatus = "pending_data" | "ready" | "editing" | "approved" | "failed";
type ReviewVersion = { n: number; content: string; at: string; reason?: string };
type ReviewDoc = {
  name: string;
  status: ReviewStatus;
  content: string;
  baseContent: string;
  versions: ReviewVersion[];
  missing: string[];
};

interface WizardState {
  step: number;
  service: ServiceKind | null;
  customer: CustomerDraft;
  vessel: VesselDraft;
  personalDocs: UploadedDoc[];
  addressDocs: UploadedDoc[];
  vesselDocs: UploadedDoc[];
  reviewDocs: ReviewDoc[];
  generating: boolean;
  progressLog: string[];
  createdProcessId: string | null;
  generationResult: PersistenceResult | null;
}

type PersistenceResult = {
  status: "success" | "partial" | "failed";
  title: string;
  message: string;
  generatedCount: number;
  documentCount: number;
  errors: string[];
};

const emptyCustomer: CustomerDraft = {
  name: "", cpf_cnpj: "", rg: "", address: "", city: "", state: "", email: "", phone: "",
};
const emptyVessel: VesselDraft = {
  name: "", registration_number: "", owner_name: "", owner_document: "", material: "",
  capacity: "", vessel_type: "", length: "", beam: "", depth: "", construction_year: "",
  navigation_area: "", activity_service: "", builder: "", engine_power: "", engine_serial: "",
  city: "", state: "",
};

const initialState: WizardState = {
  step: 1,
  service: null,
  customer: emptyCustomer,
  vessel: emptyVessel,
  personalDocs: [],
  addressDocs: [],
  vesselDocs: [],
  reviewDocs: [],
  generating: false,
  progressLog: [],
  createdProcessId: null,
  generationResult: null,
};

type Action =
  | { type: "RESET" }
  | { type: "STEP"; step: number }
  | { type: "SET_SERVICE"; service: ServiceKind }
  | { type: "PATCH_CUSTOMER"; patch: Partial<CustomerDraft> }
  | { type: "PATCH_VESSEL"; patch: Partial<VesselDraft> }
  | { type: "ADD_DOC"; bucket: "personal" | "address" | "vessel"; doc: UploadedDoc }
  | { type: "UPDATE_DOC"; bucket: "personal" | "address" | "vessel"; fileId: string; patch: Partial<UploadedDoc> }
  | { type: "INIT_REVIEW"; docs: ReviewDoc[] }
  | { type: "SET_REVIEW_CONTENT"; name: string; content: string; reason?: string }
  | { type: "SET_REVIEW_STATUS"; name: string; status: ReviewStatus }
  | { type: "GENERATING"; on: boolean }
  | { type: "LOG"; line: string }
  | { type: "CREATED"; processId: string }
  | { type: "SET_RESULT"; result: PersistenceResult | null };

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
    case "INIT_REVIEW": return { ...s, reviewDocs: a.docs };
    case "SET_REVIEW_CONTENT": {
      return {
        ...s,
        reviewDocs: s.reviewDocs.map((d) => {
          if (d.name !== a.name) return d;
          const nextN = (d.versions[d.versions.length - 1]?.n ?? 0) + 1;
          const version: ReviewVersion = { n: nextN, content: a.content, at: new Date().toISOString(), reason: a.reason };
          const wasApproved = d.status === "approved";
          if (wasApproved) console.log("[DOCUMENT_APPROVAL_REVOKED]", { name: a.name });
          console.log("[DOCUMENT_TEXT_EDITED]", { name: a.name, version: nextN });
          console.log("[DOCUMENT_VERSION_CREATED]", { name: a.name, version: nextN });
          return { ...d, content: a.content, status: "editing" as ReviewStatus, versions: [...d.versions, version] };
        }),
      };
    }
    case "SET_REVIEW_STATUS": {
      return {
        ...s,
        reviewDocs: s.reviewDocs.map((d) => (d.name === a.name ? { ...d, status: a.status } : d)),
      };
    }
    case "GENERATING": return { ...s, generating: a.on };
    case "LOG": return { ...s, progressLog: [...s.progressLog, a.line] };
    case "CREATED": return { ...s, createdProcessId: a.processId };
    case "SET_RESULT": return { ...s, generationResult: a.result };
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
  const pick = (cur: string, ...alts: any[]) => cur || alts.find((v) => v !== null && v !== undefined && String(v).trim() !== "") || "";
  return {
    name: pick(current.name, e.vessel_name, e.nome_embarcacao, e.nome),
    registration_number: pick(current.registration_number, e.registration_number, e.inscricao, e.inscrição),
    owner_name: pick(current.owner_name, e.owner_name, e.owner, e.proprietario, e.proprietário),
    owner_document: pick(current.owner_document, e.owner_document, e.cpf_cnpj, e.cnpj, e.cpf),
    material: pick(current.material, e.hull_material, e.material),
    capacity: pick(current.capacity, e.capacity, e.capacidade),
    vessel_type: pick(current.vessel_type, e.vessel_type, e.tipo),
    length: pick(current.length, e.length, e.comprimento),
    beam: pick(current.beam, e.beam, e.boca),
    depth: pick(current.depth, e.depth, e.pontal),
    construction_year: pick(current.construction_year, e.construction_year, e.ano),
    navigation_area: pick(current.navigation_area, e.navigation_area, e.area_navegacao),
    activity_service: pick(current.activity_service, e.activity_service, e.atividade),
    builder: pick(current.builder, e.builder, e.construtor),
    engine_power: pick(current.engine_power, e.engine_power, e.potencia),
    engine_serial: pick(current.engine_serial, e.engine_serial),
    city: pick(current.city, e.city, e.cidade),
    state: pick(current.state, e.state, e.uf),
  };
}

const requiredDocumentLinks = ["process_id", "customer_id", "vessel_id", "company_id", "generated_file_url"] as const;

function assertNoError(error: any, message: string) {
  if (error) throw new Error(`${message}: ${error.message || String(error)}`);
}

function pickTemplateScore(templateName: string, docName: string, serviceKind: ServiceKind) {
  const name = templateName.toLowerCase();
  const doc = docName.toLowerCase();
  let score = 0;
  if (name === doc) score += 100;
  if (name.includes(doc)) score += 50;
  if (serviceKind === "renovacao" && name.includes("renova")) score += 40;
  if (serviceKind === "renovacao" && (name.includes("tie") || name.includes("tiem"))) score += 35;
  if (doc.includes("gru") && name.includes("gru")) score += 90;
  if (doc.includes("requerimento") && name.includes("requerimento")) score += 70;
  if (name.includes("simplificado")) score += 5;
  return score;
}

async function resolveTemplate(companyId: string, docName: string, serviceKind: ServiceKind) {
  const { data, error } = await supabase
    .from("document_templates")
    .select("id, name, company_id, base_content, template_file_url, file_type, is_active")
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .ilike("name", `%${docName}%`)
    .eq("is_active", true);
  assertNoError(error, `Modelo ${docName}`);

  const candidates = (data || []).sort((a: any, b: any) => {
    const companyScoreA = a.company_id === companyId ? 10 : 0;
    const companyScoreB = b.company_id === companyId ? 10 : 0;
    return (pickTemplateScore(b.name, docName, serviceKind) + companyScoreB) - (pickTemplateScore(a.name, docName, serviceKind) + companyScoreA);
  });

  return candidates[0] || null;
}

async function validateGeneratedPdfPath(path: string) {
  if (!path || !path.toLowerCase().endsWith(".pdf")) return false;
  const { data: blob, error } = await supabase.storage.from("generated-documents").download(path);
  if (error || !blob) return false;
  const sample = await blob.slice(0, 4).text();
  return sample === "%PDF";
}

function fieldLines(label: string, input: Record<string, any>) {
  return Object.entries(input || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => `${label}.${key}: ${value}`);
}

// ---------- Bloco 2: text builder + missing-field detection + edited-text PDF ----------

function buildDocumentText(
  docName: string,
  customer: CustomerDraft,
  vessel: VesselDraft,
  service: ServiceDef,
): string {
  const has = (v: string | undefined | null) => !!(v && String(v).trim());
  const line = (label: string, v?: string) => (has(v) ? `${label}: ${v}` : null);
  const parts: (string | null)[] = [];
  parts.push(docName.toUpperCase());
  parts.push(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`);
  parts.push("");
  parts.push("SERVIÇO");
  parts.push(`Tipo: ${service.name}`);
  parts.push(`Processo administrativo: ${service.processType}`);
  parts.push("");
  if (service.needsPersonal) {
    parts.push("DADOS DO REQUERENTE");
    parts.push(line("Nome", customer.name));
    parts.push(line("CPF/CNPJ", customer.cpf_cnpj));
    parts.push(line("RG", customer.rg));
    parts.push(line("Endereço", customer.address));
    parts.push(line("Cidade", customer.city));
    parts.push(line("UF", customer.state));
    parts.push(line("Telefone", customer.phone));
    parts.push(line("E-mail", customer.email));
    parts.push("");
  }
  if (service.needsVessel) {
    parts.push("DADOS DA EMBARCAÇÃO");
    parts.push(line("Nome", vessel.name));
    parts.push(line("Inscrição", vessel.registration_number));
    parts.push(line("Proprietário", vessel.owner_name));
    parts.push(line("CPF/CNPJ do proprietário", vessel.owner_document));
    parts.push(line("Tipo", vessel.vessel_type));
    parts.push(line("Material", vessel.material));
    parts.push(line("Comprimento (m)", vessel.length));
    parts.push(line("Boca (m)", vessel.beam));
    parts.push(line("Pontal (m)", vessel.depth));
    parts.push(line("Capacidade", vessel.capacity));
    parts.push(line("Área de navegação", vessel.navigation_area));
    parts.push(line("Atividade", vessel.activity_service));
    parts.push(line("Ano de construção", vessel.construction_year));
    parts.push(line("Construtor", vessel.builder));
    parts.push("");
    if (/motor/i.test(docName) || has(vessel.engine_power) || has(vessel.engine_serial)) {
      parts.push("DADOS DO MOTOR");
      parts.push(line("Potência (HP)", vessel.engine_power));
      parts.push(line("Número de série", vessel.engine_serial));
      parts.push("");
    }
  }
  parts.push("DECLARAÇÃO");
  parts.push(
    `Declaro, para os devidos fins, que as informações acima são verdadeiras e correspondem à realidade do(a) ${docName.toLowerCase()} para a solicitação de ${service.name}.`,
  );
  return parts.filter((v) => v !== null).join("\n");
}

function detectMissingForDoc(
  docName: string,
  customer: CustomerDraft,
  vessel: VesselDraft,
  service: ServiceDef,
): string[] {
  const missing: string[] = [];
  const empty = (v: string) => !v || !v.trim();
  if (service.needsPersonal) {
    if (empty(customer.name)) missing.push("Nome");
    if (empty(customer.cpf_cnpj)) missing.push("CPF/CNPJ");
  }
  if (service.needsVessel) {
    if (empty(vessel.name)) missing.push("Nome da embarcação");
    if (empty(vessel.registration_number)) missing.push("Inscrição");
  }
  if (/motor/i.test(docName)) {
    if (empty(vessel.engine_power)) missing.push("Potência do motor");
    if (empty(vessel.engine_serial)) missing.push("Série do motor");
  }
  return missing;
}

async function buildEditedTextPdfBytes(
  docName: string,
  content: string,
  branding: import("@/services/companyBranding").CompanyBranding | null,
): Promise<Uint8Array> {
  const { buildBrandedDocumentPdf } = await import("@/services/brandedPdfBuilder");
  const { bytes } = await buildBrandedDocumentPdf({ docName, content, branding });
  return bytes;
}

async function buildFallbackPdfBytes(docName: string, fieldValues: any) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 792;
  const sanitizePdfText = (text: string) => String(text)
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
  const draw = (text: string, size = 10, isBold = false) => {
    const safeText = sanitizePdfText(text);
    const chunks = safeText.match(/.{1,88}(\s|$)/g) || [safeText];
    for (const chunk of chunks) {
      if (y < 52) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 792;
      }
      page.drawText(chunk.trim(), { x: 48, y, size, font: isBold ? bold : font, color: rgb(0, 0, 0), maxWidth: 500 });
      y -= size + 5;
    }
  };

  draw(docName.toUpperCase(), 15, true);
  draw(`Gerado em ${new Date().toLocaleString("pt-BR")} pelo fluxo Processo-First`, 9);
  y -= 10;
  draw("DADOS DO CLIENTE", 11, true);
  fieldLines("cliente", fieldValues.customer).forEach((line) => draw(line));
  y -= 8;
  draw("DADOS DA EMBARCAÇÃO", 11, true);
  fieldLines("embarcacao", fieldValues.vessel).forEach((line) => draw(line));
  y -= 8;
  draw("DADOS DO PROCESSO", 11, true);
  fieldLines("processo", fieldValues.process).forEach((line) => draw(line));
  y -= 16;
  draw("PDF real gerado, armazenado e vinculado ao processo, cliente e embarcação.", 9, true);

  return await pdfDoc.save();
}

async function createProcessFirstPdfDocument(params: {
  docName: string;
  companyId: string;
  customerId: string;
  vesselId: string | null;
  processId: string;
  templateId?: string | null;
  userId?: string | null;
  fieldValues: any;
  reason: string;
}) {
  const pdfBytes = await buildFallbackPdfBytes(params.docName, params.fieldValues);
  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  const generatedPath = `${params.companyId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("generated-documents")
    .upload(generatedPath, pdfBlob, { contentType: "application/pdf", upsert: true });
  assertNoError(uploadError, `Upload do PDF ${params.docName}`);

  const { data: generatedDoc, error: dbError } = await supabase
    .from("generated_documents")
    .insert({
      company_id: params.companyId,
      process_id: params.processId,
      customer_id: params.customerId,
      vessel_id: params.vesselId,
      template_id: params.templateId || null,
      name: `${params.docName} - ${new Date().toLocaleDateString("pt-BR")}`,
      generated_file_url: generatedPath,
      status: "completed",
      generated_by: params.userId || null,
      metadata: { fieldValues: params.fieldValues, source: "process_first_pdf", reason: params.reason } as any,
    } as any)
    .select()
    .single();
  assertNoError(dbError, `Persistência do PDF ${params.docName}`);
  return generatedDoc;
}

export function ProcessFirstWizard({ isOpen, onClose }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { createBatchJobs } = useOCR();
  const navigate = useNavigate();
  const personalInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const vesselInputRef = useRef<HTMLInputElement>(null);

  // ---- Bloco 5: library-suggested templates state ----
  const [suggestedTemplates, setSuggestedTemplates] = useState<SuggestedTemplate[]>([]);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<Set<string>>(new Set());
  const [ignoredOptionalIds, setIgnoredOptionalIds] = useState<Set<string>>(new Set());
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  // Template do documento (sobrescreve o padrão da empresa para esta geração)
  const [templateOverride, setTemplateOverride] = useState<string | null>(null);

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

  // ---- Bloco 5: fetch & suggest templates when service/company changes ----
  useEffect(() => {
    if (!isOpen || !state.service || !companyId) return;
    const svc = findService(state.service);
    if (!svc) return;
    (async () => {
      setLoadingSuggested(true);
      try {
        const all = await fetchLibrary();
        const suggested = suggestTemplatesForWizard(all, svc.processType, companyId);
        setSuggestedTemplates(suggested);
        // Pre-select all required; clear stale optional toggles
        setSelectedOptionalIds(new Set());
        setIgnoredOptionalIds(new Set());
        await logLibraryEvent("process_templates_suggested", {
          process_type: svc.processType,
          required: suggested.filter((s) => s.is_required).map((s) => s.id),
          optional: suggested.filter((s) => !s.is_required).map((s) => s.id),
        });
      } catch (e) {
        console.warn("[Bloco 5 suggest] failed", e);
      } finally {
        setLoadingSuggested(false);
      }
    })();
  }, [isOpen, state.service, companyId]);

  const toggleOptional = (tplId: string, select: boolean) => {
    setSelectedOptionalIds((prev) => {
      const next = new Set(prev);
      if (select) next.add(tplId); else next.delete(tplId);
      return next;
    });
    setIgnoredOptionalIds((prev) => {
      const next = new Set(prev);
      if (select) next.delete(tplId); else next.add(tplId);
      return next;
    });
    logLibraryEvent(
      select ? "process_document_optional_selected" : "process_document_optional_ignored",
      { template_id: tplId },
    );
  };


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
    console.log("[PROCESS_FIRST_PERSISTENCE_STARTED]", { service: service.kind });
    console.log("[PROCESS_FIRST_GENERATION_STARTED]", { service: service.kind });
    dispatch({ type: "GENERATING", on: true });
    dispatch({ type: "SET_RESULT", result: null });

    // ---- Bloco 1: Validação crítica antes de gerar QUALQUER PDF ----
    const needsEngine = service.generatedDocs.some((n) => /motor/i.test(n));
    const critical = validateCriticalFields(
      {
        cliente: { nome: state.customer.name, cpf: state.customer.cpf_cnpj },
        embarcacao: { nome: state.vessel.name, inscricao: state.vessel.registration_number },
        motor: { potencia: state.vessel.engine_power, serie: state.vessel.engine_serial },
        empresa: { nome: "ok", cnpj: "ok" }, // empresa validada via RLS no insert; UI completa virá no Bloco 2
      },
      { needsPersonal: !!service.needsPersonal, needsVessel: !!service.needsVessel, needsEngine }
    );
    if (!critical.ok) {
      console.warn("[DOCUMENT_VALIDATION_FAILED]", critical.missing);
      toast.error(
        `Não é possível gerar: ${critical.missing.length} campo(s) crítico(s) faltando: ` +
          critical.missing.map((m) => m.label).join(", ")
      );
      dispatch({ type: "GENERATING", on: false });
      return;
    }
    console.log("[DOCUMENT_VALIDATION_SUCCESS]", { fields: "ok" });

    // ---- Bloco 2: Aprovação obrigatória de todos os documentos ----
    const notApproved = state.reviewDocs.filter((r) => r.status !== "approved");
    if (state.reviewDocs.length === 0 || notApproved.length > 0) {
      const names = notApproved.map((n) => n.name).join(", ") || "todos";
      toast.error(`Existem documentos pendentes de aprovação: ${names}`);
      console.warn("[DOCUMENT_FINAL_GENERATION_BLOCKED]", { notApproved: notApproved.map((n) => n.name) });
      await logLibraryEvent("process_final_pdf_blocked", { reason: "review_not_approved", names });
      dispatch({ type: "GENERATING", on: false });
      return;
    }

    // ---- Bloco 5: templates obrigatórios da biblioteca são SEMPRE persistidos
    // por persistProcessDocuments (is_required=true). Não exigimos correspondência
    // com state.reviewDocs (que são uploads OCR de origem como RG/CNH/TIE — natureza
    // distinta dos documentos a serem GERADOS, ex.: Capa do Processo, Guia GRU).
    // A aprovação dos documentos a gerar acontece via state.reviewDocs (Bloco 2 acima).

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      const persistenceErrors: string[] = [];

      let customerId: string | null = null;
      if (service.needsPersonal && state.customer.name) {
        if (state.customer.cpf_cnpj) {
          const { data: existing } = await supabase
            .from("customers").select("id")
            .eq("company_id", companyId)
            .eq("cpf_cnpj", state.customer.cpf_cnpj)
            .maybeSingle();
          if (existing) {
            customerId = existing.id;
            const { error } = await supabase.from("customers").update({
              name: state.customer.name,
              email: state.customer.email || null,
              phone: state.customer.phone || null,
              address: state.customer.address || null,
              city: state.customer.city || null,
              state: state.customer.state || null,
              rg: state.customer.rg || null,
            }).eq("id", customerId);
            assertNoError(error, "Atualização do cliente");
          }
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
            rg: state.customer.rg || null,
          }).select().single();
          if (error) throw new Error("Cliente: " + error.message);
          customerId = c.id;
        }
        console.log("[CUSTOMER_UPSERT_OK]", { customerId });
        console.log("[CUSTOMER_CREATED_OR_UPDATED]", customerId);
        dispatch({ type: "LOG", line: `✓ Cliente: ${state.customer.name}` });
      }

      if (!customerId) throw new Error("Cliente obrigatório não foi salvo; processo não pode ser persistido sem customer_id.");

      let vesselId: string | null = null;
      let vesselLinked = !service.needsVessel;
      if (service.needsVessel && (state.vessel.name || state.vessel.registration_number)) {
        const vesselPayload = {
          company_id: companyId,
          customer_id: customerId,
          name: state.vessel.name || "Embarcação sem nome",
          registration_number: state.vessel.registration_number || null,
          vessel_type: state.vessel.vessel_type || null,
          material: state.vessel.material || null,
          length: state.vessel.length || null,
          boca: state.vessel.beam || null,
          pontal: state.vessel.depth || null,
          capacity: state.vessel.capacity || null,
          current_owner_name: state.vessel.owner_name || null,
          current_owner_cpf_cnpj: state.vessel.owner_document || null,
          engine_power: state.vessel.engine_power || null,
          engine_serial_number: state.vessel.engine_serial || null,
          notes: [state.vessel.construction_year && `Ano: ${state.vessel.construction_year}`,
                  state.vessel.navigation_area && `Área: ${state.vessel.navigation_area}`,
                  state.vessel.activity_service && `Atividade: ${state.vessel.activity_service}`,
                  state.vessel.builder && `Construtor: ${state.vessel.builder}`].filter(Boolean).join(" | ") || null,
        };
        if (state.vessel.registration_number) {
          const { data: existing } = await supabase
            .from("vessels").select("id")
            .eq("company_id", companyId)
            .eq("registration_number", state.vessel.registration_number)
            .maybeSingle();
          if (existing) {
            vesselId = existing.id;
            const { error } = await supabase.from("vessels").update(vesselPayload).eq("id", vesselId);
            assertNoError(error, "Atualização da embarcação");
          }
        }
        if (!vesselId) {
          const { data: v, error } = await supabase.from("vessels").insert(vesselPayload).select().single();
          if (error) throw new Error("Embarcação: " + error.message);
          vesselId = v.id;
        }
        const { data: linkedVessel, error: linkCheckError } = await supabase
          .from("vessels")
          .select("id, customer_id")
          .eq("id", vesselId)
          .maybeSingle();
        assertNoError(linkCheckError, "Validação do vínculo embarcação-cliente");
        vesselLinked = linkedVessel?.customer_id === customerId;
        if (!vesselLinked) throw new Error("Cliente criado, mas embarcação não vinculou.");
        console.log("[VESSEL_UPSERT_OK]", { vesselId });
        console.log("[VESSEL_CUSTOMER_LINK_OK]", { vesselId, customerId });
        console.log("[VESSEL_CREATED_OR_UPDATED]", vesselId);
        console.log("[VESSEL_LINKED_TO_CUSTOMER]", { vesselId, customerId });
        dispatch({ type: "LOG", line: `✓ Embarcação: ${state.vessel.name || state.vessel.registration_number}` });
      }

      if (service.needsVessel && !vesselId) throw new Error("Embarcação obrigatória não foi salva; processo não pode ser persistido sem vessel_id.");

      const { data: proc, error: procErr } = await supabase.from("processes").insert({
        company_id: companyId,
        customer_id: customerId,
        vessel_id: vesselId,
        process_type: service.processType,
        status: "pending",
        priority: "Média",
        title: `${service.name} - ${state.customer.name}`,
        notes: `Criado via Processo-First. Cliente: ${state.customer.name}. Embarcação: ${state.vessel.name || state.vessel.registration_number || "—"}`,
      }).select().single();
      if (procErr) throw new Error("Processo: " + procErr.message);
      console.log("[PROCESS_INSERT_OK]", { processId: proc.id, customerId, vesselId, companyId });
      console.log("[PROCESS_CREATED]", proc.id);
      dispatch({ type: "LOG", line: `✓ Processo criado: ${proc.id.slice(0, 8)}` });

      // ---- Bloco 5: persistir process_documents (sugeridos da biblioteca) ----
      try {
        const { inserted } = await persistProcessDocuments({
          processId: proc.id,
          companyId,
          userId,
          templates: suggestedTemplates,
          selectedOptionalIds,
          ignoredOptionalIds,
        });
        if (inserted > 0) {
          dispatch({ type: "LOG", line: `✓ ${inserted} documento(s) da biblioteca vinculado(s)` });
        }
        await logLibraryEvent("process_final_pdf_unlocked", { process_id: proc.id, inserted });
      } catch (e: any) {
        console.warn("[Bloco 5 process_documents] persist failed", e);
        dispatch({ type: "LOG", line: `⚠ Falha ao vincular documentos da biblioteca: ${e.message}` });
      }


      // Link uploaded OCR/source files to process, customer and vessel so all modals can list them.
      const allDocs = [...state.personalDocs, ...state.addressDocs, ...state.vesselDocs].filter((d) => d.status !== "failed");
      if (allDocs.length > 0) {
        const { error: fileLinkError } = await supabase.from("uploaded_files")
          .update({ process_id: proc.id, customer_id: customerId, vessel_id: vesselId })
          .in("id", allDocs.map((d) => d.fileId));
        assertNoError(fileLinkError, "Vínculo dos arquivos OCR ao processo");
        dispatch({ type: "LOG", line: `✓ ${allDocs.length} documento(s) vinculado(s)` });
      }

      // Generate documents: try matching templates by name, otherwise insert a stub row.
      const fieldValues = {
        customer: state.customer,
        cliente: {
          ...state.customer,
          nome: state.customer.name,
          cpf: state.customer.cpf_cnpj,
          cpf_cnpj: state.customer.cpf_cnpj,
          endereco: state.customer.address,
          cidade: state.customer.city,
          uf: state.customer.state,
          telefone: state.customer.phone,
        },
        vessel: state.vessel,
        embarcacao: {
          ...state.vessel,
          nome: state.vessel.name,
          inscricao: state.vessel.registration_number,
          proprietario: state.vessel.owner_name,
          cpf_cnpj_proprietario: state.vessel.owner_document,
          tipo: state.vessel.vessel_type,
          material: state.vessel.material,
          comprimento: state.vessel.length,
          boca: state.vessel.beam,
          pontal: state.vessel.depth,
          capacidade: state.vessel.capacity,
        },
        process: { id: proc.id, type: service.processType, kind: service.kind },
        processo: { id: proc.id, tipo: service.processType, servico: service.name },
      };
      let generatedCount = 0;
      let documentRowsCount = 0;
      let mirroredFilesCount = 0;
      const { loadCompanyBranding } = await import("@/services/companyBranding");
      const rawBranding = await loadCompanyBranding(companyId).catch(() => null);
      const branding = templateOverride
        ? ({ ...(rawBranding ?? {}), pdf_template: templateOverride } as any)
        : rawBranding;
      for (const docName of service.generatedDocs) {
        try {
          const review = state.reviewDocs.find((r) => r.name === docName);
          if (!review) throw new Error("documento ausente no painel de revisão");
          if (review.status !== "approved") throw new Error("documento não aprovado no painel de revisão");

          console.log("[DOCUMENT_READY_FOR_FINAL_PDF]", { docName });
          console.log("[DOCUMENT_REAL_GENERATION_STARTED]", { docName, processId: proc.id, customerId, vesselId });

          const pdfBytes = await buildEditedTextPdfBytes(docName, review.content, branding);
          const pdfArrayBuffer = pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength,
          ) as ArrayBuffer;
          const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
          const generatedPath = `${companyId}/${crypto.randomUUID()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("generated-documents")
            .upload(generatedPath, pdfBlob, { contentType: "application/pdf", upsert: true });
          assertNoError(uploadError, `Upload do PDF ${docName}`);

          const { data: generatedDoc, error: dbError } = await supabase
            .from("generated_documents")
            .insert({
              company_id: companyId,
              process_id: proc.id,
              customer_id: customerId,
              vessel_id: vesselId,
              template_id: null,
              name: `${docName} - ${new Date().toLocaleDateString("pt-BR")}`,
              generated_file_url: generatedPath,
              status: "completed",
              generated_by: userId,
              metadata: {
                source: "process_first_review_approved",
                versions: review.versions.length,
                content_length: review.content.length,
              } as any,
            } as any)
            .select()
            .single();
          assertNoError(dbError, `Persistência do PDF ${docName}`);

          const missingLinks = requiredDocumentLinks.filter((key) => !(generatedDoc as any)[key]);
          if (missingLinks.length > 0) throw new Error(`documento sem vínculos obrigatórios: ${missingLinks.join(", ")}`);
          const pdfOk = await validateGeneratedPdfPath((generatedDoc as any).generated_file_url);
          if (!pdfOk) throw new Error("PDF gerado não passou na validação de arquivo real");

          const { data: docRow, error: docRowError } = await supabase.from("documents").insert({
            company_id: companyId,
            process_id: proc.id,
            customer_id: customerId,
            vessel_id: vesselId,
            document_type: docName,
            status: "completed",
            file_url: (generatedDoc as any).generated_file_url,
            extracted_data: { generated_document_id: (generatedDoc as any).id, fieldValues, edited_content: review.content } as any,
            compliance_status: "validated",
          } as any).select("id").single();
          if (docRowError) {
            console.error("[DOCUMENT_PERSISTED_FAILED]", { docName, error: docRowError.message });
            throw new Error(`falha ao salvar em documents: ${docRowError.message}`);
          }
          documentRowsCount++;
          console.log("[DOCUMENT_PERSISTED_OK]", { docName, generatedDocumentId: (generatedDoc as any).id });

          // Persist every in-memory review version into document_versions for full history
          if (docRow?.id && review.versions.length > 0) {
            const versionRows = review.versions.map((v) => ({
              document_id: docRow.id,
              version_number: v.n,
              file_url: (generatedDoc as any).generated_file_url,
              created_by: userId,
              change_summary: v.reason || `Versão ${v.n} salva durante revisão`,
            }));
            const { error: versionsError } = await supabase.from("document_versions").insert(versionRows as any);
            if (versionsError) console.warn("[DOCUMENT_VERSIONS_INSERT_FAILED]", versionsError.message);
            else console.log("[DOCUMENT_VERSIONS_PERSISTED]", { docName, count: versionRows.length });
          }

          const { error: mirrorError } = await supabase.from("uploaded_files").insert({
            company_id: companyId,
            customer_id: customerId,
            vessel_id: vesselId,
            process_id: proc.id,
            uploaded_by: userId,
            file_name: `${docName}.pdf`,
            file_type: "application/pdf",
            file_size: 0,
            file_url: (generatedDoc as any).generated_file_url,
            category: "generated_document",
            status: "uploaded",
            metadata: { generated_document_id: (generatedDoc as any).id } as any,
          } as any);
          if (mirrorError) {
            console.error("[DOCUMENT_PERSISTED_FAILED]", { docName, mirror: true, error: mirrorError.message });
            throw new Error(`falha ao vincular PDF nas abas de cliente/processo/embarcação: ${mirrorError.message}`);
          }
          mirroredFilesCount++;

          generatedCount++;
          console.log("[DOCUMENT_REAL_GENERATION_OK]", { docName, path: (generatedDoc as any).generated_file_url });
          console.log("[PROCESS_DOCUMENT_LINK_OK]", { docName, processId: proc.id });
          console.log("[CUSTOMER_DOCUMENT_LINK_OK]", { docName, customerId });
          console.log("[VESSEL_DOCUMENT_LINK_OK]", { docName, vesselId });
          dispatch({ type: "LOG", line: `✓ ${docName}` });
        } catch (e: any) {
          const message = `${docName}: ${e.message || String(e)}`;
          persistenceErrors.push(message);
          console.error("[DOCUMENT_REAL_GENERATION_FAILED]", { docName, error: e?.message || e });
          console.error("[DOCUMENT_PERSISTED_FAILED]", { docName, error: e?.message || e });
          console.error("[DOCUMENT_GENERATION_FAILED]", docName, e);
          dispatch({ type: "LOG", line: `✗ ${docName}: ${e.message}` });
        }
      }
      console.log("[DOCUMENTS_GENERATED]", { count: generatedCount, total: service.generatedDocs.length });



      // Timeline/audit note
      try {
        await supabase.from("process_comments").insert({
          company_id: companyId,
          process_id: proc.id,
          user_id: userId,
          content: `Processo-First persistido: ${generatedCount}/${service.generatedDocs.length} PDF(s) real(is) gerado(s).`,
          metadata: { generatedCount, documentRowsCount, mirroredFilesCount, errors: persistenceErrors } as any,
        } as any);
      } catch (timelineError: any) {
        console.warn("[PROCESS_TIMELINE_UPDATE_SKIPPED]", timelineError?.message);
      }

      // Dossier stub/record so the process has a dossier entry from the finalization flow.
      try {
        await supabase.from("process_dossiers").insert({
          company_id: companyId,
          process_id: proc.id,
          status: generatedCount > 0 ? "draft" : "not_generated",
          metadata: { service: service.kind, generated_count: generatedCount, generated_document_names: service.generatedDocs, errors: persistenceErrors } as any,
        } as any);
        console.log("[DOSSIER_GENERATED]", proc.id);
        dispatch({ type: "LOG", line: `✓ Dossiê iniciado` });
      } catch (e: any) {
        console.warn("[DOSSIER_SKIPPED]", e?.message);
      }

      dispatch({ type: "CREATED", processId: proc.id });
      const allDocumentsReady = generatedCount === service.generatedDocs.length
        && documentRowsCount === generatedCount
        && mirroredFilesCount === generatedCount
        && generatedCount > 0
        && vesselLinked;
      const result: PersistenceResult = allDocumentsReady
        ? {
            status: "success",
            title: "Processo e documentos gerados com sucesso",
            message: "Processo, cliente, embarcação, documentos, PDFs e vínculos foram persistidos.",
            generatedCount,
            documentCount: documentRowsCount,
            errors: [],
          }
        : {
            status: "partial",
            title: generatedCount > 0 ? "Processo criado, mas documentos falharam" : "Processo criado, mas documentos falharam",
            message: vesselLinked
              ? "O processo foi criado e os vínculos principais foram salvos, mas nem todos os PDFs reais foram gerados/persistidos."
              : "Cliente criado, mas embarcação não vinculou.",
            generatedCount,
            documentCount: documentRowsCount,
            errors: persistenceErrors.length ? persistenceErrors : ["Nem todos os documentos obrigatórios possuem PDF real validado."],
          };
      dispatch({ type: "SET_RESULT", result });
      dispatch({ type: "STEP", step: 8 });
      if (allDocumentsReady) {
        console.log("[PROCESS_FIRST_PERSISTENCE_SUCCESS]", { processId: proc.id, generatedCount, documentRowsCount, mirroredFilesCount });
        console.log("[PROCESS_FIRST_GENERATION_SUCCESS]", proc.id);
        toast.success("Processo e documentos gerados com sucesso!");
      } else {
        console.error("[PROCESS_FIRST_PERSISTENCE_FAILED]", { processId: proc.id, errors: persistenceErrors, generatedCount, documentRowsCount, mirroredFilesCount });
        toast.error(result.title);
      }
    } catch (e: any) {
      console.error("[PROCESS_FIRST_PERSISTENCE_FAILED]", e);
      console.error("[PROCESS_FIRST_GENERATION_FAILED]", e);
      dispatch({ type: "SET_RESULT", result: {
        status: "failed",
        title: "Falha na geração do processo",
        message: e.message || "Não foi possível persistir o fluxo Processo-First.",
        generatedCount: 0,
        documentCount: 0,
        errors: [e.message || String(e)],
      } });
      toast.error("Falha na geração: " + e.message);
      dispatch({ type: "LOG", line: `✗ ${e.message}` });
    } finally {
      dispatch({ type: "GENERATING", on: false });
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => dispatch({ type: "RESET" }), 200);
  };

  const steps = ["Serviço", "Identidade", "Endereço", "Embarcação", "Montagem", "Revisão", "Aprovação", "Concluído"];

  const enterApprovalStep = () => {
    if (!service) return;
    const existingByName = new Map(state.reviewDocs.map((d) => [d.name, d] as const));
    const docs: ReviewDoc[] = service.generatedDocs.map((name) => {
      const baseContent = buildDocumentText(name, state.customer, state.vessel, service);
      const missing = detectMissingForDoc(name, state.customer, state.vessel, service);
      const prev = existingByName.get(name);
      if (prev) {
        // Keep user edits but recompute missing
        return { ...prev, baseContent, missing, status: missing.length > 0 && prev.status !== "approved" ? "pending_data" : prev.status };
      }
      return {
        name,
        baseContent,
        content: baseContent,
        status: (missing.length > 0 ? "pending_data" : "ready") as ReviewStatus,
        versions: [],
        missing,
      };
    });
    dispatch({ type: "INIT_REVIEW", docs });
    console.log("[DOCUMENT_REVIEW_PANEL_OPENED]", { count: docs.length });
    dispatch({ type: "STEP", step: 7 });
  };

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
            <Step2Identity
              service={service}
              docs={state.personalDocs}
              customer={state.customer}
              onUpload={(files) => handleUpload(files, "personal")}
              onChange={(p) => dispatch({ type: "PATCH_CUSTOMER", patch: p })}
              fileInputRef={personalInputRef}
            />
          )}
          {state.step === 3 && service && (
            <Step3Address
              service={service}
              docs={state.addressDocs}
              customer={state.customer}
              onUpload={(files) => handleUpload(files, "address")}
              onChange={(p) => dispatch({ type: "PATCH_CUSTOMER", patch: p })}
              fileInputRef={addressInputRef}
            />
          )}
          {state.step === 4 && service && (
            <Step3
              service={service}
              docs={state.vesselDocs}
              vessel={state.vessel}
              onUpload={(files) => handleUpload(files, "vessel")}
              onChange={(p) => dispatch({ type: "PATCH_VESSEL", patch: p })}
              fileInputRef={vesselInputRef}
            />
          )}
          {state.step === 5 && service && (
            <Step4
              service={service}
              state={state}
              suggestedTemplates={suggestedTemplates}
              loadingSuggested={loadingSuggested}
              selectedOptionalIds={selectedOptionalIds}
              ignoredOptionalIds={ignoredOptionalIds}
              onToggleOptional={toggleOptional}
            />
          )}
          {state.step === 6 && service && (
            <Step5Review
              service={service}
              state={state}
              onPatchCustomer={(p) => { console.log("[FINAL_REVIEW_FIELDS_EDITED]", "customer", Object.keys(p)); dispatch({ type: "PATCH_CUSTOMER", patch: p }); }}
              onPatchVessel={(p) => { console.log("[FINAL_REVIEW_FIELDS_EDITED]", "vessel", Object.keys(p)); dispatch({ type: "PATCH_VESSEL", patch: p }); }}
              onJumpStep={(s) => dispatch({ type: "STEP", step: s })}
            />
          )}
          {state.step === 7 && service && (
            <Step7Approval
              companyId={companyId}
              templateOverride={templateOverride}
              onTemplateChange={setTemplateOverride}
              docs={state.reviewDocs}
              onEditSave={(name, content, reason) => dispatch({ type: "SET_REVIEW_CONTENT", name, content, reason })}
              onApprove={(name) => {
                const doc = state.reviewDocs.find((d) => d.name === name);
                if (!doc) return;
                if (doc.missing.length > 0) {
                  toast.error(`Não é possível aprovar "${name}": ${doc.missing.join(", ")}`);
                  return;
                }
                dispatch({ type: "SET_REVIEW_STATUS", name, status: "approved" });
                console.log("[DOCUMENT_APPROVED]", { name });
              }}
              onRevoke={(name) => {
                dispatch({ type: "SET_REVIEW_STATUS", name, status: "ready" });
                console.log("[DOCUMENT_APPROVAL_REVOKED]", { name });
              }}
              onRegenerate={(name) => {
                const doc = state.reviewDocs.find((d) => d.name === name);
                if (!doc || !service) return;
                const fresh = buildDocumentText(name, state.customer, state.vessel, service);
                dispatch({ type: "SET_REVIEW_CONTENT", name, content: fresh, reason: "Prévia regerada" });
              }}
            />
          )}
          {state.step === 8 && service && (
            <Step6
              log={state.progressLog}
              processId={state.createdProcessId}
              service={service}
              state={state}
              onOpenProcess={() => {
                if (state.createdProcessId) {
                  navigate({ to: "/processes/$id", params: { id: state.createdProcessId } });
                  close();
                }
              }}
              onOpenDocuments={() => { navigate({ to: "/documents" }); close(); }}
              onDashboard={() => { navigate({ to: "/dashboard" }); close(); }}
            />
          )}
        </div>

        {/* Footer */}
        {state.step < 8 && (
          <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
            <button
              onClick={() => dispatch({ type: "STEP", step: Math.max(1, state.step - 1) })}
              disabled={state.step === 1}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              data-testid="pf-back"
            >
              <ChevronLeft className="h-4 w-4 inline" /> Voltar
            </button>
            {state.step < 6 && (
              <button
                onClick={() => dispatch({ type: "STEP", step: state.step + 1 })}
                disabled={!canAdvance}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-lg shadow-primary/20"
                data-testid="pf-next"
              >
                Avançar <ChevronRight className="h-4 w-4 inline" />
              </button>
            )}
            {state.step === 6 && (
              <button
                onClick={enterApprovalStep}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 shadow-lg shadow-primary/20"
                data-testid="pf-to-approval"
              >
                Ir para aprovação <ChevronRight className="h-4 w-4 inline" />
              </button>
            )}
            {state.step === 7 && (
              <button
                onClick={handleGenerate}
                disabled={state.generating || state.reviewDocs.some((d) => d.status !== "approved")}
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

function Step2Identity({ service, docs, customer, onUpload, onChange, fileInputRef }: {
  service: ServiceDef; docs: UploadedDoc[]; customer: CustomerDraft;
  onUpload: (files: FileList | null) => void; onChange: (p: Partial<CustomerDraft>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!service.needsPersonal) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500 mt-3">Este serviço não exige documento de identificação. Avance.</p>
      </div>
    );
  }
  console.log("[OCR_IDENTITY_STEP_CREATED]");
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Documento de identificação</h3>
      <p className="text-sm text-slate-500 mb-4">Envie a <strong>CNH</strong> ou o <strong>RG</strong>. O OCR extrai nome, CPF, RG e data de nascimento.</p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-8 text-center group transition-all"
        data-testid="pf-upload-identity"
      >
        <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary mx-auto" />
        <p className="text-sm font-bold text-navy mt-2">Clique para enviar (CNH ou RG)</p>
        <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={(e) => onUpload(e.target.files)} />
      <DocsList docs={docs} />
      <OCRDebugPanel docs={docs} scope="personal" />

      <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">Dados de identificação</div>
        <FieldGrid>
          <Field label="Nome" value={customer.name} onChange={(v) => onChange({ name: v })} />
          <Field label="CPF / CNPJ" value={customer.cpf_cnpj} onChange={(v) => onChange({ cpf_cnpj: v })} />
          <Field label="RG" value={customer.rg} onChange={(v) => onChange({ rg: v })} />
          <Field label="Email" value={customer.email} onChange={(v) => onChange({ email: v })} />
          <Field label="Telefone" value={customer.phone} onChange={(v) => onChange({ phone: v })} />
        </FieldGrid>
      </div>
    </div>
  );
}

function Step3Address({ service, docs, customer, onUpload, onChange, fileInputRef }: {
  service: ServiceDef; docs: UploadedDoc[]; customer: CustomerDraft;
  onUpload: (files: FileList | null) => void; onChange: (p: Partial<CustomerDraft>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!service.needsPersonal) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500 mt-3">Este serviço não exige comprovante de residência. Avance.</p>
      </div>
    );
  }
  console.log("[OCR_ADDRESS_STEP_CREATED]");
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Comprovante de residência</h3>
      <p className="text-sm text-slate-500 mb-4">Envie uma conta de <strong>água</strong>, <strong>luz</strong>, <strong>internet</strong> ou <strong>telefone</strong>. O OCR extrai o endereço.</p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-8 text-center group transition-all"
        data-testid="pf-upload-address"
      >
        <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary mx-auto" />
        <p className="text-sm font-bold text-navy mt-2">Clique para enviar (Água, Luz, Internet, Telefone)</p>
        <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={(e) => onUpload(e.target.files)} />
      <DocsList docs={docs} />
      <OCRDebugPanel docs={docs} scope="personal" />

      <div className="mt-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
        <div className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2">Endereço identificado</div>
        <FieldGrid>
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
  console.log("[OCR_VESSEL_STEP_CREATED]");
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

function Step4({
  service,
  state,
  suggestedTemplates,
  loadingSuggested,
  selectedOptionalIds,
  ignoredOptionalIds,
  onToggleOptional,
}: {
  service: ServiceDef;
  state: WizardState;
  suggestedTemplates: SuggestedTemplate[];
  loadingSuggested: boolean;
  selectedOptionalIds: Set<string>;
  ignoredOptionalIds: Set<string>;
  onToggleOptional: (tplId: string, select: boolean) => void;
}) {
  const identityOk = !service.needsPersonal || state.personalDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.customer.name;
  const addressOk = !service.needsPersonal || state.addressDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.customer.address;
  const vesselOk = !service.needsVessel || state.vesselDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.vessel.name;
  const required = suggestedTemplates.filter((t) => t.is_required);
  const optional = suggestedTemplates.filter((t) => !t.is_required);
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Montagem inteligente</h3>
      <p className="text-sm text-slate-500 mb-4">Para <strong>{service.name}</strong>, vamos precisar de:</p>
      <div className="space-y-2 mb-6">
        {service.needsPersonal && <Check label="Documento de identificação enviado" ok={identityOk} />}
        {service.needsPersonal && <Check label="Comprovante de residência enviado" ok={addressOk} />}
        {service.needsVessel && <Check label="Documentos da embarcação enviados" ok={vesselOk} />}
        {service.generatedDocs.map((d) => (
          <Check key={d} label={`${d} — será gerado automaticamente`} ok={true} info />
        ))}
      </div>

      {/* ---- Bloco 5: Documentos sugeridos da Biblioteca Nacional ---- */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black uppercase tracking-wider text-navy">
            Documentos sugeridos para este processo
          </h4>
          {loadingSuggested && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {!loadingSuggested && suggestedTemplates.length === 0 && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-4">
            Nenhum modelo na Biblioteca Nacional corresponde a este tipo de processo ainda.
          </div>
        )}
        {required.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-2">Obrigatórios</p>
            <div className="space-y-2">
              {required.map((t) => (
                <SuggestedRow key={t.id} tpl={t} checked disabled />
              ))}
            </div>
          </div>
        )}
        {optional.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Opcionais</p>
            <div className="space-y-2">
              {optional.map((t) => {
                const checked = selectedOptionalIds.has(t.id);
                return (
                  <SuggestedRow
                    key={t.id}
                    tpl={t}
                    checked={checked}
                    onChange={(v) => onToggleOptional(t.id, v)}
                  />
                );
              })}
            </div>
          </div>
        )}
        {suggestedTemplates.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-3">
            Os obrigatórios são incluídos automaticamente. Opcionais marcados serão criados; desmarcados ficam como <em>ignorados</em> e não bloqueiam o processo.
          </p>
        )}
      </div>
    </div>
  );
}

function SuggestedRow({
  tpl,
  checked,
  disabled,
  onChange,
}: {
  tpl: SuggestedTemplate;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const orgao = tpl.metadata?.orgao || tpl.metadata?.órgão || null;
  const mandatoryFields: string[] = tpl.metadata?.mandatory_fields || [];
  const deps: string[] = tpl.metadata?.dependencies || [];
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        checked ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
      } ${disabled ? "opacity-90" : "cursor-pointer hover:border-slate-300"}`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-navy">{tpl.name}</span>
          {tpl.code && <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{tpl.code}</span>}
          {orgao && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{orgao}</span>}
          {disabled && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded font-bold">Obrigatório</span>}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">{tpl.reason}</p>
        {mandatoryFields.length > 0 && (
          <p className="text-[10px] text-amber-700 mt-1">
            <strong>Campos obrigatórios:</strong> {mandatoryFields.join(", ")}
          </p>
        )}
        {deps.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            <strong>Depende de:</strong> {deps.join(", ")}
          </p>
        )}
      </div>
    </label>
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

function Step5Review({ service, state, onPatchCustomer, onPatchVessel, onJumpStep }: {
  service: ServiceDef;
  state: WizardState;
  onPatchCustomer: (p: Partial<CustomerDraft>) => void;
  onPatchVessel: (p: Partial<VesselDraft>) => void;
  onJumpStep: (s: number) => void;
}) {
  useEffect(() => { console.log("[FINAL_REVIEW_STARTED]", service.kind); }, [service.kind]);
  const c = state.customer; const v = state.vessel;
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Revisão e correção</h3>
      <p className="text-sm text-slate-500 mb-4">Confira e edite. Os dados aqui são usados na geração final.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <JumpBtn label="Voltar p/ Identificação" onClick={() => onJumpStep(2)} />
        <JumpBtn label="Voltar p/ Endereço" onClick={() => onJumpStep(3)} />
        <JumpBtn label="Voltar p/ Embarcação" onClick={() => onJumpStep(4)} />
      </div>

      {service.needsPersonal && (
        <SectionCard title="Dados do cliente" icon={<User className="h-4 w-4" />}>
          <FieldGrid>
            <Field label="Nome" value={c.name} onChange={(x) => onPatchCustomer({ name: x })} />
            <Field label="CPF/CNPJ" value={c.cpf_cnpj} onChange={(x) => onPatchCustomer({ cpf_cnpj: x })} />
            <Field label="RG" value={c.rg} onChange={(x) => onPatchCustomer({ rg: x })} />
            <Field label="Telefone" value={c.phone} onChange={(x) => onPatchCustomer({ phone: x })} />
            <Field label="E-mail" value={c.email} onChange={(x) => onPatchCustomer({ email: x })} />
            <Field label="Endereço" value={c.address} onChange={(x) => onPatchCustomer({ address: x })} />
            <Field label="Cidade" value={c.city} onChange={(x) => onPatchCustomer({ city: x })} />
            <Field label="UF" value={c.state} onChange={(x) => onPatchCustomer({ state: x })} />
          </FieldGrid>
        </SectionCard>
      )}

      {service.needsVessel && (
        <SectionCard title="Dados da embarcação" icon={<Ship className="h-4 w-4" />}>
          <FieldGrid>
            <Field label="Nome" value={v.name} onChange={(x) => onPatchVessel({ name: x })} />
            <Field label="Inscrição" value={v.registration_number} onChange={(x) => onPatchVessel({ registration_number: x })} />
            <Field label="Proprietário" value={v.owner_name} onChange={(x) => onPatchVessel({ owner_name: x })} />
            <Field label="CPF/CNPJ Proprietário" value={v.owner_document} onChange={(x) => onPatchVessel({ owner_document: x })} />
            <Field label="Tipo" value={v.vessel_type} onChange={(x) => onPatchVessel({ vessel_type: x })} />
            <Field label="Material" value={v.material} onChange={(x) => onPatchVessel({ material: x })} />
            <Field label="Comprimento" value={v.length} onChange={(x) => onPatchVessel({ length: x })} />
            <Field label="Boca" value={v.beam} onChange={(x) => onPatchVessel({ beam: x })} />
            <Field label="Pontal" value={v.depth} onChange={(x) => onPatchVessel({ depth: x })} />
            <Field label="Capacidade" value={v.capacity} onChange={(x) => onPatchVessel({ capacity: x })} />
            <Field label="Área de navegação" value={v.navigation_area} onChange={(x) => onPatchVessel({ navigation_area: x })} />
            <Field label="Atividade/Serviço" value={v.activity_service} onChange={(x) => onPatchVessel({ activity_service: x })} />
            <Field label="Ano de construção" value={v.construction_year} onChange={(x) => onPatchVessel({ construction_year: x })} />
            <Field label="Construtor" value={v.builder} onChange={(x) => onPatchVessel({ builder: x })} />
          </FieldGrid>
        </SectionCard>
      )}

      {service.needsVessel && (
        <SectionCard title="Dados do motor" icon={<Sparkles className="h-4 w-4" />}>
          <FieldGrid>
            <Field label="Potência" value={v.engine_power} onChange={(x) => onPatchVessel({ engine_power: x })} />
            <Field label="Série" value={v.engine_serial} onChange={(x) => onPatchVessel({ engine_serial: x })} />
          </FieldGrid>
        </SectionCard>
      )}

      <SectionCard title="Processo" icon={<FileText className="h-4 w-4" />}>
        <div className="text-xs space-y-1">
          <Row k="Tipo de serviço" v={service.name} />
          <Row k="Documentos a gerar" v={service.generatedDocs.join(", ")} />
          <Row k="Documentos enviados" v={String(state.personalDocs.length + state.addressDocs.length + state.vesselDocs.length)} />
        </div>
      </SectionCard>

      <button
        onClick={() => { console.log("[FINAL_REVIEW_SAVED]"); toast.success("Correções salvas. Clique em Gerar."); }}
        className="mt-3 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
        data-testid="pf-save-review"
      >
        Salvar correções
      </button>
    </div>
  );
}

function JumpBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary">
      <ChevronLeft className="h-3 w-3 inline" /> {label}
    </button>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-2 mb-2 text-navy">
        {icon}<span className="text-xs font-black uppercase tracking-wider">{title}</span>
      </div>
      {children}
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

function Step6({ log, processId, service, state, onOpenProcess, onOpenDocuments, onDashboard }: {
  log: string[]; processId: string | null; service: ServiceDef; state: WizardState;
  onOpenProcess: () => void; onOpenDocuments: () => void; onDashboard: () => void;
}) {
  const result = state.generationResult;
  const isSuccess = result?.status === "success";
  return (
    <div className="py-2">
      <div className="text-center">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isSuccess ? "bg-green-100" : "bg-amber-100"}`}>
          {isSuccess ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <AlertTriangle className="h-8 w-8 text-amber-600" />}
        </div>
        <h3 className="text-xl font-black text-navy">{result?.title || "Processo gerado"}</h3>
        <p className="text-sm text-slate-500 mt-1">{result?.message || `${service.name} — ${processId?.slice(0, 8)}`}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <SuccessCard icon={<User className="h-4 w-4" />} title="Cliente" body={state.customer.name || "—"} sub="criado/atualizado" />
        <SuccessCard icon={<Ship className="h-4 w-4" />} title="Embarcação" body={state.vessel.name || state.vessel.registration_number || "—"} sub="vinculada ao cliente" />
        <SuccessCard icon={<Sparkles className="h-4 w-4" />} title="Processo" body={service.name} sub={processId ? `ID ${processId.slice(0, 8)}` : ""} />
        <SuccessCard icon={<FileText className="h-4 w-4" />} title="Documentos" body={`${result?.generatedCount ?? 0}/${service.generatedDocs.length} PDFs validados`} sub={service.generatedDocs.join(", ")} />
      </div>

      {result?.errors?.length ? (
        <div className="mt-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 max-w-xl mx-auto">
          <div className="text-[10px] font-black uppercase tracking-wider mb-2">Pendências da persistência real</div>
          <ul className="list-disc pl-5 space-y-1 text-xs font-semibold">
            {result.errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      ) : null}

      <details className="mt-4 max-w-xl mx-auto">
        <summary className="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer">Ver log de geração</summary>
        <div className="mt-2 space-y-1">
          {log.map((l, i) => (
            <div key={i} className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{l}</div>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {processId && (
          <button onClick={onOpenProcess} className="px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90" data-testid="pf-open-process">
            Ver Processo <ArrowRight className="h-4 w-4 inline ml-1" />
          </button>
        )}
        <button onClick={onOpenDocuments} className="px-5 py-2.5 bg-white border border-slate-200 text-navy rounded-xl font-black text-xs uppercase tracking-wider hover:border-primary">
          Ver Documentos
        </button>
        <button onClick={onDashboard} className="px-5 py-2.5 bg-white border border-slate-200 text-navy rounded-xl font-black text-xs uppercase tracking-wider hover:border-primary">
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}

function SuccessCard({ icon, title, body, sub }: { icon: React.ReactNode; title: string; body: string; sub?: string }) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-2 text-navy">
        {icon}<span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</span>
      </div>
      <div className="mt-1 text-sm font-black text-navy truncate">{body}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

// ============================================================================
// Bloco 2 — Painel de revisão / edição / aprovação dos documentos
// ============================================================================
function Step7Approval({
  companyId,
  templateOverride,
  onTemplateChange,
  docs,
  onEditSave,
  onApprove,
  onRevoke,
  onRegenerate,
}: {
  companyId: string | null;
  templateOverride: string | null;
  onTemplateChange: (id: string | null) => void;
  docs: ReviewDoc[];
  onEditSave: (name: string, content: string, reason?: string) => void;
  onApprove: (name: string) => void;
  onRevoke: (name: string) => void;
  onRegenerate: (name: string) => void;
}) {
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [editName, setEditName] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editReason, setEditReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<any | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const previewDoc = docs.find((d) => d.name === previewName) || null;
  const editDoc = docs.find((d) => d.name === editName) || null;

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setCompanyBranding(null);
      return;
    }
    (async () => {
      try {
        const { loadCompanyBranding } = await import("@/services/companyBranding");
        const rawBranding = await loadCompanyBranding(companyId).catch(() => null);
        if (!cancelled) setCompanyBranding(rawBranding);
      } catch (e) {
        console.error("[COMPANY_BRANDING_LOAD_FAILED]", e);
        if (!cancelled) setCompanyBranding(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    if (!previewDoc) {
      setPreviewUrl(null);
      return;
    }
    setPreviewLoading(true);
    (async () => {
      try {
        const [{ loadCompanyBranding }, { buildBrandedDocumentPdf }] = await Promise.all([
          import("@/services/companyBranding"),
          import("@/services/brandedPdfBuilder"),
        ]);
        const rawBranding = companyId ? await loadCompanyBranding(companyId).catch(() => null) : null;
        if (!cancelled) setCompanyBranding(rawBranding);
        const branding = templateOverride
          ? ({ ...(rawBranding ?? {}), pdf_template: templateOverride } as any)
          : rawBranding;
        const { bytes } = await buildBrandedDocumentPdf({
          docName: previewDoc.name,
          content: previewDoc.content,
          branding,
        });
        if (cancelled) return;
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const blob = new Blob([ab], { type: "application/pdf" });
        createdUrl = URL.createObjectURL(blob);
        setPreviewUrl(createdUrl);
      } catch (e) {
        console.error("[PREVIEW_PDF_FAILED]", e);
        toast.error("Não foi possível gerar a prévia do PDF. Tente outro template ou revise o documento.");
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [previewDoc?.name, previewDoc?.content, companyId, templateOverride]);


  const statusBadge = (s: ReviewStatus) => {
    const map: Record<ReviewStatus, { label: string; cls: string }> = {
      pending_data: { label: "Pendente de dados", cls: "bg-amber-100 text-amber-700" },
      ready: { label: "Pronto para revisão", cls: "bg-blue-100 text-blue-700" },
      editing: { label: "Em edição", cls: "bg-purple-100 text-purple-700" },
      approved: { label: "Aprovado", cls: "bg-green-100 text-green-700" },
      failed: { label: "Falhou", cls: "bg-red-100 text-red-700" },
    };
    const v = map[s];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${v.cls}`}>{v.label}</span>;
  };

  const allApproved = docs.length > 0 && docs.every((d) => d.status === "approved");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Revisão e aprovação</div>
        <h3 className="text-2xl font-black text-navy">Revise cada documento antes de gerar o PDF final</h3>
        <p className="text-sm text-slate-600 mt-1">
          Visualize, edite e aprove. O PDF final só será gerado a partir do texto aprovado.
        </p>
      </div>

      <TemplateGalleryPanel
        effectiveTemplate={templateOverride ?? companyBranding?.pdf_template ?? "classico"}
        companyDefault={companyBranding?.pdf_template ?? null}
        primary={companyBranding?.brand_primary_color ?? "#0a2a5e"}
        open={showTemplateGallery}
        onToggle={() => setShowTemplateGallery((v) => !v)}
        onSelect={(id) => onTemplateChange(id)}
        onResetToCompany={() => onTemplateChange(null)}
        sampleDoc={docs[0] ? { name: docs[0].name, content: docs[0].content } : null}
        branding={companyBranding}
      />

      {!allApproved && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
          Existem documentos pendentes de aprovação. Aprove todos para liberar a geração final.
        </div>
      )}

      <div className="grid gap-3">
        {docs.map((d) => (
          <div key={d.name} className="border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-black text-navy truncate">{d.name}</div>
                  {statusBadge(d.status)}
                  {d.versions.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-500">v{d.versions[d.versions.length - 1].n}</span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {d.missing.length === 0 ? (
                    <span className="text-green-600 font-bold">Todos os campos obrigatórios preenchidos</span>
                  ) : (
                    <span className="text-amber-700 font-bold">Faltando: {d.missing.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setPreviewName(d.name);
                  console.log("[DOCUMENT_PREVIEW_OPENED]", { name: d.name });
                }}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-navy"
              >
                Visualizar
              </button>
              <button
                onClick={() => {
                  setEditName(d.name);
                  setEditText(d.content);
                  setEditReason("");
                }}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700"
              >
                Editar
              </button>
              <button
                onClick={() => onRegenerate(d.name)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                Regenerar prévia
              </button>
              {d.status === "approved" ? (
                <button
                  onClick={() => onRevoke(d.name)}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800"
                >
                  Revogar aprovação
                </button>
              ) : (
                <button
                  onClick={() => onApprove(d.name)}
                  disabled={d.missing.length > 0}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-green-600 hover:opacity-90 text-white disabled:opacity-40"
                >
                  Aprovar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewName(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prévia exata do PDF final (WYSIWYG)</div>
                <div className="text-lg font-black text-navy">{previewDoc.name}</div>
              </div>
              <button onClick={() => setPreviewName(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              {previewLoading || !previewUrl ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Renderizando PDF…
                </div>
              ) : (
                <iframe title={`Prévia ${previewDoc.name}`} src={previewUrl} className="w-full h-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor modal */}
      {editDoc && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Editar documento</div>
                <div className="text-lg font-black text-navy">{editDoc.name}</div>
              </div>
              <button onClick={() => setEditName(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[400px] border border-slate-200 rounded-xl p-4 font-mono text-[12px] leading-relaxed text-slate-800 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Motivo da alteração (opcional)"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <p className="text-[11px] text-slate-500">
                O template original não é alterado. Cada salvamento cria uma nova versão do documento.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setEditName(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-100 text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onEditSave(editDoc.name, editText, editReason || undefined);
                  setEditName(null);
                }}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-primary text-white hover:opacity-90"
              >
                Salvar versão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------- Template Gallery (Step 7) -------------------
const TEMPLATE_CATEGORIES: { label: string; ids: PdfTemplateId[] }[] = [
  { label: "Oficiais", ids: ["classico", "oficial", "protocolo", "timbrado"] },
  { label: "Marinha", ids: ["naval-azul", "institucional", "azul-profundo", "naval-premium"] },
  { label: "Corporativos", ids: ["executivo", "escritorio", "moderno", "minimalista", "corporate-clean"] },
  { label: "Engenharia", ids: ["laudo", "engenharia-naval", "relatorio-tecnico"] },
  { label: "Premium", ids: ["luxo", "premium-branco", "capa-executiva"] },
  { label: "Checklists", ids: ["checklist"] },
];

function TemplateGalleryPanel({
  effectiveTemplate,
  companyDefault,
  primary,
  open,
  onToggle,
  onSelect,
  onResetToCompany,
  sampleDoc,
  branding,
}: {
  effectiveTemplate: string;
  companyDefault: string | null;
  primary: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onResetToCompany: () => void;
  sampleDoc: { name: string; content: string } | null;
  branding: any;
}) {
  const current = PDF_TEMPLATES.find((t) => t.id === effectiveTemplate) ?? PDF_TEMPLATES[0];
  const [fullPreviewIdx, setFullPreviewIdx] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const openFullPreview = (templateId: string = effectiveTemplate) => {
    const idx = PDF_TEMPLATES.findIndex((t) => t.id === templateId);
    console.log("[TEMPLATE_PREVIEW_OPEN_REQUESTED]", { templateId, idx });
    setPreviewError(null);
    setFullPreviewIdx(idx >= 0 ? idx : 0);
  };

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    if (fullPreviewIdx === null) {
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewBytes(null);
      return;
    }
    const tpl = PDF_TEMPLATES[fullPreviewIdx];
    if (!tpl) return;
    setLoadingFull(true);
    setPreviewError(null);
    (async () => {
      try {
        const { buildBrandedDocumentPdf } = await import("@/services/brandedPdfBuilder");
        const fallbackContent =
          "REQUERIMENTO\n\nObjeto: Demonstração do modelo de documento.\n\nDADOS DO REQUERENTE\nNome: João da Silva\nCPF: 000.000.000-00\nEndereço: Rua Exemplo, 123 - Rio de Janeiro/RJ\n\nDADOS DA EMBARCAÇÃO\nNome: Mar Aberto\nTIE: 9999999\nComprimento: 8,50 m\n\nDECLARAÇÃO\nDeclaro, sob as penas da lei, que as informações prestadas são verdadeiras.\n\n- Documento de identidade\n- Comprovante de residência\n- TIE/TIEM\n";
        const docName = sampleDoc?.name || "Documento Modelo";
        const content = sampleDoc?.content || fallbackContent;
        const mergedBranding = { ...(branding ?? {}), pdf_template: tpl.id };
        const { bytes } = await buildBrandedDocumentPdf({
          docName,
          content,
          branding: mergedBranding as any,
        });
        if (cancelled) return;
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const blob = new Blob([ab], { type: "application/pdf" });
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewBytes(bytes);
        console.log("[TEMPLATE_PREVIEW_READY]", { template: tpl.id, docName });
      } catch (e) {
        console.error("[TEMPLATE_FULL_PREVIEW_FAILED]", e);
        const message = e instanceof Error ? e.message : "Erro desconhecido ao gerar prévia.";
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewBytes(null);
          setPreviewError(message);
          toast.error(`Falha ao visualizar template: ${message}`);
        }
      } finally {
        if (!cancelled) setLoadingFull(false);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fullPreviewIdx, sampleDoc?.name, sampleDoc?.content, branding]);

  const fullTpl = fullPreviewIdx !== null ? PDF_TEMPLATES[fullPreviewIdx] : null;
  const groupedTemplates = TEMPLATE_CATEGORIES.map((category) => ({
    ...category,
    templates: category.ids
      .map((id) => PDF_TEMPLATES.find((template) => template.id === id))
      .filter(Boolean) as typeof PDF_TEMPLATES,
  })).filter((category) => category.templates.length > 0);

  const fullPreviewModal = fullPreviewIdx !== null && fullTpl && typeof document !== "undefined"
    ? createPortal(
        <div
          className="fixed inset-0 z-[180] bg-slate-950/85 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setFullPreviewIdx(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-7xl h-[95dvh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Prévia do template de PDF"
          >
            <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-slate-200 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Modelo {fullPreviewIdx + 1} de {PDF_TEMPLATES.length} · Prévia A4 real
                </div>
                <div className="text-sm sm:text-base font-black text-navy truncate">{fullTpl.label}</div>
                <div className="text-[11px] text-slate-500 truncate hidden sm:block">{fullTpl.description}</div>
              </div>
              <button
                type="button"
                onClick={() => setFullPreviewIdx(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 shrink-0"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-slate-200 relative overflow-hidden">
              {loadingFull && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 text-xs font-bold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Gerando prévia A4...
                </div>
              )}
              {previewUrl ? (
                <PdfPreviewFrame url={previewUrl} bytes={previewBytes} title="Prévia do template" />
              ) : (
                !loadingFull && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 px-6 text-center">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    <span>{previewError ? `Não foi possível gerar a prévia: ${previewError}` : "Não foi possível gerar a prévia."}</span>
                  </div>
                )
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-t border-slate-200 bg-white shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setFullPreviewIdx((i) => (i === null ? 0 : (i - 1 + PDF_TEMPLATES.length) % PDF_TEMPLATES.length))}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelect(fullTpl.id);
                  setFullPreviewIdx(null);
                  toast.success(`Template aplicado: ${fullTpl.label}`);
                }}
                className="flex-1 min-w-[160px] px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-primary text-white hover:opacity-90"
              >
                Usar este modelo
              </button>
              <button
                type="button"
                onClick={() => setFullPreviewIdx((i) => (i === null ? 0 : (i + 1) % PDF_TEMPLATES.length))}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                Próximo →
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="border border-slate-200 rounded-2xl bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Template do Documento
          </div>
          <div className="text-sm font-black text-navy truncate">
            {current.label}
            <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">
              {companyDefault === effectiveTemplate || (!companyDefault && effectiveTemplate === "classico")
                ? "padrão da empresa"
                : "específico deste processo"}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">{current.description}</div>
        </div>
        <div className="text-xs font-bold text-primary shrink-0">
          {open ? "Fechar galeria" : "Escolher template ▾"}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="text-[11px] text-slate-500 flex-1 min-w-0">
              Selecione um dos 20 modelos. A escolha vale apenas para este processo — para mudar o padrão da empresa use Identidade Corporativa.
            </div>
            <button
              type="button"
              onClick={() => openFullPreview()}
              className="text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 shrink-0"
            >
              Visualizar Template
            </button>
            {companyDefault && effectiveTemplate !== companyDefault && (
              <button
                type="button"
                onClick={onResetToCompany}
                className="text-[11px] font-bold text-primary hover:underline shrink-0"
              >
                Voltar ao padrão da empresa
              </button>
            )}
          </div>
          <div className="max-h-[min(58dvh,540px)] overflow-y-auto pr-1 space-y-5 pb-2">
            {groupedTemplates.map((category) => (
              <section key={category.label} className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {category.label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {category.templates.map((t) => {
                    const selected = t.id === effectiveTemplate;
                    return (
                      <div
                        key={t.id}
                        className={`relative text-left rounded-xl border-2 p-2 transition bg-white ${
                          selected ? "border-primary ring-2 ring-primary/25 bg-primary/5 shadow-md" : "border-slate-200 hover:border-primary/60 hover:shadow-sm"
                        }`}
                      >
                        {selected && (
                          <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                            <CheckCircle2 className="h-3 w-3" /> Selecionado
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelect(t.id)}
                          className="block w-full text-left"
                        >
                          <TemplateMiniPreview id={t.id} primary={primary} />
                          <div className="mt-2 text-[11px] font-black text-navy truncate pr-2">{t.label}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-2 min-h-[2.5em]">{t.description}</div>
                          <div className="text-[9px] text-slate-400 mt-1 truncate">Ideal: {t.bestFor}</div>
                        </button>
                        <div className="mt-2 grid grid-cols-1 gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelect(t.id)}
                            disabled={selected}
                            className={`w-full rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                              selected ? "bg-primary/10 text-primary cursor-default" : "bg-slate-100 text-navy hover:bg-slate-200"
                            }`}
                          >
                            {selected ? "Usando este modelo" : "Usar modelo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openFullPreview(t.id)}
                            className="w-full text-[10px] font-bold text-primary hover:underline"
                          >
                            Abrir / visualizar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      {fullPreviewModal}
    </div>
  );
}

function PdfPreviewFrame({ url, bytes, title }: { url: string; bytes: Uint8Array | null; title: string }) {
  const [useCanvasPreview, setUseCanvasPreview] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const hasNativePdf = typeof navigator !== "undefined" && "pdfViewerEnabled" in navigator ? Boolean((navigator as any).pdfViewerEnabled) : !isMobile;
    setUseCanvasPreview(isMobile || !hasNativePdf);
  }, [url]);

  if (useCanvasPreview && bytes) return <PdfCanvasPreview bytes={bytes} />;

  return (
    <object data={`${url}#toolbar=0&navpanes=0`} type="application/pdf" className="w-full h-full">
      {bytes ? <PdfCanvasPreview bytes={bytes} /> : <iframe src={`${url}#toolbar=0&navpanes=0`} title={title} className="w-full h-full border-0" />}
    </object>
  );
}

function PdfCanvasPreview({ bytes }: { bytes: Uint8Array }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() } as any);
        const pdf = await loadingTask.promise;
        const container = containerRef.current;
        if (!container || cancelled) return;
        container.innerHTML = "";
        const containerWidth = Math.min(920, Math.max(320, container.clientWidth || 700));
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const pdfPage = await pdf.getPage(pageNum);
          const baseViewport = pdfPage.getViewport({ scale: 1 });
          const scale = Math.max(0.72, Math.min(1.75, (containerWidth - 24) / baseViewport.width));
          const viewport = pdfPage.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "h-auto max-w-full rounded-sm bg-white shadow-xl mb-4";
          container.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas indisponível no navegador.");
          await pdfPage.render({ canvasContext: ctx, viewport } as any).promise;
        }
      } catch (e) {
        console.error("[PDF_CANVAS_PREVIEW_FAILED]", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao renderizar PDF no navegador.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  return (
    <div className="h-full w-full overflow-auto bg-slate-200 p-3 sm:p-6 flex justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Renderizando PDF no navegador...
        </div>
      )}
      {error ? (
        <div className="m-auto rounded-xl bg-white px-4 py-3 text-xs text-slate-600 shadow">
          Não foi possível renderizar a prévia: {error}
        </div>
      ) : (
        <div ref={containerRef} className="w-full max-w-[920px] flex flex-col items-center" />
      )}
    </div>
  );
}

function TemplateMiniPreview({ id, primary }: { id: string; primary: string }) {
  const gold = "#c9a13a";
  const light = "#f1f5f9";
  const ink = "#0f172a";
  const navy = "#0d1f45";
  const navyDeep = "#062046";
  return (
    <div className="aspect-[3/4] rounded-md border border-slate-200 bg-white overflow-hidden relative text-[0px]">
      {(id === "corporate-clean" || id === "engenharia-naval" || id === "laudo") && (
        <div
          className="absolute left-0 top-0 bottom-0 z-[1]"
          style={{ width: id === "corporate-clean" ? 10 : 5, background: id === "corporate-clean" ? primary : ink }}
        />
      )}
      {id === "naval-premium" && (
        <div className="absolute right-0 top-0 bottom-0 z-[1]" style={{ width: 12, background: primary, opacity: 0.75 }} />
      )}
      {(id === "protocolo" || id === "oficial") && (
        <div className="absolute right-2 top-8 z-[2] h-3 w-9 rounded-[2px] border" style={{ borderColor: id === "oficial" ? primary : "#64748b" }} />
      )}
      {/* Header band */}
      {(() => {
        const h = id === "minimalista" || id === "protocolo" || id === "corporate-clean" ? 6
          : id === "capa-executiva" ? 22
          : id === "azul-profundo" || id === "naval-premium" ? 16
          : id === "luxo" || id === "relatorio-tecnico" ? 14
          : id === "executivo" || id === "moderno" ? 14
          : 10;
        const bg =
          id === "azul-profundo" ? navyDeep
          : id === "naval-azul" || id === "naval-premium" ? navy
          : id === "institucional" ? "#0f213f"
          : id === "luxo" ? "#0a1733"
          : id === "premium-branco" || id === "corporate-clean" ? "#ffffff"
          : id === "escritorio" ? "#f8fafc"
          : id === "engenharia-naval" ? light
          : id === "oficial" ? "#1f2937"
          : id === "timbrado" ? primary
          : id === "capa-executiva" ? primary
          : id === "relatorio-tecnico" ? primary
          : id === "executivo" || id === "moderno" ? primary
          : id === "minimalista" ? "transparent"
          : id === "protocolo" ? "transparent"
          : primary;
        return (
          <div style={{ background: bg, height: `${h}px`, position: "relative" }}>
            {id === "corporate-clean" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: primary }} />}
            {id === "engenharia-naval" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ink }} />}
            {id === "naval-premium" && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, background: primary, opacity: 0.7 }} />}
            {(id === "naval-azul" || id === "naval-premium" || id === "luxo" || id === "oficial" || id === "timbrado" || id === "capa-executiva" || id === "relatorio-tecnico" || id === "premium-branco") && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 2, background: gold }} />
            )}
            {id === "luxo" && <div style={{ position: "absolute", left: 0, right: 0, bottom: -5, height: 1, background: gold }} />}
            {id === "capa-executiva" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "60%", height: 2, background: "#fff" }} />
              </div>
            )}
          </div>
        );
      })()}
      {/* Body lines */}
      <div className={`px-1.5 pt-1.5 space-y-1 ${id === "corporate-clean" ? "pl-4" : id === "laudo" || id === "engenharia-naval" ? "pl-3" : ""}`}>
        {id === "checklist" ? (
          <>
            {[0,1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div style={{ width: 5, height: 5, border: `1px solid ${primary}` }} />
                <div className="h-[2px] flex-1 bg-slate-200" />
              </div>
            ))}
          </>
        ) : id === "escritorio" || id === "corporate-clean" ? (
          <>
            <div className="h-[3px] w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <div className="space-y-1">
                <div className="h-[2px] w-full bg-slate-200" />
                <div className="h-[2px] w-5/6 bg-slate-100" />
                <div className="h-[2px] w-3/4 bg-slate-100" />
              </div>
              <div className="space-y-1">
                <div className="h-[2px] w-full bg-slate-200" />
                <div className="h-[2px] w-4/5 bg-slate-100" />
                <div className="h-[2px] w-2/3 bg-slate-100" />
              </div>
            </div>
        </>
        ) : id === "capa-executiva" ? (
          <>
            <div className="mt-3 mx-auto h-[4px] w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="mx-auto h-[1px] w-1/2" style={{ background: gold }} />
            <div className="pt-2 space-y-1">
              <div className="h-[2px] w-full bg-slate-100" />
              <div className="h-[2px] w-5/6 bg-slate-100" />
            </div>
          </>
        ) : id === "protocolo" ? (
          <>
            <div className="h-[3px] w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="h-[1px] w-8 bg-slate-400" />
            <div className="pt-1 space-y-1">
              <div className="h-[2px] w-full bg-slate-100" />
              <div className="h-[2px] w-5/6 bg-slate-100" />
              <div className="h-[2px] w-2/3 bg-slate-100" />
            </div>
          </>
        ) : id === "engenharia-naval" || id === "relatorio-tecnico" || id === "laudo" ? (
          <>
            <div className="h-[3px] w-1/3 rounded-sm" style={{ background: ink }} />
            <div className="flex items-center gap-1">
              <div style={{ width: 6, height: 6, background: id === "relatorio-tecnico" ? primary : "#64748b" }} />
              <div className="h-[2px] w-2/3 bg-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <div style={{ width: 6, height: 6, background: id === "relatorio-tecnico" ? primary : "#64748b" }} />
              <div className="h-[2px] w-1/2 bg-slate-200" />
            </div>
            <div className="grid grid-cols-[8px_1fr] gap-1 pt-0.5">
              <div className="h-8 rounded-sm" style={{ background: primary, opacity: 0.25 }} />
              <div className="space-y-1">
                <div className="h-[2px] w-full bg-slate-100" />
                <div className="h-[2px] w-5/6 bg-slate-100" />
                <div className="h-[2px] w-3/4 bg-slate-100" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`h-[3px] rounded-sm`} style={{ background: ink, width: id === "premium-branco" || id === "institucional" || id === "naval-premium" ? "50%" : "66%", marginLeft: id === "premium-branco" || id === "institucional" || id === "naval-premium" ? "25%" : 0 }} />
            <div className="h-[1px] w-full" style={{ background: id === "timbrado" ? "#94a3b8" : id === "luxo" || id === "naval-premium" ? gold : "#e2e8f0" }} />
            <div className="h-[2px] w-full bg-slate-100" />
            <div className="h-[2px] w-5/6 bg-slate-100" />
            <div className="h-[2px] w-3/4 bg-slate-100" />
            <div className="h-[2px] w-4/6 bg-slate-100" />
          </>
        )}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: id === "minimalista" ? "transparent" : id === "luxo" || id === "naval-premium" ? gold : light }} />
    </div>
  );
}
