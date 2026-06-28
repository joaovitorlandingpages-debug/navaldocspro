import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getPortalContext,
  portalSendMessage,
  portalUploadDocument,
  portalDownloadFile,
  portalConfirmReceipt,
} from "@/lib/clientPortal.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Ship, User, FileText, Send, Upload, Download, CheckCircle2,
  Clock, MessageSquare, Loader2, AlertCircle, Phone,
} from "lucide-react";

export const Route = createFileRoute("/portal/$token")({
  ssr: false,
  component: PortalPage,
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function PortalPage() {
  const { token } = useParams({ from: "/portal/$token" });
  const fetchCtx = useServerFn(getPortalContext);
  const sendMsg = useServerFn(portalSendMessage);
  const upload = useServerFn(portalUploadDocument);
  const dl = useServerFn(portalDownloadFile);
  const confirm = useServerFn(portalConfirmReceipt);

  const [ctx, setCtx] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setLoading(true);
      const c = await fetchCtx({ data: { token } });
      setCtx(c);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Não foi possível abrir o portal</h1>
          <p className="text-muted-foreground text-sm">{error || "Link inválido."}</p>
        </Card>
      </div>
    );
  }

  const { company, process, customer, vessel, documents, uploads, messages, timeline, released, signatures = [], access } = ctx;
  const pendingDocs = (documents || []).filter((d: any) => d.status !== "approved" && d.status !== "aprovado");
  const phoneDigits = (company?.phone || "").replace(/\D/g, "");

  async function handleSend() {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      await sendMsg({ data: { token, message: msg } });
      setMsg("");
      toast.success("Mensagem enviada");
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function handleUpload(file: File, documentId?: string) {
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      await upload({ data: { token, fileName: file.name, contentType: file.type, base64: b64, documentId: documentId ?? null } });
      toast.success("Documento enviado");
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function handleDownload(bucket: string, path: string) {
    try {
      const { url } = await dl({ data: { token, bucket, path } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleConfirm() {
    try {
      await confirm({ data: { token } });
      toast.success("Recebimento confirmado");
      reload();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 rounded bg-primary text-primary-foreground grid place-items-center font-bold">
              {(company?.name || "?")[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{company?.name}</h1>
            <p className="text-xs text-muted-foreground">Portal do Cliente</p>
          </div>
          {phoneDigits && (
            <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><Phone className="w-4 h-4 mr-2" />WhatsApp</Button>
            </a>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Badge variant="secondary" className="mb-2">{process?.status}</Badge>
              <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-4 h-4" />{process?.process_type}</h2>
              {process?.protocol_number && <p className="text-sm text-muted-foreground">Protocolo: {process.protocol_number}</p>}
            </div>
            <div className="text-xs text-muted-foreground">
              Acesso válido até {new Date(access.expires_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{customer?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Ship className="w-4 h-4 text-muted-foreground" /><span>{vessel?.name || "—"}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />Documentos pendentes</h3>
          {pendingDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência no momento. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {pendingDocs.map((d: any) => (
                <li key={d.id} className="border rounded p-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">{d.metadata?.label || d.metadata?.code || "Documento"}</div>
                    <div className="text-xs text-muted-foreground">{d.status}</div>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], d.id)} />
                    <Button asChild size="sm" disabled={busy}><span><Upload className="w-4 h-4 mr-2" />Enviar</span></Button>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t pt-4">
            <label className="cursor-pointer inline-block">
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <Button variant="outline" asChild disabled={busy}><span><Upload className="w-4 h-4 mr-2" />Enviar outro documento</span></Button>
            </label>
          </div>
        </Card>

        {uploads.length > 0 && (
          <Card className="p-5">
            <h3 className="font-bold mb-3">Documentos enviados</h3>
            <ul className="space-y-2 text-sm">
              {uploads.map((u: any) => (
                <li key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span>{u.file_name}</span>
                  <Badge variant="outline">{u.validation_status || u.ocr_status || "recebido"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {released.length > 0 && (
          <Card className="p-5">
            <h3 className="font-bold mb-3">Arquivos liberados</h3>
            <ul className="space-y-2">
              {released.map((f: any) => {
                const path = f.signed_file_url || f.generated_file_url;
                if (!path) return null;
                return (
                  <li key={f.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm">{f.name}</span>
                    <Button size="sm" variant="outline" onClick={() => handleDownload("generated-documents", path)}>
                      <Download className="w-4 h-4 mr-2" />Baixar
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {signatures.length > 0 && (
          <Card className="p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />Assinaturas</h3>
            <ul className="space-y-2">
              {signatures.map((s: any) => {
                const mine = (s.signature_participants || []).find((p: any) => (customer?.email && p.email === customer.email) || (customer?.name && p.name === customer.name));
                const pendingMine = mine && mine.status !== "signed";
                return (
                  <li key={s.id} className="border rounded-xl p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.status === "completed" ? "Concluída" : s.status === "in_progress" ? "Em andamento" : "Aguardando"} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {pendingMine && (
                          <a href={`/assinar/${mine.access_token}`} target="_blank" rel="noreferrer">
                            <Button size="sm">Assinar agora</Button>
                          </a>
                        )}
                        {s.final_signed_pdf_url && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload("signed-documents", s.final_signed_pdf_url)}>
                            <Download className="w-3 h-3 mr-1" />PDF
                          </Button>
                        )}
                        {s.evidence_certificate_url && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload("signed-documents", s.evidence_certificate_url)}>
                            Certificado
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      {(s.signature_participants || []).sort((a: any, b: any) => (a.signing_order ?? 0) - (b.signing_order ?? 0)).map((p: any) => (
                        <span key={p.id} className={`px-2 py-0.5 rounded-full ${p.status === "signed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {p.name} · {p.role}{p.status === "signed" ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Mensagens</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
            {messages.map((m: any) => (
              <div key={m.id} className={`text-sm p-2 rounded ${m.sender === "client" ? "bg-primary/10 ml-8" : "bg-slate-100 mr-8"}`}>
                <div className="text-xs text-muted-foreground mb-1">{m.sender === "client" ? "Você" : "Empresa"} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
                <div>{m.message}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Escreva uma mensagem..." rows={2} />
            <Button onClick={handleSend} disabled={busy || !msg.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3">Histórico recente</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {timeline.slice(0, 10).map((t: any, i: number) => (
              <li key={i}>• {new Date(t.created_at).toLocaleString("pt-BR")} — {t.message || t.event_type}</li>
            ))}
          </ul>
          <Button className="mt-4" variant="outline" onClick={handleConfirm}>
            <CheckCircle2 className="w-4 h-4 mr-2" />Confirmar recebimento
          </Button>
        </Card>
      </main>
    </div>
  );
}
