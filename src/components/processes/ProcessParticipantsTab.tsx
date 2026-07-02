import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ExternalLink, Users, AlertTriangle, RefreshCw } from "lucide-react";
import {
  listParticipants, addParticipant, removeParticipant,
  ROLE_LABEL, type ParticipantRole, type ProcessParticipant,
} from "@/services/processes/participants";
import { maskCpfCnpj, maskPhone } from "@/lib/br-format";

const ROLES: ParticipantRole[] = [
  "owner", "buyer", "seller", "attorney", "grantor",
  "representative", "engineer", "technician", "witness", "applicant",
];

const SINGLE_ROLES: ParticipantRole[] = ["owner", "buyer", "seller"]; // only one per process

// Roles obrigatórios por tipo de processo (nome exibido em process_types.name)
const REQUIRED_ROLES_BY_TYPE: Record<string, ParticipantRole[]> = {
  "Transferência de Propriedade": ["buyer", "seller"],
  "Inscrição de Embarcação": ["owner"],
  "Renovação de TIE": ["owner"],
  "Segunda Via de TIE": ["owner"],
  "Cancelamento de Inscrição": ["owner"],
  "Alteração de Características": ["owner"],
  "Regularização Documental": ["owner"],
  "BSADE Avulso": ["owner"],
};

interface Props {
  processId: string;
  companyId: string;
  processType?: string | null;
  customerId?: string | null;
  secondaryCustomerId?: string | null;
  onSyncProcess?: (patch: { customer_id?: string | null; secondary_customer_id?: string | null }) => void;
}

