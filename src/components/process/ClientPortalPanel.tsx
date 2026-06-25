import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createPortalAccess, revokePortalAccess, renewPortalAccess, sendCompanyMessage,
} from "@/lib/clientPortal.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Link2, RefreshCw, Ban, Send, MessageSquare, FileUp } from "lucide-react";

export function ClientPortalPanel({ processId }: { processId: string }) {
  const create = useServerFn(createPortalAccess);
  const revoke = useServerFn(revokePortalAccess);
  const renew = useServerFn(renewPortalAccess);
  const sendMsg = useServerFn(sendCompanyMessage);

  const [accesses, setAccesses] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [{ data: a }, { data: u }, { data: m }] = await Promise.all([
      supabase.from("client_portal_access").select("*").eq("process_id", processId).order("created_at", { ascending: false }),
      (supabase as any).from("process_document_uploads").select("*").eq("process_id", processId).order("created_at", { ascending: false }),
      supabase.from("client_portal_messages").select("*").eq("process_id", processId).order("created_at", { ascending: true }),
    ]);
    setAccesses(a || []);
    setUploads((u || []).filter((x: any) => x.process_document_id && (x.file_name || "").length > 0));
    setMessages(m || []);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [processId]);

  const active = accesses.find((a) => a.status === "ativo");
  const portalUrl = active ? `${window.location.origin}/portal/${active.access_token}` : "";

  async function handleCreate() {
    setBusy(true);
    try {
      await create({ data: { processId, daysValid: days } });
      toast.success("Link do portal gerado");
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function handleCopy() {
    await navigator.clipboard.writeText(portalUrl);
    toast.success("Link copiado");
  }
  async function handleRevoke(id: string) {
    await revoke({ data: { accessId: id } });
    toast.success("Acesso revogado");
    reload();
  }
  async function handleRenew(id: string) {
    await renew({ data: { accessId: id, daysValid: days } });
    toast.success("Acesso renovado");
    reload();
  }
  async function handleSend() {
    if (!msg.trim()) return;
    await sendMsg({ data: { processId, message: msg, accessId: active?.id ?? null } });
    setMsg("");
    toast.success("Mensagem enviada");
    reload();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5" />
          <h3 className="font-bold">Portal do Cliente</h3>
        </div>
        {active ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={portalUrl} className="font-mono text-xs" />
              <Button variant="outline" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <Badge>{active.status}</Badge>
              <span>Expira em {new Date(active.token_expires_at).toLocaleDateString("pt-BR")}</span>
              <span>Último acesso: {active.last_access_at ? new Date(active.last_access_at).toLocaleString("pt-BR") : "nunca"}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
              <Button variant="outline" size="sm" onClick={() => handleRenew(active.id)}><RefreshCw className="w-4 h-4 mr-2" />Renovar</Button>
              <Button variant="destructive" size="sm" onClick={() => handleRevoke(active.id)}><Ban className="w-4 h-4 mr-2" />Revogar</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-28" />
            <span className="text-sm text-muted-foreground">dias de validade</span>
            <Button onClick={handleCreate} disabled={busy}>Gerar link seguro</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><FileUp className="w-4 h-4" />Documentos enviados pelo cliente</h3>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum upload via portal ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {uploads.map((u: any) => (
              <li key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span>{u.file_name}</span>
                <Badge variant="outline">{u.validation_status || u.ocr_status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Mensagens com o cliente</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
          {messages.map((m: any) => (
            <div key={m.id} className={`text-sm p-2 rounded ${m.sender === "company" ? "bg-primary/10 ml-8" : "bg-slate-100 mr-8"}`}>
              <div className="text-xs text-muted-foreground mb-1">{m.sender === "company" ? "Empresa" : "Cliente"} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
              <div>{m.message}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Mensagem ao cliente..." rows={2} />
          <Button onClick={handleSend} disabled={!msg.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  );
}

export default ClientPortalPanel;
