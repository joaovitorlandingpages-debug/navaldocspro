import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Search, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signaturesService, type ParticipantRole } from "@/services/signatures";
import { useAuth } from "@/hooks/useAuth";
import { casUpdate } from "@/lib/optimisticLock";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
  processId?: string;
  documentId?: string;
  defaultTitle?: string;
  defaultCustomerId?: string;
}

type Participant = {
  name: string; email: string; phone: string; role: ParticipantRole; signing_order?: number;
};

export function SignatureRequestDialog({
  open, onOpenChange, onCreated, processId, documentId, defaultTitle, defaultCustomerId,
}: Props) {
  const { profile, user } = useAuth();
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [order, setOrder] = useState<"free" | "sequential">("sequential");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([
    { name: "", email: "", phone: "", role: "cliente" },
  ]);
  const [saving, setSaving] = useState(false);

  // Customer search/create
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "", cpf_cnpj: "", email: "", phone: "", address: "",
  });

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle ?? "");
      setParticipants([{ name: "", email: "", phone: "", role: "cliente" }]);
      setSelectedCustomer(null);
      setCreatingNew(false);
      setCustomerQuery("");
      if (defaultCustomerId) loadDefaultCustomer(defaultCustomerId);
    }
  }, [open, defaultTitle, defaultCustomerId]);

  const loadDefaultCustomer = async (id: string) => {
    const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    if (data) selectCustomer(data);
  };

  useEffect(() => {
    if (!profile?.company_id || customerQuery.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const q = customerQuery.trim();
      const { data } = await supabase
        .from("customers")
        .select("id,name,cpf_cnpj,email,phone,address")
        .eq("company_id", profile.company_id)
        .or(`name.ilike.%${q}%,cpf_cnpj.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(8);
      setCustomerResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery, profile?.company_id]);

  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setCustomerResults([]);
    setCustomerQuery("");
    // Fill first participant of role 'cliente' with this customer data
    setParticipants((prev) => {
      const next = [...prev];
      const idx = next.findIndex((p) => p.role === "cliente");
      const filled: Participant = {
        name: c.name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        role: "cliente",
      };
      if (idx >= 0) next[idx] = filled; else next.unshift(filled);
      return next;
    });
  };

  const createCustomer = async () => {
    if (!profile?.company_id) return;
    if (!newCustomer.name.trim()) return toast.error("Informe o nome do cliente");
    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: profile.company_id,
        name: newCustomer.name.trim(),
        cpf_cnpj: newCustomer.cpf_cnpj || null,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado e vinculado");
    selectCustomer(data);
    setCreatingNew(false);
    setNewCustomer({ name: "", cpf_cnpj: "", email: "", phone: "", address: "" });
    // Optionally link to process
    if (processId) {
      await supabase.from("processes").update({ customer_id: data.id }).eq("id", processId);
    }
  };

  const updateParticipant = (i: number, patch: Partial<Participant>) => {
    setParticipants((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  };

  const addParticipant = (role: ParticipantRole = "outro") => {
    setParticipants((prev) => [...prev, { name: "", email: "", phone: "", role }]);
  };

  const removeParticipant = (i: number) => {
    setParticipants((prev) => prev.filter((_, j) => j !== i));
  };

  const save = async () => {
    if (!profile?.company_id) return toast.error("Empresa não identificada");
    if (!title.trim()) return toast.error("Informe o título");
    const valid = participants
      .filter((p) => p.name.trim())
      .map((p, idx) => ({ ...p, signing_order: idx }));
    if (valid.length === 0) return toast.error("Adicione pelo menos um participante");
    setSaving(true);
    try {
      await signaturesService.create({
        company_id: profile.company_id,
        title: title.trim(),
        process_id: processId,
        document_id: documentId,
        signing_order: order,
        expires_at: expiresAt || undefined,
        participants: valid,
        created_by: user?.id,
      });
      toast.success("Solicitação criada — links gerados");
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao criar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Solicitar assinatura
            {processId && <Badge variant="secondary" className="ml-2 text-[10px]">Vinculada ao processo</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label>Título do documento</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Contrato de Serviço Naval" />
          </div>

          {/* Customer */}
          <Card className="p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Cliente</Label>
              {!creatingNew && (
                <Button size="sm" variant="ghost" onClick={() => setCreatingNew(true)} className="gap-1 h-7">
                  <UserPlus className="w-3 h-3" /> Novo cliente
                </Button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-white border">
                <div className="text-sm">
                  <p className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {selectedCustomer.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedCustomer.cpf_cnpj ?? "—"} • {selectedCustomer.email ?? "—"} • {selectedCustomer.phone ?? "—"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : creatingNew ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome*" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  <Input placeholder="CPF/CNPJ" value={newCustomer.cpf_cnpj} onChange={(e) => setNewCustomer({ ...newCustomer, cpf_cnpj: e.target.value })} />
                  <Input placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                  <Input placeholder="Telefone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                </div>
                <Input placeholder="Endereço" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createCustomer}>Cadastrar e usar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCreatingNew(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input placeholder="Buscar por nome, CPF/CNPJ, email ou telefone..." value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
                </div>
                {customerResults.length > 0 && (
                  <div className="mt-2 border rounded-lg bg-white max-h-56 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left p-2 hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.cpf_cnpj ?? "—"} • {c.email ?? c.phone ?? "—"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ordem</Label>
              <Select value={order} onValueChange={(v: any) => setOrder(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequencial</SelectItem>
                  <SelectItem value="free">Livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expira em</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Participantes ({participants.length})</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => addParticipant("engenheiro")} className="h-7 text-xs">+ Engenheiro</Button>
                <Button size="sm" variant="ghost" onClick={() => addParticipant("despachante")} className="h-7 text-xs">+ Despachante</Button>
                <Button size="sm" variant="ghost" onClick={() => addParticipant("testemunha")} className="h-7 text-xs">+ Testemunha</Button>
              </div>
            </div>
            {participants.map((p, i) => (
              <Card key={i} className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome" value={p.name} onChange={(e) => updateParticipant(i, { name: e.target.value })} />
                  <Select value={p.role} onValueChange={(v: any) => updateParticipant(i, { role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="engenheiro">Engenheiro</SelectItem>
                      <SelectItem value="despachante">Despachante</SelectItem>
                      <SelectItem value="responsavel_tecnico">Responsável Técnico</SelectItem>
                      <SelectItem value="testemunha">Testemunha</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Email" value={p.email} onChange={(e) => updateParticipant(i, { email: e.target.value })} />
                  <Input placeholder="Telefone (com DDD)" value={p.phone} onChange={(e) => updateParticipant(i, { phone: e.target.value })} />
                </div>
                {participants.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-rose-600 h-7" onClick={() => removeParticipant(i)}>
                    <X className="w-3 h-3 mr-1" /> Remover
                  </Button>
                )}
              </Card>
            ))}
            <Button size="sm" variant="outline" onClick={() => addParticipant("outro")} className="w-full gap-1">
              <Plus className="w-3 h-3" /> Outro participante
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar e gerar links"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
