import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Props {
  process: any;
  onSaved?: () => void;
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
  { v: "low", l: "Baixa" },
  { v: "medium", l: "Média" },
  { v: "high", l: "Alta" },
  { v: "urgent", l: "Urgente" },
  { v: "critical", l: "Crítica" },
];

export function ProcessEditForm({ process, onSaved }: Props) {
  const [form, setForm] = useState({
    title: process?.title ?? "",
    process_type: process?.process_type ?? "",
    status: process?.status ?? "pending",
    priority: process?.priority ?? "medium",
    due_date: process?.due_date ?? "",
    notes: process?.notes ?? "",
    customer_id: process?.customer_id ?? "",
    vessel_id: process?.vessel_id ?? "",
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return;
      const [c, v] = await Promise.all([
        supabase.from("customers").select("id,name").eq("company_id", profile.company_id).order("name"),
        supabase.from("vessels").select("id,name").eq("company_id", profile.company_id).order("name"),
      ]);
      setCustomers(c.data || []);
      setVessels(v.data || []);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("processes").update({
        title: form.title || null,
        process_type: form.process_type,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        notes: form.notes || null,
        customer_id: form.customer_id,
        vessel_id: form.vessel_id || null,
      }).eq("id", process.id);
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
    <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
      <h3 className="text-lg font-black text-navy uppercase tracking-tight">Editar Processo</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tipo</Label>
          <Input value={form.process_type} onChange={(e) => setForm({ ...form, process_type: e.target.value })} required />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Cliente</Label>
          <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Embarcação</Label>
          <Select value={form.vessel_id || "__none__"} onValueChange={(v) => setForm({ ...form, vessel_id: v === "__none__" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Sem embarcação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem embarcação</SelectItem>
              {vessels.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prioridade</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prazo</Label>
          <Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Observações</Label>
          <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="h-11 rounded-xl gap-2 bg-primary text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
