import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Download, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verificar-assinatura/$code")({
  component: VerifyPage,
});

function VerifyPage() {
  const { code } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.rpc("certificate_verify" as any, { p_code: code });
        if (!data) { setLoading(false); return; }
        const payload = data as any;
        setCert(payload.cert);
        setRequest(payload.request);
      } finally { setLoading(false); }
    })();
  }, [code]);

  const downloadCert = async () => {
    if (!cert?.pdf_url && !cert?.certificate_url) {
      toast.error("Certificado ainda não disponível");
      return;
    }
    const path = cert.pdf_url || cert.certificate_url;
    const { data, error } = await supabase.storage.from("signed-documents").createSignedUrl(path, 120);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Verificando...</div>;

  if (!cert) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="p-8 max-w-md text-center">
          <XCircle className="w-12 h-12 mx-auto text-rose-500 mb-3" />
          <h1 className="font-semibold text-xl">Código não encontrado</h1>
          <p className="text-sm text-slate-500 mt-1">O código <code className="font-mono">{code}</code> não corresponde a nenhum documento.</p>
        </Card>
      </div>
    );
  }

  const participants: any[] = Array.isArray(cert.participants_snapshot) ? cert.participants_snapshot : [];
  const events: any[] = Array.isArray(cert.events_snapshot) ? cert.events_snapshot : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <Shield className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3" /> Documento Válido
              </Badge>
              <h1 className="text-xl md:text-2xl font-semibold">{request?.title ?? "Documento Assinado"}</h1>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Info label="Código de verificação" value={cert.verification_code} mono />
            <Info label="Gerado em" value={new Date(cert.generated_at).toLocaleString("pt-BR")} />
            <Info label="Status" value="Concluído" />
            <Info label="Hash do documento" value={(cert.document_hash ?? "").slice(0, 32) + "..."} mono />
          </div>
          <div className="mt-5 flex gap-2 flex-wrap">
            <Button onClick={downloadCert} className="gap-2">
              <Download className="w-4 h-4" /> Baixar certificado
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Participantes ({participants.length})</h2>
          <div className="space-y-3">
            {participants.map((p, i) => (
              <div key={i} className="border-l-4 border-emerald-500 pl-3 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{p.role}</Badge>
                  {p.status === "signed" && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Assinou</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.signed_at ? new Date(p.signed_at).toLocaleString("pt-BR") : "—"} • Tipo: {p.signature_type ?? "—"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Hash: {(p.signature_hash ?? "").slice(0, 48)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> Timeline</h2>
          <div className="space-y-2">
            {events.map((e, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:gap-3 text-sm border-l-2 border-slate-200 pl-3 sm:border-0 sm:pl-0">
                <span className="text-xs text-slate-400 font-mono sm:w-40 shrink-0">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                <div className="min-w-0">
                  <span className="font-semibold text-slate-700">{e.event_type}</span>
                  {e.event_message && <p className="text-xs text-slate-500 break-words">{e.event_message}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 pt-2">
          Verificação pública gerada pelo NavalDocs Pro
        </p>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
      <p className={`text-sm text-slate-700 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
