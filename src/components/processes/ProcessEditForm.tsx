import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Plus, X, AlertTriangle, User, Ship, FileText, Calendar, ClipboardList } from "lucide-react";

interface Props {
  process: any;
  onSaved?: () => void;
  onCancel?: () => void;
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

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <header className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black text-navy uppercase tracking-tight">{title}</h3>
      </header>
      {children}
    </section>
  );
}

export function ProcessEditForm({ process, onSaved, onCancel }: Props) {
  const initial = useMemo(() => ({
    title: process?.title ?? "",
    process_type: process?.process_type ?? "",
    status: process?.status ?? "pending",
    priority: process?.priority ?? "medium",
    due_date: process?.due_date ?? "",
    notes: process?.notes ?? "",
    customer_id: process?.customer_id ?? "",
    vessel_id: process?.vessel_id ?? "",
    responsible_id: process?.responsible_id ?? "",
    technical_manager_id: process?.technical_manager_id ?? "",
    tags: (process?.tags ?? []) as string[],
  }), [process]);

  const [form, setForm] = useState(initial);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newVesselOpen, setNewVesselOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", cpf_cnpj: "", email: "", phone: "" });
  const [newVessel, setNewVessel] = useState({ name: "", registration_number: "", vessel_type: "" });

  useEffect(() => { setForm(initial); }, [initial]);

  async function reload() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return;
    setCompanyId(profile.company_id);
    const [c, v, p] = await Promise.all([
      supabase.from("customers").select("id,name,cpf_cnpj").eq("company_id", profile.company_id).order("name"),
      supabase.from("vessels").select("id,name,customer_id").eq("company_id", profile.company_id).order("name"),
      supabase.from("profiles").select("id,name,email").eq("company_id", profile.company_id).order("name"),
    ]);
    setCustomers(c.data || []);
    setVessels(v.data || []);
    setUsers(p.data || []);
  }
  useEffect(() => { reload(); }, []);

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
    if (!t) return;
    if (form.tags.includes(t)) { setTagInput(""); return; }
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  }
  function removeTag(t: string) { setForm({ ...form, tags: form.tags.filter((x) => x !== t) }); }

  async function createCustomer() {
    if (!newCustomer.name.trim() || !companyId) return;
    const { data, error } = await supabase.from("customers").insert({
      company_id: companyId,
      name: newCustomer.name.trim(),
      cpf_cnpj: newCustomer.cpf_cnpj || null,
      email: newCustomer.email || null,
      phone: newCustomer.phone || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente criado.");
    await reload();
    setForm((f) => ({ ...f, customer_id: data!.id }));
    setNewCustomer({ name: "", cpf_cnpj: "", email: "", phone: "" });
    setNewCustomerOpen(false);
  }

  async function createVessel() {
    if (!newVessel.name.trim() || !companyId || !form.customer_id) {
      toast.error("Selecione um cliente antes de criar a embarcação.");
      return;
    }
    const { data, error } = await supabase.from("vessels").insert({
      company_id: companyId,
      customer_id: form.customer_id,
      name: newVessel.name.trim(),
      registration_number: newVessel.registration_number || null,
      vessel_type: newVessel.vessel_type || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Embarcação criada.");
    await reload();
    setForm((f) => ({ ...f, vessel_id: data!.id }));
    setNewVessel({ name: "", registration_number: "", vessel_type: "" });
    setNewVesselOpen(false);
  }

  const filteredVessels = vessels.filter((v) => !form.customer_id || v.customer_id === form.customer_id || v.id === form.vessel_id);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) { toast.info("Nada para salvar."); return; }
    if (!form.process_type?.trim()) { toast.error("Tipo de processo é obrigatório."); return; }
    if (!form.customer_id) { toast.error("Cliente é obrigatório."); return; }
    setSaving(true);
    try {
      const payload: any = { ...dirtyFields };
      if ("due_date" in payload) payload.due_date = payload.due_date || null;
      if ("vessel_id" in payload) payload.vessel_id = payload.vessel_id || null;
      if ("responsible_id" in payload) payload.responsible_id = payload.responsible_id || null;
      if ("technical_manager_id" in payload) payload.technical_manager_id = payload.technical_manager_id || null;
      if ("notes" in payload) payload.notes = payload.notes || null;
      if ("title" in payload) payload.title = payload.title || null;
      const { error } = await supabase.from("processes").update(payload).eq("id", process.id);
      if (error) throw error;
      toast.success("Processo atualizado.");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {(customerChanged || vesselChanged) && hasGenerated && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-sm mb-0.5">Atenção — impacto nos documentos</strong>
            Alterar {customerChanged && "o cliente"}{customerChanged && vesselChanged && " e "}{vesselChanged && "a embarcação"} não atualiza
            automaticamente os PDFs já gerados deste processo. Após salvar, regenere os documentos na aba <em>Geração</em> para refletir os novos dados.
          </div>
        </div>
      )}

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
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 rounded-md">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
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

      <Section icon={User} title="Cliente">
        <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Cliente vinculado *</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v, vessel_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.cpf_cnpj ? ` — ${c.cpf_cnpj}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" className="rounded-xl gap-1.5" onClick={() => setNewCustomerOpen(true)}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </Section>

      <Section icon={Ship} title="Embarcação">
        <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Embarcação vinculada</Label>
            <Select value={form.vessel_id || "__none__"} onValueChange={(v) => setForm({ ...form, vessel_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Sem embarcação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem embarcação</SelectItem>
                {filteredVessels.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" className="rounded-xl gap-1.5" onClick={() => setNewVesselOpen(true)} disabled={!form.customer_id}>
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>
        {!form.customer_id && <p className="text-[11px] text-slate-400">Selecione um cliente para criar/listar embarcações.</p>}
      </Section>

      <Section icon={Calendar} title="Prazos, Prioridade & Responsáveis">
        <div className="grid md:grid-cols-2 gap-4">
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
            <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prazo</Label>
            <Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Responsável</Label>
            <Select value={form.responsible_id || "__none__"} onValueChange={(v) => setForm({ ...form, responsible_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Responsável Técnico</Label>
            <Select value={form.technical_manager_id || "__none__"} onValueChange={(v) => setForm({ ...form, technical_manager_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável técnico</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section icon={ClipboardList} title="Observações Internas">
        <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas internas, contexto, instruções para a equipe..." />
      </Section>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 -mx-4 md:-mx-0 px-4 md:px-6 py-3 rounded-b-2xl flex items-center justify-between gap-3">
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

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={newCustomer.cpf_cnpj} onChange={(e) => setNewCustomer({ ...newCustomer, cpf_cnpj: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)}>Cancelar</Button>
            <Button onClick={createCustomer} disabled={!newCustomer.name.trim()}>Criar e vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newVesselOpen} onOpenChange={setNewVesselOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Embarcação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={newVessel.name} onChange={(e) => setNewVessel({ ...newVessel, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inscrição / TIE</Label>
                <Input value={newVessel.registration_number} onChange={(e) => setNewVessel({ ...newVessel, registration_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Input value={newVessel.vessel_type} onChange={(e) => setNewVessel({ ...newVessel, vessel_type: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVesselOpen(false)}>Cancelar</Button>
            <Button onClick={createVessel} disabled={!newVessel.name.trim()}>Criar e vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
