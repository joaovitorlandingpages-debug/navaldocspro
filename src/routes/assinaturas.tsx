import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signaturesService, buildPublicSignUrl } from "@/services/signatures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Copy, MessageCircle, Mail, X, FileSignature, Clock, CheckCircle2, AlertCircle, Download, Link2, Ship, User, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignatureTestRunner } from "@/components/signatures/SignatureTestRunner";
import { SignatureRequestDialog } from "@/components/signatures/SignatureRequestDialog";
import { loadSignatureMetrics, type SignatureMetrics } from "@/services/signatureMetrics";

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
  const [metrics, setMetrics] = useState<SignatureMetrics | null>(null);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const data = await signaturesService.list(profile.company_id);
      // Enrich with process / customer / vessel
      const procIds = Array.from(new Set(data.map((r: any) => r.process_id).filter(Boolean)));
      let procMap: Record<string, any> = {};
      if (procIds.length) {
        const { data: procs } = await supabase
          .from("processes")
          .select("id, process_type, customer:customers(id,name), vessel:vessels(id,name)")
          .in("id", procIds);
        for (const p of procs ?? []) procMap[p.id] = p;
      }
      setRows(data.map((r: any) => ({ ...r, process: r.process_id ? procMap[r.process_id] : null })));
      try { setMetrics(await loadSignatureMetrics(profile.company_id)); } catch {}
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
        <div className="flex items-center gap-2 flex-wrap">
          {profile?.role === "admin_master_global" && profile?.company_id && (
            <SignatureTestRunner companyId={profile.company_id} userId={profile.id} onChanged={load} />
          )}
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Solicitação
          </Button>
        </div>
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

      <SignatureRequestDialog open={open} onOpenChange={setOpen} onCreated={load} />
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

  const downloadSigned = async (path: string) => {
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
    const url = `${window.location.origin}/verificar-assinatura/${data.verification_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de verificação copiado");
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
          {row.process && (
            <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
              <Link to="/processes/$id" params={{ id: row.process.id }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
                <FolderOpen className="w-3 h-3" /> {row.process.process_type}
              </Link>
              {row.process.customer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  <User className="w-3 h-3" /> {row.process.customer.name}
                </span>
              )}
              {row.process.vessel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  <Ship className="w-3 h-3" /> {row.process.vessel.name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {row.final_signed_pdf_url && (
            <Button variant="outline" size="sm" onClick={() => downloadSigned(row.final_signed_pdf_url)} className="gap-1">
              <Download className="w-3 h-3" /> PDF Assinado
            </Button>
          )}
          {row.evidence_certificate_url && (
            <Button variant="outline" size="sm" onClick={() => downloadSigned(row.evidence_certificate_url)} className="gap-1">
              <Download className="w-3 h-3" /> Certificado
            </Button>
          )}
          {row.status === "completed" && (
            <Button variant="outline" size="sm" onClick={() => copyVerifyLink(row.id)} className="gap-1">
              <Link2 className="w-3 h-3" /> Link de verificação
            </Button>
          )}
          {row.status !== "completed" && row.status !== "cancelled" && (
            <Button variant="outline" size="sm" onClick={cancel} className="gap-1">
              <X className="w-3 h-3" /> Cancelar
            </Button>
          )}
        </div>
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

