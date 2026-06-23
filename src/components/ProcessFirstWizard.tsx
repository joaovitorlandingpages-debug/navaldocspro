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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

function toFieldRows(label: string, input: Record<string, any>) {
  return Object.entries(input)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => `${label}.${key}: ${value}`);
}

function wrapLine(text: string, maxChars = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildProcessFirstPdf(docName: string, fieldValues: any) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 48;
  let y = 792;

  const draw = (text: string, size = 10, isBold = false) => {
    for (const line of wrapLine(text)) {
      if (y < 56) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 792;
      }
      page.drawText(line, { x: margin, y, size, font: isBold ? bold : font, color: rgb(0, 0, 0), maxWidth: 500 });
      y -= size + 5;
    }
  };

  draw(docName.toUpperCase(), 15, true);
  draw(`Gerado pelo fluxo Processo-First em ${new Date().toLocaleString("pt-BR")}`, 9);
  y -= 10;
  draw("DADOS DO CLIENTE", 11, true);
  toFieldRows("cliente", fieldValues.customer || {}).forEach((line) => draw(line));
  y -= 8;
  draw("DADOS DA EMBARCAÇÃO", 11, true);
  toFieldRows("embarcacao", fieldValues.vessel || {}).forEach((line) => draw(line));
  y -= 8;
  draw("DADOS DO PROCESSO", 11, true);
  toFieldRows("processo", fieldValues.process || {}).forEach((line) => draw(line));
  y -= 18;
  draw("Arquivo PDF criado e persistido com vínculos obrigatórios de processo, cliente e embarcação.", 9);

  return await pdfDoc.save();
}

