/**
 * Modal de solicitação de assinatura em lote.
 * Coleta signatário principal + ordem + mensagem e dispara batchRequestSignature.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Signature } from "lucide-react";
import { batchRequestSignature, type BatchSignerInput, type ChecklistLite } from "@/services/processes/batchChecklistActions";
import type { ParticipantRole } from "@/services/signatures";

type Preset = "cliente" | "responsavel_tecnico" | "engenheiro" | "despachante" | "outro";

interface Props {
  open: boolean;
  onClose: () => void;
  processId: string;
  process: any;
  items: ChecklistLite[];
  createdBy?: string;
  onDone: (report: Awaited<ReturnType<typeof batchRequestSignature>>) => void;
}

const PRESET_ROLE: Record<Preset, ParticipantRole> = {
  cliente: "cliente",
  responsavel_tecnico: "responsavel_tecnico",
  engenheiro: "engenheiro",
  despachante: "despachante",
  outro: "outro",
};

export function BatchSignatureDialog({ open, onClose, processId, process, items, createdBy, onDone }: Props) {
  const [preset, setPreset] = useState<Preset>("cliente");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ParticipantRole>("cliente");
  const [order, setOrder] = useState<"free" | "sequential">("free");
  const [message, setMessage] = useState("");
  const [sameForAll, setSameForAll] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["batch-sig-customer", process?.customer_id],
    enabled: open && !!process?.customer_id,
    queryFn: async () => {
      const { data } = await supabase.from("customers")
        .select("id,name,email,phone").eq("id", process.customer_id).maybeSingle();
      return data;
    },
  });

  const { data: team } = useQuery({
    queryKey: ["batch-sig-team", process?.company_id],
    enabled: open && !!process?.company_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id,full_name,email,phone,role").eq("company_id", process.company_id);
      return data ?? [];
    },
  });

  const teamByRole = useMemo(() => {
    const map: Record<string, any> = {};
    (team ?? []).forEach((p: any) => {
      const r = (p.role || "").toLowerCase();
      if (!map[r]) map[r] = p;
    });
    return map;
  }, [team]);

  // Preenche automaticamente conforme o preset
  useEffect(() => {
    if (!open) return;
    if (preset === "cliente" && customer) {
      setName(customer.name || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setRole("cliente");
      return;
    }
    if (preset === "outro") { setRole("outro"); return; }
    const src = teamByRole[preset];
    if (src) {
      setName(src.full_name || "");
      setEmail(src.email || "");
      setPhone(src.phone || "");
      setRole(PRESET_ROLE[preset]);
    } else {
      setRole(PRESET_ROLE[preset]);
    }
  }, [preset, customer, teamByRole, open]);

  const eligible = items.filter((i) => i.requires_signature || i.document_id);

  const canSubmit = name.trim().length >= 2 && (email.trim().length > 3 || phone.trim().length > 5);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Informe pelo menos nome e (e-mail ou telefone).");
      return;
    }
    if (!sameForAll) {
      toast.info("Signatários individuais por documento serão suportados em breve — usando o mesmo signatário desta vez.");
    }
    setBusy(true);
    try {
      const signer: BatchSignerInput = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        signing_order: order,
        message: message.trim() || undefined,
        customer_id: preset === "cliente" ? process?.customer_id ?? undefined : undefined,
      };
      const report = await batchRequestSignature(processId, items, signer, createdBy);
      onDone(report);
      onClose();
    } catch (e: any) {
      toast.error("Falha ao criar assinaturas: " + (e?.message || "erro"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <Signature className="h-5 w-5 text-amber-600" /> Solicitar assinatura em lote
          </DialogTitle>
          <DialogDescription>
            {eligible.length} de {items.length} item(ns) selecionado(s) exigem assinatura ou têm documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Signatário principal</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente do processo</SelectItem>
                <SelectItem value="responsavel_tecnico">Responsável técnico</SelectItem>
                <SelectItem value="engenheiro">Engenheiro</SelectItem>
                <SelectItem value="despachante">Despachante</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div className="sm:col-span-2">
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ParticipantRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="responsavel_tecnico">Responsável técnico</SelectItem>
                  <SelectItem value="engenheiro">Engenheiro</SelectItem>
                  <SelectItem value="despachante">Despachante</SelectItem>
                  <SelectItem value="testemunha">Testemunha</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ordem</Label>
            <RadioGroup value={order} onValueChange={(v) => setOrder(v as any)} className="grid grid-cols-2 gap-2 mt-1">
              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="free" /> <span className="text-sm">Livre</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="sequential" /> <span className="text-sm">Sequencial</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label>Mensagem opcional</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensagem que acompanha as solicitações" rows={3} />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <Checkbox checked={sameForAll} onCheckedChange={(v) => setSameForAll(!!v)} />
            <span className="text-sm font-medium text-slate-700">Usar o mesmo signatário para todos os documentos</span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy || !canSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Signature className="h-4 w-4 mr-2" />}
            Criar {eligible.length} solicitação(ões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchSignatureDialog;
