import { useEffect, useState } from "react";
import { Loader2, FileSignature, Download, ExternalLink, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { customerSignaturesService, type CustomerSignature } from "@/services/customerSignatures";
import { Link } from "@tanstack/react-router";

interface Props {
  companyId: string;
  customerId: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  completed: { label: "Concluída", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Aguardando", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Visualizada", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  expired: { label: "Expirada", color: "bg-red-100 text-red-700" },
  pending: { label: "Pendente", color: "bg-slate-100 text-slate-700" },
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700" },
};

export function CustomerSignaturesTab({ companyId, customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [reusable, setReusable] = useState<CustomerSignature[]>([]);
  const [stats, setStats] = useState({ total: 0, signed: 0, last: null as string | null });

  async function load() {
    setLoading(true);
    try {
      const [reqs, sigs] = await Promise.all([
        customerSignaturesService.listRequestsForCustomer(companyId, customerId),
        customerSignaturesService.listForCustomer(companyId, customerId),
      ]);
      setRequests(reqs);
      setReusable(sigs);
      const signedReqs = reqs.filter((r: any) => r.status === "completed");
      setStats({
        total: reqs.length,
        signed: signedReqs.length,
        last: signedReqs[0]?.updated_at ?? null,
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [companyId, customerId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Dashboard do Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-xs text-slate-500">solicitações</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Assinadas</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.signed}</p>
          <p className="text-xs text-slate-500">documentos</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Última assinatura</p>
          <p className="text-sm font-bold text-slate-900 mt-2">{stats.last ? new Date(stats.last).toLocaleString("pt-BR") : "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1"><Shield className="w-3 h-3" />Assinatura reutilizável</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">{reusable.length}</p>
          <p className="text-xs text-slate-500">cadastrada(s)</p>
        </Card>
      </div>

      {reusable.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />Assinaturas autorizadas para reuso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reusable.map((s) => (
              <div key={s.id} className="border rounded-xl p-3 bg-slate-50 flex items-center gap-3">
                {s.signature_image_url?.startsWith("data:image") ? (
                  <img src={s.signature_image_url} alt="" className="w-24 h-12 object-contain bg-white border rounded" />
                ) : (
                  <div className="w-24 h-12 bg-white border rounded flex items-center justify-center text-xs text-slate-400">{s.signature_type}</div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Autorizada em {new Date(s.authorized_at).toLocaleDateString("pt-BR")}</p>
                  <p className="text-[11px] text-slate-500">tipo: {s.signature_type}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => customerSignaturesService.revoke(s.id).then(load)}>
                  <RefreshCw className="w-3 h-3 mr-1" />Revogar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileSignature className="w-4 h-4 text-blue-600" />Histórico de Assinaturas</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-6 text-center">Nenhuma solicitação de assinatura para este cliente.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const st = statusLabel[r.status] ?? statusLabel.pending;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 border rounded-xl p-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-slate-900 text-sm">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                      {r.process_id && <> · <Link to="/processes/$id" params={{ id: r.process_id }} className="text-blue-600 hover:underline">ver processo</Link></>}
                    </p>
                  </div>
                  <Badge className={st.color}>{st.label}</Badge>
                  {r.final_signed_pdf_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={r.final_signed_pdf_url} target="_blank" rel="noopener noreferrer"><Download className="w-3 h-3 mr-1" />PDF</a>
                    </Button>
                  )}
                  {r.evidence_certificate_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={r.evidence_certificate_url} target="_blank" rel="noopener noreferrer"><Shield className="w-3 h-3 mr-1" />Certificado</a>
                    </Button>
                  )}
                  {r.process_id && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/processes/$id" params={{ id: r.process_id }}><ExternalLink className="w-3 h-3" /></Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
