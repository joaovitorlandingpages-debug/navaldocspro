import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { signaturesService } from "@/services/signatures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PenTool, Type, Upload, Eraser, Shield, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/assinar/$token")({
  component: PublicSignPage,
});

function PublicSignPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"drawn" | "typed" | "upload">("drawn");
  const [typed, setTyped] = useState("");
  const [uploadData, setUploadData] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const found = await signaturesService.getByToken(token);
        if (!found) { toast.error("Link inválido"); return; }
        setData(found);
        if (found.participant.status === "signed") setDone(true);
        else await signaturesService.logView(token);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const startDraw = (e: any) => { drawingRef.current = true; draw(e); };
  const stopDraw = () => {
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.beginPath();
  };
  const draw = (e: any) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const c = canvasRef.current; const ctx = c.getContext("2d"); if (!ctx) return;
    const r = c.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - r.left : e.clientX - r.left;
    const y = "touches" in e ? e.touches[0].clientY - r.top : e.clientY - r.top;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const clearCanvas = () => {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = e => setUploadData(String(e.target?.result ?? ""));
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!accepted) return toast.error("Aceite os termos para continuar");
    let signature_data = "";
    if (tab === "drawn") {
      signature_data = canvasRef.current?.toDataURL() ?? "";
      if (!signature_data || signature_data.length < 1000) return toast.error("Desenhe sua assinatura");
    } else if (tab === "typed") {
      if (!typed.trim()) return toast.error("Digite seu nome");
      signature_data = typed;
    } else {
      if (!uploadData) return toast.error("Envie uma imagem da assinatura");
      signature_data = uploadData;
    }
    setSigning(true);
    try {
      await signaturesService.signByToken(token, { signature_type: tab, signature_data, accepted_terms: true });
      setDone(true);
      toast.success("Assinatura registrada com sucesso");
    } catch (e: any) { toast.error(e.message); }
    finally { setSigning(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando...</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md text-center">
        <Shield className="w-12 h-12 mx-auto text-rose-400 mb-3" />
        <h1 className="font-bold text-xl">Link inválido ou expirado</h1>
      </Card>
    </div>
  );

  const { participant, request } = data;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="p-10 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
          <h1 className="font-black text-2xl text-slate-900 mb-2">Documento assinado!</h1>
          <p className="text-slate-600">Sua assinatura foi registrada com evidência digital. Você pode fechar esta página.</p>
          <div className="mt-6 text-xs text-slate-400 space-y-1">
            <p>{request.title}</p>
            <p>Participante: {participant.name}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assinatura Online • NavalDocs Pro</p>
          <h1 className="text-2xl font-black mt-1">{request.title}</h1>
          <div className="mt-3 text-sm text-slate-600">
            <p><span className="font-bold">Participante:</span> {participant.name}</p>
            <p><span className="font-bold">Papel:</span> {participant.role}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold mb-3">Sua assinatura</h2>
          <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="drawn"><PenTool className="w-3 h-3 mr-1" />Desenhar</TabsTrigger>
              <TabsTrigger value="typed"><Type className="w-3 h-3 mr-1" />Digitar</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="w-3 h-3 mr-1" />Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="drawn">
              <div className="relative border-2 border-dashed rounded-xl bg-white">
                <canvas
                  ref={canvasRef} width={600} height={220}
                  className="w-full h-[220px] touch-none cursor-crosshair"
                  onMouseDown={startDraw} onMouseUp={stopDraw} onMouseMove={draw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchEnd={stopDraw} onTouchMove={draw}
                />
                <Button variant="ghost" size="sm" onClick={clearCanvas} className="absolute bottom-2 right-2 gap-1 text-xs">
                  <Eraser className="w-3 h-3" /> Limpar
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="typed">
              <Input value={typed} onChange={e => setTyped(e.target.value)}
                placeholder="Digite seu nome completo"
                className="text-2xl font-serif italic text-center py-8" />
            </TabsContent>
            <TabsContent value="upload">
              <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {uploadData ? (
                  <img src={uploadData} alt="Assinatura" className="max-h-32 mx-auto" />
                ) : (
                  <div className="text-slate-400">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Clique para enviar imagem da assinatura</p>
                  </div>
                )}
              </label>
            </TabsContent>
          </Tabs>

          <div className="mt-5 flex items-start gap-2">
            <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} id="terms" />
            <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer">
              Declaro que sou {participant.name} e concordo em assinar este documento eletronicamente.
              Aceito que serão registrados IP, data/hora, dispositivo e hash de evidência digital.
            </label>
          </div>

          <Button className="w-full mt-4 h-12 font-bold" onClick={submit} disabled={signing}>
            {signing ? "Registrando..." : "Confirmar Assinatura"}
          </Button>
        </Card>

        <p className="text-[10px] text-center text-slate-400">
          Protegido por NavalDocs Pro • Evidência digital com SHA-256 e trilha de auditoria.
        </p>
      </div>
    </div>
  );
}