async function validateGeneratedPdfPath(path: string) {
  if (!path || !path.toLowerCase().endsWith(".pdf")) return false;
  const { data: blob, error } = await supabase.storage.from("generated-documents").download(path);
  if (error || !blob) return false;
  const sample = await blob.slice(0, 4).text();
  return sample === "%PDF";
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
    console.log("[PROCESS_FIRST_GENERATION_STARTED]", { service: service.kind });
    dispatch({ type: "GENERATING", on: true });
    try {
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
            await supabase.from("customers").update({
              name: state.customer.name,
              email: state.customer.email || null,
              phone: state.customer.phone || null,
              address: state.customer.address || null,
              city: state.customer.city || null,
              state: state.customer.state || null,
            }).eq("id", customerId);
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
          }).select().single();
          if (error) throw new Error("Cliente: " + error.message);
          customerId = c.id;
        }
        console.log("[CUSTOMER_CREATED_OR_UPDATED]", customerId);
        dispatch({ type: "LOG", line: `✓ Cliente: ${state.customer.name}` });
      }

      let vesselId: string | null = null;
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
            await supabase.from("vessels").update(vesselPayload).eq("id", vesselId);
          }
        }
        if (!vesselId) {
          const { data: v, error } = await supabase.from("vessels").insert(vesselPayload).select().single();
          if (error) throw new Error("Embarcação: " + error.message);
          vesselId = v.id;
        }
        console.log("[VESSEL_CREATED_OR_UPDATED]", vesselId);
        if (customerId) console.log("[VESSEL_LINKED_TO_CUSTOMER]", { vesselId, customerId });
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
      console.log("[PROCESS_CREATED]", proc.id);
      dispatch({ type: "LOG", line: `✓ Processo criado: ${proc.id.slice(0, 8)}` });

      // Link uploaded files to process
      const allDocs = [...state.personalDocs, ...state.addressDocs, ...state.vesselDocs].filter((d) => d.status !== "failed");
      if (allDocs.length > 0) {
        await supabase.from("uploaded_files")
          .update({ process_id: proc.id })
          .in("id", allDocs.map((d) => d.fileId));
        dispatch({ type: "LOG", line: `✓ ${allDocs.length} documento(s) vinculado(s)` });
      }

      // Generate documents: try matching templates by name, otherwise insert a stub row.
      const fieldValues = {
        customer: state.customer,
        vessel: state.vessel,
        process: { type: service.processType, kind: service.kind },
      };
      let generatedCount = 0;
      for (const docName of service.generatedDocs) {
        try {
          const { data: tpl } = await supabase
            .from("document_templates")
            .select("id")
            .eq("company_id", companyId)
            .ilike("name", `%${docName}%`)
            .maybeSingle();
          if (tpl?.id) {
            const { error: genErr } = await supabase.functions.invoke("generate-document", {
              body: { templateId: tpl.id, companyId, customerId, vesselId, processId: proc.id, fieldValues },
            });
            if (genErr) throw genErr;
          } else {
            await supabase.from("generated_documents").insert({
              company_id: companyId,
              customer_id: customerId,
              vessel_id: vesselId,
              process_id: proc.id,
              name: `${docName} (falha — template não encontrado)`,
              status: "error",
              metadata: { ...fieldValues, reason: "template_not_found" } as any,
            });
            dispatch({ type: "LOG", line: `✗ ${docName}: template não encontrado` });
            console.warn("[GENERATED_DOCUMENT_STUB_FLAGGED]", docName);
            continue;
          }
          generatedCount++;
          dispatch({ type: "LOG", line: `✓ ${docName}` });
        } catch (e: any) {
          console.error("[DOCUMENT_GENERATION_FAILED]", docName, e);
          dispatch({ type: "LOG", line: `✗ ${docName}: ${e.message}` });
        }
      }
      console.log("[DOCUMENTS_GENERATED]", { count: generatedCount, total: service.generatedDocs.length });

      // Dossier stub
      try {
        await supabase.from("process_dossiers").insert({
          company_id: companyId,
          process_id: proc.id,
          status: "draft",
          metadata: { service: service.kind, generated_count: generatedCount } as any,
        } as any);
        console.log("[DOSSIER_GENERATED]", proc.id);
        dispatch({ type: "LOG", line: `✓ Dossiê iniciado` });
      } catch (e: any) {
        console.warn("[DOSSIER_SKIPPED]", e?.message);
      }

      dispatch({ type: "CREATED", processId: proc.id });
      dispatch({ type: "STEP", step: 7 });
      console.log("[PROCESS_FIRST_GENERATION_SUCCESS]", proc.id);
      toast.success("Processo e documentos gerados com sucesso!");
    } catch (e: any) {
      console.error("[PROCESS_FIRST_GENERATION_FAILED]", e);
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

  const steps = ["Serviço", "Identidade", "Endereço", "Embarcação", "Montagem", "Revisão", "Concluído"];

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
            <Step4 service={service} state={state} />
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
        {state.step < 7 && (
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

function Step4({ service, state }: { service: ServiceDef; state: WizardState }) {
  const identityOk = !service.needsPersonal || state.personalDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.customer.name;
  const addressOk = !service.needsPersonal || state.addressDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.customer.address;
  const vesselOk = !service.needsVessel || state.vesselDocs.some((d) => d.status === "done" || d.status === "ocr") || !!state.vessel.name;
  console.log("[PROCESS_FIRST_UX_IMPROVED]", { identityOk, addressOk, vesselOk });
  return (
    <div>
      <h3 className="text-lg font-black text-navy mb-1">Montagem inteligente</h3>
      <p className="text-sm text-slate-500 mb-4">Para <strong>{service.name}</strong>, vamos precisar de:</p>
      <div className="space-y-2">
        {service.needsPersonal && <Check label="Documento de identificação enviado" ok={identityOk} />}
        {service.needsPersonal && <Check label="Comprovante de residência enviado" ok={addressOk} />}
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
  return (
    <div className="py-2">
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-black text-navy">Processo gerado com sucesso</h3>
        <p className="text-sm text-slate-500 mt-1">{service.name} — {processId?.slice(0, 8)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <SuccessCard icon={<User className="h-4 w-4" />} title="Cliente" body={state.customer.name || "—"} sub="criado/atualizado" />
        <SuccessCard icon={<Ship className="h-4 w-4" />} title="Embarcação" body={state.vessel.name || state.vessel.registration_number || "—"} sub="vinculada ao cliente" />
        <SuccessCard icon={<Sparkles className="h-4 w-4" />} title="Processo" body={service.name} sub={processId ? `ID ${processId.slice(0, 8)}` : ""} />
        <SuccessCard icon={<FileText className="h-4 w-4" />} title="Documentos" body={`${service.generatedDocs.length} gerados`} sub={service.generatedDocs.join(", ")} />
      </div>

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
