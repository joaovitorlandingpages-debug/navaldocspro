import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { signaturesService } from "@/services/signatures";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  PenTool, Type, Upload, Eraser, Shield, CheckCircle2, ChevronRight, ChevronLeft,
  FileText, Download, Copy, MessageCircle, User, Loader2, Clock, XCircle, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/assinar/$token")({
  component: PublicSignPage,
});

type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS = ["Identificação", "Documento", "Aceite", "Assinatura", "Confirmar"];

function detectDevice() {
  if (typeof navigator === "undefined") return { os: "", browser: "", device: "" };
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "Desconhecido";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox" : "Outro";
  const device = /Mobile|Android|iPhone/i.test(ua) ? "Celular"
    : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";
  return { os, browser, device };
}

function PublicSignPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [company, setCompany] = useState<{ name?: string; logo_url?: string } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(0);

  // step 1
  const [ident, setIdent] = useState({ name: "", role: "", document: "", company: "" });
  // step 3
  const [readConfirmed, setReadConfirmed] = useState(false);
  // step 4
  const [tab, setTab] = useState<"drawn" | "typed" | "upload">("drawn");
  const [typed, setTyped] = useState("");
  const [uploadData, setUploadData] = useState<string>("");
  const [drawnData, setDrawnData] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  // step 5
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const found = await signaturesService.getByToken(token);
        if (!found) { setError("Link inválido ou não encontrado."); return; }
        const { participant, request } = found;
        if (!request) { setError("Solicitação não encontrada."); return; }

        // Expiration / cancellation gates
        if (request.status === "cancelled") { setError("Esta solicitação foi cancelada."); return; }
        if (request.expires_at && new Date(request.expires_at).getTime() < Date.now()) {
          setError("Este link expirou. Solicite um novo ao remetente."); return;
        }
        if (participant.status === "signed") {
          setResult({ status: "already", participant, request });
        }

        // Sequential check via secure RPC (validates token)
        if (request.signing_order === "sequential") {
          const { data: prev } = await supabase.rpc("signature_get_sequential_prev" as any, { p_token: token });
          const blocker = (prev ?? []).find((p: any) => p.status !== "signed");
          if (blocker) {
            setError(`Aguardando assinatura anterior: ${blocker.name}. Você receberá acesso quando chegar sua vez.`);
            return;
          }
        }

        setData(found);
        setIdent(s => ({ ...s, name: participant.name || "", role: participant.role || "" }));

        // Company branding
        const { data: comp } = await supabase
          .from("companies").select("name, logo_url").eq("id", participant.company_id).maybeSingle();
        setCompany(comp as any);

        // PDF signed URL (best-effort; only if document is generated + accessible)
        if (request.document_id) {
          try {
            const { data: doc } = await supabase
              .from("generated_documents")
              .select("file_url, name")
              .eq("id", request.document_id).maybeSingle();
            const raw = String((doc as any)?.file_url ?? "");
            if (raw) {
              const bucket = raw.includes("/generated-documents/") ? "generated-documents" : "process-attachments";
              const marker = `/${bucket}/`;
              const idx = raw.indexOf(marker);
              const path = idx >= 0 ? raw.slice(idx + marker.length) : raw;
              const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
              if (signed?.signedUrl) setPdfUrl(signed.signedUrl);
              else if (raw.startsWith("http")) setPdfUrl(raw);
            }
          } catch { /* preview optional */ }
        }

        if (participant.status !== "signed") {
          await signaturesService.logView(token);
        }
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar o link.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ---- canvas ----
  useEffect(() => {
    if (tab !== "drawn" || !canvasRef.current) return;
    const c = canvasRef.current;
    // Handle DPR for crisp lines on mobile
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    if (ctx) { ctx.scale(dpr, dpr); ctx.lineCap = "round"; ctx.lineJoin = "round"; }
  }, [tab, step]);

  const startDraw = (e: any) => { e.preventDefault(); drawingRef.current = true; draw(e); };
  const stopDraw = () => {
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.beginPath();
    if (canvasRef.current) setDrawnData(canvasRef.current.toDataURL());
  };
  const draw = (e: any) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const c = canvasRef.current; const ctx = c.getContext("2d"); if (!ctx) return;
    const r = c.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - r.left : e.clientX - r.left;
    const y = "touches" in e ? e.touches[0].clientY - r.top : e.clientY - r.top;
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const clearCanvas = () => {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (c && ctx) { ctx.clearRect(0, 0, c.width, c.height); setDrawnData(""); }
  };
  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error("Imagem grande demais (máx 5MB)");
    const reader = new FileReader();
    reader.onload = ev => setUploadData(String(ev.target?.result ?? ""));
    reader.readAsDataURL(f);
  };

  const signaturePreview = useMemo(() => {
    if (tab === "drawn") return drawnData;
    if (tab === "upload") return uploadData;
    return "";
  }, [tab, drawnData, uploadData]);

  const canAdvance = (from: Step): boolean => {
    if (from === 0) return ident.name.trim().length >= 2 && ident.document.trim().length >= 3;
    if (from === 1) return true;
    if (from === 2) return readConfirmed;
    if (from === 3) {
      if (tab === "drawn") return drawnData.length > 1500;
      if (tab === "typed") return typed.trim().length >= 2;
      return !!uploadData;
    }
    return true;
  };

  const submit = async () => {
    if (!accepted) return toast.error("Aceite os termos para finalizar");
    let signature_data = "";
    if (tab === "drawn") signature_data = drawnData || (canvasRef.current?.toDataURL() ?? "");
    else if (tab === "typed") signature_data = typed;
    else signature_data = uploadData;
    if (!signature_data) return toast.error("Assinatura ausente");

    setSigning(true);
    try {
      const res = await signaturesService.signByToken(token, {
        signature_type: tab, signature_data, accepted_terms: true,
        identification: ident,
      });
      setResult({ ...res, participant: data.participant, request: data.request });
      toast.success("Assinatura registrada!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao assinar");
    } finally { setSigning(false); }
  };

  // ---------- render states ----------
  if (loading) return (
    <div className="min-h-screen grid place-items-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen grid place-items-center p-4 bg-slate-50">
      <Card className="p-8 max-w-md text-center">
        <XCircle className="w-14 h-14 mx-auto text-rose-400 mb-3" />
        <h1 className="font-semibold text-xl mb-2">Não foi possível abrir</h1>
        <p className="text-sm text-slate-600">{error}</p>
      </Card>
    </div>
  );

  if (result) return <SuccessScreen result={result} company={company} token={token} />;

  const { participant, request } = data;
  const pct = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
          ) : (
            <div className="h-8 w-8 rounded bg-primary/10 grid place-items-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
              {company?.name ?? "Assinatura Eletrônica"}
            </p>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">{request.title}</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Etapa {step + 1} de {STEP_LABELS.length} — {STEP_LABELS[step]}
            </p>
            {request.expires_at && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expira {new Date(request.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        {step === 0 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Sua identificação</h2>
            </div>
            <p className="text-sm text-slate-500">Confirme seus dados para assinar este documento com validade jurídica.</p>
            <div className="grid gap-4">
              <div>
                <Label>Nome completo *</Label>
                <Input value={ident.name} onChange={e => setIdent({ ...ident, name: e.target.value })} placeholder="Como aparece no seu documento" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>CPF ou documento *</Label>
                  <Input value={ident.document} onChange={e => setIdent({ ...ident, document: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label>Papel</Label>
                  <Input value={ident.role} onChange={e => setIdent({ ...ident, role: e.target.value })} placeholder="Ex.: Cliente" />
                </div>
              </div>
              <div>
                <Label>Empresa (opcional)</Label>
                <Input value={ident.company} onChange={e => setIdent({ ...ident, company: e.target.value })} placeholder="Nome da empresa" />
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Revise o documento</h2>
            </div>
            {pdfUrl ? (
              <>
                <div className="rounded-xl overflow-hidden border bg-slate-100">
                  <iframe src={pdfUrl} title="Documento" className="w-full h-[55vh] sm:h-[70vh]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir em nova aba
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfUrl} download className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Baixar cópia
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border-2 border-dashed p-8 text-center text-slate-500 bg-slate-50">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Pré-visualização do documento indisponível neste link. Você poderá visualizar o PDF assinado após a conclusão.</p>
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Termos de assinatura eletrônica</h2>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed max-h-64 overflow-y-auto space-y-2">
              <p>Ao continuar, você declara que:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>É <b>{ident.name || participant.name}</b> e está assinando por vontade própria.</li>
                <li>Concorda com o uso de assinatura eletrônica nos termos da <b>MP 2.200-2/2001</b> e da <b>Lei 14.063/2020</b>.</li>
                <li>Autoriza o registro de <b>IP, data/hora, dispositivo, navegador, sistema operacional</b> e <b>hash</b> como evidência digital.</li>
                <li>Compreende que esta assinatura tem validade jurídica entre as partes.</li>
              </ul>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={readConfirmed} onCheckedChange={v => setReadConfirmed(!!v)} className="mt-0.5" />
              <span className="text-sm text-slate-700">Li e aceito os termos acima.</span>
            </label>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Sua assinatura</h2>
            </div>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList className="grid grid-cols-3 w-full mb-4 h-12">
                <TabsTrigger value="drawn" className="text-xs sm:text-sm gap-1.5"><PenTool className="w-4 h-4" />Desenhar</TabsTrigger>
                <TabsTrigger value="typed" className="text-xs sm:text-sm gap-1.5"><Type className="w-4 h-4" />Digitar</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs sm:text-sm gap-1.5"><Upload className="w-4 h-4" />Enviar</TabsTrigger>
              </TabsList>
              <TabsContent value="drawn">
                <div className="relative border-2 border-dashed rounded-xl bg-white">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-[260px] sm:h-[300px] touch-none cursor-crosshair rounded-xl"
                    onMouseDown={startDraw} onMouseUp={stopDraw} onMouseMove={draw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchEnd={stopDraw} onTouchMove={draw}
                  />
                  <Button variant="ghost" size="sm" onClick={clearCanvas} className="absolute bottom-2 right-2 gap-1 text-xs">
                    <Eraser className="w-3.5 h-3.5" /> Limpar
                  </Button>
                  <p className="absolute top-2 left-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Desenhe com o dedo ou mouse
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="typed">
                <Input value={typed} onChange={e => setTyped(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="text-2xl sm:text-3xl font-serif italic text-center py-10 h-auto" />
              </TabsContent>
              <TabsContent value="upload">
                <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  {uploadData ? (
                    <img src={uploadData} alt="Assinatura" className="max-h-40 mx-auto" />
                  ) : (
                    <div className="text-slate-400">
                      <Upload className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm font-medium">Toque para enviar imagem (PNG/JPG, até 5MB)</p>
                    </div>
                  )}
                </label>
              </TabsContent>
            </Tabs>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Confirmar e finalizar</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <Row label="Documento" value={request.title} />
              <Row label="Nome" value={ident.name} />
              <Row label="Documento" value={ident.document} />
              {ident.company && <Row label="Empresa" value={ident.company} />}
              <Row label="Papel" value={ident.role || participant.role} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Prévia da assinatura</p>
                <div className="border rounded-lg p-3 bg-slate-50 min-h-20 grid place-items-center">
                  {tab === "typed" ? (
                    <span className="text-2xl font-serif italic">{typed}</span>
                  ) : signaturePreview ? (
                    <img src={signaturePreview} alt="Prévia" className="max-h-24" />
                  ) : (
                    <span className="text-xs text-slate-400">Sem prévia</span>
                  )}
                </div>
              </div>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={v => setAccepted(!!v)} className="mt-0.5" />
              <span className="text-sm text-slate-700">
                Confirmo que li o documento, aceito os termos e desejo assinar eletronicamente agora.
              </span>
            </label>
          </Card>
        )}

        <p className="text-[10px] text-center text-slate-400 pt-2">
          🔒 Conexão segura • Evidência com SHA-256 e trilha de auditoria • NavalDocs Pro
        </p>
      </main>

      {/* Footer nav */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
          <Button variant="outline" className="flex-1 h-12 gap-1"
            disabled={step === 0 || signing}
            onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}>
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          {step < 4 ? (
            <Button className="flex-[2] h-12 gap-1 font-bold"
              disabled={!canAdvance(step)}
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}>
              Continuar <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="flex-[2] h-12 font-bold" disabled={signing || !accepted} onClick={submit}>
              {signing ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Registrando...</>) : "Finalizar assinatura"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed pb-2 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right break-words">{value || "—"}</span>
    </div>
  );
}

function SuccessScreen({ result, company, token }: { result: any; company: any; token: string }) {
  const dev = detectDevice();
  const code = result.verification_code as string | null;
  const signedUrl = result.signed_pdf_url as string | null;
  const certUrl = result.certificate_url as string | null;
  const title = result.request?.title ?? "Documento";

  const shareMsg = code
    ? `Olá! O documento "${title}" foi assinado. Código de verificação: ${code}. Verifique em: ${typeof window !== "undefined" ? window.location.origin : ""}/verificar-assinatura/${code}`
    : `Olá! Segue o link para assinar o documento "${title}": ${typeof window !== "undefined" ? window.location.origin : ""}/assinar/${token}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareMsg); toast.success("Mensagem copiada"); }
    catch { toast.error("Não foi possível copiar"); }
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white grid place-items-center p-4">
      <Card className="p-6 sm:p-8 max-w-lg w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 grid place-items-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="font-semibold text-2xl text-slate-900 mb-1">Assinatura concluída!</h1>
        <p className="text-sm text-slate-600 mb-5">
          Sua assinatura foi registrada com evidência digital ({dev.device} · {dev.os} · {dev.browser}).
        </p>

        {code && (
          <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Código de verificação</p>
            <p className="font-mono text-xl font-bold text-emerald-900 tracking-wider">{code}</p>
          </div>
        )}

        <div className="grid gap-2">
          {code && (
            <Button asChild variant="outline" className="h-11 gap-2">
              <Link to="/verificar-assinatura/$code" params={{ code }}>
                <Shield className="w-4 h-4" /> Verificar assinatura
              </Link>
            </Button>
          )}
          {signedUrl && (
            <Button asChild variant="outline" className="h-11 gap-2">
              <a href={signedUrl} target="_blank" rel="noreferrer"><Download className="w-4 h-4" /> Baixar documento assinado</a>
            </Button>
          )}
          {certUrl && (
            <Button asChild variant="outline" className="h-11 gap-2">
              <a href={certUrl} target="_blank" rel="noreferrer"><FileText className="w-4 h-4" /> Baixar certificado de evidência</a>
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" className="h-11 gap-2" onClick={copy}>
              <Copy className="w-4 h-4" /> Copiar mensagem
            </Button>
            <Button asChild className="h-11 gap-2 bg-emerald-600 hover:bg-emerald-700">
              <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-6">
          {company?.name ? `${company.name} • ` : ""}Protegido por NavalDocs Pro
        </p>
      </Card>
    </div>
  );
}
