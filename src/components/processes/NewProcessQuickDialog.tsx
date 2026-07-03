/**
 * NewProcessQuickDialog — Wizard Guiado Definitivo (7 etapas)
 *
 *  1. Tipo de processo
 *  2. Cliente(s) — comprador + vendedor em transferências
 *  3. Documentos do cliente (CNH/RG, CPF/CNPJ, comprovante)
 *  4. Embarcação + documentos (TIE/TIEM, NF, NF motor, fotos)
 *  5. Identidade dos documentos (sem logo / empresa / cliente / exclusivo)
 *  6. Documentos a gerar (Blueprint + biblioteca)
 *  7. Resumo e criação
 *
 * Preserva Blueprint, OCR, Batch Generation, Assinaturas, Dossiê e Workspace.
 * O modo "Upload rápido" continua acessível pelo Chooser.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sparkles, ArrowRight, ArrowLeft, Search, FileText, Plus, X,
  ShieldCheck, GitBranch, PackageOpen, Signature, Zap, User, Ship, ImageIcon,
  CheckCircle2, Upload, Eye, RotateCcw, Trash2, AlertTriangle, Link2, UserPlus,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  materializeProcessBlueprint,
  previewProcessBlueprint,
  type BlueprintPreviewItem,
} from "@/services/processes/blueprintEngine";
import {
  batchGenerate, type BatchReport, type ChecklistLite,
} from "@/services/processes/batchChecklistActions";
import { Progress } from "@/components/ui/progress";
import {
  confirmProcessVisible, notifyProcessesChanged,
} from "@/services/processes/processCreation";
import { FileUploader } from "@/components/FileUploader";
import type { FileBucket } from "@/hooks/useFiles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdvanced?: () => void;
}

type ProcessTypeRow = { id: string; name: string; category: string | null };
type CustomerRow = { id: string; name: string };
type VesselRow = { id: string; name: string; customer_id: string | null };
type TemplateRow = { id: string; name: string; category: string | null };

type BrandingMode = "none" | "company" | "customer" | "exclusive";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const STEPS: { n: Step; label: string; icon: any }[] = [
  { n: 1, label: "Tipo",       icon: Sparkles },
  { n: 2, label: "Cliente",    icon: User },
  { n: 3, label: "Docs Cliente", icon: FileText },
  { n: 4, label: "Embarcação", icon: Ship },
  { n: 5, label: "Identidade", icon: ImageIcon },
  { n: 6, label: "Gerar",      icon: Zap },
  { n: 7, label: "Resumo",     icon: CheckCircle2 },
];

/** Slots de upload — nome exibido + categoria usada no storage. */
interface DocSlot {
  key: string;
  label: string;
  category: string;
  suggested?: boolean;   // pré-marcado ao entrar na etapa
  hint?: string;
  allowMissing?: boolean;      // libera checkbox "não possui"
  onMissingGenerate?: string;  // rótulo do documento gerado quando marcado
}


