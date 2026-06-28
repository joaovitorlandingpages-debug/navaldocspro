import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { signaturesService, buildPublicSignUrl } from "@/services/signatures";
import { SignatureRequestDialog } from "@/components/signatures/SignatureRequestDialog";
import {
  Signature, Plus, Copy, MessageCircle, Mail, X, Download, Link2,
  CheckCircle2, Clock, AlertCircle, FileText, Eye, Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  processId: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700", icon: FileText },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700", icon: Send },
  viewed: { label: "Visualizada", color: "bg-indigo-100 text-indigo-700", icon: Eye },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Concluída", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", color: "bg-rose-100 text-rose-700", icon: X },
  expired: { label: "Expirada", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
};

export function ProcessSignaturesPanel({ processId }: Props) {
  const [requests, setRequests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [process, setProcess] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultDoc, setDefaultDoc] = useState<{ id?: string; title?: string }>({});

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: proc }, reqRes, docRes] = await Promise.all([
        supabase.from("processes").select("id,company_id,customer_id,vessel_id,process_type,status").eq("id", processId).maybeSingle(),
        supabase
          .from("signature_requests")
          .select("*, signature_participants(*)")
          .eq("process_id", processId)
          .order("created_at", { ascending: false }),
        supabase
          .from("generated_documents")
          .select("id,name,status,signature_status,created_at")
          .eq("process_id", processId)
          .order("created_at", { ascending: false }),
      ]);
      setProcess(proc ?? null);
      setRequests(reqRes.data ?? []);
      setDocuments(docRes.data ?? []);

      const reqIds = (reqRes.data ?? []).map((r: any) => r.id);
      if (reqIds.length) {
        const { data: ev } = await supabase
          .from("signature_events")
          .select("*")
          .in("signature_request_id", reqIds)
          .order("created_at", { ascending: true });
        setEvents(ev ?? []);
      } else {
        setEvents([]);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [processId]);

  const overallStatus = useMemo(() => {
    if (requests.length === 0) {
      return { tone: "slate", icon: FileText, title: "Nenhuma assinatura solicitada", detail: "Crie uma solicitação a partir de um documento gerado." };
    }
    const active = requests.filter((r) => !["cancelled", "expired"].includes(r.status));
    if (active.length === 0) return { tone: "slate", icon: AlertCircle, title: "Nenhuma assinatura ativa", detail: "Todas as solicitações foram canceladas ou expiraram." };
    const allCompleted = active.every((r) => r.status === "completed");
    if (allCompleted) return { tone: "emerald", icon: CheckCircle2, title: "✅ Processo totalmente assinado", detail: `${active.length} solicitação(ões) concluída(s).` };

    // Find pending roles across requests
    const pendingByRole: Record<string, number> = {};
    for (const r of active) {
      if (r.status === "completed") continue;
      for (const p of r.signature_participants ?? []) {
        if (p.status !== "signed") pendingByRole[p.role] = (pendingByRole[p.role] ?? 0) + 1;
      }
    }
    const pendingRoles = Object.keys(pendingByRole);
    if (pendingRoles.length === 1) {
      const map: Record<string, string> = {
        cliente: "Aguardando assinatura do cliente",
        engenheiro: "Aguardando assinatura do engenheiro",
        despachante: "Aguardando assinatura do despachante",
        responsavel_tecnico: "Aguardando assinatura do responsável técnico",
        testemunha: "Aguardando testemunha",
      };
      return { tone: "amber", icon: Clock, title: `🟡 ${map[pendingRoles[0]] ?? "Aguardando assinatura"}`, detail: `${pendingByRole[pendingRoles[0]]} pessoa(s) faltando.` };
    }
    return { tone: "amber", icon: Clock, title: "🟡 Aguardando múltiplas assinaturas", detail: pendingRoles.map((r) => `${r}: ${pendingByRole[r]}`).join(" • ") };
  }, [requests]);

  const openNewForDoc = (doc?: { id: string; name: string }) => {
    setDefaultDoc({ id: doc?.id, title: doc?.name });
    setDialogOpen(true);
  };

  const onCancel = async (id: string, companyId: string) => {
    if (!confirm("Cancelar esta solicitação?")) return;
    await signaturesService.cancel(id, companyId);
    toast.success("Cancelada");
    load();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(buildPublicSignUrl(token));
    toast.success("Link copiado");
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("signed-documents").createSignedUrl(path, 120);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const copyVerifyLink = async (requestId: string) => {
    const { data } = await supabase
      .from("signature_evidence_certificates")
      .select("verification_code")
      .eq("signature_request_id", requestId)
      .maybeSingle();
    if (!data?.verification_code) return toast.error("Certificado ainda não gerado");
    navigator.clipboard.writeText(`${window.location.origin}/verificar-assinatura/${data.verification_code}`);
    toast.success("Link de verificação copiado");
  };

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card className={`p-6 border-2 ${
        overallStatus.tone === "emerald" ? "border-emerald-200 bg-emerald-50/40" :
        overallStatus.tone === "amber" ? "border-amber-200 bg-amber-50/40" :
        "border-slate-200 bg-slate-50/40"
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <overallStatus.icon className={`w-8 h-8 ${
              overallStatus.tone === "emerald" ? "text-emerald-600" :
              overallStatus.tone === "amber" ? "text-amber-600" : "text-slate-500"
            }`} />
            <div>
              <h2 className="text-lg font-black tracking-tight">{overallStatus.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{overallStatus.detail}</p>
            </div>
          </div>
          <Button onClick={() => openNewForDoc()} className="gap-2">
            <Plus className="w-4 h-4" /> Nova solicitação
          </Button>
        </div>
      </Card>

      {/* Documents → solicitar assinatura */}
      {documents.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentos gerados ({documents.length})
          </h3>
          <div className="grid gap-2">
            {documents.map((d) => {
              const hasRequest = requests.some((r) => r.document_id === d.id);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{d.name || "Documento sem título"}</p>
                    <p className="text-[11px] text-slate-500">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                  {hasRequest ? (
                    <Badge variant="secondary" className="text-[10px]">Já solicitado</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openNewForDoc({ id: d.id, name: d.name })} className="gap-1">
                      <Signature className="w-3 h-3" /> Solicitar assinatura
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Requests */}
      <Card className="p-5">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Signature className="w-4 h-4" /> Solicitações de assinatura
        </h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Carregando...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nenhuma solicitação ainda.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META.draft;
              const Icon = meta.icon;
              const parts: any[] = r.signature_participants ?? [];
              const signed = parts.filter((p) => p.status === "signed").length;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${meta.color} border-0 gap-1`}><Icon className="w-3 h-3" />{meta.label}</Badge>
                        <span className="text-[11px] text-slate-400">Enviada: {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        {r.expires_at && (
                          <span className="text-[11px] text-slate-400">• Expira: {format(new Date(r.expires_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                      </div>
                      <p className="font-bold">{r.title}</p>
                      <p className="text-xs text-slate-500">{signed}/{parts.length} assinaram • Ordem: {r.signing_order === "sequential" ? "Sequencial" : "Livre"}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.final_signed_pdf_url && (
                        <Button size="sm" variant="outline" onClick={() => downloadFile(r.final_signed_pdf_url)} className="gap-1">
                          <Download className="w-3 h-3" /> PDF
                        </Button>
                      )}
                      {r.evidence_certificate_url && (
                        <Button size="sm" variant="outline" onClick={() => downloadFile(r.evidence_certificate_url)} className="gap-1">
                          <Download className="w-3 h-3" /> Certificado
                        </Button>
                      )}
                      {r.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => copyVerifyLink(r.id)} className="gap-1">
                          <Link2 className="w-3 h-3" /> Verificar
                        </Button>
                      )}
                      {!["completed", "cancelled"].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => onCancel(r.id, r.company_id)} className="gap-1 text-rose-600">
                          <X className="w-3 h-3" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {parts.map((p) => {
                      const lastView = events
                        .filter((e) => e.participant_id === p.id && e.event_type === "participant_opened")
                        .slice(-1)[0];
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{p.name}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-400">{p.role}</span>
                              {p.status === "signed" ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                                  Assinado {p.signed_at ? `• ${format(new Date(p.signed_at), "dd/MM HH:mm", { locale: ptBR })}` : ""}
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-200 text-slate-700 border-0 text-[10px]">Pendente</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {p.email || p.phone || "—"}
                              {lastView && ` • Visto ${format(new Date(lastView.created_at), "dd/MM HH:mm", { locale: ptBR })}`}
                            </p>
                          </div>
                          {p.status !== "signed" && !["completed", "cancelled"].includes(r.status) && (
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => copyLink(p.access_token)} className="h-7 gap-1 text-xs">
                                <Copy className="w-3 h-3" /> Link
                              </Button>
                              {p.phone && (
                                <a target="_blank" rel="noopener noreferrer"
                                  href={`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Assine: ${buildPublicSignUrl(p.access_token)}`)}`}>
                                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                                    <MessageCircle className="w-3 h-3" /> WhatsApp
                                  </Button>
                                </a>
                              )}
                              {p.email && (
                                <a href={`mailto:${p.email}?subject=${encodeURIComponent("Documento para assinatura")}&body=${encodeURIComponent(buildPublicSignUrl(p.access_token))}`}>
                                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                                    <Mail className="w-3 h-3" /> Email
                                  </Button>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Timeline */}
      {events.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Linha do tempo
          </h3>
          <ol className="relative border-l-2 border-slate-200 ml-3 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{e.event_type.replace(/_/g, " ")}</p>
                <p className="text-sm text-slate-600">{e.event_message ?? "—"}</p>
                <p className="text-[11px] text-slate-400">{format(new Date(e.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <SignatureRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        processId={processId}
        documentId={defaultDoc.id}
        defaultTitle={defaultDoc.title}
        defaultCustomerId={process?.customer_id}
        onCreated={load}
      />
    </div>
  );
}