export function ProcessParticipantsTab({
  processId, companyId, processType,
  customerId, secondaryCustomerId, onSyncProcess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ProcessParticipant[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listParticipants(processId);
      setParticipants(rows);
    } catch (e: any) {
      toast.error("Falha ao carregar participantes: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const g: Record<string, ProcessParticipant[]> = {};
    for (const p of participants) (g[p.role] ||= []).push(p);
    return g;
  }, [participants]);

  const requiredRoles = REQUIRED_ROLES_BY_TYPE[processType || ""] || [];
  const missingRoles = requiredRoles.filter((r) => !grouped[r]?.length);

  async function syncProcessColumns(role: ParticipantRole, customer_id: string | null) {
    if (role === "owner") {
      await supabase.from("processes").update({ customer_id }).eq("id", processId);
      onSyncProcess?.({ customer_id });
    } else if (role === "seller") {
      await supabase.from("processes").update({ secondary_customer_id: customer_id } as any).eq("id", processId);
      onSyncProcess?.({ secondary_customer_id: customer_id });
    }
  }

  async function handleAdd(customer_id: string, role: ParticipantRole) {
    // Bloqueia duplicidade em papéis únicos
    if (SINGLE_ROLES.includes(role) && grouped[role]?.length) {
      toast.error(`Já existe um ${ROLE_LABEL[role]} neste processo. Remova antes de adicionar outro.`);
      return;
    }
    // Impede o mesmo cliente no mesmo papel
    if (grouped[role]?.some((p) => p.customer_id === customer_id)) {
      toast.error("Este cliente já está neste papel.");
      return;
    }
    try {
      await addParticipant(processId, customer_id, role);
      await syncProcessColumns(role, customer_id);
      toast.success(`${ROLE_LABEL[role]} adicionado.`);
      setAddOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Falha ao adicionar: " + (e?.message || e));
    }
  }

  async function handleRemove(p: ProcessParticipant) {
    if (!confirm(`Remover ${p.name} do papel "${ROLE_LABEL[p.role]}"?`)) return;
    try {
      await removeParticipant(p.id);
      if (p.role === "owner" && customerId === p.customer_id) await syncProcessColumns("owner", null);
      if (p.role === "seller" && secondaryCustomerId === p.customer_id) await syncProcessColumns("seller", null);
      toast.success("Participante removido.");
      await load();
    } catch (e: any) {
      toast.error("Falha ao remover: " + (e?.message || e));
    }
  }

  async function handleChangeRole(p: ProcessParticipant, newRole: ParticipantRole) {
    if (newRole === p.role) return;
    if (SINGLE_ROLES.includes(newRole) && grouped[newRole]?.length) {
      toast.error(`Já existe um ${ROLE_LABEL[newRole]}.`);
      return;
    }
    try {
      await removeParticipant(p.id);
      await addParticipant(processId, p.customer_id, newRole);
      if (p.role === "owner") await syncProcessColumns("owner", null);
      if (p.role === "seller") await syncProcessColumns("seller", null);
      await syncProcessColumns(newRole, p.customer_id);
      toast.success("Papel alterado.");
      await load();
    } catch (e: any) {
      toast.error("Falha ao alterar papel: " + (e?.message || e));
    }
  }

  if (loading) {
    return <div className="py-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-navy">Participantes do Processo</h3>
          <Badge variant="secondary" className="text-[10px]">{participants.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Adicionar</Button>
        </div>
      </div>

      {missingRoles.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-xs">
            <strong className="block text-sm mb-1">Participantes obrigatórios ausentes</strong>
            {processType} exige:{" "}
            <span className="font-bold">{missingRoles.map((r) => ROLE_LABEL[r]).join(", ")}</span>.
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
          <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">Nenhum participante cadastrado.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Adicionar participante</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {ROLES.filter((r) => grouped[r]?.length).map((role) => (
            <div key={role} className="space-y-2">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                {ROLE_LABEL[role]} {grouped[role].length > 1 && `(${grouped[role].length})`}
              </div>
              {grouped[role].map((p) => (
                <ParticipantCard
                  key={p.id} p={p}
                  onRemove={() => handleRemove(p)}
                  onChangeRole={(nr) => handleChangeRole(p, nr)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddParticipantDialog
          open={addOpen} onOpenChange={setAddOpen}
          companyId={companyId} onAdd={handleAdd}
          disabledRoles={SINGLE_ROLES.filter((r) => grouped[r]?.length)}
        />
      )}
    </div>
  );
}

function ParticipantCard({
  p, onRemove, onChangeRole,
}: {
  p: ProcessParticipant;
  onRemove: () => void;
  onChangeRole: (r: ParticipantRole) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary/30 transition">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center font-black text-sm shrink-0">
        {p.name?.[0]?.toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-navy truncate">{p.name}</div>
        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
          {p.cpf_cnpj && <span>{maskCpfCnpj(p.cpf_cnpj)}</span>}
          {p.phone && <span>{maskPhone(p.phone)}</span>}
          {p.email && <span className="truncate">{p.email}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Select value={p.role} onValueChange={(v) => onChangeRole(v as ParticipantRole)}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" asChild title="Abrir cadastro">
          <a href={`/customers?id=${p.customer_id}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button size="icon" variant="ghost" onClick={onRemove} title="Remover">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function AddParticipantDialog({
  open, onOpenChange, companyId, onAdd, disabledRoles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  onAdd: (customer_id: string, role: ParticipantRole) => void;
  disabledRoles: ParticipantRole[];
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [role, setRole] = useState<ParticipantRole>("attorney");
  const [customerId, setCustomerId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  // novo cliente
  const [nName, setNName] = useState("");
  const [nDoc, setNDoc] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("customers")
        .select("id,name,cpf_cnpj,email,phone").eq("company_id", companyId)
        .order("name").limit(200);
      setCustomers(data || []);
    })();
  }, [companyId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  async function submit() {
    setSaving(true);
    try {
      let finalId = customerId;
      if (mode === "new") {
        if (!nName.trim()) { toast.error("Nome obrigatório."); setSaving(false); return; }
        const { data, error } = await supabase.from("customers").insert({
          company_id: companyId, name: nName.trim(),
          cpf_cnpj: nDoc.replace(/\D/g, "") || null,
          phone: nPhone.replace(/\D/g, "") || null,
          email: nEmail.trim() || null,
        } as any).select("id").single();
        if (error) throw error;
        finalId = data.id;
      }
      if (!finalId) { toast.error("Selecione ou crie um cliente."); setSaving(false); return; }
      onAdd(finalId, role);
    } catch (e: any) {
      toast.error("Falha: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter((c) =>
    !query || c.name?.toLowerCase().includes(query.toLowerCase()) || c.cpf_cnpj?.includes(query),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adicionar participante</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>Existente</Button>
            <Button variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>Novo cliente</Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ParticipantRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} disabled={disabledRoles.includes(r)}>
                    {ROLE_LABEL[r]}{disabledRoles.includes(r) ? " (já existe)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "existing" ? (
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Cliente</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedCustomer ? selectedCustomer.name : "Selecionar cliente..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar por nome ou CPF..." value={query} onValueChange={setQuery} />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente.</CommandEmpty>
                      <CommandGroup>
                        {filtered.slice(0, 50).map((c) => (
                          <CommandItem key={c.id} value={c.id}
                            onSelect={() => { setCustomerId(c.id); setPickerOpen(false); }}>
                            <div className="flex flex-col">
                              <span className="font-medium">{c.name}</span>
                              {c.cpf_cnpj && <span className="text-[11px] text-slate-500">{maskCpfCnpj(c.cpf_cnpj)}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Nome *" value={nName} onChange={(e) => setNName(e.target.value)} />
              <Input placeholder="CPF/CNPJ" value={nDoc} onChange={(e) => setNDoc(maskCpfCnpj(e.target.value))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Telefone" value={nPhone} onChange={(e) => setNPhone(maskPhone(e.target.value))} />
                <Input placeholder="E-mail" value={nEmail} onChange={(e) => setNEmail(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} loading={saving}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
