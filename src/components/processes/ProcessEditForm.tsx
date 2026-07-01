import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Save, Plus, X, AlertTriangle, User, Ship, FileText, Calendar,
  ClipboardList, Palette, CheckSquare, BarChart3, Zap, ExternalLink, Copy,
  Archive, Trash2, PenLine, FileSignature, FolderArchive, Share2, Upload,
} from "lucide-react";

interface Props {
  process: any;
  onSaved?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const STATUSES = [
  { v: "pending", l: "Novo" },
  { v: "in_progress", l: "Em andamento" },
  { v: "waiting_docs", l: "Aguardando documentos" },
  { v: "review", l: "Em revisão" },
  { v: "ready_to_generate", l: "Pronto para geração" },
  { v: "waiting_signature", l: "Aguardando assinatura" },
  { v: "protocolado", l: "Protocolado" },
  { v: "completed", l: "Finalizado" },
  { v: "cancelled", l: "Cancelado" },
];
const PRIORITIES = [
  { v: "low", l: "Baixa" }, { v: "medium", l: "Média" }, { v: "high", l: "Alta" },
  { v: "urgent", l: "Urgente" }, { v: "critical", l: "Crítica" },
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
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-black text-navy uppercase tracking-tight">{title}</h3>
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

export function ProcessEditForm({ process, onSaved, onCancel, onClose }: Props) {
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

  const [form, setForm] = useState(initial);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [newVesselOpen, setNewVesselOpen] = useState(false);
  const [editVesselOpen, setEditVesselOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<any>({});
  const [vesselDraft, setVesselDraft] = useState<any>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(initial); }, [initial]);

  async function reload() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return;
    setCompanyId(profile.company_id);
    const [c, v, p] = await Promise.all([
      supabase.from("customers").select("id,name,cpf_cnpj,email,phone,city,state").eq("company_id", profile.company_id).order("name"),
      supabase.from("vessels").select("id,name,customer_id,vessel_type,registration_number,engine,current_owner_name").eq("company_id", profile.company_id).order("name"),
      supabase.from("profiles").select("id,name,email").eq("company_id", profile.company_id).order("name"),
    ]);
    setCustomers(c.data || []);
    setVessels(v.data || []);
    setUsers(p.data || []);
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

  const filteredCustomers = customers.filter((c) =>
    !customerFilter.trim() || `${c.name} ${c.cpf_cnpj ?? ""}`.toLowerCase().includes(customerFilter.toLowerCase())
  );
  const filteredVessels = vessels
    .filter((v) => !form.customer_id || v.customer_id === form.customer_id || v.id === form.vessel_id)
    .filter((v) => !vesselFilter.trim() || `${v.name} ${v.registration_number ?? ""}`.toLowerCase().includes(vesselFilter.toLowerCase()));

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
    if (mode === "new") {
      const { data, error } = await supabase.from("customers").insert({
        company_id: companyId,
        name: customerDraft.name.trim(),
        cpf_cnpj: customerDraft.cpf_cnpj || null,
        email: customerDraft.email || null,
        phone: customerDraft.phone || null,
        city: customerDraft.city || null,
        state: customerDraft.state || null,
      }).select().single();
      if (error) return toast.error(error.message);
      toast.success("Cliente criado.");
      await reload();
      setForm((f) => ({ ...f, customer_id: data!.id }));
      setNewCustomerOpen(false);
    } else {
      const { error } = await supabase.from("customers").update({
        name: customerDraft.name, cpf_cnpj: customerDraft.cpf_cnpj || null,
        email: customerDraft.email || null, phone: customerDraft.phone || null,
        city: customerDraft.city || null, state: customerDraft.state || null,
      }).eq("id", customerDraft.id);
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
    if (mode === "new") {
      const { data, error } = await supabase.from("vessels").insert({
        company_id: companyId,
        customer_id: form.customer_id,
        name: vesselDraft.name.trim(),
        registration_number: vesselDraft.registration_number || null,
        vessel_type: vesselDraft.vessel_type || null,
        engine: vesselDraft.engine || null,
        current_owner_name: vesselDraft.current_owner_name || null,
      }).select().single();
      if (error) return toast.error(error.message);
      toast.success("Embarcação criada.");
      await reload();
      setForm((f) => ({ ...f, vessel_id: data!.id }));
      setNewVesselOpen(false);
    } else {
      const { error } = await supabase.from("vessels").update({
        name: vesselDraft.name,
        registration_number: vesselDraft.registration_number || null,
        vessel_type: vesselDraft.vessel_type || null,
        engine: vesselDraft.engine || null,
        current_owner_name: vesselDraft.current_owner_name || null,
      }).eq("id", vesselDraft.id);
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
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!isDirty) return toast.info("Nada para salvar.");
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
          extras[k === "process_number" ? "process_number" : k] = (form as any)[k] || null;
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
  }

  // -------- Quick Actions
  async function goTo(tab: string) {
    onClose?.();
    await navigate({ to: "/processes/$id", params: { id: process.id }, search: { tab } as any });
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
    onClose?.();
    await navigate({ to: "/processes/$id", params: { id: data as string }, search: { tab: "overview" } as any });
  }
  async function archive() {
    if (!confirm("Arquivar este processo?")) return;
    const { error } = await supabase.rpc("process_archive", { p_id: process.id });
    if (error) return toast.error(error.message);
    toast.success("Processo arquivado.");
    onClose?.();
  }
  async function trash() {
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase.rpc("process_trash", { p_id: process.id });
    if (error) return toast.error(error.message);
    toast.success("Processo movido para a lixeira.");
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

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full">
      <Tabs defaultValue="dados" className="flex-1 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-5 sm:px-8 py-2 overflow-x-auto">
          <TabsList className="bg-slate-100/70">
            <TabsTrigger value="dados"><FileText className="h-3.5 w-3.5 mr-1.5" />Dados</TabsTrigger>
            <TabsTrigger value="cliente"><User className="h-3.5 w-3.5 mr-1.5" />Cliente</TabsTrigger>
            <TabsTrigger value="embarcacao"><Ship className="h-3.5 w-3.5 mr-1.5" />Embarcação</TabsTrigger>
            <TabsTrigger value="identidade"><Palette className="h-3.5 w-3.5 mr-1.5" />Identidade</TabsTrigger>
            <TabsTrigger value="checklist"><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Checklist</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Estatísticas</TabsTrigger>
            <TabsTrigger value="acoes"><Zap className="h-3.5 w-3.5 mr-1.5" />Ações</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-5">
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
                  <Input value={form.process_type} onChange={(e) => setForm({ ...form, process_type: e.target.value })} required />
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

            <Section icon={User} title="Equipe & Responsáveis">
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
              <div className="space-y-3">
                <Input placeholder="Buscar cliente por nome ou CPF/CNPJ..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
                <div className="max-h-56 overflow-y-auto border rounded-xl divide-y">
                  {filteredCustomers.length === 0 && <div className="p-4 text-xs text-slate-400 text-center">Nenhum cliente encontrado.</div>}
                  {filteredCustomers.slice(0, 30).map((c) => (
                    <button key={c.id} type="button" onClick={() => setForm({ ...form, customer_id: c.id, vessel_id: "" })}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${form.customer_id === c.id ? "bg-primary/5" : ""}`}>
                      <div>
                        <div className="text-sm font-bold text-navy">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.cpf_cnpj || "sem CPF/CNPJ"} {c.city ? `· ${c.city}${c.state ? "/" + c.state : ""}` : ""}</div>
                      </div>
                      {form.customer_id === c.id && <Badge className="bg-primary text-white">Selecionado</Badge>}
                    </button>
                  ))}
                </div>
                {currentCustomer && (
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
                )}
              </div>
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
              {!form.customer_id ? (
                <p className="text-xs text-slate-400">Selecione um cliente para escolher a embarcação.</p>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="Buscar embarcação..." value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)} />
                  <div className="max-h-56 overflow-y-auto border rounded-xl divide-y">
                    <button type="button" onClick={() => setForm({ ...form, vessel_id: "" })}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-xs italic ${!form.vessel_id ? "bg-primary/5" : ""}`}>
                      Sem embarcação vinculada
                    </button>
                    {filteredVessels.map((v) => (
                      <button key={v.id} type="button" onClick={() => setForm({ ...form, vessel_id: v.id })}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${form.vessel_id === v.id ? "bg-primary/5" : ""}`}>
                        <div>
                          <div className="text-sm font-bold text-navy">{v.name}</div>
                          <div className="text-[11px] text-slate-500">{v.vessel_type || "—"} {v.registration_number ? `· ${v.registration_number}` : ""}</div>
                        </div>
                        {form.vessel_id === v.id && <Badge className="bg-primary text-white">Selecionada</Badge>}
                      </button>
                    ))}
                  </div>
                  {currentVessel && (
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
                  )}
                </div>
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
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("timeline")}>
                  <ClipboardList className="h-4 w-4" /> Abrir Timeline
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={() => goTo("dossier")}>
                  <FolderArchive className="h-4 w-4" /> Abrir Dossiê
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={share}>
                  <Share2 className="h-4 w-4" /> Compartilhar Processo
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={duplicate}>
                  <Copy className="h-4 w-4" /> Duplicar Processo
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={archive}>
                  <Archive className="h-4 w-4" /> Arquivar
                </Button>
                <Button type="button" variant="outline" className="rounded-xl justify-start gap-2 h-11 text-red-600 hover:text-red-700 hover:border-red-300" onClick={trash}>
                  <Trash2 className="h-4 w-4" /> Mover para Lixeira
                </Button>
              </div>
            </Section>
          </TabsContent>
        </div>
      </Tabs>

      {/* Sticky save bar */}
      <div className="border-t border-slate-100 bg-white/95 backdrop-blur px-5 sm:px-8 py-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500 font-medium">
          {isDirty ? <span className="text-amber-600 font-bold">Alterações não salvas</span> : "Nenhuma alteração"}
        </div>
        <div className="flex gap-2">
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
                  <Input value={customerDraft.cpf_cnpj || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, cpf_cnpj: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Telefone</Label>
                  <Input value={customerDraft.phone || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>E-mail</Label>
                <Input type="email" value={customerDraft.email || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Cidade</Label>
                  <Input value={customerDraft.city || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Estado</Label>
                  <Input maxLength={2} value={customerDraft.state || ""} onChange={(e) => setCustomerDraft({ ...customerDraft, state: e.target.value.toUpperCase() })} /></div>
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
