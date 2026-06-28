import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signaturesService, buildPublicSignUrl, type ParticipantRole } from "@/services/signatures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, MessageCircle, Mail, X, FileSignature, Clock, CheckCircle2, AlertCircle, Download, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/assinaturas")({
  component: AssinaturasPage,
});

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700", icon: FileSignature },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700", icon: Clock },
  viewed: { label: "Visualizada", color: "bg-indigo-100 text-indigo-700", icon: Clock },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Concluída", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", color: "bg-rose-100 text-rose-700", icon: X },
  expired: { label: "Expirada", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
};

function AssinaturasPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const data = await signaturesService.list(profile.company_id);
      setRows(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [profile?.company_id]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter(r => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Central de Assinaturas</h1>
          <p className="text-sm text-slate-500">Solicite, acompanhe e audite assinaturas online de documentos.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          ["all", "Todas"],
          ["sent", "Pendentes"],
          ["in_progress", "Em andamento"],
          ["completed", "Concluídas"],
          ["cancelled", "Canceladas"],
          ["expired", "Expiradas"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
              filter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label} <span className="opacity-60">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">Nenhuma solicitação</p>
          <p className="text-sm text-slate-500 mt-1">Crie uma nova solicitação para enviar documentos para assinatura.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => <RequestRow key={r.id} row={r} onChanged={load} />)}
        </div>
      )}

      <NewRequestDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}

function RequestRow({ row, onChanged }: { row: any; onChanged: () => void }) {
  const meta = STATUS_META[row.status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  const parts: any[] = row.signature_participants ?? [];
  const signed = parts.filter(p => p.status === "signed").length;

  const copy = (token: string) => {
    navigator.clipboard.writeText(buildPublicSignUrl(token));
    toast.success("Link copiado");
  };

  const cancel = async () => {
    if (!confirm("Cancelar solicitação?")) return;
    await signaturesService.cancel(row.id, row.company_id);
    toast.success("Cancelada");
    onChanged();
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${meta.color} border-0 gap-1`}><Icon className="w-3 h-3" />{meta.label}</Badge>
            <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <h3 className="font-bold text-slate-900">{row.title}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {signed} de {parts.length} assinaram • Ordem: {row.signing_order === "sequential" ? "Sequencial" : "Livre"}
          </p>
        </div>
        {row.status !== "completed" && row.status !== "cancelled" && (
          <Button variant="outline" size="sm" onClick={cancel} className="gap-1">
            <X className="w-3 h-3" /> Cancelar
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {parts.map(p => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">{p.role}</span>
                {p.status === "signed" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Assinado</Badge>
                ) : (
                  <Badge className="bg-slate-200 text-slate-700 border-0 text-[10px]">Pendente</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">{p.email || p.phone || "—"}</p>
            </div>
            {p.status !== "signed" && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => copy(p.access_token)} className="h-8 gap-1 text-xs">
                  <Copy className="w-3 h-3" /> Link
                </Button>
                {p.phone && (
                  <a target="_blank" rel="noopener noreferrer"
                    href={`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Assine: ${buildPublicSignUrl(p.access_token)}`)}`}>
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </Button>
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}?subject=${encodeURIComponent("Assinatura")}&body=${encodeURIComponent(buildPublicSignUrl(p.access_token))}`}>
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                      <Mail className="w-3 h-3" /> Email
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function NewRequestDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { profile, user } = useAuth();
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState<"free" | "sequential">("free");
  const [participants, setParticipants] = useState<any[]>([
    { name: "", email: "", phone: "", role: "cliente" as ParticipantRole },
  ]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setOrder("free");
    setParticipants([{ name: "", email: "", phone: "", role: "cliente" }]);
  };

  const save = async () => {
    if (!profile?.company_id) return toast.error("Empresa não identificada");
    if (!title.trim()) return toast.error("Informe o título");
    const valid = participants.filter(p => p.name.trim());
    if (valid.length === 0) return toast.error("Adicione pelo menos um participante");
    setSaving(true);
    try {
      await signaturesService.create({
        company_id: profile.company_id,
        title,
        signing_order: order,
        participants: valid,
        created_by: user?.id,
      });
      toast.success("Solicitação criada");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Solicitação de Assinatura</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título do documento</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Contrato de Serviço Naval" />
          </div>
          <div>
            <Label>Ordem de assinatura</Label>
            <Select value={order} onValueChange={(v: any) => setOrder(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Livre (qualquer ordem)</SelectItem>
                <SelectItem value="sequential">Sequencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Participantes</Label>
              <Button size="sm" variant="ghost" onClick={() => setParticipants([...participants, { name: "", email: "", phone: "", role: "outro" }])}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            {participants.map((p, i) => (
              <Card key={i} className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome" value={p.name} onChange={e => {
                    const next = [...participants]; next[i].name = e.target.value; setParticipants(next);
                  }} />
                  <Select value={p.role} onValueChange={(v) => {
                    const next = [...participants]; next[i].role = v; setParticipants(next);
                  }}>
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
                  <Input placeholder="Email" value={p.email} onChange={e => {
                    const next = [...participants]; next[i].email = e.target.value; setParticipants(next);
                  }} />
                  <Input placeholder="Telefone" value={p.phone} onChange={e => {
                    const next = [...participants]; next[i].phone = e.target.value; setParticipants(next);
                  }} />
                </div>
                {participants.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-rose-600 h-7" onClick={() => setParticipants(participants.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3 mr-1" /> Remover
                  </Button>
                )}
              </Card>
            ))}
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
