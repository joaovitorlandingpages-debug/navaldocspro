import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import {
  Loader2, Save, Plus, X, AlertTriangle, User, Ship, FileText, Calendar,
  ClipboardList, Palette, CheckSquare, BarChart3, Zap, ExternalLink, Copy,
  Archive, Trash2, PenLine, FileSignature, FolderArchive, Share2, Upload,
  ChevronDown, Check, Users,
} from "lucide-react";
import { BR_UFS, maskCpfCnpj, maskPhone, daysUntil } from "@/lib/br-format";
import { ProcessParticipantsTab } from "./ProcessParticipantsTab";

interface Props {
  process: any;
  onSaved?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  initialTab?: string;
}

const STATUSES = [
  { v: "pending", l: "Novo", tone: "bg-slate-100 text-slate-700" },
  { v: "in_progress", l: "Em andamento", tone: "bg-blue-100 text-blue-700" },
  { v: "waiting_docs", l: "Aguardando documentos", tone: "bg-amber-100 text-amber-800" },
  { v: "review", l: "Em revisão", tone: "bg-violet-100 text-violet-700" },
  { v: "ready_to_generate", l: "Pronto para geração", tone: "bg-cyan-100 text-cyan-700" },
  { v: "waiting_signature", l: "Aguardando assinatura", tone: "bg-orange-100 text-orange-700" },
  { v: "protocolado", l: "Protocolado", tone: "bg-emerald-100 text-emerald-800" },
  { v: "completed", l: "Finalizado", tone: "bg-emerald-100 text-emerald-800" },
  { v: "cancelled", l: "Cancelado", tone: "bg-slate-200 text-slate-600" },
];
const PRIORITIES = [
  { v: "low", l: "Baixa", tone: "bg-slate-100 text-slate-700" },
  { v: "medium", l: "Média", tone: "bg-blue-100 text-blue-700" },
  { v: "high", l: "Alta", tone: "bg-amber-100 text-amber-800" },
  { v: "urgent", l: "Urgente", tone: "bg-orange-100 text-orange-700" },
  { v: "critical", l: "Crítica", tone: "bg-red-100 text-red-700" },
];
const CATEGORIES = ["Registro", "Renovação", "Transferência", "Vistoria", "Cancelamento", "Alteração", "Outro"];
const BRANDING_MODES = [
  { v: "none", l: "Sem logo" },
  { v: "company", l: "Logo da empresa" },
  { v: "customer", l: "Logo do cliente" },
  { v: "process", l: "Logo exclusivo do processo" },
];

