/**
 * NewProcessQuickDialog — o novo entry point para criação de processos.
 *
 * Fluxo mínimo: usuário escolhe apenas o TIPO. Cliente e Embarcação são
 * opcionais e podem ser vinculados agora ou depois pelo Workspace.
 * Ao criar, dispara o Blueprint Engine para materializar automaticamente
 * todo o checklist documental do processo.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { materializeProcessBlueprint } from "@/services/processes/blueprintEngine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdvanced?: () => void;
}

type ProcessTypeRow = { id: string; name: string; category: string | null };
type CustomerRow = { id: string; name: string };
type VesselRow = { id: string; name: string; customer_id: string | null };

export function NewProcessQuickDialog({ isOpen, onClose, onOpenAdvanced }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [types, setTypes] = useState<ProcessTypeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [typeQuery, setTypeQuery] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [vesselId, setVesselId] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setSelectedTypeId("");
      setCustomerId("");
      setVesselId("");
      setPriority("normal");
      setTitle("");
      setTypeQuery("");
    }
  }, [isOpen]);

  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q),
    );
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

  const selectedType = types.find((t) => t.id === selectedTypeId) || null;

  async function handleCreate() {
    if (!selectedType) {
      toast.error("Selecione o tipo de processo.");
      return;
    }
    if (!profile?.company_id) {
      toast.error("Sua empresa ainda não foi vinculada. Recarregue e tente novamente.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("processes")
        .insert({
          company_id: profile.company_id,
          process_type: selectedType.name,
          process_type_id: selectedType.id,
          customer_id: customerId || null,
          vessel_id: vesselId || null,
          title: title.trim() || selectedType.name,
          priority,
          status: "pending",
          is_draft: !customerId,
        })
        .select("id")
        .single();
      if (error) throw error;
      const processId = (data as any).id as string;

      // Motor Inteligente: monta o checklist a partir do pacote do tipo
      try {
        const result = await materializeProcessBlueprint(processId);
        console.log("[BLUEPRINT_MATERIALIZED]", result);
      } catch (e) {
        console.warn("Blueprint materialize failed (não bloqueia criação):", e);
      }

      toast.success("Processo criado. O checklist foi montado automaticamente.");
      onClose();
      navigate({ to: "/processes/$id", params: { id: processId }, search: { tab: "overview" } });
    } catch (e: any) {
      toast.error("Erro ao criar processo: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Processo
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo — o sistema monta automaticamente todos os documentos, anexos e assinaturas necessários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Tipo de processo <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <Input
                value={typeQuery}
                onChange={(e) => setTypeQuery(e.target.value)}
                placeholder="Buscar por nome ou categoria..."
                className="pl-9"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto rounded-lg border bg-slate-50/50">
              {grouped.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-4 text-center">Nenhum tipo encontrado.</div>
              ) : (
                grouped.map(([cat, list]) => (
                  <div key={cat}>
                    <div className="sticky top-0 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {cat}
                    </div>
                    {list.map((t) => (
                      <button
                        key={t.id}
                        type="button"
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
                ))
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Cliente <span className="text-slate-400 normal-case font-medium">(opcional)</span>
              </Label>
              <Select value={customerId || "none"} onValueChange={(v) => { setCustomerId(v === "none" ? "" : v); setVesselId(""); }}>
                <SelectTrigger><SelectValue placeholder="Vincular depois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Vincular depois —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Embarcação <span className="text-slate-400 normal-case font-medium">(opcional)</span>
              </Label>
              <Select value={vesselId || "none"} onValueChange={(v) => setVesselId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Vincular depois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Vincular depois —</SelectItem>
                  {vesselOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título interno (opcional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={selectedType?.name || "Ex.: Registro embarcação Phoenix"} />
            </div>
            <div className="space-y-2">
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

          {selectedType && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary/80 flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                O sistema vai criar automaticamente os documentos, anexos e assinaturas de <b>{selectedType.name}</b> assim que o processo for criado. Você resolve apenas as pendências no Workspace.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onOpenAdvanced ? (
            <Button variant="ghost" type="button" onClick={() => { onClose(); onOpenAdvanced(); }} disabled={submitting}>
              Modo avançado (com uploads)
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button type="button" onClick={handleCreate} disabled={submitting || !selectedTypeId}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Criar Processo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