export function NewProcessQuickDialog({ isOpen, onClose, onOpenAdvanced }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { checkLimit } = usePlanLimits();

  const [step, setStep] = useState<Step>(1);

  // Dados carregados
  const [types, setTypes] = useState<ProcessTypeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [vessels, setVessels] = useState<VesselRow[]>([]);

  // Etapa 1
  const [typeQuery, setTypeQuery] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [title, setTitle] = useState("");

  // Etapa 2 — clientes
  const [customerId, setCustomerId] = useState<string>("");
  const [secondaryCustomerId, setSecondaryCustomerId] = useState<string>("");

  // Etapa 3 — checklist de docs do cliente + controle
  const [noResidenceProof, setNoResidenceProof] = useState(false);
  const [uploadedSlots, setUploadedSlots] = useState<Record<string, number>>({});
  const [clientDocPicks, setClientDocPicks] = useState<Set<string>>(new Set());

  // Etapa 4 — embarcação + checklist de docs
  const [vesselId, setVesselId] = useState<string>("");
  const [hasMotor, setHasMotor] = useState(false);
  const [vesselDocPicks, setVesselDocPicks] = useState<Set<string>>(new Set());

  // Task files por slot: cada upload vira uma tarefa independente com OCR próprio.
  interface TaskFile {
    id: string;
    file_name: string;
    file_url: string;
    bucket: FileBucket;
    ocrJobId?: string;
    ocrStatus?: "pending" | "processing" | "completed" | "failed" | "reviewed";
    extracted?: Record<string, any>;
    confidence?: number;
  }
  const [taskFiles, setTaskFiles] = useState<Record<string, TaskFile[]>>({});
  const [matchInfo, setMatchInfo] = useState<{
    customerMatch?: { id: string; name: string } | null;
    customerNew?: string | null;
    vesselMatch?: { id: string; name: string } | null;
    vesselNew?: string | null;
  }>({});


  // Etapa 5 — identidade
  const [brandingMode, setBrandingMode] = useState<BrandingMode>("company");

  // Etapa 6 — documentos gerados
  const [preview, setPreview] = useState<BlueprintPreviewItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [extras, setExtras] = useState<TemplateRow[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<TemplateRow[]>([]);
  const [allowEmptyPackage, setAllowEmptyPackage] = useState(false);

  // Criação
  const [submitting, setSubmitting] = useState(false);
  const [generateNow, setGenerateNow] = useState(false);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [genReport, setGenReport] = useState<BatchReport | null>(null);
  const [createdProcessId, setCreatedProcessId] = useState<string | null>(null);

  const selectedType = types.find((t) => t.id === selectedTypeId) || null;
  const typeName = selectedType?.name || "";
  const isTransfer = /transfer/i.test(typeName);
  const isRegistration = /registro/i.test(typeName);
  const isMotorChange = /motor/i.test(typeName);
  const needsVessel = !/segunda via|licença rádio|licenca radio/i.test(typeName);

  // Etapa 3 — checklist completa (engenheiro marca só o que possui)
  const clientSlots = useMemo<DocSlot[]>(() => [
    { key: "rg",          label: "RG",                           category: "rg",                     suggested: true },
    { key: "cnh",         label: "CNH",                          category: "cnh",                    suggested: true, hint: "Habilitação com foto." },
    { key: "cpf",         label: "CPF",                          category: "cpf",                    suggested: !isRegistration && !isTransfer },
    { key: "cnpj",        label: "CNPJ",                         category: "cnpj",                   hint: "Cartão CNPJ, se pessoa jurídica." },
    {
      key: "comprovante", label: "Comprovante de residência",    category: "comprovante_residencia",
      suggested: true, allowMissing: true,
      onMissingGenerate: "Declaração de Residência",
      hint: "Conta de luz, água ou telefone (últimos 90 dias).",
    },
    { key: "declaracao",  label: "Declaração de residência",     category: "declaracao_residencia",  hint: "Só se já possuir a declaração pronta." },
  ], [isRegistration, isTransfer]);

  // Etapa 4 — checklist de docs da embarcação
  const vesselSlots = useMemo<DocSlot[]>(() => {
    if (!needsVessel) return [];
    return [
      { key: "tie",           label: "TIE / TIEM",                       category: "tie",              suggested: !isRegistration, hint: "Título anterior, se já registrada." },
      { key: "nf_embarcacao", label: "Nota fiscal da embarcação",        category: "nota_fiscal",      suggested: isRegistration || isTransfer },
      { key: "nf_motor",      label: "Nota fiscal do motor",             category: "nota_fiscal_motor", suggested: hasMotor || isMotorChange },
      { key: "memorial",      label: "Memorial descritivo",              category: "memorial",         suggested: isRegistration, hint: "Especificações técnicas do casco." },
      { key: "fotos",         label: "Fotos (proa, popa, casco, motor)", category: "fotos",            suggested: isRegistration },
      { key: "outros",        label: "Outros documentos",                category: "outros" },
    ];
  }, [needsVessel, isRegistration, isTransfer, hasMotor, isMotorChange]);


  // ------------------------------------------------------------- carregamento
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [{ data: pt }, { data: cs }, { data: vs }] = await Promise.all([
        supabase.from("process_types").select("id,name,category").order("name"),
        supabase.from("customers").select("id,name").order("name").limit(500),
        supabase.from("vessels").select("id,name,customer_id").order("name").limit(500),
      ]);
      setTypes((pt as any) ?? []);
      setCustomers((cs as any) ?? []);
      setVessels((vs as any) ?? []);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedTypeId(""); setTypeQuery(""); setTitle(""); setPriority("normal");
      setCustomerId(""); setSecondaryCustomerId("");
      setNoResidenceProof(false); setUploadedSlots({});
      setClientDocPicks(new Set()); setVesselDocPicks(new Set());
      setVesselId(""); setHasMotor(false);
      setTaskFiles({}); setMatchInfo({});
      setBrandingMode("company");
      setPreview([]); setExcluded(new Set()); setExtras([]);
      setLibraryOpen(false); setLibraryQuery(""); setLibraryResults([]);
      setAllowEmptyPackage(false);
      setGenerateNow(false); setGenProgress(null); setGenReport(null);
      setCreatedProcessId(null);
    }
  }, [isOpen]);

  // Pré-seleção da checklist de docs assim que o tipo é escolhido
  useEffect(() => {
    if (!selectedTypeId) return;
    setClientDocPicks(new Set(clientSlots.filter(s => s.suggested).map(s => s.key)));
    setVesselDocPicks(new Set(vesselSlots.filter(s => s.suggested).map(s => s.key)));
  }, [selectedTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleClientPick = (key: string) => setClientDocPicks(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });
  const toggleVesselPick = (key: string) => setVesselDocPicks(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });


  // ------------------------------------------------------------- helpers
  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => t.name.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q));
  }, [types, typeQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProcessTypeRow[]>();
    for (const t of filteredTypes) {
      const key = t.category || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTypes]);

  const vesselOptions = useMemo(() => {
    if (!customerId) return vessels;
    return vessels.filter((v) => v.customer_id === customerId);
  }, [vessels, customerId]);

  const bumpSlot = (key: string) =>
    setUploadedSlots((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

  // Registra novo arquivo como task no slot correspondente e dispara polling do OCR.
  function attachTaskFile(
    slotKey: string,
    bucket: FileBucket,
    result: { id: string; file_name: string; file_url: string },
  ) {
    setTaskFiles((prev) => ({
      ...prev,
      [slotKey]: [
        ...(prev[slotKey] || []),
        { id: result.id, file_name: result.file_name, file_url: result.file_url, bucket, ocrStatus: "pending" },
      ],
    }));
    bumpSlot(slotKey);
  }

  async function removeTaskFile(slotKey: string, fileId: string) {
    setTaskFiles((prev) => ({
      ...prev,
      [slotKey]: (prev[slotKey] || []).filter((t) => t.id !== fileId),
    }));
    setUploadedSlots((prev) => ({ ...prev, [slotKey]: Math.max(0, (prev[slotKey] || 1) - 1) }));
    try { await supabase.from("uploaded_files").delete().eq("id", fileId); } catch (e) { console.warn(e); }
  }

  async function openTaskFile(t: TaskFile) {
    try {
      const { data } = await supabase.storage.from(t.bucket).createSignedUrl(t.file_url, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch { toast.error("Não foi possível abrir o arquivo."); }
  }

  // Polling de ocr_jobs para todos os arquivos anexados neste wizard.
  useEffect(() => {
    const allFiles = Object.entries(taskFiles).flatMap(([slot, arr]) =>
      arr.filter((f) => f.ocrStatus !== "completed" && f.ocrStatus !== "reviewed" && f.ocrStatus !== "failed")
         .map((f) => ({ slot, f }))
    );
    if (allFiles.length === 0) return;
    const iv = setInterval(async () => {
      const ids = allFiles.map((a) => a.f.id);
      const { data } = await supabase
        .from("ocr_jobs")
        .select("id,uploaded_file_id,status,extracted_data,confidence_score")
        .in("uploaded_file_id", ids);
      if (!data || data.length === 0) return;
      setTaskFiles((prev) => {
        const next: typeof prev = { ...prev };
        for (const job of data as any[]) {
          for (const [slot, arr] of Object.entries(next)) {
            const idx = arr.findIndex((x) => x.id === job.uploaded_file_id);
            if (idx >= 0) {
              const copy = [...arr];
              copy[idx] = {
                ...copy[idx],
                ocrJobId: job.id,
                ocrStatus: job.status,
                extracted: job.extracted_data || copy[idx].extracted,
                confidence: job.confidence_score ?? copy[idx].confidence,
              };
              next[slot] = copy;
            }
          }
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [taskFiles]);

  // Match automático de cliente/embarcação a partir do OCR (CPF/CNPJ, inscrição).
  useEffect(() => {
    const clientFields = Object.entries(taskFiles)
      .filter(([k]) => ["rg", "cnh", "cpf", "cnpj"].includes(k))
      .flatMap(([, arr]) => arr.map((t) => t.extracted).filter(Boolean));
    const doc = clientFields.find((f: any) => f?.cpf || f?.cnpj) as any;
    if (doc && !customerId) {
      const norm = (s: any) => String(s || "").replace(/\D+/g, "");
      const key = norm(doc.cpf || doc.cnpj);
      if (key.length >= 11) {
        (async () => {
          const { data } = await supabase.from("customers").select("id,name,cpf_cnpj").ilike("cpf_cnpj", `%${key.slice(-6)}%`).limit(5);
          const match = (data as any[])?.find((c) => norm(c.cpf_cnpj) === key);
          if (match) setMatchInfo((m) => ({ ...m, customerMatch: { id: match.id, name: match.name }, customerNew: null }));
          else if (doc.name) setMatchInfo((m) => ({ ...m, customerMatch: null, customerNew: doc.name }));
        })();
      }
    }
    const vesselFields = Object.entries(taskFiles)
      .filter(([k]) => ["tie", "nf_embarcacao"].includes(k))
      .flatMap(([, arr]) => arr.map((t) => t.extracted).filter(Boolean));
    const vdoc = vesselFields.find((f: any) => f?.registration_number || f?.vessel_name) as any;
    if (vdoc && !vesselId) {
      if (vdoc.registration_number) {
        (async () => {
          const { data } = await supabase.from("vessels").select("id,name,registration_number").eq("registration_number", String(vdoc.registration_number));
          const match = (data as any[])?.[0];
          if (match) setMatchInfo((m) => ({ ...m, vesselMatch: { id: match.id, name: match.name }, vesselNew: null }));
          else if (vdoc.vessel_name) setMatchInfo((m) => ({ ...m, vesselMatch: null, vesselNew: vdoc.vessel_name }));
        })();
      } else if (vdoc.vessel_name) {
        setMatchInfo((m) => ({ ...m, vesselNew: vdoc.vessel_name }));
      }
    }
  }, [taskFiles, customerId, vesselId]);

  const uploadedTotal = useMemo(
    () => Object.values(taskFiles).reduce((a, arr) => a + arr.length, 0),
    [taskFiles]
  );
  const avgConfidence = useMemo(() => {
    const arr = Object.values(taskFiles).flat().map((t) => t.confidence).filter((c): c is number => typeof c === "number");
    if (arr.length === 0) return null;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100);
  }, [taskFiles]);

  // ------------------------------------------------------------- CRUD inline
  async function createCustomerInline(kind: "primary" | "secondary" = "primary") {
    const label = kind === "secondary" ? "vendedor" : (isTransfer ? "comprador" : "cliente");
    const name = window.prompt(`Nome do ${label}:`)?.trim();
    if (!name) return;
    const cpf = window.prompt(`CPF/CNPJ do ${label} (opcional):`)?.trim() || null;
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    const { data, error } = await supabase
      .from("customers")
      .insert({ company_id: profile.company_id, name, cpf_cnpj: cpf })
      .select("id,name").single();
    if (error) { toast.error("Erro ao criar cliente: " + error.message); return; }
    setCustomers((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    if (kind === "secondary") setSecondaryCustomerId((data as any).id);
    else setCustomerId((data as any).id);
    toast.success(`Cliente "${name}" criado.`);
  }

  async function createVesselInline() {
    if (!customerId) { toast.error("Selecione o cliente antes."); return; }
    const name = window.prompt("Nome da embarcação:")?.trim();
    if (!name) return;
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    const { data, error } = await supabase
      .from("vessels")
      .insert({ company_id: profile.company_id, customer_id: customerId, name })
      .select("id,name,customer_id").single();
    if (error) { toast.error("Erro ao criar embarcação: " + error.message); return; }
    setVessels((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setVesselId((data as any).id);
    toast.success(`Embarcação "${name}" criada.`);
  }

  // ------------------------------------------------------------- navegação entre steps
  async function loadPreviewIfNeeded() {
    if (preview.length > 0 || !selectedType) return;
    setLoadingPreview(true);
    try {
      const items = await previewProcessBlueprint(selectedType.name);
      if (items.length === 0 && !allowEmptyPackage) {
        const ok = window.confirm(
          `⚠ O tipo "${selectedType.name}" ainda não possui modelo de documentos configurado.\n\n` +
          `Deseja criar um PROCESSO VAZIO MANUALMENTE?`
        );
        if (!ok) { setLoadingPreview(false); return; }
        setAllowEmptyPackage(true);
      }
      setPreview(items);
      const initialExcluded = new Set<string>();
      items.forEach((i) => {
        if ((i.kind === "optional" || i.kind === "conditional") && i.templateId) {
          initialExcluded.add(i.templateId);
        }
      });
      setExcluded(initialExcluded);
    } catch (e: any) {
      toast.error("Falha ao carregar modelo: " + (e?.message || e));
    } finally {
      setLoadingPreview(false);
    }
  }

  function validateStep(target: Step): string | null {
    if (step === 1 && !selectedTypeId) return "Selecione o tipo de processo.";
    if (step === 2) {
      if (!customerId) return isTransfer ? "Selecione o comprador." : "Selecione o cliente.";
      if (isTransfer && !secondaryCustomerId) return "Selecione o vendedor.";
    }
    if (step === 4 && needsVessel && target > 4 && !vesselId) {
      return "Selecione ou crie a embarcação (ou volte e marque o tipo como sem embarcação).";
    }
    return null;
  }

  async function goStep(target: Step) {
    if (target > step) {
      const err = validateStep(target);
      if (err) { toast.error(err); return; }
    }
    if (target >= 6 && preview.length === 0) {
      await loadPreviewIfNeeded();
    }
    setStep(target);
  }

  // ------------------------------------------------------------- documentos a gerar
  function toggleTemplate(tplId: string | null) {
    if (!tplId) return;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(tplId)) next.delete(tplId); else next.add(tplId);
      return next;
    });
  }

  async function searchLibrary(q: string) {
    setLibraryQuery(q);
    if (q.trim().length < 2) { setLibraryResults([]); return; }
    const { data } = await supabase
      .from("document_templates")
      .select("id,name,category")
      .ilike("name", `%${q}%`)
      .limit(15);
    setLibraryResults((data as any) ?? []);
  }
  function addExtra(t: TemplateRow) {
    if (extras.some((e) => e.id === t.id)) return;
    const inPreview = preview.find((p) => p.templateId === t.id);
    if (inPreview) {
      setExcluded((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
      toast.success(`"${t.name}" marcado.`);
      return;
    }
    setExtras((prev) => [...prev, t]);
  }
  function removeExtra(id: string) { setExtras((prev) => prev.filter((e) => e.id !== id)); }

  const selectedCount = useMemo(() => {
    const base = preview.filter((p) => p.templateId && !excluded.has(p.templateId)).length;
    return base + extras.length;
  }, [preview, excluded, extras]);

  // Se não tem comprovante, injeta Declaração automaticamente na busca de extras.
  useEffect(() => {
    if (!noResidenceProof) return;
    (async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("id,name,category")
        .ilike("name", "%declara%residenc%")
        .limit(1);
      const t = (data as any)?.[0];
      if (t && !extras.some((e) => e.id === t.id)) setExtras((prev) => [...prev, t]);
    })();
  }, [noResidenceProof]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------- criação
  async function handleCreate() {
    if (!selectedType) return;
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    if (!customerId) { toast.error("Cliente obrigatório."); setStep(2); return; }
    if (isTransfer && !secondaryCustomerId) { toast.error("Vendedor obrigatório em transferência."); setStep(2); return; }

    setSubmitting(true);
    try {
      const limit = await checkLimit("processes");
      if (limit.reached) {
        toast.error("Limite de processos ativos atingido.", {
          description: `Ativos: ${limit.current}/${limit.limit ?? "ilimitado"}.`,
        });
        return;
      }
      const { data, error } = await supabase
        .from("processes")
        .insert({
          company_id: profile.company_id,
          process_type: selectedType.name,
          process_type_id: selectedType.id,
          customer_id: customerId,
          secondary_customer_id: isTransfer && secondaryCustomerId ? secondaryCustomerId : null,
          vessel_id: vesselId || null,
          title: title.trim() || selectedType.name,
          priority,
          status: "pending",
          is_draft: false,
          archived_at: null,
          trashed_at: null,
          deleted_at: null,
          branding_mode: brandingMode,
        } as any)
        .select("id").single();
      if (error) throw error;
      const processId = (data as any).id as string;

      try {
        await materializeProcessBlueprint(processId, {
          excludeTemplateIds: Array.from(excluded),
          extraTemplateIds: extras.map((e) => e.id),
        });
      } catch (e) { console.warn("blueprint falhou:", e); }

      const visibleProcess = await confirmProcessVisible(processId, profile.company_id);
      notifyProcessesChanged(visibleProcess);
      setCreatedProcessId(processId);
      toast.success(`Processo criado com ${selectedCount} documento(s) no checklist.`);

      if (generateNow && selectedCount > 0) {
        const { data: rows } = await supabase
          .from("document_checklists")
          .select("id,item_name,template_id,document_id,requires_signature")
          .eq("process_id", processId);
        const items: ChecklistLite[] = ((rows ?? []) as any[])
          .filter((r) => !!r.template_id)
          .map((r) => ({
            id: r.id, item_name: r.item_name, template_id: r.template_id,
            document_id: r.document_id, requires_signature: r.requires_signature,
          }));
        if (items.length > 0) {
          setGenProgress({ done: 0, total: items.length, current: "" });
          const rep = await batchGenerate(processId, items, (done, total, current) => {
            setGenProgress({ done, total, current });
          });
          setGenReport(rep); setGenProgress(null);
          return;
        }
      }

      onClose();
      navigate({ to: "/processes/$id", params: { id: processId }, search: { tab: "overview" } });
    } catch (e: any) {
      toast.error("Erro ao criar processo: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  function openCreatedProcess() {
    if (!createdProcessId) return;
    const id = createdProcessId;
    onClose();
    navigate({ to: "/processes/$id", params: { id }, search: { tab: "overview" } });
  }

  // ------------------------------------------------------------- render
  const canAdvance = !validateStep((Math.min(7, step + 1)) as Step);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] max-h-[92vh] sm:max-h-[90vh] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:w-screen overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Processo
          </DialogTitle>
          <DialogDescription>
            Passo a passo guiado. O sistema pede só o que este tipo de processo exige.
          </DialogDescription>
          <StepIndicator step={step} onJump={(n) => n < step && setStep(n)} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          {/* STEP 1 — Tipo */}
          {step === 1 && (
            <div className="space-y-4 py-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <Input value={typeQuery} onChange={(e) => setTypeQuery(e.target.value)} placeholder="Buscar tipo de processo…" className="pl-9" />
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-lg border bg-slate-50/50">
                {grouped.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-4 text-center">Nenhum tipo encontrado.</div>
                ) : grouped.map(([cat, list]) => (
                  <div key={cat}>
                    <div className="sticky top-0 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">{cat}</div>
                    {list.map((t) => (
                      <button
                        key={t.id} type="button"
                        onClick={() => setSelectedTypeId(t.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm border-b last:border-b-0 transition ${
                          selectedTypeId === t.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-white"
                        }`}
                      >
                        <span>{t.name}</span>
                        {selectedTypeId === t.id && <ArrowRight className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título interno</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={selectedType?.name || "Opcional"} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Cliente */}
          {step === 2 && (
            <div className="space-y-4 py-3">
              <CustomerPicker
                label={isTransfer ? "Comprador" : "Cliente"}
                value={customerId}
                onChange={(v) => { setCustomerId(v); setVesselId(""); }}
                onCreate={() => createCustomerInline("primary")}
                options={customers.filter((c) => c.id !== secondaryCustomerId)}
              />
              {isTransfer && (
                <CustomerPicker
                  label="Vendedor"
                  value={secondaryCustomerId}
                  onChange={setSecondaryCustomerId}
                  onCreate={() => createCustomerInline("secondary")}
                  options={customers.filter((c) => c.id !== customerId)}
                />
              )}
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
                💡 No próximo passo você anexa os documentos deste cliente (CNH, comprovante, etc.).
              </p>
            </div>
          )}

          {/* STEP 3 — Docs do cliente (task cards) */}
          {step === 3 && (
            <div className="space-y-4 py-3">
              <p className="text-xs text-slate-600">
                Cada documento é uma tarefa independente. Envie, e o OCR extrai os dados automaticamente.
              </p>

              {(matchInfo.customerMatch || matchInfo.customerNew) && (
                <MatchBanner
                  match={matchInfo.customerMatch}
                  newName={matchInfo.customerNew}
                  entity="cliente"
                  onLink={() => matchInfo.customerMatch && setCustomerId(matchInfo.customerMatch.id)}
                />
              )}

              <div className="space-y-3">
                {clientSlots.map((slot) => {
                  const isComprovante = slot.key === "comprovante";
                  const skipped = isComprovante && noResidenceProof;
                  return (
                    <DocTaskCard
                      key={slot.key}
                      slot={slot}
                      files={taskFiles[slot.key] || []}
                      bucket="customer-documents"
                      customerId={customerId || undefined}
                      skipped={skipped}
                      skipMessage={skipped ? "Declaração de Residência será gerada automaticamente." : undefined}
                      onSkipToggle={isComprovante ? (v) => {
                        setNoResidenceProof(v);
                        if (v) setClientDocPicks((prev) => { const n = new Set(prev); n.delete("comprovante"); return n; });
                      } : undefined}
                      onUploaded={(r) => attachTaskFile(slot.key, "customer-documents", r)}
                      onRemove={(id) => removeTaskFile(slot.key, id)}
                      onView={openTaskFile}
                    />
                  );
                })}
              </div>
            </div>
          )}


          {/* STEP 4 — Embarcação (checklist + upload dos marcados) */}
          {step === 4 && (
            <div className="space-y-4 py-3">
              {!needsVessel ? (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-100">
                  Este tipo de processo não exige embarcação. Você pode pular para a próxima etapa.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Embarcação <span className="text-red-500">*</span>
                      </Label>
                      <button type="button" onClick={createVesselInline} disabled={!customerId} className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-40">
                        <Plus className="h-3 w-3" /> Nova
                      </button>
                    </div>
                    <Select value={vesselId || ""} onValueChange={setVesselId}>
                      <SelectTrigger className={!vesselId ? "border-red-300" : ""}><SelectValue placeholder="Selecione a embarcação" /></SelectTrigger>
                      <SelectContent>
                        {vesselOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer border border-slate-100 bg-slate-50/50 p-2.5 rounded-lg">
                    <Checkbox checked={hasMotor} onCheckedChange={(v) => setHasMotor(!!v)} />
                    Esta embarcação tem motor (pediremos a NF do motor)
                  </label>

                  {(matchInfo.vesselMatch || matchInfo.vesselNew) && (
                    <MatchBanner
                      match={matchInfo.vesselMatch}
                      newName={matchInfo.vesselNew}
                      entity="embarcação"
                      onLink={() => matchInfo.vesselMatch && setVesselId(matchInfo.vesselMatch.id)}
                    />
                  )}

                  {vesselId && (
                    <div className="space-y-3">
                      {vesselSlots.map((slot) => (
                        <DocTaskCard
                          key={slot.key}
                          slot={slot}
                          files={taskFiles[slot.key] || []}
                          bucket="vessel-documents"
                          vesselId={vesselId}
                          onUploaded={(r) => attachTaskFile(slot.key, "vessel-documents", r)}
                          onRemove={(id) => removeTaskFile(slot.key, id)}
                          onView={openTaskFile}
                        />
                      ))}
                      <p className="text-[11px] text-slate-400 italic">
                        💡 O OCR identifica casco, inscrição e motor e vincula automaticamente à embarcação.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}



          {/* STEP 5 — Identidade */}
          {step === 5 && (
            <div className="space-y-3 py-3">
              <p className="text-sm text-slate-600">Escolha como os documentos gerados serão marcados:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { v: "none",      title: "Sem logo",         desc: "Documentos limpos, sem cabeçalho." },
                  { v: "company",   title: "Logo da empresa",  desc: "Usa a identidade corporativa cadastrada." },
                  { v: "customer",  title: "Logo do cliente",  desc: "Usa a marca do cliente (se disponível)." },
                  { v: "exclusive", title: "Logo exclusivo",   desc: "Configure um logo só para este processo." },
                ].map((opt) => (
                  <button
                    key={opt.v} type="button"
                    onClick={() => setBrandingMode(opt.v as BrandingMode)}
                    className={`text-left p-3 rounded-xl border transition ${
                      brandingMode === opt.v ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-bold text-navy">{opt.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Preview do cabeçalho</p>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                    {brandingMode === "none" ? (
                      <div className="h-10 w-10 rounded bg-slate-100" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gradient-to-br from-primary/40 to-primary/10 grid place-content-center text-primary text-xs font-black">
                        LOGO
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">{title || selectedType?.name || "Documento"}</p>
                      <p className="text-[10px] text-slate-500">
                        {brandingMode === "company" && "Empresa"}
                        {brandingMode === "customer" && "Cliente"}
                        {brandingMode === "exclusive" && "Exclusivo deste processo"}
                        {brandingMode === "none" && "Sem marca"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">Conteúdo do documento aqui…</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6 — Docs a gerar */}
          {step === 6 && (
            <div className="space-y-4 py-3">
              {loadingPreview ? (
                <div className="py-16 flex items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando modelo…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat icon={ShieldCheck} label="Obrigatórios" value={preview.filter((p) => p.kind === "mandatory").length} tone="emerald" />
                    <MiniStat icon={PackageOpen} label="Opcionais" value={preview.filter((p) => p.kind === "optional").length} tone="slate" />
                    <MiniStat icon={GitBranch} label="Condicionais" value={preview.filter((p) => p.kind === "conditional").length} tone="violet" />
                  </div>
                  <DocSection title="Obrigatórios" icon={ShieldCheck} tone="emerald" items={preview.filter((p) => p.kind === "mandatory")} excluded={excluded} onToggle={toggleTemplate} lockChecked />
                  <DocSection title="Opcionais" icon={PackageOpen} tone="slate" items={preview.filter((p) => p.kind === "optional")} excluded={excluded} onToggle={toggleTemplate} emptyLabel="Sem opcionais." />
                  <DocSection title="Condicionais" icon={GitBranch} tone="violet" items={preview.filter((p) => p.kind === "conditional")} excluded={excluded} onToggle={toggleTemplate} emptyLabel="Sem condicionais." />
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest text-navy">Extras da Biblioteca</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setLibraryOpen((v) => !v)}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                    {libraryOpen && (
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                          <Input value={libraryQuery} onChange={(e) => searchLibrary(e.target.value)} placeholder="Buscar template…" className="pl-9" />
                        </div>
                        {libraryResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-white">
                            {libraryResults.map((t) => (
                              <button key={t.id} type="button" onClick={() => addExtra(t)}
                                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0">
                                <span>{t.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{t.category || "geral"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {extras.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum extra adicionado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {extras.map((e) => (
                          <Badge key={e.id} variant="outline" className="gap-1.5 pl-2 pr-1 py-1">
                            {e.name}
                            <button type="button" onClick={() => removeExtra(e.id)} className="hover:bg-slate-100 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 7 — Resumo */}
          {step === 7 && (
            <div className="space-y-3 py-3">
              <SummaryRow label="Tipo"       value={selectedType?.name || "—"} />
              <SummaryRow label="Título"     value={title || selectedType?.name || "—"} />
              <SummaryRow label="Prioridade" value={priority} />
              <SummaryRow label={isTransfer ? "Comprador" : "Cliente"} value={customers.find((c) => c.id === customerId)?.name || "—"} />
              {isTransfer && <SummaryRow label="Vendedor" value={customers.find((c) => c.id === secondaryCustomerId)?.name || "—"} />}
              {needsVessel && <SummaryRow label="Embarcação" value={vessels.find((v) => v.id === vesselId)?.name || "—"} />}
              <SummaryRow label="Identidade" value={
                brandingMode === "none" ? "Sem logo" :
                brandingMode === "company" ? "Logo da empresa" :
                brandingMode === "customer" ? "Logo do cliente" : "Logo exclusivo"
              } />
              <SummaryRow label="Uploads" value={
                Object.values(uploadedSlots).reduce((a, b) => a + b, 0) + " arquivo(s) anexado(s)"
              } />
              <SummaryRow label="Documentos a gerar" value={`${selectedCount} documento(s)`} />
              {noResidenceProof && (
                <p className="text-[11px] text-violet-700 bg-violet-50 rounded-lg p-2 border border-violet-100">
                  📝 Declaração de residência será gerada automaticamente.
                </p>
              )}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer border border-slate-100 bg-slate-50/50 p-2.5 rounded-lg mt-4">
                <Checkbox checked={generateNow} onCheckedChange={(v) => setGenerateNow(!!v)} disabled={submitting} />
                Gerar todos os documentos automaticamente após criar
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between border-t p-4 sm:p-6 shrink-0">
          <div className="flex gap-2">
            {step > 1 ? (
              <Button variant="ghost" type="button" onClick={() => setStep((step - 1) as Step)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            ) : onOpenAdvanced ? (
              <Button variant="ghost" type="button" onClick={() => { onClose(); onOpenAdvanced(); }} disabled={submitting}>
                <Upload className="h-4 w-4 mr-1" /> Modo rápido (upload solto)
              </Button>
            ) : <div />}
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>Cancelar</Button>
            {step < 7 ? (
              <Button type="button" onClick={() => goStep((step + 1) as Step)} disabled={!canAdvance || loadingPreview}>
                {loadingPreview ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generateNow && selectedCount > 0 ? `Criar e gerar ${selectedCount}` : "Criar Processo"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Progresso da geração pós-criação */}
      <Dialog open={!!genProgress} onOpenChange={() => { /* trava */ }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Gerando {genProgress?.total} documento(s)…
            </DialogTitle>
            <DialogDescription>Falhas não interrompem os demais.</DialogDescription>
          </DialogHeader>
          {genProgress && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="truncate max-w-[70%]">{genProgress.current || "Preparando…"}</span>
                <span>{genProgress.done}/{genProgress.total}</span>
              </div>
              <Progress value={(genProgress.done / Math.max(1, genProgress.total)) * 100} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Relatório */}
      <Dialog open={!!genReport} onOpenChange={(v) => { if (!v) setGenReport(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Processo criado
            </DialogTitle>
            <DialogDescription>Resumo da geração inicial:</DialogDescription>
          </DialogHeader>
          {genReport && (
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{genReport.ok.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Gerados</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                <p className="text-2xl font-black text-red-700">{genReport.failed.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Falharam</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{genReport.missingData.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pendências</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGenReport(null)}>Fechar</Button>
            <Button onClick={openCreatedProcess}>
              Abrir workspace <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

/* -------------------- subcomponentes -------------------- */

function StepIndicator({ step, onJump }: { step: Step; onJump: (n: Step) => void }) {
  return (
    <div className="flex items-center gap-1 pt-3 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = s.n === step, done = s.n < step;
        const Icon = s.icon;
        return (
          <div key={s.n} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => done && onJump(s.n)}
              disabled={!done}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition ${
                active ? "bg-primary text-primary-foreground border-primary" :
                done ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer" :
                "bg-slate-50 text-slate-400 border-slate-200"
              }`}
            >
              <Icon className="h-3 w-3" /> {s.n}. {s.label}
            </button>
            {i < STEPS.length - 1 && <div className={`h-px w-3 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function CustomerPicker({
  label, value, onChange, onCreate, options,
}: {
  label: string; value: string; onChange: (v: string) => void; onCreate: () => void;
  options: CustomerRow[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {label} <span className="text-red-500">*</span>
        </Label>
        <button type="button" onClick={onCreate} className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1">
          <Plus className="h-3 w-3" /> Novo
        </button>
      </div>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className={!value ? "border-red-300" : ""}><SelectValue placeholder={`Selecione ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <span className="font-bold text-navy text-right">{value}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "emerald" | "slate" | "violet" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <Icon className="h-4 w-4 mx-auto mb-1" />
      <p className="text-lg font-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}

function DocSection({
  title, icon: Icon, tone, items, excluded, onToggle, emptyLabel, lockChecked,
}: {
  title: string; icon: any; tone: "emerald" | "slate" | "violet";
  items: BlueprintPreviewItem[]; excluded: Set<string>;
  onToggle: (id: string | null) => void;
  emptyLabel?: string; lockChecked?: boolean;
}) {
  const border: Record<string, string> = { emerald: "border-emerald-100", slate: "border-slate-100", violet: "border-violet-100" };
  return (
    <div className={`rounded-2xl border ${border[tone]} bg-white p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${tone === "emerald" ? "text-emerald-600" : tone === "violet" ? "text-violet-600" : "text-slate-500"}`} />
        <span className="text-sm font-black uppercase tracking-widest text-navy">{title}</span>
        <Badge variant="outline" className="text-[10px] font-black">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-slate-400">{emptyLabel || "—"}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const checked = lockChecked ? true : !(it.templateId && excluded.has(it.templateId));
            return (
              <label key={(it.templateId || it.name) + idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                  checked ? "bg-slate-50 border-slate-100" : "bg-white border-slate-100 opacity-70"
                } ${lockChecked ? "cursor-default" : "hover:border-primary/30"}`}>
                <Checkbox checked={checked} onCheckedChange={() => !lockChecked && onToggle(it.templateId)} disabled={lockChecked || !it.templateId} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{it.name}</p>
                  {it.ruleSummary && <p className="text-[11px] text-violet-600 mt-0.5 line-clamp-2">Só é gerado se: {it.ruleSummary}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {it.requiresSignature && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-amber-200 text-amber-600"><Signature className="h-2.5 w-2.5" /> assina</Badge>}
                    {it.requiresOcr && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-sky-200 text-sky-600"><Zap className="h-2.5 w-2.5" /> OCR</Badge>}
                    {!it.templateId && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-500">sem template</Badge>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