function Section({ icon: Icon, title, children, action }: any) {
  return (
    <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-black text-navy uppercase tracking-tight truncate">{title}</h3>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-black text-navy">{value ?? "—"}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Chip({ tone, children, onClick, title }: any) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition hover:brightness-95 ${tone}`}
    >
      {children}
    </button>
  );
}

export function ProcessEditForm({ process, onSaved, onCancel, onClose, initialTab }: Props) {
  const navigate = useNavigate();
  const meta = (process?.draft_data && typeof process.draft_data === "object" ? process.draft_data : {}) as any;

  const initial = useMemo(() => ({
    title: process?.title ?? "",
    process_type: process?.process_type ?? "",
    process_number: meta.process_number ?? "",
    category: meta.category ?? "",
    status: process?.status ?? "pending",
    priority: process?.priority ?? "medium",
    started_at: process?.started_at ? String(process.started_at).slice(0, 10) : "",
    due_date: process?.due_date ?? "",
    notes: process?.notes ?? "",
    customer_id: process?.customer_id ?? "",
    vessel_id: process?.vessel_id ?? "",
    responsible_id: process?.responsible_id ?? "",
    technical_manager_id: process?.technical_manager_id ?? "",
    engineer_id: meta.engineer_id ?? "",
    despachante_id: meta.despachante_id ?? "",
    tags: (process?.tags ?? []) as string[],
    branding_mode: process?.branding_mode ?? "company",
    branding_logo_url: process?.branding_logo_url ?? "",
  }), [process, meta.process_number, meta.category, meta.engineer_id, meta.despachante_id]);

  const [tab, setTab] = useState<string>(initialTab ?? "dados");
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const [form, setForm] = useState(initial);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [processTypes, setProcessTypes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [newVesselOpen, setNewVesselOpen] = useState(false);
  const [editVesselOpen, setEditVesselOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<any>({});
  const [vesselDraft, setVesselDraft] = useState<any>({});
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [vesselPickerOpen, setVesselPickerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "archive" | "trash">(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(initial); }, [initial]);

  async function reload() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return;
    setCompanyId(profile.company_id);
    const [c, v, p, pt] = await Promise.all([
      supabase.from("customers").select("id,name,cpf_cnpj,email,phone,city,state").eq("company_id", profile.company_id).order("name"),
      supabase.from("vessels").select("id,name,customer_id,vessel_type,registration_number,engine,current_owner_name").eq("company_id", profile.company_id).order("name"),
      supabase.from("profiles").select("id,name,email").eq("company_id", profile.company_id).order("name"),
      supabase.from("process_types").select("id,name,category").order("name"),
    ]);
    setCustomers(c.data || []);
    setVessels(v.data || []);
    setUsers(p.data || []);
    setProcessTypes(pt.data || []);
  }
  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!process?.id) return;
    (async () => {
      const [docs, sigs, ocr, uploads, dossiers] = await Promise.all([
        supabase.from("generated_documents").select("id", { count: "exact", head: true }).eq("process_id", process.id),
        supabase.from("signature_requests").select("id", { count: "exact", head: true }).eq("process_id", process.id),
        supabase.from("ocr_jobs").select("id", { count: "exact", head: true }).eq("process_id", process.id),
        supabase.from("process_document_uploads").select("id", { count: "exact", head: true }).eq("process_id", process.id),
        supabase.from("process_dossiers").select("id", { count: "exact", head: true }).eq("process_id", process.id),
      ]);
      setStats({
        documents: docs.count ?? 0,
        signatures: sigs.count ?? 0,
        ocr: ocr.count ?? 0,
        uploads: uploads.count ?? 0,
        pending: process.pending_documents_count ?? 0,
        dossiers: dossiers.count ?? 0,
      });
    })();
  }, [process?.id, process?.pending_documents_count]);

  const currentCustomer = customers.find((c) => c.id === form.customer_id);
  const currentVessel = vessels.find((v) => v.id === form.vessel_id);
  const customerChanged = form.customer_id !== initial.customer_id;
  const vesselChanged = form.vessel_id !== initial.vessel_id;
  const hasGenerated = (process?.completion_percentage ?? 0) > 0;

  const dirtyFields = useMemo(() => {
    const diff: any = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
      const a = JSON.stringify(form[k] ?? null);
      const b = JSON.stringify((initial as any)[k] ?? null);
      if (a !== b) diff[k] = form[k];
    });
    return diff;
  }, [form, initial]);
  const isDirty = Object.keys(dirtyFields).length > 0;

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { setTagInput(""); return; }
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  }
  function removeTag(t: string) { setForm({ ...form, tags: form.tags.filter((x) => x !== t) }); }

  // -------- Customer inline CRUD
  function openNewCustomer() { setCustomerDraft({ name: "", cpf_cnpj: "", email: "", phone: "", city: "", state: "" }); setNewCustomerOpen(true); }
  async function openEditCustomer() {
    if (!currentCustomer) return;
    const { data } = await supabase.from("customers").select("*").eq("id", currentCustomer.id).single();
    setCustomerDraft(data || currentCustomer);
    setEditCustomerOpen(true);
  }
  async function saveCustomer(mode: "new" | "edit") {
    if (!customerDraft.name?.trim() || !companyId) return;
    const payload = {
      name: customerDraft.name.trim(),
      cpf_cnpj: customerDraft.cpf_cnpj || null,
      email: customerDraft.email || null,
      phone: customerDraft.phone || null,
      city: customerDraft.city || null,
      state: customerDraft.state || null,
    };
    if (mode === "new") {
      const { data, error } = await supabase.from("customers").insert({ company_id: companyId, ...payload }).select().single();
      if (error) return toast.error(error.message);
      toast.success("Cliente criado.");
      await reload();
      setForm((f) => ({ ...f, customer_id: data!.id }));
      setNewCustomerOpen(false);
    } else {
      const { error } = await supabase.from("customers").update(payload).eq("id", customerDraft.id);
      if (error) return toast.error(error.message);
      toast.success("Cliente atualizado.");
      await reload();
      setEditCustomerOpen(false);
    }
  }

  // -------- Vessel inline CRUD
  function openNewVessel() {
    if (!form.customer_id) return toast.error("Selecione um cliente primeiro.");
    setVesselDraft({ name: "", registration_number: "", vessel_type: "", engine: "", current_owner_name: currentCustomer?.name || "" });
    setNewVesselOpen(true);
  }
  async function openEditVessel() {
    if (!currentVessel) return;
    const { data } = await supabase.from("vessels").select("*").eq("id", currentVessel.id).single();
    setVesselDraft(data || currentVessel);
    setEditVesselOpen(true);
  }
  async function saveVessel(mode: "new" | "edit") {
    if (!vesselDraft.name?.trim() || !companyId) return;
    const payload = {
      name: vesselDraft.name.trim(),
      registration_number: vesselDraft.registration_number || null,
      vessel_type: vesselDraft.vessel_type || null,
      engine: vesselDraft.engine || null,
      current_owner_name: vesselDraft.current_owner_name || null,
    };
    if (mode === "new") {
      const { data, error } = await supabase.from("vessels").insert({ company_id: companyId, customer_id: form.customer_id, ...payload }).select().single();
      if (error) return toast.error(error.message);
      toast.success("Embarcação criada.");
      await reload();
      setForm((f) => ({ ...f, vessel_id: data!.id }));
      setNewVesselOpen(false);
    } else {
      const { error } = await supabase.from("vessels").update(payload).eq("id", vesselDraft.id);
      if (error) return toast.error(error.message);
      toast.success("Embarcação atualizada.");
      await reload();
      setEditVesselOpen(false);
    }
  }

  // -------- Branding logo upload
  async function uploadLogo(file: File) {
    if (!companyId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${companyId}/${process.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("company-branding").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("company-branding").createSignedUrl(path, 60 * 60 * 24 * 365);
      setForm((f) => ({ ...f, branding_mode: "process", branding_logo_url: signed?.signedUrl || "" }));
      toast.success("Logo enviado.");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload.");
    } finally { setUploading(false); }
  }

  // -------- Save
  const handleSave = useCallback(async (e?: React.FormEvent | KeyboardEvent) => {
    (e as any)?.preventDefault?.();
    if (!isDirty) { toast.info("Nada para salvar."); return; }
    if (!form.process_type?.trim()) return toast.error("Tipo de processo é obrigatório.");
    if (!form.customer_id) return toast.error("Cliente é obrigatório.");
    setSaving(true);
    try {
      const payload: any = {};
      const extras: any = { ...meta };
      const columnMap: Record<string, string> = {
        title: "title", process_type: "process_type", status: "status", priority: "priority",
        due_date: "due_date", notes: "notes", customer_id: "customer_id", vessel_id: "vessel_id",
        responsible_id: "responsible_id", technical_manager_id: "technical_manager_id",
        started_at: "started_at", tags: "tags", branding_mode: "branding_mode",
        branding_logo_url: "branding_logo_url",
      };
      const nullable = new Set(["due_date","vessel_id","responsible_id","technical_manager_id","notes","title","started_at","branding_logo_url"]);
      let extrasChanged = false;
      Object.keys(dirtyFields).forEach((k) => {
        if (columnMap[k]) {
          payload[columnMap[k]] = nullable.has(k) ? ((form as any)[k] || null) : (form as any)[k];
        } else {
          extras[k] = (form as any)[k] || null;
          extrasChanged = true;
        }
      });
      if (extrasChanged) payload.draft_data = extras;
      const { error } = await supabase.from("processes").update(payload).eq("id", process.id);
      if (error) throw error;
      toast.success("Processo atualizado.");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar.");
    } finally { setSaving(false); }
  }, [isDirty, form, dirtyFields, meta, process?.id, onSaved]);

  // Ctrl/Cmd + S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        // Ignore when any nested Dialog / AlertDialog is open (customer, vessel, confirm)
        if (newCustomerOpen || editCustomerOpen || newVesselOpen || editVesselOpen || confirmAction !== null) return;
        e.preventDefault();
        handleSave(e);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, newCustomerOpen, editCustomerOpen, newVesselOpen, editVesselOpen, confirmAction]);


  // -------- Quick Actions
  async function goTo(t: string) {
    onClose?.();
    await navigate({ to: "/processes/$id", params: { id: process.id }, search: { tab: t } as any });
  }
  async function share() {
    try {
      const { data, error } = await supabase.rpc("process_get_share_token", { p_id: process.id });
      if (error) throw error;
      const url = `${window.location.origin}/portal/${data}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link do portal copiado.");
    } catch (e: any) { toast.error(e.message || "Falha ao gerar link."); }
  }
  async function duplicate() {
    const { data, error } = await supabase.rpc("process_duplicate", { p_id: process.id });
    if (error) return toast.error(error.message);
    toast.success("Processo duplicado.");
    onSaved?.();
    onClose?.();
    await navigate({ to: "/processes/$id", params: { id: data as string }, search: { tab: "overview" } as any });
  }
  async function runArchive() {
    const { error } = await supabase.rpc("process_archive", { p_id: process.id });
    if (error) return toast.error(error.message);
    toast.success("Processo arquivado.");
    onSaved?.();
    onClose?.();
  }
  async function runTrash() {
    const { error } = await supabase.rpc("process_trash", { p_id: process.id });
    if (error) return toast.error(error.message);
    toast.success("Processo movido para a lixeira.");
    onSaved?.();
    onClose?.();
  }

  // -------- Checklist (derived)
  const checklist = [
    { label: "Cliente cadastrado", done: !!form.customer_id },
    { label: "Embarcação cadastrada", done: !!form.vessel_id },
    { label: "Documentação recebida", done: (stats.uploads ?? 0) > 0 },
    { label: "OCR realizado", done: (stats.ocr ?? 0) > 0 },
    { label: "PDFs gerados", done: (stats.documents ?? 0) > 0 },
    { label: "Assinaturas enviadas", done: (stats.signatures ?? 0) > 0 },
    { label: "Assinaturas concluídas", done: (process?.missing_signatures_count ?? 1) === 0 && (stats.signatures ?? 0) > 0 },
    { label: "Processo finalizado", done: ["completed","protocolado"].includes(process?.status) },
  ];
  const checklistPct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const statusMeta = STATUSES.find((s) => s.v === form.status) ?? STATUSES[0];
  const priorityMeta = PRIORITIES.find((p) => p.v === form.priority) ?? PRIORITIES[1];
  const dueDays = daysUntil(form.due_date);
  const dueTone = dueDays === null
    ? "bg-slate-100 text-slate-600"
    : dueDays < 0 ? "bg-red-100 text-red-700"
    : dueDays <= 3 ? "bg-orange-100 text-orange-700"
    : dueDays <= 7 ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800";
  const dueLabel = dueDays === null ? "Sem prazo"
    : dueDays < 0 ? `${Math.abs(dueDays)}d atrasado`
    : dueDays === 0 ? "Vence hoje"
    : `${dueDays}d restantes`;

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full">
      {/* ============ RICH HEADER ============ */}
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 sm:px-8 pt-4 pb-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Customer combobox */}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-1">Cliente</div>
            <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full flex items-center justify-between gap-2 px-3 h-11 rounded-xl border border-slate-200 bg-white hover:border-primary/40 transition text-left">
                  <div className="min-w-0 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-navy truncate">
                        {currentCustomer?.name || <span className="text-slate-400 font-medium">Selecionar cliente…</span>}
                      </div>
                      {currentCustomer && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {currentCustomer.cpf_cnpj || "sem CPF/CNPJ"}{currentCustomer.phone ? ` · ${currentCustomer.phone}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
                  <CommandInput placeholder="Nome, CPF/CNPJ, telefone…" />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.cpf_cnpj ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`}
                          onSelect={() => { setForm((f) => ({ ...f, customer_id: c.id, vessel_id: f.customer_id === c.id ? f.vessel_id : "" })); setCustomerPickerOpen(false); }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-navy truncate">{c.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{c.cpf_cnpj || "—"}{c.phone ? ` · ${c.phone}` : ""}</div>
                          </div>
                          {form.customer_id === c.id && <Check className="h-4 w-4 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <div className="border-t p-1">
                      <button type="button" onClick={() => { setCustomerPickerOpen(false); openNewCustomer(); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-50 text-sm text-primary font-semibold">
                        <Plus className="h-4 w-4" /> Novo cliente
                      </button>
                    </div>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Vessel combobox */}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-1">Embarcação</div>
            <Popover open={vesselPickerOpen} onOpenChange={setVesselPickerOpen}>
              <PopoverTrigger asChild>
                <button type="button" disabled={!form.customer_id} className="w-full flex items-center justify-between gap-2 px-3 h-11 rounded-xl border border-slate-200 bg-white hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition text-left">
                  <div className="min-w-0 flex items-center gap-2">
                    <Ship className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-navy truncate">
                        {currentVessel?.name || <span className="text-slate-400 font-medium">{form.customer_id ? "Selecionar embarcação…" : "Selecione um cliente"}</span>}
                      </div>
                      {currentVessel && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {currentVessel.vessel_type || "—"}{currentVessel.registration_number ? ` · ${currentVessel.registration_number}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
                  <CommandInput placeholder="Nome, registro/TIE, tipo…" />
                  <CommandList>
                    <CommandEmpty>Nenhuma embarcação.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="__none__" onSelect={() => { setForm((f) => ({ ...f, vessel_id: "" })); setVesselPickerOpen(false); }}>
                        <span className="italic text-slate-500">Sem embarcação vinculada</span>
                      </CommandItem>
                      {vessels.filter((v) => v.customer_id === form.customer_id).map((v) => (
                        <CommandItem
                          key={v.id}
                          value={`${v.name} ${v.registration_number ?? ""} ${v.vessel_type ?? ""}`}
                          onSelect={() => { setForm((f) => ({ ...f, vessel_id: v.id })); setVesselPickerOpen(false); }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-navy truncate">{v.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{v.vessel_type || "—"}{v.registration_number ? ` · ${v.registration_number}` : ""}</div>
                          </div>
                          {form.vessel_id === v.id && <Check className="h-4 w-4 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <div className="border-t p-1">
                      <button type="button" disabled={!form.customer_id} onClick={() => { setVesselPickerOpen(false); openNewVessel(); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-50 text-sm text-primary font-semibold disabled:opacity-50">
                        <Plus className="h-4 w-4" /> Nova embarcação
                      </button>
                    </div>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Status + chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={statusMeta.tone} onClick={() => setTab("dados")} title="Alterar status">
            <span className="opacity-70">Status:</span> {statusMeta.l}
          </Chip>
          <Chip tone={priorityMeta.tone} onClick={() => setTab("dados")} title="Alterar prioridade">
            <span className="opacity-70">Prio:</span> {priorityMeta.l}
          </Chip>
          <Chip tone={dueTone} onClick={() => setTab("dados")} title="Alterar prazo">
            <Calendar className="h-3 w-3" /> {dueLabel}
          </Chip>
          <Chip tone="bg-primary/10 text-primary" onClick={() => setTab("checklist")} title="Ver checklist">
            <CheckSquare className="h-3 w-3" /> Checklist {checklistPct}%
          </Chip>
          <Chip tone="bg-slate-100 text-slate-700" onClick={() => goTo("generation")} title="Ver documentos gerados">
            <FileText className="h-3 w-3" /> {stats.documents ?? 0} docs
          </Chip>
          <Chip tone="bg-slate-100 text-slate-700" onClick={() => goTo("documents")} title="OCR do processo">
            <Zap className="h-3 w-3" /> {stats.ocr ?? 0} OCR
          </Chip>
          <Chip tone="bg-slate-100 text-slate-700" onClick={() => goTo("signatures")} title="Assinaturas">
            <FileSignature className="h-3 w-3" /> {stats.signatures ?? 0} assinaturas
          </Chip>
          {(stats.pending ?? 0) > 0 && (
            <Chip tone="bg-red-100 text-red-700" onClick={() => goTo("documents")} title="Pendências">
              <AlertTriangle className="h-3 w-3" /> {stats.pending} pendências
            </Chip>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-8 py-2 overflow-x-auto">
          <TabsList className="bg-slate-100/70">
            <TabsTrigger value="dados"><FileText className="h-3.5 w-3.5 mr-1.5" />Dados</TabsTrigger>
            <TabsTrigger value="cliente"><User className="h-3.5 w-3.5 mr-1.5" />Cliente</TabsTrigger>
            <TabsTrigger value="embarcacao"><Ship className="h-3.5 w-3.5 mr-1.5" />Embarcação</TabsTrigger>
            <TabsTrigger value="identidade"><Palette className="h-3.5 w-3.5 mr-1.5" />Identidade</TabsTrigger>
            <TabsTrigger value="checklist"><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Checklist</TabsTrigger>
            <TabsTrigger value="participantes"><Users className="h-3.5 w-3.5 mr-1.5" />Participantes</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Estatísticas</TabsTrigger>
            <TabsTrigger value="acoes"><Zap className="h-3.5 w-3.5 mr-1.5" />Ações</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-5 pb-24">
          {(customerChanged || vesselChanged) && hasGenerated && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <strong className="block text-sm mb-0.5">Impacto nos documentos já gerados</strong>
                Trocar {customerChanged && "o cliente"}{customerChanged && vesselChanged && " e "}{vesselChanged && "a embarcação"} não regenera os PDFs. Após salvar, regenere na aba <em>Geração</em>.
              </div>
            </div>
          )}

          {/* ======================= DADOS ======================= */}
          <TabsContent value="dados" className="space-y-5 m-0">
            <Section icon={FileText} title="Dados do Processo">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Registro inicial — Phoenix Ops" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tipo de Processo *</Label>
                  {processTypes.length > 0 ? (
                    <Select value={form.process_type || undefined} onValueChange={(v) => setForm({ ...form, process_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                      <SelectContent>
                        {processTypes.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.process_type} onChange={(e) => setForm({ ...form, process_type: e.target.value })} required />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Número do Processo</Label>
                  <Input value={form.process_number} onChange={(e) => setForm({ ...form, process_number: e.target.value })} placeholder="Ex.: 2026/00042" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Número do Protocolo</Label>
                  <Input value={process?.protocol_number ?? ""} disabled placeholder="Gerado automaticamente" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Categoria</Label>
                  <Select value={form.category || "__none__"} onValueChange={(v) => setForm({ ...form, category: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Data de Abertura</Label>
                  <Input type="date" value={form.started_at ?? ""} onChange={(e) => setForm({ ...form, started_at: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prazo</Label>
                  <Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 rounded-md">
                      {t}<button type="button" onClick={() => removeTag(t)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {form.tags.length === 0 && <span className="text-xs text-slate-400">Sem tags</span>}
                </div>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Adicionar tag e Enter" />
                  <Button type="button" variant="outline" onClick={addTag} className="rounded-xl">Adicionar</Button>
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Equipe">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: "responsible_id", label: "Responsável" },
                  { key: "technical_manager_id", label: "Responsável Técnico" },
                  { key: "engineer_id", label: "Engenheiro" },
                  { key: "despachante_id", label: "Despachante" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">{f.label}</Label>
                    <Select value={(form as any)[f.key] || "__none__"} onValueChange={(v) => setForm({ ...form, [f.key]: v === "__none__" ? "" : v } as any)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não atribuído</SelectItem>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon={ClipboardList} title="Observações Internas">
              <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas internas, contexto, instruções para a equipe..." />
            </Section>
          </TabsContent>

          {/* ======================= CLIENTE ======================= */}
          <TabsContent value="cliente" className="space-y-5 m-0">
            <Section icon={User} title="Cliente do Processo" action={
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={openNewCustomer}>
                  <Plus className="h-3.5 w-3.5" /> Novo
                </Button>
                {currentCustomer && (
                  <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={openEditCustomer}>
                    <PenLine className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>
            }>
              {currentCustomer ? (
                <div className="grid md:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 text-xs">
                  <div><b>Nome:</b> {currentCustomer.name}</div>
                  <div><b>CPF/CNPJ:</b> {currentCustomer.cpf_cnpj || "—"}</div>
                  <div><b>Telefone:</b> {currentCustomer.phone || "—"}</div>
                  <div><b>Email:</b> {currentCustomer.email || "—"}</div>
                  <div><b>Cidade:</b> {currentCustomer.city || "—"}</div>
                  <div><b>Estado:</b> {currentCustomer.state || "—"}</div>
                  <div className="md:col-span-2 pt-1">
                    <Button type="button" size="sm" variant="link" className="p-0 h-auto gap-1" onClick={() => { onClose?.(); navigate({ to: "/customers" }); }}>
                      <ExternalLink className="h-3 w-3" /> Abrir cadastro completo
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum cliente selecionado. Use o combobox no topo do painel.</p>
              )}
            </Section>
          </TabsContent>

          {/* ======================= EMBARCAÇÃO ======================= */}
          <TabsContent value="embarcacao" className="space-y-5 m-0">
            <Section icon={Ship} title="Embarcação do Processo" action={
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={openNewVessel} disabled={!form.customer_id}>
                  <Plus className="h-3.5 w-3.5" /> Nova
                </Button>
                {currentVessel && (
                  <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={openEditVessel}>
                    <PenLine className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>
            }>
              {currentVessel ? (
                <div className="grid md:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 text-xs">
                  <div><b>Nome:</b> {currentVessel.name}</div>
                  <div><b>Tipo:</b> {currentVessel.vessel_type || "—"}</div>
                  <div><b>Registro:</b> {currentVessel.registration_number || "—"}</div>
                  <div><b>Motor:</b> {currentVessel.engine || "—"}</div>
                  <div className="md:col-span-2"><b>Proprietário:</b> {currentVessel.current_owner_name || currentCustomer?.name || "—"}</div>
                  <div className="md:col-span-2 pt-1">
                    <Button type="button" size="sm" variant="link" className="p-0 h-auto gap-1" onClick={() => { onClose?.(); navigate({ to: "/vessels" }); }}>
                      <ExternalLink className="h-3 w-3" /> Abrir cadastro completo
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhuma embarcação selecionada. Use o combobox no topo do painel.</p>
              )}
            </Section>
          </TabsContent>

          {/* ======================= IDENTIDADE ======================= */}
          <TabsContent value="identidade" className="space-y-5 m-0">
            <Section icon={Palette} title="Identidade Visual do Processo">
              <div className="grid gap-2">
                {BRANDING_MODES.map((m) => (
                  <label key={m.v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form.branding_mode === m.v ? "border-primary bg-primary/5" : "border-slate-200"}`}>
                    <input type="radio" name="branding" checked={form.branding_mode === m.v} onChange={() => setForm({ ...form, branding_mode: m.v })} />
                    <span className="text-sm font-semibold text-navy">{m.l}</span>
                  </label>
                ))}
              </div>

              {form.branding_mode === "process" && (
                <div className="space-y-3">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                  <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Enviar logo exclusivo
                  </Button>
                  {form.branding_logo_url && (
                    <div className="p-4 rounded-xl border bg-white">
                      <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Preview</div>
                      <img src={form.branding_logo_url} alt="Logo" className="max-h-24 object-contain" />
                    </div>
                  )}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* ======================= CHECKLIST ======================= */}
          <TabsContent value="checklist" className="space-y-5 m-0">
            <Section icon={CheckSquare} title={`Checklist do Processo (${checklistPct}%)`}>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary transition-all" style={{ width: `${checklistPct}%` }} />
              </div>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-3 p-3 rounded-xl border ${c.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                    <div className={`h-5 w-5 rounded-md grid place-items-center ${c.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {c.done ? "✓" : "—"}
                    </div>
                    <span className={`text-sm ${c.done ? "text-emerald-900 font-bold" : "text-slate-600"}`}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </TabsContent>

          {/* ======================= PARTICIPANTES ======================= */}
          <TabsContent value="participantes" className="space-y-5 m-0">
            <ProcessParticipantsTab
              processId={process.id}
              companyId={process.company_id}
              processType={process.process_type}
              customerId={form.customer_id}
              secondaryCustomerId={(process as any).secondary_customer_id}
            />
          </TabsContent>


          {/* ======================= STATS ======================= */}
          <TabsContent value="stats" className="space-y-5 m-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={FileText} label="Documentos" value={stats.documents} />
              <StatCard icon={FileSignature} label="Assinaturas" value={stats.signatures} />
              <StatCard icon={Zap} label="OCR" value={stats.ocr} />
              <StatCard icon={AlertTriangle} label="Pendências" value={stats.pending} />
              <StatCard icon={Upload} label="Arquivos" value={stats.uploads} />
              <StatCard icon={FolderArchive} label="Dossiês" value={stats.dossiers} />
            </div>
            <Section icon={BarChart3} title="Progresso Geral">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><b>Conclusão:</b> {process?.completion_percentage ?? 0}%</div>
                <div><b>Compliance:</b> {process?.compliance_score ?? 0}%</div>
                <div><b>SLA:</b> {process?.sla_status || "—"}</div>
                <div><b>Automação:</b> {process?.automation_status || "—"}</div>
              </div>
            </Section>
          </TabsContent>

          {/* ======================= AÇÕES ======================= */}
          <TabsContent value="acoes" className="space-y-3 m-0">
            <Section icon={Zap} title="Ações Rápidas">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("generation")}>
                  <FileText className="h-4 w-4" /> Gerar Documento
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("signatures")}>
                  <FileSignature className="h-4 w-4" /> Abrir Assinaturas
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("history")}>
                  <ClipboardList className="h-4 w-4" /> Abrir Timeline
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("dossier_v2")}>
                  <FolderArchive className="h-4 w-4" /> Abrir Dossiê
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={share}>
                  <Share2 className="h-4 w-4" /> Compartilhar Processo
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={duplicate}>
                  <Copy className="h-4 w-4" /> Duplicar Processo
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => setConfirmAction("archive")}>
                  <Archive className="h-4 w-4" /> Arquivar
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11 text-red-600 hover:text-red-700 hover:border-red-300" onClick={() => setConfirmAction("trash")}>
                  <Trash2 className="h-4 w-4" /> Mover para Lixeira
                </Button>
              </div>
            </Section>
          </TabsContent>
        </div>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur px-5 sm:px-8 py-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500 font-medium truncate">
          {isDirty
            ? <span className="text-amber-600 font-bold">Alterações não salvas · <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px]">S</kbd> para salvar</span>
            : "Nenhuma alteração"}
        </div>
        <div className="flex gap-2 shrink-0">
          {onCancel && (
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving || !isDirty} className="h-11 rounded-xl gap-2 bg-primary text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </div>

      {/* ============ Confirm AlertDialog ============ */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "archive" ? "Arquivar processo?" : "Mover para a lixeira?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "archive"
                ? "O processo sairá da grade ativa, mas continuará acessível em Arquivados. Você pode restaurar a qualquer momento."
                : "O processo será movido para a lixeira e poderá ser restaurado por 30 dias antes da exclusão definitiva."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction === "trash" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              onClick={async () => {
                const a = confirmAction; setConfirmAction(null);
                if (a === "archive") await runArchive();
                if (a === "trash") await runTrash();
              }}
            >
              {confirmAction === "archive" ? "Arquivar" : "Mover para Lixeira"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ Customer Dialogs ============ */}
      {[
        { open: newCustomerOpen, setOpen: setNewCustomerOpen, mode: "new" as const, title: "Novo Cliente" },
        { open: editCustomerOpen, setOpen: setEditCustomerOpen, mode: "edit" as const, title: "Editar Cliente" },
      ].map((d) => (
        <Dialog key={d.title} open={d.open} onOpenChange={d.setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{d.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome *</Label>
                <Input value={customerDraft.name || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>CPF / CNPJ</Label>
                  <Input value={customerDraft.cpf_cnpj || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, cpf_cnpj: maskCpfCnpj(e.target.value) })} placeholder="000.000.000-00" /></div>
                <div className="space-y-1.5"><Label>Telefone</Label>
                  <Input value={customerDraft.phone || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
              </div>
              <div className="space-y-1.5"><Label>E-mail</Label>
                <Input type="email" value={customerDraft.email || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, email: e.target.value })} /></div>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1.5"><Label>Cidade</Label>
                  <Input value={customerDraft.city || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>UF</Label>
                  <Select value={customerDraft.state || "__none__"} onValueChange={(v) => setCustomerDraft({ ...customerDraft, state: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {BR_UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => d.setOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveCustomer(d.mode)} disabled={!customerDraft.name?.trim()}>
                {d.mode === "new" ? "Criar e vincular" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* ============ Vessel Dialogs ============ */}
      {[
        { open: newVesselOpen, setOpen: setNewVesselOpen, mode: "new" as const, title: "Nova Embarcação" },
        { open: editVesselOpen, setOpen: setEditVesselOpen, mode: "edit" as const, title: "Editar Embarcação" },
      ].map((d) => (
        <Dialog key={d.title} open={d.open} onOpenChange={d.setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{d.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome *</Label>
                <Input value={vesselDraft.name || ""} onChange={(e) => setVesselDraft({ ...vesselDraft, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Registro / TIE</Label>
                  <Input value={vesselDraft.registration_number || ""} onChange={(e) => setVesselDraft({ ...vesselDraft, registration_number: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Input value={vesselDraft.vessel_type || ""} onChange={(e) => setVesselDraft({ ...vesselDraft, vessel_type: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Motor</Label>
                <Input value={vesselDraft.engine || ""} onChange={(e) => setVesselDraft({ ...vesselDraft, engine: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Proprietário</Label>
                <Input value={vesselDraft.current_owner_name || ""} onChange={(e) => setVesselDraft({ ...vesselDraft, current_owner_name: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => d.setOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveVessel(d.mode)} disabled={!vesselDraft.name?.trim()}>
                {d.mode === "new" ? "Criar e vincular" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </form>
  );
}
